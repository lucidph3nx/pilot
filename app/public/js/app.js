var app = angular.module('pilot', ['ngMaterial', 'ngAnimate', 'ngAria', 'ngMessages'])
.config(function($mdThemingProvider) {
  $mdThemingProvider.theme('default')
    .dark();
});
