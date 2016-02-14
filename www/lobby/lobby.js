(function() {

  angular
    .module('lobby', ['connection'])
    .controller('LobbyController', LobbyController);


  function LobbyController($scope, $state, $stateParams, $mdDialog, connection, session) {
    var self = this;

    self.game = connection.game;
    self.play = play;

    // Connect on load
    connection.connect(session.gameId, session.user);
    connection.on('lobby', function() {
      $mdDialog.cancel();
      if (!$state.is('lobby')) {
        console.log('Going to lobby');
        $state.go('lobby');
      }
    });

    connection.on('beginGame', function() {
      $mdDialog.cancel();
      if (!$state.is('grid')) {
        console.log('Going to grid');
        $state.go('grid');
      }
    });

    // *********************************
    // Internal methods
    // *********************************

    function connect() {
      connection.connect(session.gameId, session.user);
    }

    function play() {
      connection.beginGame();
    }
  }

})();