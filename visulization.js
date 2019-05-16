'use strict'

let width = 750;
let height = 450;
let margin = {top: 20, right: 15, bottom: 100, left: 100};
let w = width - margin.left - margin.right;
let h = height - margin.top - margin.bottom;

let dataset;
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
})

function filterData() {
    
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