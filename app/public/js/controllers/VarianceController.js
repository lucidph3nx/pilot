app.controller('VarianceController', ['$scope', 'currentServices', '$interval',function($scope, currentServices, $interval) {

  var extraseconds
  var initialtime

    //initialise
      currentServices.async().then(function(d) {
        initialtime = d.data.Time
        $scope.time = new Date(initialtime).toJSON().substring(10,19).replace('T',' ').trim();
        $scope.currentServices = d.data.CurrentServices;
        extraseconds = 0
      });

      $interval(function () {
          currentServices.async().then(function(d) {
            initialtime = d.data.Time
            $scope.time = new Date(initialtime).toJSON().substring(10,19).replace('T',' ').trim();
            $scope.currentServices = d.data.CurrentServices;
            extraseconds = 0
          });
      }, 30000);

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

      $scope.test2 = "tested ok 2";

      $scope.sortType = ['kiwirail','departs'];
      $scope.sortReverse = false;

      function pad(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
      }

}]);
