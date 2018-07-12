app.factory('runningSheetService', function($http) {
    let urlBase = 'runningSheet';
    let factory = {};
    factory.getRunningSheet=function(stationId) {
        return $http.get(urlBase +'?stationId='+ stationId);
    };
    return factory;
  });
