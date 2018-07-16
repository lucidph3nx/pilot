app.controller('AppController', ['$scope', 'currentServices', '$interval', '$timeout',
                          function($scope, currentServices, $interval, $timeout) {
    let extraseconds;
    let initialtime;
    // initialise currentServices
      currentServices.async().then(function(d) {
        initialtime = d.data.Time;
        $scope.time = moment(initialtime).format('HH:mm:ss');
        $scope.currentServices = d.data.currentServices;
        extraseconds = 0;
      });
      // refresh currentServices data
      $interval(function() {
          currentServices.async().then(function(d) {
            initialtime = d.data.Time;
            $scope.time = moment(initialtime).format('HH:mm:ss');
            $scope.currentServices = d.data.currentServices;
            extraseconds = 0;
          });
      }, 15000);
      // tick clock
      $interval(function() {
          extraseconds = extraseconds + 1;
          if (extraseconds < 60 ) {
          $scope.time = moment(initialtime).add(extraseconds, 'seconds').format('HH:mm:ss');
        } else {
          $scope.time = 'Connection Error - Last Update: ' + moment(initialtime).format('HH:mm:ss');
        }
        // itterate through all CurrentServices and add the extra seconds on
        for (service in $scope.currentServices) {
          $scope.currentServices[service].location_age_seconds = $scope.currentServices[service].location_age_seconds + 1;
          $scope.currentServices[service].location_age = pad((Math.floor($scope.currentServices[service].location_age_seconds / 60)), 2) + ':' + pad(($scope.currentServices[service].location_age_seconds % 60), 2);
        };
        // itterate through all currentUnitList and add the extra seconds on
        for (unit in $scope.currentUnitList) {
          $scope.currentUnitList[unit].positionAgeSeconds = $scope.currentUnitList[unit].positionAgeSeconds + 1;
          $scope.currentUnitList[unit].positionAge = pad((Math.floor($scope.currentUnitList[unit].positionAgeSeconds / 60)), 2) + ':' + pad(($scope.currentUnitList[unit].positionAgeSeconds % 60), 2);
        };
      }, 1000);

      $scope.sortReverse = false;
      $scope.splitBy = ['UP', 'DOWN'];
      $scope.getSort = function(view) {
        if (view == 'UP') {
          return 'departs';
        } else if (view == 'DOWN') {
          return 'arrives';
        };
      };
      $scope.sortType = ['kiwirail', 'departs'];
      $scope.toShow = 'Variance';
      function pad(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
      }
}]);
