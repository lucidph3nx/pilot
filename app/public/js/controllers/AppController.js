app.controller('AppController',  ['$scope', 'currentServices', 'berthing', 'stationList', 'busCalcPost', '$interval', '$timeout', '$mdSidenav', '$mdpDatePicker', '$mdpTimePicker', function ($scope, currentServices, berthing, stationList, busCalcPost, $interval, $timeout, $mdSidenav, $mdpDatePicker, $mdpTimePicker) {

    var extraseconds
    var initialtime

    //initialise
      currentServices.async().then(function(d) {
        initialtime = d.data.Time
        $scope.time = moment(initialtime).format("HH:mm:ss")
        $scope.currentServices = d.data.currentServices;
        extraseconds = 0
      });
      berthing.async().then(function(d) {
        $scope.berthing = d.data;
      });
      //refresh data
      $interval(function () {
          currentServices.async().then(function(d) {
            initialtime = d.data.Time
            $scope.time = moment(initialtime).format("HH:mm:ss")
            $scope.currentServices = d.data.currentServices;
            extraseconds = 0
          });
      }, 15000);
      //tick clock
      $interval(function () {
          extraseconds = extraseconds + 1
          if (extraseconds < 60 ){
          $scope.time = moment(initialtime).add(extraseconds, 'seconds').format("HH:mm:ss");
        }else{
          $scope.time = "Connection Error - Last Update: " + moment(initialtime).format("HH:mm:ss");
        }
        //itterate through all CurrentServices and add the extra seconds on
        for (service in $scope.currentServices){
          $scope.currentServices[service].location_age_seconds =  $scope.currentServices[service].location_age_seconds + 1
          $scope.currentServices[service].location_age = pad((Math.floor($scope.currentServices[service].location_age_seconds / 60)),2) + ":" + pad(($scope.currentServices[service].location_age_seconds % 60),2)
        };

      }, 1000);


      $scope.sortReverse = false;
      $scope.splitBy = ['UP','DOWN'];

      $scope.getSort = function(view){
        if(view == 'UP'){
          return 'departs';
        }else if(view == 'DOWN'){
          return 'arrives';
        };
      }
      $scope.sortType = ['kiwirail','departs'];


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

      $scope.toShow = "Variance"; //"LinesDiagram";

      $scope.show = function (toShow) {
        $scope.toShow = toShow;
      };
      //for service detail bar
      $scope.selectedID = "NONE";
      $scope.detail = function (serviceId) {
        $scope.selectedID = serviceId;
      };


      function pad(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
      }

    //data for bus calc
    $scope.busCalcData = {
      Time : new Date(moment()),
      Line : 'HVL',
      Station1 : undefined,
      Station2 : undefined
    };
    $scope.resetBusCalcTime = function() {
      $scope.busCalcData.Time = new Date(moment())
    };
    $scope.stationList = stationList.stationList;
    $scope.busCalcResults = {};
    $scope.busCalcResultsVisible = false;
    $scope.calculateBus = function() {
      //$scope.busCalcData.Time = moment($scope.busCalcData.Time);
        busCalcPost.getCalc($scope.busCalcData).success(function(data,status){
          $scope.busCalcResults = data;
          $scope.busCalcResultsVisible = true;
        });
    };
    //mPicker stuff for bus calc
  this.showTimePicker = function(ev) {
    $mdpTimePicker($scope.busCalcData.Time, {
      targetEvent: ev
    }).then(function(selectedDate) {
      $scope.busCalcData.Time = selectedDate;
    });;
  }

}]);
