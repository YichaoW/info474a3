var map;
var data;
var markers=[];
var pmarkers=[];
var houseInfoWindows=[]; 
var currentEvent;
var clickable = true;
var origin = {lat: 47.655548, lng: -122.303200};
async function initMap() {
    data = await d3.csv("kc_house_data.csv");
   /* data.forEach(d=>{
        if (d.price.substring(d.price.length - 5,d.price.length) == "e+006") {
            console.log(d.price)
        }
    })*/

    //var infowindow = new google.maps.InfoWindow();

    map = new google.maps.Map(document.getElementById('map'), {
        center: origin,
        zoom: 8,
        draggable: false
    });

    map.data.loadGeoJson('Zipcodes_for_King_County_and_Surrounding_Area__zipcode_area.geojson');
    map.data.setStyle({
        fillColor: '#00000000',
        strokeWeight: 2,
        strokeColor:"#4286f4"
    });

    setLimitBounds();
    initListeners();

    data.forEach(d=>{
      /*    var houseCircle = new google.maps.Circle({
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            map: map,
            center: {lat: +d.lat, lng: +d.long},
            radius: 10
          });*/
          
    });

    initSearchBox();

}

function centerMap(zoomNum, position) {
    map.setZoom(zoomNum);
    map.setCenter(position);
}

function shadeSelectedRegion() {
    if (currentEvent) {
        map.data.overrideStyle(currentEvent.feature, {fillColor: "green"});
    }
}

function initSearchBox() {
    // Create the search box and link it to the UI element.
    var input = document.getElementById('pac-input');
    var searchBox = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
    searchBox.setBounds(map.getBounds());
    });


    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();
        if (places.length == 0) {
        return;
        }
        // Clear out the old markers.
        pmarkers.forEach(function(marker) {
            marker.setMap(null);
        });
        pmarkers = [];

        // For each place, get the icon, name and location.
        var bounds = new google.maps.LatLngBounds();
        places.forEach(function(place) {
            if (!place.geometry) {
            console.log("Returned place contains no geometry");
            return;
            }
            var icon = {
            url: place.icon,
            size: new google.maps.Size(71, 71),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(17, 34),
            scaledSize: new google.maps.Size(25, 25)
            };

            // Create a marker for each place.
            pmarkers.push(new google.maps.Marker({
            map: map,
            icon: icon,
            title: place.name,
            position: place.geometry.location
            }));

            if (place.geometry.viewport) {
            // Only geocodes have viewport.
            bounds.union(place.geometry.viewport);
            } else {
            bounds.extend(place.geometry.location);
            }
        });
        if (places.length <= 1) {
            centerMap(12, places[0].geometry.location);
        } else {
            map.fitBounds(bounds);
        }

    });
}

function setLimitBounds() {
    var minZoomLevel = 8;

    // Bounds for North America
    var strictBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(47.922095, -120.859524), 
        new google.maps.LatLng(47.095843, -122.770653)
    );

    // Listen for the dragend event
    google.maps.event.addListener(map, 'dragend', function() {
        if (strictBounds.contains(map.getCenter())) return;

        // We're out of bounds - Move the map back within the bounds

        var c = map.getCenter(),
            x = c.lng(),
            y = c.lat(),
            maxX = strictBounds.getNorthEast().lng(),
            maxY = strictBounds.getNorthEast().lat(),
            minX = strictBounds.getSouthWest().lng(),
            minY = strictBounds.getSouthWest().lat();

        if (x < minX) x = minX;
        if (x > maxX) x = maxX;
        if (y < minY) y = minY;
        if (y > maxY) y = maxY;
        map.setCenter(new google.maps.LatLng(y, x));
        
    });

    // Limit the zoom level
    google.maps.event.addListener(map, 'zoom_changed', function() {
        if (map.getZoom() < minZoomLevel) map.setZoom(minZoomLevel);
    });
}

function initListeners() {
    map.data.addListener('mouseover', async function(event) {
        const sum = data.reduce((total, row)=>{
            if (event.feature.l.ZIP == row.zipcode){
                return ++total;
            }
            return total;
        },0);
        $("#locationFilterText").val(`ZIP: ${event.feature.l.ZIP}; # of sold houses: ${sum}`)

        if (!currentEvent || currentEvent.feature.l.OBJECTID != event.feature.l.OBJECTID) {
            map.data.revertStyle();
            shadeSelectedRegion();
            if (sum == 0) {
                clickable = false;
                map.data.overrideStyle(event.feature, {fillColor: "gray"});
            } else {
                var extentPrice =  d3.extent(data, d=>{
                    if (event.feature.l.ZIP == d.zipcode){
                        return d.price;
                    }
                });
                var meanPrice =  d3.mean(data, d=>{
                    if (event.feature.l.ZIP == d.zipcode){
                        return d.price;
                    }
                });
                var medianPrice =  d3.median(data, d=>{
                    if (event.feature.l.ZIP == d.zipcode){
                        return d.price;
                    }
                });
                $("#locationFilterText").val(`ZIP: ${event.feature.l.ZIP}; # of sold houses: ${sum}; Min Price: ${extentPrice[0]}; Max Price: ${extentPrice[1]}; Mean Price: ${meanPrice}; Median Price: ${medianPrice}`)

                map.data.overrideStyle(event.feature, {fillColor: "red"});
            }
            //infowindow.setContent(`ZIP: ${event.feature.l.ZIP}<br># of sold houses: ${sum}`);
           // infowindow.setPosition({lat: event.latLng.lat(), lng: event.latLng.lng()});
            //infowindow.open(map);
        }
        

    });

    map.data.addListener('click', function(event) {
        if (!clickable) return;
        currentEvent = event;
        map.data.revertStyle();
        shadeSelectedRegion();

        markers.forEach(m=>m.setMap(null));
        markers = [];

        centerMap(11, {lat: event.latLng.lat(), lng: event.latLng.lng()});
        
      /*  data.forEach(d=>{
            if (currentEvent.feature.l.ZIP == d.zipcode) {
                var markerImage = {
                    url: 'home.png',
                    // This marker is 20 pixels wide by 32 pixels high.
                    scaledSize: new google.maps.Size(24, 24),
                  };
                
                var marker = new google.maps.Marker({
                    position: {lat: +d.lat, lng: +d.long},
                    map: map,
                    icon: markerImage,
                    title: 'house'
                });
                marker.addListener('click', ()=>{
                    centerMap(15, {lat: +d.lat, lng: +d.long});

                    houseInfoWindows.forEach(h=>h.close());
                    houseInfoWindows = [];

                    var houseInfowindow= new google.maps.InfoWindow();
                    houseInfowindow.setContent(`Sold Date: ${d.date.substring(0,8)} <br> 
                                                Price: $${d.price} <br>
                                                Bedrooms: ${d.bedrooms}<br>
                                                Bathrooms: ${d.bathrooms}<br>
                                                SQFT Living: ${d.sqft_living}<br>
                                                SQFT Lot: ${d.sqft_lot}<br>
                                                Floors: ${d.floors}<br>
                                                Built Year: ${d.yr_built}<br>
                                                Renovated Year: ${d.yr_renovated}`);
                    houseInfowindow.open(map,marker);
                    houseInfoWindows.push(houseInfowindow);
                });

                markers.push(marker)
            }
        })*/
    });

    map.data.addListener('mouseout', function(event) {
        clickable = true;
      //  infowindow.close();
        map.data.revertStyle();
        shadeSelectedRegion();
    });
}