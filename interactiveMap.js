var map;
var dataset;
var markers=[];
var pmarkers=[];
var houseInfoWindows=[]; 
var zipcodes=new Map();
var infowindow;
var currentZip;

var origin = {lat: 47.477330, lng: -121.513281};

let width = 650;
let height = 650;
let margin = {top: 20, right: 15, bottom: 100, left: 100};
let w = width - margin.left - margin.right;
let h = height - margin.top - margin.bottom;

let svg;
let chart;
let tooltip;

let xAxis = "price";
let xMax = null;
let xMin = null;
let xAxisScale = null;

let yAxis = "none";
let yMax = null;
let yMin = null;
let yAxisScale = null;


let price_default = [300000, 1500000];
let yearBuiltDefault = [1950, 2000];
let bedroomDefault = [4.0, 10.0];
let floorDefault = [1.0, 3.0];
let bathroomDefault = [1.0, 5.0]

let filters = {
    zip: null,
    price: price_default,
    year: yearBuiltDefault,
    bedroom: bedroomDefault,
    floor: floorDefault,
    bathroom: bathroomDefault
}

let axisRefName = {
    "none": "Count",
    "price": "House Price ($)",
    "bathrooms": "# of Bathrooms",
    "bedrooms": "# of Bedrooms",
    "sqft_living": "Living Space (foot square)",
    "sqft_lot": "Land Space (foot square)",
    "floors": "# of Floors",
    "view": "Goodness of the House View",
    "condition": "House Condition",
    "grade": "Goodness of Design", 
    "sqft_above": "Space above Ground Level (foot square)", 
    "sqft_basement": "Basement Space (foot square)", 
    "yr_built": "Year Built", 
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
        let innerText = axisRefName[key];
        if (i === 0) {
            innerText = "X: " + innerText
        }  else {
            innerText = "Y: " + innerText
        }
        option.innerHTML = innerText;
        option.value = key;
        if (i === 1 || (i === 0 && key !== "none")) {
            select.appendChild(option);
        }
    })
})


$("#zipSearchButton").click(e=>{
    $("#warnSection").attr("hidden", "");

    var zip = $("#zipSearchText").val();

    if (zip=="") return;

    zip = parseInt(zip);
    var zipExist = zipcodes.get(zip);
    if (zipExist && zip != currentZip && getSumForZip(zip) != 0) {
        shadeRegionByZip(zip);
    } else if (!zipExist || getSumForZip(zip) == 0) {
        $("#warnSection").removeAttr("hidden");
    }
})

$("#clearSearchButton").click(e=>{
    $("#warnSection").attr("hidden", "");
    $("#zipSearchText").val("");
    unselectRegion();
});

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: origin,
        zoom: 7.5,
        draggable: false,
        styles: [
            {
            "featureType": "all",
            "stylers": [
              { "visibility": "off" }
            ]
            }],
        backgroundColor: '#FFF',
        disableDefaultUI: true,
        draggable: false,
        scaleControl: false,
        scrollwheel: false,
    });

    map.data.loadGeoJson('Zipcodes_for_King_County_and_Surrounding_Area__zipcode_area.geojson',{idPropertyName: "OBJECTID"});
    
   


    map.data.setStyle(feature=>{
        var color = "#bdbdbd";
        var zip = feature.l.ZIP;
        if (zipcodes.has(zip)) {
            zipcodes.get(zip).push(feature.l.OBJECTID);
        } else {
            zipcodes.set(zip,[feature.l.OBJECTID]);
        }
        if (getSumForZip(zip)==0) {
            color = "#636363"
        } 
        return {
            fillColor: color,
            strokeWeight: 2,
        };

    });

    infowindow = new google.maps.InfoWindow();
    
    setLimitBounds();
  //  initSearchBox();

    loaddata();
}



function centerMap(zoomNum, position) {
    map.setZoom(zoomNum);
    map.setCenter(position);
}

function shadeSelectedRegion() {
    if (currentZip) {
        renderRegionByZip(currentZip, "green");
    }
}

function setLimitBounds() {
    var minZoomLevel = 8;
    google.maps.event.addListener(map, 'zoom_changed', function() {
        if (map.getZoom() < minZoomLevel) map.setZoom(minZoomLevel);
    });
}

function renderRegionByZip(zip,color) {
    zipcodes.get(zip).forEach(id=>{
        map.data.overrideStyle(map.data.getFeatureById(id), {fillColor: color});
    })
}

function zipClickable(zip) {
    return getSumForZip(zip)!=0;
}

function shadeRegionByZip(zip) {
    if (currentZip != zip) {
        currentZip = zip;
        map.data.revertStyle();
        shadeSelectedRegion();
        $("#locationFilterText").html("<h3>Location Summary</h3>"+getSummaryText(zip));
    } else {
        unselectRegion();
    }
    filterData();
}

function unselectRegion() {
    currentZip = null;
    $("#locationFilterText").html("");
    map.data.revertStyle();
    filterData();
}

function initMapDataListeners() {
    
    map.data.addListener('mouseover', async function(event) {
        const sum = getSumForZip(event.feature.l.ZIP);
        infowindow.close();
        infowindow.setContent(`ZIP: ${event.feature.l.ZIP}<br> # of sold houses: ${sum}`);
        infowindow.setPosition({lat:event.latLng.lat(),lng:event.latLng.lng()});
        if (currentZip != event.feature.l.ZIP) {
            map.data.revertStyle();
            shadeSelectedRegion();
            if (sum == 0) {
                map.data.overrideStyle(event.feature, {fillColor: "#636363"});
            } else {
                infowindow.setContent(getSummaryText(event.feature.l.ZIP));
                renderRegionByZip(event.feature.l.ZIP, "red");
            }
        }
        

        infowindow.open(map);
    });

    map.data.addListener('click', function(event) {
        if (!zipClickable(event.feature.l.ZIP) ) return;
        shadeRegionByZip(event.feature.l.ZIP);
    });

    map.data.addListener('mouseout', function(event) {
        infowindow.close();
        map.data.revertStyle();
        shadeSelectedRegion();        
    });
}

function getSummaryText(zip) {
    const sum = getSumForZip(zip);
    
    var extentPrice =  d3.extent(dataset, d=>{
        if (zip == d.zipcode){
            return +d.price;
        }
    });
    var meanPrice =  d3.mean(dataset, d=>{
        if (zip == d.zipcode){
            return +d.price;
        }
    });
    var medianPrice =  d3.median(dataset, d=>{
        if (zip == d.zipcode){
            return +d.price;
        }
    });
    return `ZIP: ${zip} <br> 
            # of sold houses: ${sum}<br> 
            Min Price: ${d3.format(",")(extentPrice[0])}<br> 
            Max Price: ${d3.format(",")(extentPrice[1])}<br> 
            Mean Price: ${d3.format(",")(meanPrice.toFixed(0))}<br> 
            Median Price: ${d3.format(",")(medianPrice)}`
}

function loaddata() {
    d3.csv("data/kc_house_data.csv", (error, data) => {
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
        
        svg = d3.select("#plot").append("svg")
            .attr("width", w + margin.left + margin.right)
            .attr("height", h + margin.top + margin.bottom)
            .attr("padding", "1rem")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        chart = svg.append("g").attr('translate', 'transform(' + margin + ',' + margin + ')');
        
        tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

        filterData()

        

        d3.select("#first").on("change", () => {
            xAxis = document.querySelector("#first").value;
            filterData();
        })

        d3.select("#second").on("change", () => {
            yAxis = document.querySelector("#second").value;
            filterData();
        })

        initMapDataListeners();
        initFilter();
    });
}

function getSumForZip(zip) {
     return dataset.reduce((total, row)=>{
        if (zip == row.zipcode){
            return ++total;
        }
        return total;
    },0);
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

    price_default= [d3.min(priceOptions), d3.max(priceOptions)];
    filters.price = price_default;

    let priceSliderRange = d3
        .sliderBottom()
        .min(d3.min(priceOptions))
        .max(d3.max(priceOptions))
        .width(200)
        .default(price_default)
        .fill('#2196f3')
        .step(1000)
        .ticks(8)
        .tickFormat(d3.format('.2s'))
        .displayFormat(d3.format('.2s'))
        .on('onchange', val => {
            d3.select('div#value-range-price').text(val.map(d => "$" + d3.format(".2s")(d)).join('-'));
            filters.price = val.sort((a, b) =>  {return a - b});
            filterData();
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

    
    
        yearBuiltDefault = [d3.min(yearBuiltOptions), d3.max(yearBuiltOptions)]
        filters.year = yearBuiltDefault;

    let yearBuiltSliderRange = d3
        .sliderBottom()
        .min(d3.min(yearBuiltOptions))
        .max(d3.max(yearBuiltOptions))
        .width(200)
        .default(yearBuiltDefault)
        .fill('#2196f3')
        .ticks(5)
        .step(1)
        .on('onchange', val => {
            d3.select('div#value-range-yearBuilt').text(val.join('-'));
            filters.year = val.sort((a, b) =>  {return a - b});
            filterData();
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

        bedroomDefault = [d3.min(bedroomsOptions), d3.max(bedroomsOptions)]
        filters.bedroom = bedroomDefault;

    let bedroomsSliderRange = d3
        .sliderBottom()
        .min(d3.min(bedroomsOptions))
        .max(d3.max(bedroomsOptions))
        .width(200)
        .default(bedroomDefault)
        .fill('#2196f3')
        .step(1)
        .marks(1)
        .on('onchange', val => {
            d3.select('div#value-range-bedrooms').text(val.join('-'));
            filters.bedroom = val.sort((a, b) =>  {return a - b});
            filterData();
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

        bathroomDefault = [d3.min(bathroomsOptions), d3.max(bathroomsOptions)];
        filters.bathroom = bathroomDefault;

    let bathroomsSliderRange = d3
        .sliderBottom()
        .min(d3.min(bathroomsOptions))
        .max(d3.max(bathroomsOptions))
        .width(200)
        .default(bathroomDefault)
        .fill('#2196f3')
        .step(0.25)
        .marks(0.25)
        .on('onchange', val => {
            d3.select('div#value-range-bathrooms').text(val.map(d3.format('.2f')).join('-'));
            filters.bathroom = val.sort((a, b) =>  {return a - b});
            filterData();
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

        floorDefault = [d3.min(floorsOptions),d3.max(floorsOptions)]
        filters.floor = floorDefault;

    let floorsSliderRange = d3
        .sliderBottom()
        .min(d3.min(floorsOptions))
        .max(d3.max(floorsOptions))
        .width(200)
        .default(floorDefault)
        .fill('#2196f3')
        .step(0.5)
        .ticks(4)
        .on('onchange', val => {
            d3.select('div#value-range-floors').text(val.map(d3.format('.1f')).join('-'));
            filters.floor = val.sort((a, b) =>  {return a - b});
            filterData();
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

    filterData();
}

function filterData() {
    if (currentZip) {
        filters.zip = currentZip;
    } else {
        filters.zip = null;
    }

    let filterData = dataset.filter((row) => {
        let zip = !filters.zip || row.zipcode === filters.zip;
        let price = filters.price[0] <= row.price && row.price <= filters.price[1];
        let year = filters.year[0] <= row["yr_built"] && row["yr_built"] <= filters.year[1];
        let bedroom = filters.bedroom[0] <= row["bedrooms"] && row["bedrooms"] <= filters.bedroom[1];
        let bathroom = filters.bathroom[0] <= row["bathrooms"] && row["bathrooms"] <= filters.bathroom[1];
        let floor = filters.floor[0] <= row["floors"] && row["floors"] <= filters.floor[1];
        return zip && price && year && bedroom && bathroom && floor;
    })
    clearAxis();
    drawCoordinates(filterData);
    drawViz(filterData);
}

function drawViz(data) {
    if (xAxis !== "none" && yAxis !== "none") {
        clearGraph();
        
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
        clearGraph();

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
                changeColor(chart, ".bar", i, "#feb24c");
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

function clearGraph() {
    chart.selectAll(".bar").remove();
    chart.selectAll(".circle").remove();
}

function clearAxis() {
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



function drawCoordinates(data) {
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
            .attr("x", 250)
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