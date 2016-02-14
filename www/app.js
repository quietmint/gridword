/**
 * Fast UUID generator, RFC4122 version 4 compliant.
 * @author Jeff Ward (jcward.com).
 * @license MIT license
 * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
 **/
var UUID = (function() {
  var self = {};
  var lut = [];
  for (var i = 0; i < 256; i++) {
    lut[i] = (i < 16 ? '0' : '') + (i).toString(16);
  }
  self.generate = function() {
    var d0 = Math.random() * 0xffffffff | 0;
    var d1 = Math.random() * 0xffffffff | 0;
    var d2 = Math.random() * 0xffffffff | 0;
    var d3 = Math.random() * 0xffffffff | 0;
    return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
      lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
      lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
      lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff];
  }
  return self;
})();


angular
  .module('gridword', ['ngMaterial', 'ui.router', 'ui.gravatar', 'welcome', 'lobby', 'grid'])
  .config(function($compileProvider, $mdThemingProvider, gravatarServiceProvider, $stateProvider) {
    // Angular debugging
    $compileProvider.debugInfoEnabled(false);

    // Theme
    $mdThemingProvider.theme('default')
      .primaryPalette('deep-purple', {
        default: '700'
      })
      .backgroundPalette('grey', {
        'hue-1': '100'
      })
      .accentPalette('orange');

    // Gravatar config
    gravatarServiceProvider.defaults = {
      size: 40,
      'default': 'mm' // Mystery man as default for missing avatars
    };
    gravatarServiceProvider.secure = true;

    // States and URLs
    $stateProvider.state('welcome', {
        url: '',
        templateUrl: 'welcome/welcome.html',
        controller: 'WelcomeController',
        controllerAs: 'c'
      })
      .state('lobby', {
        templateUrl: 'lobby/lobby.html',
        controller: 'LobbyController',
        controllerAs: 'c'
      })
      .state('grid', {
        templateUrl: 'grid/grid.html',
        controller: 'GridController',
        controllerAs: 'c'
      });
  })

.run(function($document, $window, $timeout, $mdDialog, connection) {
  // Verify browser support
  $document.ready(function() {
    if (!connection.isSupported()) {
      $timeout(function() {
        $mdDialog.show(
          $mdDialog.alert()
          .escapeToClose(false)
          .clickOutsideToClose(false)
          .title('Browser Not Supported')
          .textContent('This applicaiton requires a newer web browser. Try the latest version of Chrome, Edge, Firefox, Internet Explorer, Opera, or Safari.')
          .ariaLabel('Browser Not Supported')
          .ok('Get A New Browser')
        ).then(function() {
          $window.location.href = 'https://whatbrowser.org/';
        });
      }, 0);
    }
  });
})