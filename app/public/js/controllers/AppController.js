app.controller('AppController',  ['$scope', 'currentServices', '$interval', '$timeout', '$mdSidenav', function ($scope, currentServices, $interval, $timeout, $mdSidenav) {

    var extraseconds
    var initialtime
    //initialise
      currentServices.async().then(function(d) {
        initialtime = d.data.Time
        $scope.time = new Date(initialtime).toJSON().substring(10,19).replace('T',' ').trim();
        $scope.currentServices = d.data.CurrentServices;
        extraseconds = 0
      });
      //refresh data
      $interval(function () {
          currentServices.async().then(function(d) {
            initialtime = d.data.Time
            $scope.time = new Date(initialtime).toJSON().substring(10,19).replace('T',' ').trim();
            $scope.currentServices = d.data.CurrentServices;
            extraseconds = 0
          });
      }, 30000);
      //tick clock
      $interval(function () {
          extraseconds = extraseconds + 1
          if (extraseconds < 60 ){
          $scope.time = new Date(initialtime + (extraseconds * 1000)).toJSON().substring(10,19).replace('T',' ').trim();
        }else{
          $scope.time = "Connection Error - Last Update: " + new Date(initialtime).toJSON().substring(10,19).replace('T',' ').trim();
        }
        //itterate through all CurrentServices and add the extra seconds on
        for (service in  $scope.currentServices){
          $scope.currentServices[service].location_age_seconds =  $scope.currentServices[service].location_age_seconds + 1
          $scope.currentServices[service].location_age = pad((Math.floor($scope.currentServices[service].location_age_seconds / 60)),2) + ":" + pad(($scope.currentServices[service].location_age_seconds % 60),2)
        }

      }, 1000);

      $scope.sortType = ['kiwirail','departs'];
      $scope.sortReverse = false;

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


      function pad(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
      }

}]);
