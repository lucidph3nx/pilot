app.directive('map', ['currentServices', function(){

  // directive link function
   var link = function(scope, element, attrs) {
       var map, infoWindow;
       var markers = [];

       // map config
       var mapOptions = {
           center: new google.maps.LatLng(-41.1235183,175.1070867),
           zoom: 11,
           mapTypeId: google.maps.MapTypeId.ROADMAP,
           scrollwheel: true,
           styles: [{"featureType": "administrative","elementType": "labels.text.fill","stylers": [{"visibility": "off"},{"color": "#1d1d2b"}]},
                   {"featureType": "administrative","elementType": "labels.text.stroke","stylers": [{"visibility": "off"},{"color": "#ffffff"}]},
                   {"featureType": "landscape.man_made","elementType": "geometry","stylers": [{"color": "#e5e5e5"}]},
                   {"featureType": "landscape.natural","elementType": "geometry","stylers": [{"saturation": -100},{"lightness": 11}]},
                   {"featureType": "poi","elementType": "all","stylers": [{"visibility": "off"}]},
                   {"featureType": "poi","elementType": "geometry","stylers": [{"color": "#cfd0cf"}]},
                   {"featureType": "poi","elementType": "labels.text.fill","stylers": [{"color": "#4a4a4a"}]},
                   {"featureType": "poi","elementType": "labels.text.stroke","stylers": [{"color": "#f9fafa"}]},
                   {"featureType": "poi","elementType": "labels.icon","stylers": [{"visibility": "off"},{"gamma": 0.01},{"saturation": -87},{"lightness": 53}]},
                   {"featureType": "poi.attraction","elementType": "all","stylers": [{"visibility": "off"}]},
                   {"featureType": "poi.business","elementType": "all","stylers": [{"visibility": "off"}]},
                   {"featureType": "poi.government","elementType": "all","stylers": [{"visibility": "off"}]},
                   {"featureType": "road","elementType": "labels.text.fill","stylers": [{"color": "#3c3c3c"},{"visibility": "off"}]},
                   {"featureType": "road","elementType": "labels.text.stroke","stylers": [{"color": "#ededed"},{"visibility": "simplified"},{"lightness": 67}]},
                   {"featureType": "road.highway","elementType": "geometry.fill","stylers": [{"color": "#ffffff"}]},
                   {"featureType": "road.highway","elementType": "geometry.stroke","stylers": [{"color": "#c6c5c6"}]},
                   {"featureType": "road.highway","elementType": "labels.icon","stylers": [{"visibility": "off"},{"gamma": 0.36},{"lightness": 61},{"saturation": -21}]},
                   {"featureType": "road.local","elementType": "geometry","stylers": [{"color": "#ffffff"},{"visibility": "simplified"}]},
                   {"featureType": "transit.line","elementType": "all","stylers": [{"visibility": "off"}]},
                   {"featureType": "transit.line","elementType": "geometry.fill","stylers": [{"hue": "#ff0033"},{"visibility": "off"},{"color": "#000000"},{"weight": 1}]},
                   {"featureType": "transit.line","elementType": "labels.text.fill","stylers": [{"visibility": "off"},{"lightness": -12},{"color": "#ffffff"}]},
                   {"featureType": "transit.line","elementType": "labels.text.stroke","stylers": [{"color": "#c6c5c3"},{"visibility": "off"},{"weight": 0.6}]},
                   {"featureType": "transit.station","elementType": "all","stylers": [{"visibility": "off"}]},
                   {"featureType": "water","elementType": "geometry","stylers": [{"color": "#00364A"}]},
                   {"featureType": "water","elementType": "labels.text.fill","stylers": [{"color": "#ffffff"}]},
                   {"featureType": "water","elementType": "labels.text.stroke","stylers": [{"color": "#cdcdcd"},{"visibility": "off"}]}]
                     };

       // init the map
       function initMap() {
           if (map === void 0) {
               map = new google.maps.Map(element[0], mapOptions);
           }
       }

       // place a marker
       function setMarker(map, position, title, content) {
           var marker;
           var markerOptions = {
               position: position,
               map: map,
               title: title,
               icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
           };

           marker = new google.maps.Marker(markerOptions);
           markers.push(marker); // add marker to array

           google.maps.event.addListener(marker, 'click', function () {
               // close window if not undefined
               if (infoWindow !== void 0) {
                   infoWindow.close();
               }
               // create new window
               var infoWindowOptions = {
                   content: content
               };
               infoWindow = new google.maps.InfoWindow(infoWindowOptions);
               infoWindow.open(map, marker);
           });
       }

       // Sets the map on all markers in the array.
      function setMapOnAll(map) {
        for (var i = 0; i < markers.length; i++) {
          markers[i].setMap(map);
        }
      }
       // show the map and place some markers
       initMap();

       for (s = 0; s < scope.currentServices.length; s++){
         setMarker(map, new google.maps.LatLng(scope.currentServices[s].lat, scope.currentServices[s].long), scope.currentServices[s].service_id, scope.currentServices[s].service_id);
       };

   };

   return {
       template: '<div id="gmaps"></div>',
       scope: true,
       replace: true,
       link: link
   };
}]);
