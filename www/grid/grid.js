(function() {

  angular
    .module('grid', ['connection'])
    .controller('GridController', GridController)
    .controller('EndGameController', EndGameController);


  function GridController($timeout, $scope, $state, $mdSidenav, $mdDialog, $document, connection, session) {
    var self = this;

    self.game = connection.game;
    self.toggleNav = toggleNav;
    self.clickWord = clickWord;
    self.releaseWord = releaseWord;

    // Init
    connection.on('endGame', endGame);

    // *********************************
    // Internal methods
    // *********************************

    var currentTimeout;

    function toggleNav() {
      $mdSidenav('left').toggle();
    }

    function clickWord(word, $event) {
      if (self.game.status === 'playing') {
        if (typeof $event.clientX === 'number') {
          console.log('Click', word.word);
          currentTimeout = $timeout(function() {
            currentTimeout = undefined;
            console.log('Guess', word.word);
            connection.guessWord(word);

            /*
            angular.element(document.querySelector('.word')).triggerHandler('mousedown');
            angular.element(document.querySelector('.word')).triggerHandler('mouseup');
            */
          }, 750);
        }
      } else if (self.game.status === 'over') {
        endGame();
      }
    }

    function releaseWord(word, $event) {
      if (currentTimeout) {
        console.log('Release', word.word);
        $timeout.cancel(currentTimeout);
        currentTimeout = undefined;
      }
    }

    function endGame() {
      $mdDialog.show({
        parent: angular.element(document.body),
        templateUrl: 'grid/end-game-dialog.html',
        controller: 'EndGameController',
        controllerAs: 'dlg',
        clickOutsideToClose: false,
        escapeToClose: true
      }).then(function(action) {
        console.log('dialog closed, action = ' + action);
      });
    }
  }


  function EndGameController($mdDialog, connection) {
    var self = this;
    self.game = connection.game;
    self.cancel = function() {
      $mdDialog.cancel();
    }
    self.beginGame = function() {
      connection.beginGame();
    };
  }

})();