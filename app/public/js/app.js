var app = angular.module('pilot', ['ngMaterial', 'ngAnimate', 'ngAria', 'ngMessages', 'mdPickers'])
.config(function($mdThemingProvider) {
  $mdThemingProvider.theme('default')
    .dark();
});
