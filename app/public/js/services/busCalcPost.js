app.factory('busCalcPost', function($http) {
    var factory = {};

    factory.getCalc = function(busCalcData){
      return $http.post('busCalc', busCalcData);
    };
    return factory

});
