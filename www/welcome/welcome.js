(function() {

  angular
    .module('welcome', ['md5', 'ngStorage'])
    .controller('WelcomeController', WelcomeController)
    .controller('JoinGameController', JoinGameController)
    .factory('session', sessionFactory)
    .factory('gravatarProfile', gravatarProfileFactory);

  function WelcomeController($document, $mdDialog, $state, gravatarProfile, $localStorage, session, md5) {
    var self = this;

    self.newGame = newGame;
    self.joinGame = joinGame;
    self.updateName = updateName;
    self.$storage = $localStorage;

    // *********************************
    // Internal methods
    // *********************************

    /**
     * Create a new gameId
     */
    function newGame($event) {
      populateSession();
      $state.go('lobby');
    }

    /**
     * Prompt for gameId with custom dialog
     */
    function joinGame($event) {
      $mdDialog.show({
        targetEvent: $event,
        templateUrl: 'welcome/join-game-dialog.html',
        controller: 'JoinGameController',
        controllerAs: 'dlg',
        clickOutsideToClose: false,
        escapeToClose: true
      }).then(function(gameId) {
        session.gameId = gameId;
        populateSession();
        $state.go('lobby');
      });
    }

    function updateName() {
      self.$storage.displayName = undefined;
      gravatarProfile(self.$storage.email).then(function(profile) {
        self.$storage.displayName = profile.displayName;
      });
    }

    function populateSession() {
      session.user = {
        clientId: UUID.generate(),
        gravatar: self.$storage.email ? md5(self.$storage.email) : undefined,
        displayName: self.$storage.displayName,
        neverGiveClues: self.$storage.neverGiveClues
      };
    }
  }


  function JoinGameController($mdDialog) {
    var self = this;
    self.cancel = function() {
      $mdDialog.cancel();
    }
    self.joinGame = function() {
      $mdDialog.hide(self.gameId);
    };
  }


  function gravatarProfileFactory($http, md5) {
    return function(email) {
      var profileUrl = 'https://www.gravatar.com/' + md5(email) + '.json?callback=JSON_CALLBACK';
      return $http.jsonp(profileUrl).then(function(success) {
        if (Array.isArray(success.data.entry) && success.data.entry.length > 0) {
          return success.data.entry[0];
        }
      });
    }
  }


  function sessionFactory() {
    return {
      gameId: undefined,
      user: {}
    }
  }

})();