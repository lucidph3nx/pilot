app.factory('berthing', function($http) {
  return {
    async: function() {
      return $http.get('berthing');
    },
  };
});
