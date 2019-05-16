var map;
var dataset;
var markers=[];
var pmarkers=[];
var houseInfoWindows=[]; 
var currentEvent;
var clickable = true;
var origin = {lat: 47.655548, lng: -122.303200};

let width = 750;
let height = 450;
let margin = {top: 20, right: 15, bottom: 100, left: 100};
let w = width - margin.left - margin.right;
let h = height - margin.top - margin.bottom;

let xAxis = "bedrooms";
let xMax = null;
let xMin = null;
let xAxisScale = null;

let yAxis = "none";
let yMax = null;
let yMin = null;
let yAxisScale = null;


let axisRefName = {
    "none": "Count",
    "bathrooms": "# of Bathrooms",
    "price": "House Price ($)",
    "bedrooms": "# of Bedrooms",
    "sqft_living": "Living Space (foot square)",
    "sqft_lot": "Land Space (foot square)",
    "floors": "# of Floors",
    "waterfront": "apartment is overlooking waterfront",
    "view": "Goodness of the House View",
    "condition": "House Condition",
    "grade": "Goodness of Design", 
    "sqft_above": "Space above Ground Level (foot square)", 
    "sqft_basement": "Basement Space (foot square)", 
    "yr_built": "Year Built", 
    "yr_renovated": "Year of the Last Renovation", 
    "sqft_living15": "Living Space of Neighborhood (foot square)", 
    "sqft_lot15": "Land Space of Neighborhood (foot square)"
}

let isOrdinal = {
    "none": false,
    "bathrooms": false,
    "price": false,
    "bedrooms": true,
    "sqft_living": false,
    "sqft_lot": false,
    "floors": false,
    "waterfront": true,
    "view": true,
    "condition": true,
    "grade": true, 
    "sqft_above": false, 
    "sqft_basement": false, 
    "yr_built": false, 
    "yr_renovated": false, 
    "sqft_living15": false, 
    "sqft_lot15": false
}

let selects = document.querySelectorAll("select")

selects.forEach((select, i) => {
    Object.keys(axisRefName).forEach((key) => {
        let option = document.createElement("option");
        if (i === 0) {
            if (key === xAxis) {
                option.selected = "selected";
            }
        } else {
            if (key === yAxis) {
                option.selected = "selected"
            }
        }
        option.innerHTML = axisRefName[key];
        option.value = key;
        select.appendChild(option);
    })
})




function initMap() {
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
    initSearchBox();

    loaddata();
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
 /*   var strictBounds = new google.maps.LatLngBounds(
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
        
    });*/

    // Limit the zoom level
    google.maps.event.addListener(map, 'zoom_changed', function() {
        if (map.getZoom() < minZoomLevel) map.setZoom(minZoomLevel);
    });
}

function initMapDataListeners() {
    map.data.addListener('mouseover', async function(event) {
        const sum = dataset.reduce((total, row)=>{
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
                var extentPrice =  d3.extent(dataset, d=>{
                    if (event.feature.l.ZIP == d.zipcode){
                        return +d.price;
                    }
                });
                var meanPrice =  d3.mean(dataset, d=>{
                    if (event.feature.l.ZIP == d.zipcode){
                        return +d.price;
                    }
                });
                var medianPrice =  d3.median(dataset, d=>{
                    if (event.feature.l.ZIP == d.zipcode){
                        return +d.price;
                    }
                });
                $("#locationFilterText").val(`ZIP: ${event.feature.l.ZIP}; # of sold houses: ${sum}; Min Price: ${extentPrice[0]}; Max Price: ${extentPrice[1]}; Mean Price: ${meanPrice}; Median Price: ${medianPrice}`)

                map.data.overrideStyle(event.feature, {fillColor: "red"});
            }
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

function loaddata() {
    d3.csv("kc_house_data.csv", (error, data) => {
        if (error) return console.warn(error);
        data.forEach(row => {
            for (let i = 2; i < data.columns.length; i++) {
                let col = data.columns[i];
                row[col] = +row[col];
            } 
            let date = row.date;
            row.year = +date.substring(0, 4);
            row.month = +date.substring(4, 6);
            row.day = +date.substring(6, 8);
    
            if (row.waterfront === 1) {
                row.waterfront = "Yes"
            } else {
                row.waterfront = "No"
            }
        });
        dataset = data;
        let svg = d3.select("body").append("svg")
            .attr("width", w + margin.left + margin.right)
            .attr("height", h + margin.top + margin.bottom)
            .attr("padding", "1rem")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let chart = svg.append("g").attr('translate', 'transform(' + margin + ',' + margin + ')');
        
        var tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

        drawCoordinates(svg, dataset);

        drawViz(dataset, chart, tooltip);

        d3.select("#first").on("change", () => {
            xAxis = document.querySelector("#first").value;
            clearAxis(svg);
            drawCoordinates(svg, dataset);
            drawViz(dataset, chart, tooltip);
        })

        d3.select("#second").on("change", () => {
            yAxis = document.querySelector("#second").value;
            clearAxis(svg);
            drawCoordinates(svg, dataset);
            drawViz(dataset, chart, tooltip);
        })

        

        initMapDataListeners();
        initFilter();
    });
}

function initFilter() {
    let houseData = dataset;
    let houseRecords = d3.nest()
      .key(d => d.id)
      .entries(houseData)
      .map(record => record.values[0]);

    // price
    let priceOptions = d3.map(houseRecords, d => d.price).keys()
        .map(d => parseInt(d))

    let priceSliderRange = d3
        .sliderBottom()
        .min(d3.min(priceOptions))
        .max(d3.max(priceOptions))
        .width(300)
        .default([300000, 1500000])
        .fill('#2196f3')
        .step(1000)
        .ticks(8)
        .tickFormat(d3.format('.2s'))
        .displayFormat(d3.format('.2s'))
        .on('onchange', val => {
            d3.select('div#value-range-price').text(val.map(d => "$" + d3.format(".2s")(d)).join('-'));
        });

    let priceRange = d3
        .select('div#slider-range-price')
        .append('svg')
        .attr('width', 500)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)');
    priceRange.call(priceSliderRange );

    d3.select('div#value-range-price').text(
        priceSliderRange
            .value()
            .map(d3.format('.2s'))
            .join('-')
    );

    // yearBuilt
    let yearBuiltOptions = d3.map(houseRecords, d => d.yr_built).keys()
        .map(d => parseInt(d))

    let yearBuiltSliderRange = d3
        .sliderBottom()
        .min(d3.min(yearBuiltOptions))
        .max(d3.max(yearBuiltOptions))
        .width(300)
        .default([1950, 2000])
        .fill('#2196f3')
        .ticks(5)
        .step(1)
        .on('onchange', val => {
            d3.select('div#value-range-yearBuilt').text(val.join('-'));
        });

    let yearBuiltRange = d3
        .select('div#slider-range-yearBuilt')
        .append('svg')
        .attr('width', 500)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)');
    
        yearBuiltRange.call(yearBuiltSliderRange);

    d3.select('div#value-range-yearBuilt').text(
        yearBuiltSliderRange
        .value()
        .join('-')
    );

    // bedroom
    let bedroomsOptions = d3.map(houseRecords, d => d.bedrooms).keys()
        .map(d => parseInt(d))

    let bedroomsSliderRange = d3
        .sliderBottom()
        .min(d3.min(bedroomsOptions))
        .max(d3.max(bedroomsOptions))
        .width(300)
        .default([4, 10])
        .fill('#2196f3')
        .step(1)
        .marks(1)
        .on('onchange', val => {
            d3.select('div#value-range-bedrooms').text(val.join('-'));
        });

    let bedroomsRange = d3
        .select('div#slider-range-bedrooms')
        .append('svg')
        .attr('width', 500)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)');
    
        bedroomsRange.call(bedroomsSliderRange);

    d3.select('div#value-range-bedrooms').text(
        bedroomsSliderRange
        .value()
        .join('-')
    );


    // bathroom
    let bathroomsOptions = d3.map(houseRecords, d => d.bathrooms).keys()
        .map(d => parseFloat(d))

    let bathroomsSliderRange = d3
        .sliderBottom()
        .min(d3.min(bathroomsOptions))
        .max(d3.max(bathroomsOptions))
        .width(300)
        .default([1.0, 5.0])
        .fill('#2196f3')
        .step(0.25)
        .marks(0.25)
        .on('onchange', val => {
            d3.select('div#value-range-bathrooms').text(val.map(d3.format('.2f')).join('-'));
        });

    let bathroomsRange = d3
        .select('div#slider-range-bathrooms')
        .append('svg')
        .attr('width', 500)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)');
    bathroomsRange.call(bathroomsSliderRange );

    d3.select('div#value-range-bathrooms').text(
        bathroomsSliderRange
            .value()
            .map(d3.format('.1f'))
            .join('-')
    );

    // floors
    let floorsOptions = d3.map(houseRecords, d => d.floors).keys()
        .map(d => parseFloat(d))

    let floorsSliderRange = d3
        .sliderBottom()
        .min(d3.min(floorsOptions))
        .max(d3.max(floorsOptions))
        .width(300)
        .default([1.0, 3.0])
        .fill('#2196f3')
        .step(0.5)
        .ticks(4)
        .on('onchange', val => {
            d3.select('div#value-range-floors').text(val.map(d3.format('.1f')).join('-'));
        });

    let floorsRange = d3
        .select('div#slider-range-floors')
        .append('svg')
        .attr('width', 500)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)');
    floorsRange.call(floorsSliderRange );

    d3.select('div#value-range-floors').text(
        floorsSliderRange
            .value()
            .map(d3.format('.1f'))
            .join('-')
    );

    d3.select("#waterfront-checkbox")
        .on('change', () => {
        if (this.checked) {
            // Checkbox is checked..
        } else {
            // Checkbox is not checked..
        }
    })
}

function drawViz(data, chart, tooltip) {
    if (xAxis !== "none" && yAxis !== "none") {
        clearGraph(chart);
        
        let circle = chart.selectAll("circle").data(data);

        circle.exit().remove();

        circle.attr("cx", (row) => { 
            return xAxisScale(row[xAxis]);  
        }).attr("cy", (row) => { 
            return yAxisScale(row[yAxis]); 
        }).style("fill", d3.hcl(-97, 32, 52));


        circle.data(data)
            .enter().append("circle")
            .attr("class", "circle")
            .attr("cx", (row) => { 
                return xAxisScale(row[xAxis]);  
            }).attr("cy", (row) => { 
                return yAxisScale(row[yAxis]); 
            }).attr("r", 4).style("fill", d3.hcl(-97, 32, 52)).style("opacity", 0.5)
            .on("mouseover", (row, i) => {
                changeColor(chart, ".circle", i, "red");
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(
                    axisRefName[xAxis] + ": " + row[xAxis] 
                        + "<br>" + axisRefName[yAxis] + ": " + row[yAxis]
                        + "<br> Sold Date: " + row.year + "/" + row.month + "/" + row.day
                ).style("top", (d3.event.pageY - 40) + "px")
                .style("left", (d3.event.pageX + 10) + "px")
            }).on("mouseout", (row, i) => {
                changeColor(chart, ".circle", i, "steelblue");
                tooltip.transition().duration(500).style("opacity", 0);
            }).transition().duration(300);
    } else {
        clearGraph(chart);

        let varName = xAxis;
        if (varName === "none") {
            varName = yAxis;
        }

        let count = {}
        data.forEach((row) => {
            let num = row[varName];
            if(!count[num]) {
                count[num] = 0;
            }
            count[num]++;
        });

        count = binData(count);

        let tallyData = [];

        Object.keys(count).forEach((key) => {
            tallyData.push({
                "value": +key,
                "count": count[key]
            });
        });

        let bar = chart.selectAll(".bar")
					.data(tallyData, (row) => {
                        return row.value
                    })

        bar.exit().remove();

        let x = d3.scaleBand().range([0, 0.5 * (width - margin.right)]).padding(0.1);
        let y = d3.scaleLinear().range([height - margin.bottom, margin.top])
            
        x.domain(tallyData.map(function(d) {return d.value;}))
        y.domain([0, d3.max(tallyData, (d) => {return d.count;})]).nice()
        
        let xName = xAxis;
        if (xAxis === "none") {
            xName = yAxis;
        }

        bar.enter().append("rect")
            .attr("class", "bar")
            .attr("fill", "steelblue")
            .attr("width", 0.5 * x.bandwidth())
            .merge(bar)
            .attr("x", (row) => {return xAxisScale(row.value) - 0.25 * x.bandwidth()})
            .attr("y", (row) => {return y(row.count) - 20})
            .attr("height", (row) => {return y(0) - y(row.count)}).on("mouseover", (row, i) => {
                changeColor(chart, ".bar", i, "red");
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(
                    axisRefName[xName] + ": " + row.value 
                        + "<br> Count" + ": " + row.count
                ).style("top", (d3.event.pageY - 40) + "px")
                .style("left", (d3.event.pageX + 10) + "px")
            }).on("mouseout", (row, i) => {
                changeColor(chart, ".bar", i, "steelblue");
                tooltip.transition().duration(500).style("opacity", 0);
            }).transition().duration(300);
        
    }
}

function changeColor(chart, className, index, color) {
    chart.selectAll(className).filter((d1, i1) => {
        return index === i1;
    }).style("fill", color);
}

function clearGraph(chart) {
    chart.selectAll(".bar").remove();
    chart.selectAll(".circle").remove();
}

function clearAxis(svg) {
    svg.selectAll("g.x-axis > *").remove();
    svg.selectAll("g.y-axis > *").remove();
    svg.selectAll("text.axis-text").remove();

    xMax = null;
    xMin = null;
    xAxisScale = null;

    yMax = null;
    yMin = null;
    yAxisScale = null;
}



function drawCoordinates(svg, data) {
    let yName = "Count";
    let xName = "Count";

    if (xAxis !== "none") {
        xName = axisRefName[xAxis];
        data.forEach((row) => { 
            if (!xMax || row[xAxis] > xMax) {
                xMax = row[xAxis];
            }
            if (!xMin || row[xAxis] < xMin) {
                xMin = row[xAxis]
            }
        })
        if (yAxis === "none") {
            let optimums = getCountOptimum(data, xAxis);
            xMin = +optimums.numMin;
            xMax = +optimums.numMax;
            yMin = 0;
            yMax = +optimums.max;
        }
    }

    if (yAxis !== "none") {
        yName = axisRefName[yAxis];
        data.forEach((row) => {
            if (!yMax || row[yAxis] > yMax) {
                yMax = row[yAxis];
            }

            if (!yMin || row[yAxis] < yMin) {
                yMin = row[yAxis]
            }
        })

        if (xAxis === "none") {
            let optimums = getCountOptimum(data, yAxis);
            xMin = +optimums.numMin;
            xMax = +optimums.numMax;
            yMin = 0;
            yMax = +optimums.max;
            xName = yName;
            yName = "Count";
        }
    }

    if (isOrdinal[xAxis]) {
        let ordinals = [];
        for (let i = xMin - 1; i <= xMax + 1; i++) {
            ordinals.push(i) + "";
        }
        xAxisScale = d3.scalePoint().domain(ordinals).range([0, w]);
    } else {
        xAxisScale = d3.scaleLinear().domain([xMin - 1, xMax + 1]).range([0, w]);
    }

    yAxisScale = d3.scaleLinear().domain([yMin - 1, yMax + 1]).range([h, 0]);
    let finalXAxis= d3.axisBottom().scale(xAxisScale);
    let finalYAxis= d3.axisLeft().scale(yAxisScale);
    
    svg.append("g").attr("class", "x-axis")
                    .attr("transform", "translate(0," + (height - margin.bottom - 20) + ")")
                    .text(xAxis)
                    .call(finalXAxis);

    svg.append("g").attr("class", "y-axis")
                    .attr("transform", "translate(" + (margin.left - 100)+ ",0)")
                    .call(finalYAxis).attr("x", 0);

    svg.append("text")
            .attr("class", "axis-text")             
            .attr("y", height - 85)
            .attr("x", 300)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(xName);

    svg.append("text")
            .attr("class", "axis-text") 
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left + 20)
            .attr("x",0 - (height / 2) + 40)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(yName);
}

function getCountOptimum(data, name) {
    let count = {}
    data.forEach((row) => {
        let num = row[name];
        if(!count[num]) {
            count[num] = 0;
        }
        count[num]++;
    });

    count = binData(count);

    let sortNums = Object.keys(count).map((a) => {
        return +a;
    }).sort((a, b) => {
        return(a - b)
    });

    let max = null;
    let min = null;
    let numMin = sortNums[0];
    console.log(sortNums);
    let numMax = sortNums[sortNums.length - 1];
    Object.keys(count).forEach((num) => {
        if (!max || count[num] > max) {
            max = count[num]
        }
        if (!min || count[num] < min) {
            min = count[num]
        }
    })
    return({
        "max": max,
        "min": min,
        "numMin": numMin,
        "numMax": numMax
    })
}

function binData(count) {
    let realizations = Object.keys(count);
    let newCount = count;
    if (realizations.length > 100) {
        newCount = {}
        let ite = Math.round(realizations.length / 100);
        while (realizations.length > 0) {
            let bin = [];
            for (let i = 1; i <= Math.min(ite, realizations.length); i++) {
                bin.push(+realizations.pop());
            }

            bin = bin.sort((a, b) => {
                return(a - b);
            })
            
            let sum = 0;
            bin.forEach((value) => {
                sum += count[value];
            });
            let median = bin[Math.floor(bin.length / 2)]
            newCount[median] = sum;
        }
    }
    return(newCount)
}