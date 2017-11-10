app.factory('getRoster', function($http) {
    let factory = {};
    let shiftId = '';
        factory.getReq = function(shift) {
          shiftId = shift;
          return $http.get('dayRoster?shiftId='+shiftId);
        };
        return factory;
  });
