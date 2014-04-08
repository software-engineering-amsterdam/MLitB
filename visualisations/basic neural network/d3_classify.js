    //In case margins are desired, set them
    var emptyMargin = { top:0, right:0, bottom:0, left:0 };
    //Axis and labels take up space we need to take into account:
    //graph should not yet be drawn where the numbers start
    var axisMargin = { top: 5, left: 1, bottom: 9, right: 1 };
    //Total margin
    var margin = { top:emptyMargin.top + axisMargin.top,
        bottom:emptyMargin.bottom + axisMargin.bottom,
        right:emptyMargin.right + axisMargin.right,
        left:emptyMargin.left + axisMargin.left };

    var width = 500 - margin.left - margin.right;
    var height = 500 - margin.top - margin.bottom;
    
    //svg container for the graph showing decision boundaries
    //apply margins by adding all items to a transformed group
    var boundaryGraph = d3.select("#boundaryGraph").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
       .append("g")
        .attr("transform", "translate(" + emptyMargin.left + "," + emptyMargin.top + ")")
        
    //Group of rectangles that will form the background
    var squareGroup = boundaryGraph.append("g");
    
    //The axes need their own groups
    var yAxisGroup = boundaryGraph.append("g")
        .attr("transform", "translate(" + (axisMargin.left + 0.5 * width) + "," + axisMargin.top + ")")
    var xAxisGroup = boundaryGraph.append("g")
        .attr("transform", "translate(" + axisMargin.left + "," + (0.5 * height + axisMargin.bottom) + ")")

    //Initial call to the function to show something will show there 
    updateBoundaries(points);

    //Call every time to redraw with new data (only requires the points as
    //parameter, but should also have access to the net)
    function updateBoundaries(points){
// console.log(points);
        //Update scales for new data
        //Added a margin to minx and maxx so points are not exactly on the edge
        var widthscale = d3.scale.linear()
            .domain(
                [d3.min(points, function(d){ return d.x - Math.abs(d.x * 0.1); }),
                 d3.max(points, function(d){ return d.x + Math.abs(d.x * 0.1); })])
            .range([0, width]);

        //Does the inverse translation
        var reverseWidthscale = d3.scale.linear()
            .domain([0, width])
            .range(
                [d3.min(points, function(d){ return d.x - Math. abs(d.x * 0.1); }),
                d3.max(points, function(d){ return d.x + Math.abs(d.x * 0.1); })]);

        var heightscale = d3.scale.linear()
            .domain(
                [d3.max(points, function(d){ return d.y + Math.abs(d.y * 0.1); }),
                 d3.min(points, function(d){ return d.y - Math.abs(d.y * 0.1); })])
            .range([0, height]);

        var reverseHeightscale = d3.scale.linear()
            .domain([0, height])
            .range(
                [d3.max(points, function(d){ return d.y + Math.abs(d.y * 0.1); }),
                 d3.min(points, function(d){ return d.y - Math.abs(d.y * 0.1); })]);

        //When the svg container is clicked, add a point of the proper class
        //Pressing shift or not determines class point
        boundaryGraph.on("click", function(){
            if (d3.event.shiftKey) labelval = 1;
            else labelval = 0;
            
            var newPoint = {"x":reverseWidthscale(d3.mouse(this)[0]),
                "y":reverseHeightscale(d3.mouse(this)[1]),
                "label":labelval};
            //add to drawing array
            points.push(newPoint);
            //add to data array of the page's logic
            addPoint(newPoint);
        });

        //Now we'll colour the field depending on the class:
        //we decide on a granularity and check for every square of this size
        //the classification the network gives
        var netx = new convnetjs.Vol(1,1,2);
        var density= 5.0; //granularity
        var colours = [];
        for(var x= 0.0; x <= width; x += density){
            for(var y= axisMargin.top; y <= height; y += density){
                netx.w[0] = reverseWidthscale(x);//(x - width / 2) / ss;
                netx.w[1] = reverseHeightscale(y);//(y - height / 2) / ss;
                var a = net.forward(netx, false);
        
                if(a.w[0] > a.w[1]) 
                    colours.push({"x":x,"y":y,"colour":"orange"});
                else colours.push({"x":x,"y":y,"colour":"steelblue"});
            }
        }
        //Bind proper colour to each grid cel and (re)draw square
        var squares = squareGroup.selectAll("rect").data(colours);
        
        //If this isn't the first time, only change colour
        squares.style("fill", function(d){ return d.colour; });

        //first time run: add all squares
        squares.enter().append("rect")
            .attr("x", function(d){ return d.x - density / 2 - 1 + axisMargin.left; })
            .attr("y", function(d){ return d.y - density - 1 + axisMargin.top; })
            .attr("width", density + 2)
            .attr("height", density + 2)
            .style("fill", function(d){ return d.colour; });

        //Add axes
        var yAxis = d3.svg.axis().scale(heightscale).orient("left");
        yAxisGroup.call(yAxis);
        var xAxis = d3.svg.axis().scale(widthscale).orient("bottom");
        xAxisGroup.call(xAxis);

        //Now bind/find all data points (instances with known classes) on top
        var circles = boundaryGraph.selectAll("circle").data(points);
        //Add all new datapoints
        circles.enter().append("circle")
            .attr("cx", function(d){ return widthscale(d.x); })
            .attr("cy", function(d){ return heightscale(d.y); })
            .attr("r", 5)
            .style("fill", function(d){
                if(d.label == 1) return "dodgerblue";
                return "orangered";
            })
            .style("stroke", "black"); 
       
        //Points somehow removed? Remove them from visualisation 
        circles.exit().remove();
    }

