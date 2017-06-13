app.controller('AppController',  function ($scope, $timeout, $mdSidenav) {
    $scope.toggleLeft = buildToggler('left');
    $scope.toggleRight = buildToggler('right');

    $scope.openLeftMenu = function() {
      $scope.isSideNavOpen = !$scope.isSideNavOpen;
    };

    function buildToggler(componentId) {
      return function() {
        $mdSidenav(componentId).toggle();
      };
    }
});
