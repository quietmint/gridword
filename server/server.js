var _ = require('underscore-node');
var fs = require('fs');
var platform = require('platform');
var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;

var allWords = _.union(
  JSON.parse(fs.readFileSync('words-many.json', 'utf-8')),
  JSON.parse(fs.readFileSync('places.json', 'utf-8'))
);
console.log("Loaded word list: " + allWords.length);

// Function to send to a socket
function sendToSocket(socket, data) {
  if (typeof data !== 'string') {
    data = JSON.stringify(data, null, 2);
  };
  console.log('Send: %s', data);
  try {
    socket.send(data);
  } catch (e) {
    console.error('Send error', e);
  }
}

// Define game f
function Game(gameId) {
  this.gameId = gameId;
  this.sockets = [];
  this.status = 'waiting';
  this.beginTime = undefined;
  this.winner = undefined;
  this.words = undefined;
  this.teams = undefined;
}
Game.prototype = {
  isEmpty: function isEmpty() {
    var game = this;
    // Remove disconnected players
    game.sockets = game.sockets.filter(function(socket) {
      var connected = socket.readyState == WebSocket.OPEN;
      if (!connected) {
        console.warn('Found not connected socket (readyState: %s)', socket.readyState);
        try {
          socket.close();
        } catch (e) {
          console.error('Socket close error', e);
        }
      }
      return connected;
    });
    return game.sockets.length == 0;
  },

  sendToEveryone: function sendToEveryone() {
    var game = this;
    if (game.isEmpty()) {
      return;
    }

    // Create game state
    var gameData = _.omit(game, 'sockets');
    gameData.action = 'game';
    gameData.players = game.sockets.map(function(socket) {
      return socket.player;
    });

    // Send to each player
    //gameData = JSON.stringify(gameData, null, 2);
    game.sockets.forEach(function(socket) {
      var myData = _.clone(gameData);
      myData.me = socket.player;
      sendToSocket(socket, myData);
    });
  },

  checkEndGame: function checkEndGame() {
    var game = this;
    if (game.status == 'playing') {
      // Check if team 1 wins
      var moreTeam1 = game.words.some(function(word) {
        return !word.guessed && word.team == 1;
      });
      if (!moreTeam1) {
        game.status = 'over';
        game.winner = 1;
        return;
      }

      // Check if team 2 wins
      if (game.teams == 2) {
        var moreTeam2 = game.words.some(function(word) {
          return !word.guessed && word.team == 2;
        });
        if (!moreTeam2) {
          game.status = 'over';
          game.winner = 2;
          return;
        }
      }
    }
  },

  addPlayer: function addPlayer(socket) {
    var game = this;
    if (game.status === 'playing') {
      // Assign new player to a team
      // Default to team 1, unless team 1 has more players
      var player = socket.player;
      player.team = 1;
      if (game.teams == 2) {
        var playersTeam1 = game.sockets.filter(function(s) {
          return s.player.team == 1;
        }).length;
        var playersTeam2 = game.sockets.filter(function(s) {
          return s.player.team == 2;
        }).length;
        if (playersTeam1 > playersTeam2) {
          player.team = 2;
        }
      }
    }
    game.sockets.push(socket);
    game.sendToEveryone();
  },

  removePlayer: function removePlayer(socket) {
    var game = this;
    game.sockets = game.sockets.filter(function(s) {
      return socket !== s;
    });
    game.checkEndGame();
    game.sendToEveryone();
  },

  begin: function begin() {
    var game = this;
    if (game.sockets.length < 2) {
      console.warn('Attempt to begin game with less than 2 players');
      return;
    }

    // Reset game state
    game.status = 'playing';
    game.beginTime = Date.now();
    game.winner = undefined;

    // Assign players to teams
    var players = _.shuffle(game.sockets.map(function(socket) {
      return socket.player;
    }));
    game.teams = players.length >= 4 ? 2 : 1;
    players.forEach(function(player, index) {
      player.team = (index % game.teams) + 1;
      delete player.announcer;
    });

    // Give each team an announcer
    for (var team = 1; team <= game.teams; team++) {
      var teamPlayers = players.filter(function(player) {
        return player.team == team;
      });
      var elligiblePlayers = teamPlayers.filter(function(player) {
        return !player.neverGiveClues;
      });

      if (elligiblePlayers.length > 0) {
        elligiblePlayers[0].announcer = true;
      } else {
        console.warn('All players on team ' + team + ' have selected "neverGiveClues"?');
        teamPlayers[0].announcer = true;
      }
    }

    // Choose words and assign to teams
    game.words = _.shuffle(_.sample(allWords, 25).map(function(word, index) {
      return {
        word: word,
        team: index == 0 ? -1 // first word is the assassin
          : index <= 9 ? 1 // next 9 are for team 1
          : index <= 17 ? (game.teams == 2 ? 2 : 0) // next 8 are for team 2 (if playing)
          : 0 // the rest are neutral
      };
    }));

    game.sendToEveryone();
  },

  guessWord: function guessWord(socket, wordText) {
    var game = this;
    if (game.status == 'playing' && Array.isArray(game.words)) {
      // Mark the word as guessed
      game.words.some(function(word) {
        if (word.word == wordText) {
          word.guessed = socket.player.team;

          // Guessing team loses if assassin was chosen
          if (word.team == -1) {
            console.log('chose the assassin');
            game.status = 'over';
            game.winner = game.teams == 1 ? -1 : 2 - (socket.player.team % 2);
          }
          return true;
        }
      });
      game.checkEndGame();
      game.sendToEveryone();
    }
  }
};

var games = {};

// Listen for connections
var wss = new WebSocketServer({
  port: 8081
});

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function hasGame(gameId) {
  return games.hasOwnProperty(gameId);
}

function getGame(gameId) {
  if (!games.hasOwnProperty(gameId)) {
    console.log('Creating game', gameId);
    games[gameId] = new Game(gameId);
  }
  return games[gameId];
}

function deleteGame(gameId) {
  console.log('Deleting game', gameId);
  delete games[gameId];
}

wss.on('connection', function connection(socket) {
  socket.state = {};
  console.log('Connect');

  // Events
  socket.on('close', function close() {
    console.log('Disconnect');
    if (socket.gameId != null) {
      var game = getGame(socket.gameId);
      game.removePlayer(socket);
      if (game.isEmpty()) {
        deleteGame(socket.gameId);
      }
    }
  });

  socket.on('message', function incoming(message) {
    var data = JSON.parse(message);
    var action = data.action;
    delete data.action;
    console.log('Received: %s %s', action, JSON.stringify(data, null, 2));
    processMessage(action, data);
  });

  function processMessage(action, data) {
    if (action == 'join') {
      // Remove from previous game
      if (socket.gameId != null) {
        var oldGame = getGame(socket.gameId);
        oldGame.remove(socket);
      }

      // Update player information
      var browser, os;
      if (data.userAgent) {
        var ua = platform.parse(data.userAgent);
        browser = ua.name;
        if (ua && ua.os && ua.os.family) {
          os = ua.os.family;
        }
      }
      socket.player = {
        browser: browser,
        clientId: data.clientId,
        displayName: data.displayName,
        gravatar: data.gravatar,
        joinTime: Date.now(),
        os: os,
        neverGiveClues: data.neverGiveClues
      };

      // Generate unused game ID
      if (data.gameId == null) {
        do data.gameId = getRandomInt(100000, 999999); while (hasGame(data.gameId));
      }

      // Add to the game
      socket.gameId = +data.gameId;
      var game = getGame(socket.gameId);
      game.addPlayer(socket);

    } else if (action == 'begin') {
      var game = getGame(socket.gameId);
      game.begin();

    } else if (action == 'guess') {
      var game = getGame(socket.gameId);
      game.guessWord(socket, data.word);

    } else {
      console.warn('Unknown action: %s', action);
    }
  }
});