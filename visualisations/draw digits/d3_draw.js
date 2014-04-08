    //Size of desired canvas for graph
    //In case margins are desired, set them
    var margind = { top:0, right:0, bottom:0, left:0 };
    //Axis and labels take up space we need to take into account
    var axisMargind = { top: 0, left: 0, bottom: 0, right: 0 };
    var widthd = 200 - margind.left - margind.right;
    var heightd = 200 - margind.top - margind.bottom;

    var strokewidth = widthd / 24;
    //scale that gives an integer 0 - 24 depending on the continuous
    //value; used to translate mouse position to sample's array
    //position. currently assumes a nxn width/height
    var drawscale = d3.scale.linear().domain([0, widthd]).rangeRound([0, 23]);
    
    var LINE = 0, GRID = 1;
    var drawmode = GRID;
    var sample = new convnetjs.Vol(24,24,1,0.0);
    
    //svg container for the graph showing loss
    //apply margins by adding all items to a transformed group
    var drawSvg = d3.select("#drawdiv").append("svg")
        .attr("width", widthd + margind.left + margind.right)
        .attr("height", heightd + margind.top + margind.bottom)
        .style("border", "1px solid black")
        .on("mousedown", function(){
            if(drawmode === LINE) startpathtracking();
             })
        .on("mouseup", function(){
            if(drawmode === LINE) stoppathtracking();
            })
    drawSvg.append("rect").attr("x", 0).attr("y", 0)
        .attr("width", widthd + margind.left + margind.right)
        .attr("height", heightd + margind.top + margind.bottom)
        .style("fill", "steelblue");
    var drawGroup = drawSvg.append("g")
        .attr("transform", "translate(" + margind.left + "," + margind.top + ")")
    //svg for clear button
    widthd2 = 24
    var clearSvg = d3.select("#drawdiv").append("svg")
        .attr("width", widthd2)
        .attr("height", widthd2)
        .style("border", "1px solid lightgrey")
        .on("click", clearDrawing);
    clearSvg.append("line")
        .attr("x1", 4).attr("y1", 4)
        .attr("x2", 20).attr("y2", 20)
        .attr("stroke", "red")
        .attr("stroke-width", 5);
    clearSvg.append("line")
        .attr("x1", 20).attr("y1", 4)
        .attr("x2", 4).attr("y2", 20)
        .attr("stroke", "red")
        .attr("stroke-width", 5);

    offsetx = 10
    offsety = 110
    var probsSvg = d3.select("#drawdiv").append("svg")
        .attr("id", "probssvg")
        .attr("width", widthd).attr("height", heightd);
//    probsSvg.append("text").text("Probabilities not calculated yet")
//        .attr("x",offsetx).attr("y",offsety);

    //add labels sometime after net is created
    setTimeout(function() {
        probs = probsSvg.selectAll(".lables").data(d3.range(net.layers[net.layers.length - 1].out_depth));
        probs.enter().append("text")
            .attr("class", "lables")
            .attr("x", function(d){ return offsetx; })
            .attr("y", function(d){ return d * 10 + offsety; })
            .text(function(d){ return "Prob class " + d + ": "; });
    }, 3000);

    //initialise some stuff for keeping track of all paths drawn
    //two draw modes possible: line and grid
    //line is drawn such as the user draws;
    //grid as the sample that is actually made

    //array with integer values 0 - 23
//    intarray = [];
  //  for (i = 0; i < 24; i++) {
    //    intarray[i] = i;
    //}
    

    //start linemode code
        //line and path related stuff is for line draw mode
        var lineFunction = d3.svg.line()
            .x(function(d) { return d.x; })
            .y(function(d) { return d.y; })
            .interpolate("linear");

        var currentPath = -1
        pathdata = []

        var refreshIntervalId = -1
        function clearDrawing(){
            //initialise 24x24x1 example to 0.0's
            sample = new convnetjs.Vol(24,24,1,0.0);
            if(drawmode === LINE) drawSvg.selectAll("path").remove();
            else{
                drawSvg.selectAll(".gridcell").remove();
                initialiseGrid();
            }
        }

        //-> 24x24: 576 values 0 - 1 where 1 is a drawn pixel
        //possible todo: make it 4 random subcrops of a 28x28 image

        var curpathdata = []
        //on click
        function startpathtracking(){
            curpathdata = []
            currentPath = drawSvg.append("path")
                .attr("stroke", "black")
                .attr("fill", "none")
                .attr("stroke-width", strokewidth);
 
            drawSvg.on("mousemove", pathtracker);
            //the draw function updates every once in a while until
            //the user is done drawing
            refreshIntervalId = setInterval(drawPath, 50)
        }

        //update line attribute, ie redraw line with newest info
        function drawPath(){
            currentPath.attr("d", lineFunction(curpathdata));
        }

        //on mouse move, store current location for both drawing and
        //the sample
        function pathtracker(){
            var m = d3.mouse(this);
            curpathdata.push({x: m[0], y: m[1]})
            samplePoint(drawscale(m[0]), drawscale(m[1]))
        }

        //when mouse is released, stop the continuous functions
        function stoppathtracking(){
            drawSvg.on("mousemove", null);
            //no longer need to update drawing
            clearInterval(refreshIntervalId);
        }


    function samplePoint(i, j, shift){
        sample.w[i + j * 24] = 1 - shift;
            //If room above, add a pixel there
            if(j > 0)
                sample.w[i + (j-1) * 24] = 1 - shift;
            //As above, so below
            if(j < 23)
                sample.w[i + (j+1) * 24] = 1 - shift;
            if(i > 0)
                sample.w[i - 1 + j * 24] = 1 - shift;
            if(i < 23)
                sample.w[i + 1 + j * 24] = 1 - shift;
//add check which button was pressed
    }

    gridColour = ["black", "lightgrey"];
    function drawgridPoint(i,j,shift){

        rectbackground[i + j * 24].style("fill", gridColour[shift]);
            //If room above, add a pixel there
            if(j > 0)
                rectbackground[i + (j-1) * 24].style("fill", gridColour[shift]);
            //So above, so below
            if(j < 23)
                rectbackground[i + (j+1) * 24].style("fill", gridColour[shift]);
            if(i > 0)
                rectbackground[i - 1 + j * 24].style("fill", gridColour[shift]);
            if(i < 23)
                rectbackground[i + 1 + j * 24].style("fill", gridColour[shift]);
    }

    setInterval(updateProbabilities, 1000);

    //start gridmode code

    //test if mouse is down;
    //this is done alternatively than sometimes suggested, has different problms
    var mouseDown = 0;
    var shiftDown = 0;
    
    document.body.onmousedown = function(e){
        if(e.shiftKey) shiftDown = 1
        mouseDown = 1;
    }
    document.body.onmouseup = function(e){
        if(e.shiftKey) shiftDown = 0
        mouseDown = 0;
    }

    //background is 26x26 rectangles whose colours can change;
    //create and store rectangles
    var rectbackground = []
    var boxsize = widthd / 24
    if(drawmode===GRID)
        initialiseGrid()

    function initialiseGrid(){
        rectbackground = []
        for(j = 0; j < 24; j++){
            for(i = 0; i < 24; i++){
                rect = drawGroup.append("rect")
                        .attr("class", "gridcell")
                        .attr("x", i * boxsize)
                        .attr("y", j * boxsize)
                        .attr("indexx", i)
                        .attr("indexy", j)
                        .attr("width", boxsize)
                        .attr("height", boxsize)
                        .style("fill", "lightgrey")
                        .on("mouseover", function(){
                            i = parseInt(d3.select(this).attr("indexx"))
                            j = parseInt(d3.select(this).attr("indexy"))
                            if(mouseDown){ 
                                samplePoint(i, j, shiftDown);
                                drawgridPoint(i, j, shiftDown);
                            }
                        });
                rectbackground.push(rect);
            }
        }
    } 

    //set the x.w[] values for the sample
    //alt click
    //clear; forward; print top3 results; onclick just add a point

    function updateProbabilities(){
        if(!('undefined' === typeof net)){
            net.forward(sample, false);
    //    if(net.layers[net.layers.length - 1].out_act === undefined) {
      //      return;
        //}
            probs = probsSvg.selectAll(".probs").data(net.layers[net.layers.length - 1].out_act.w);
            probs.text(function(d){ return d; });
            probs.enter().append("text")
                .attr("class", "probs")
                .attr("x", function(d){ return offsetx + 70; })
                .attr("y", function(d, i){ return i * 10 + offsety; })
                .text(function(d){ return d; });
        }
    }
