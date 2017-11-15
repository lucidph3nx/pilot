app.factory('currentUnitList', function($http) {
  return {
    async: function() {
      return $http.get('currentUnitList');
    },
  };
});
