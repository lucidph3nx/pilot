app.factory('currentServices', function($http) {
  return {
    async: function() {
      return $http.get('CurrentServices');
    }
  };
});
