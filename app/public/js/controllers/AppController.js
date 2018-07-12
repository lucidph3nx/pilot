app.controller('AppController', ['$scope', 'currentServices', 'currentUnitList', 'getRoster', 'runningSheetService', 'stationList', '$interval', '$timeout', '$mdDialog', '$mdSidenav', '$mdpDatePicker', '$mdpTimePicker',
                          function($scope, currentServices, currentUnitList, getRoster, runningSheetService, stationList, $interval, $timeout, $mdDialog, $mdSidenav, $mdpDatePicker, $mdpTimePicker) {
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
    // initialise currentUnitList
    currentUnitList.async().then(function(d) {
      $scope.currentUnitList = d.data.currentUnitList;
    });
    // refresh currentUnitList data
    $interval(function() {
      currentUnitList.async().then(function(d) {
          $scope.currentUnitList = d.data.currentUnitList;
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

      $scope.toShow = 'Variance'; // "LinesDiagram";

      $scope.show = function(toShow) {
        $scope.toShow = toShow;
      };
      // for service detail bar
      $scope.selectedID = 'NONE';
      $scope.detail = function(serviceId) {
        $scope.selectedID = serviceId;
      };


      function pad(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
      }
    // mPicker stuff for bus calc
  this.showTimePicker = function(ev) {
    $mdpTimePicker($scope.busCalcData.Time, {
      targetEvent: ev,
    }).then(function(selectedDate) {
      $scope.busCalcData.Time = selectedDate;
    }); ;
  };
  $scope.dayRoster = [];
  $scope.showDayRoster = function(ev, shift) {
    getRoster.getReq(shift).success(function(data, status) {
      $scope.dayRoster = data;
      $mdDialog.show({
        controller: DialogController,
        templateUrl: 'public/js/directives/dayRoster.html',
        scope: $scope.$new(),
        parent: angular.element(document.body),
        targetEvent: ev,
        clickOutsideToClose: true,
      });
    });
  };
  function DialogController($scope, $mdDialog) {
    $scope.hide = function() {
      $mdDialog.hide();
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };
  }


  $scope.ServicesToShow = {
    stationId: 'WELL',
    ShowUp: true,
    ShowDown: false,
    AllDay: false,
  };
  $scope.runningSheet = [];

  $scope.startRunningSheet = runningSheetService.getRunningSheet($scope.ServicesToShow.stationId).success(function(data, status) {
    $scope.runningSheet = data.filter(filterByDirection);
  });
  $scope.refreshRunningSheet = function() {
    runningSheetService.getRunningSheet($scope.ServicesToShow.stationId).success(function(data, status) {
      console.log('refreshed');
      $scope.runningSheet = data.filter(filterByDirection);
    });
  };
  // for future when i incorporate live data
  // $interval(function() {
  //   $scope.refreshRunningSheet();
  // }, 15000);

  function filterByDirection(service) {
    if ($scope.ServicesToShow.ShowUp && $scope.ServicesToShow.ShowDown && filterByTime(service)) {
      return true;
    } else if ($scope.ServicesToShow.ShowUp && service.direction == 'UP' && filterByTime(service)) {
      return true;
    } else if ($scope.ServicesToShow.ShowDown && service.direction == 'DOWN' && filterByTime(service)) {
      return true;
    } else {
      return false;
    }
  };
  function filterByTime(service) {
    let now = moment();
    let arrives = moment(service.arrives, 'HH:mm');
    if ($scope.ServicesToShow.AllDay == false) {
      if (arrives > moment(now).subtract(10, 'minutes') && arrives < moment(now).add(2, 'hour')) {
        return true;
      } else {
        return false;
      };
    } else {
      return true;
    }
  };
}]);
