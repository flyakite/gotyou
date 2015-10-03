L.mapbox.accessToken = 'pk.eyJ1IjoiZmx5YWtpdGUiLCJhIjoiY2lmOW9ycmI1MWI5anM5bHgzenpmMXh1ZSJ9.0JIZfFXb8GSPiCFp4347qw';
// Here we don't use the second argument to map, since that would automatically
// load in non-clustered markers from the layer. Instead we add just the
// backing tileLayer, and then use the featureLayer only for its data.
var map = L.mapbox.map('map')
  .setView([25.034, 121.54], 13)
  .addLayer(L.mapbox.tileLayer('mapbox.streets'));

var overlays = L.layerGroup().addTo(map);

// we create the 'layers' variable outside of the on('ready' callback
// so that it can be accessible in the showSpots function. Otherwise,
// JavaScript scope would prevent you from accessing it.
var layers;

// Since featureLayer is an asynchronous method, we use the `.on('ready'`
// call to only use its marker data once we know it is actually loaded.
var myLayer = L.mapbox.featureLayer()
  .loadURL('/data/hot-spot.json')
  .on('ready', function(e) {
    layers = e.target;
    showSpots();
  });

var filters = document.getElementById('colors').filters;

// There are many ways to filter data. Mapbox.js has the .setFilter method,
// but it only applies to L.mapbox.featureLayer layers, and that isn't what
// we're creating - we're making marker groups in a MarkerClusterGroup layer.
// Thus we distill filtering down to its essential part: an 'if' statement
// in a loop.


var geojson = { type: 'LineString', coordinates: [] }; //for car routing
function showSpots() {
  // first collect all of the checked boxes and create an array of strings
  // like ['green', 'blue']
  var list = [];
  for (var i = 0; i < filters.length; i++) {
    if (filters[i].checked) list.push(filters[i].value);
  }
  

  // then remove any previously-displayed marker groups
  overlays.clearLayers();
  // create a new marker group
  var clusterGroup = new L.MarkerClusterGroup({
    iconCreateFunction: function(cluster) {
      var c = cluster.getChildCount();
      var icon = c >= 100? 'danger': c;
      var color, s;
      // ingredient marker color
      if(c>=100){
        color = '#ff0000';
      }else{
        s = Math.floor((100-c)*1.2).toString(16)
        s = s.length == 1? '0'+s:s;
        color = '#f2' + s +'11';
      }
      return L.mapbox.marker.icon({
        // show the number of markers in the cluster on the icon.
        'marker-symbol': icon,
        'marker-color': color
      });
    }
  }).addTo(overlays);

  
  geojson.coordinates = [];
  // and add any markers that fit the filtered criteria to that group.
  layers.eachLayer(function(layer) {
    if (list.indexOf(layer.feature.properties.line) !== -1) {
      geojson.coordinates.push(layer.feature.geometry.coordinates);
      clusterGroup.addLayer(layer);
    }
  });
}

// var ticking;
// var policeMarker;
var policeMarkers = [];
function startRouting(e) {
  e.preventDefault();
  // Add this generated geojson object to the map.
  //L.geoJson(geojson).addTo(map);


  //clear
  // if(typeof policeMarker !== 'undefined'){
  //   console.log('clear');
  //   // policeMarker.clearLayers();
  //   map.removeLayer(policeMarker);
  //   clearTimeout(ticking);
  // }
  if(policeMarkers.length > 0){
    for(var i=policeMarkers.length;i--;){
      console.log('remove');
      map.removeLayer(policeMarkers[i]);
    }
    policeMarkers = [];
  }
  
  // Create a counter with a value of 0.
  var j = 0;

  // Create a marker and add it to the map.
  
  var cn = document.getElementById('car-number').value;
  console.log(cn);
  var policeMarker;
  for(var i=cn; i--;){
    policeMarker = L.marker([121.509279+0.01*i,25.070475+0.01*i], {
      icon: L.icon({
        // this feature is in the GeoJSON format: see geojson.org
        // for the full specification
        
          "iconUrl": '/img/police-car.png',
          "iconSize": [50, 50], // size of the icon
          "iconAnchor": [25, 25], // point of the icon which will correspond to marker's location
          "popupAnchor": [0, -25]
      })
    }).addTo(map);
    // console.log('policeMarker.setLatLng');
    // policeMarker.setLatLng();
    policeMarker.aid = i;
    policeMarkers.push(policeMarker);
  }



  function findDirection (waypoints, policeMarkerTemp, callback) {
    var url = 'https://api.mapbox.com/v4/directions/mapbox.driving/' +
    waypoints.join(';') + '.json?access_token=' + L.mapbox.accessToken;
    $.getJSON(url, function(data) {
      callback && callback(data, policeMarkerTemp);
    });
  }

  function findRouting(start, policeMarkerTemp, callback){
    console.log('start: '+ start);
    console.log(geojson.coordinates.length);
    var samplePointsLength = Math.min(20,geojson.coordinates.length-start);
    var maxc = geojson.coordinates.length > samplePointsLength? samplePointsLength: geojson.coordinates.length;
    var waypoints = [];
    var lastPoint = null;
    for(var i=0;i<samplePointsLength; i++){
      if(lastPoint && lastPoint==(geojson.coordinates[start+i][0],geojson.coordinates[start+i][1]))
        continue;
      waypoints.push([geojson.coordinates[start+i][0],geojson.coordinates[start+i][1]]);
      lastPoint=(geojson.coordinates[start+i][0],geojson.coordinates[start+i][1]);
    }
    findDirection(waypoints, policeMarkerTemp, function(data, policeMarkerTemp) {
      callback && callback(data, policeMarkerTemp);
    });
  }

  for(var i=policeMarkers.length; i--; ){
    var policeMarkerTemp = policeMarkers[i];
    var r = Math.floor(geojson.coordinates.length/policeMarkers.length)*i;
    findRouting(r, policeMarkerTemp, function(data, policeMarkerTemp) {
      policeMarkerTemp.route = data.routes[0];
      console.log(policeMarkerTemp.aid);
      policeMarkerTemp.j = 0;
      tick(policeMarkerTemp);
    });
  }


  
  function tick(policeCar) {
      // Set the marker to be at the same point as one
      // of the segments or the line.
      console.log();
      policeCar.setLatLng(L.latLng(
          policeCar.route.geometry.coordinates[policeCar.j][1],
          policeCar.route.geometry.coordinates[policeCar.j][0])
      );
      // Move to the next point of the line
      // until `j` reaches the length of the array.
      if (++policeCar.j < policeCar.route.geometry.coordinates.length){
        ticking = setTimeout(function() {
          tick(policeCar);
        }, 700);
      }
  }
  return false;
}

$('#start-routing').click(startRouting);
$(':checkbox').radiocheck();
