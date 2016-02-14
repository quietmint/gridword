angular
  .module('connection', ['angular-websocket'])
  .factory('connection', connectionFactory);

function connectionFactory($websocket, $q) {
  var self = this;

  self.address = 'ws://ws.' + window.location.hostname + ':8080/';
  self.game = {
    connected: false,
    gameId: undefined,
    me: undefined,
    players: [],
  };

  self.isSupported = isSupported;
  self.on = on;
  self.connect = connect;
  self.disconnect = disconnect;
  self.beginGame = beginGame;
  self.guessWord = guessWord;

  // *********************************
  // Internal fields
  // *********************************

  var _socket;
  var _callbacks = {
    beginGame: [],
    endGame: [],
    lobby: []
  };

  return self;

  // *********************************
  // Internal methods
  // *********************************

  function isSupported() {
    return 'WebSocket' in window && window.WebSocket.CLOSING === 2;
  }

  function on(eventName, callback) {
    if (Array.isArray(_callbacks[eventName])) {
      _callbacks[eventName].push(callback);
    }
  }

  function triggerCallbacks(eventName) {
    console.log('Triggering ' + eventName);
    var callbacks = _callbacks[eventName];
    if (Array.isArray(callbacks)) {
      callbacks.forEach(function(callback) {
        callback();
      });
    }
  }

  function connect(gameId, user) {
    var deferred = $q.defer();
    if (_socket == null) {
      console.debug('Connecting to ' + self.address);
      _socket = $websocket(self.address, null, {
        maxTimeout: 30000, // 30 seconds
        reconnectIfNotNormalClose: true
      });

      self.game.gameId = gameId;
      _socket.onOpen(function(event) {
        self.game.connected = true;
        console.debug('Connected');
        send(angular.extend({
          action: 'join',
          gameId: self.game.gameId,
          userAgent: navigator.userAgent
        }, user));
        deferred.resolve();
      });

      _socket.onClose(function(event) {
        self.game.connected = false;
        console.debug('Disconnected');
      });

      _socket.onError(function(event) {
        console.debug('Error');
      });

      _socket.onMessage(function(event) {
        var data = JSON.parse(event.data);
        var action = data.action;
        delete data.action;
        console.debug('Received', action, data);
        processMessage(action, data);
      });

    } else {
      deferred.resolve();
    }
    return deferred.promise;
  }

  function disconnect() {
    _socket.close();
  }

  function send(message) {
    console.debug('Sent', message);
    _socket.send(message);
  }

  function processMessage(action, data) {
    if (action == 'game') {
      var eventName = undefined;
      if (self.game.status !== data.status) {
        if (data.status === 'waiting') {
          eventName = 'lobby';
        } else if (data.status === 'playing') {
          eventName = 'beginGame';
        } else if (data.status === 'over') {
          eventName = 'endGame';
        }
      }
      angular.copy(data, self.game);
      self.game.connected = true;
      if (eventName) {
        triggerCallbacks(eventName);
      }
    } else {
      console.warn('Unknown action', action);
    }
  }

  function beginGame() {
    send({
      action: 'begin'
    });
  }

  function guessWord(word) {
    if (self.game.status == 'playing') {
      word.guessed = true;
      _socket.send({
        action: 'guess',
        word: word.word
      });
    }
  }
}