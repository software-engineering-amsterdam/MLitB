    //Visualised data is (step_num, classification loss + L2 weight decay loss)

    //Size of desired canvas for graph
    //In case margins are desired, set them
    var margin = { top:0, right:0, bottom:0, left:0 };
    //Axis and labels take up space we need to take into account
    var axisMargin = { top: 7, left: 50, bottom: 16 };
    var width = 400 - margin.left - margin.right;
    var height = 200 - margin.top - margin.bottom;
    
    //svg container for the graph showing loss
    //apply margins by adding all items to a transformed group
    var graphLoss = d3.select("#graphloss").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
       .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    //The axes need their own groups
    var yAxisGroup = graphLoss.append("g")
        .attr("transform", "translate(" + axisMargin.left + ",0)")
    var xAxisGroup = graphLoss.append("g")
        .attr("transform", "translate(0,"+(height - axisMargin.bottom)+")")
    
    //Create path (line in graph)
    var path = graphLoss.append("path").attr("id", "lossline");
    

    //Function to call when visualised data needs to be updated
    function updateLoss(data){
        //First update scales for new data
        //Function for scaling values minx-maxx to 0-width
        var widthscale = d3.scale.linear()
            .domain(
                [0, d3.max(data, function(d){ return d.x; })])
            .range([axisMargin.left, width - axisMargin.left]);

        //A scale to scale values miny-maxy to 0-height
        var heightscale = d3.scale.linear().domain(
                [d3.max(data, function(d){ return d.y; }),
                 d3.min(data, function(d){ return d.y; })])
            .range([axisMargin.top, height - axisMargin.bottom ]);


        //Add axes
        var yAxis = d3.svg.axis().scale(heightscale).orient("left");
        yAxisGroup.call(yAxis);
        var xAxis = d3.svg.axis().scale(widthscale).orient("bottom");
        xAxisGroup.call(xAxis);

        //Create line
        var lineGenerator = d3.svg.line()
            .x(function(d){ return widthscale(d.x); })
            .y(function(d){ return heightscale(d.y); })
            .interpolate("linear");
        
        path.transition().attr("d", lineGenerator(data));
    }


