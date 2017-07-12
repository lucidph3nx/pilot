app.controller('AppController',  ['$scope', 'currentServices', 'berthing', 'stationList', 'busCalcPost', '$interval', '$timeout', '$mdSidenav', '$mdpDatePicker', '$mdpTimePicker', function ($scope, currentServices, berthing, stationList, busCalcPost, $interval, $timeout, $mdSidenav, $mdpDatePicker, $mdpTimePicker) {

    var extraseconds
    var initialtime

    //initialise
      currentServices.async().then(function(d) {
        initialtime = d.data.Time
        $scope.time = new Date(initialtime).toJSON().substring(10,19).replace('T',' ').trim();
        $scope.currentServices = d.data.CurrentServices;
        extraseconds = 0
      });
      berthing.async().then(function(d) {
        $scope.berthing = d.data;
      });
      //refresh data
      $interval(function () {
          currentServices.async().then(function(d) {
            initialtime = d.data.Time
            $scope.time = new Date(initialtime).toJSON().substring(10,19).replace('T',' ').trim();
            $scope.currentServices = d.data.CurrentServices;
            extraseconds = 0
          });
      }, 15000);
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
      $scope.detail = function (service_id) {
        $scope.selectedID = service_id;
      };


      function pad(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
      }
      //mPicker stuff for bus calc
      $scope.currentDate = new Date();
  	this.showDatePicker = function(ev) {
    	$mdpDatePicker($scope.currentDate, {
        targetEvent: ev
      }).then(function(selectedDate) {
        $scope.currentDate = selectedDate;
      });;
    };

    this.filterDate = function(date) {
      return moment(date).date() % 2 == 0;
    };

    this.showTimePicker = function(ev) {
    	$mdpTimePicker($scope.currentTime, {
        targetEvent: ev
      }).then(function(selectedDate) {
        $scope.currentTime = selectedDate;
      });;
    }
    //data for bus calc
    $scope.busCalcData = {
      Time : $scope.currentTime,
      Line : 'HVL',
      Station1 : '',
      Station2 : ''
    };
    $scope.stationList = stationList.stationList;

    $scope.busCalcResults = {};

    $scope.calculateBus = function() {
      busCalcPost.getCalc($scope.busCalcData).success(function(data,status){
        $scope.busCalcResults = data;
      });
    };

}]);
