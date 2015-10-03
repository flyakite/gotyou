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
L.mapbox.featureLayer()
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

var ticking;
var policeMarker;
function startRouting() {
  // Add this generated geojson object to the map.
  //L.geoJson(geojson).addTo(map);


  //clear
  // if(typeof policeMarker !== 'undefined'){
  //   map.removeLayer(policeMarker);
  //   clearTimeout(ticking);
  // }
  
  // Create a counter with a value of 0.
  var j = 0;

  // Create a marker and add it to the map.
  var policeMarker = L.marker([0, 0], {
    icon: L.mapbox.marker.icon({
      'marker-color': '#f86767'
    })
  }).addTo(map);


  function findDirection (waypoints, callback) {
    var url = 'https://api.mapbox.com/v4/directions/mapbox.driving/' +
    waypoints.join(';') + '.json?access_token=' + L.mapbox.accessToken;
    $.getJSON(url, function(data) {
      console.dir(data);
      callback && callback(data);
    });
  }

  function findRouting(start, callback){
    var samplePointsLength = Math.min(20,geojson.coordinates.length);
    var maxc = geojson.coordinates.length > samplePointsLength? samplePointsLength: geojson.coordinates;
    var waypoints = [];
    var lastPoint;
    for(var i=0;i<samplePointsLength; i++){
      if(lastPoint && lastPoint==(geojson.coordinates[start+i][0],geojson.coordinates[start+i][1]))
        continue;
      waypoints.push([geojson.coordinates[start+i][0],geojson.coordinates[start+i][1]]);
      lastPoint=(geojson.coordinates[start+i][0],geojson.coordinates[start+i][1]);
    }
    console.dir(waypoints);
    findDirection(waypoints, function(data) {
      callback && callback(data);
    });
  }

  var route;
  findRouting(0, function(data) {
    route = data.routes[0];
    tick();
  });


  
  function tick() {

      // Set the marker to be at the same point as one
      // of the segments or the line.
      policeMarker.setLatLng(L.latLng(
          route.geometry.coordinates[j][1],
          route.geometry.coordinates[j][0])
      );

      // Move to the next point of the line
      // until `j` reaches the length of the array.
      if (++j < route.geometry.coordinates.length){
        ticking = setTimeout(tick, 700);
      }
  }
  // body...
}
