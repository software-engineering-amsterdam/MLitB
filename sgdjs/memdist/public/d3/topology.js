//topology visualisation
//todo: check leave behaviour; margin; autoscale; collision detection http://bl.ocks.org/mbostock/3231298 ; sync power latency

top_width = 500;
top_height = 520;
var top_svg = d3.select("#d3vis").append("svg")
    .attr("width", top_width)
    .attr("height", top_height)
    .attr("border", 1);
/*
var borderPath = top_svg.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("height", top_height)
    .attr("width", top_width)
    .style("stroke", 'black')
    .style("fill", "none")
    .style("stroke-width", 1);
*/
//start graphcode
var force = d3.layout.force()
    .size([top_width, top_height])
    .charge(-60)
    .on("tick", tick);

var nodes = force.nodes(),
    node = top_svg.selectAll(".node");


var top_r_scale = d3.scale.linear()
    .domain([0,100]).range([10,25]);

//latencies 0 - 200 get increasingly bad saturation
var top_c_scale = d3.scale.linear()
    .domain([0,200]).range([1,0.2]);


powers = [0]
//no race condition as each function is atomic
function savePower(pows){
    powers = pows.slice(0); //copies the array by value
}

//used for random colors
var color = d3.scale.category20();

//legends
//saturation
xmarg = 100
ymarg = 100
radmarg = 10
top_svg.append("circle")
    .attr("cx", top_height - xmarg).attr("cy", top_width - ymarg)
    .attr("r", radmarg)
    .attr("fill", function(d,i){col = d3.hsl("red"); col.s = top_c_scale(0); return col;});

top_svg.append("text")
    .attr("x", top_height - xmarg + radmarg + 2).attr("y", top_width - ymarg + (1/2) * radmarg)
    .text("0")

top_svg.append("circle")
    .attr("cx", top_height - xmarg + 33).attr("cy", top_width - ymarg)
    .attr("r", 10)
    .attr("fill", function(d,i){col = d3.hsl("red"); col.s = top_c_scale(200); return col;});

top_svg.append("text")
    .attr("x", top_height  - xmarg + radmarg + 35 ).attr("y", top_width - ymarg + (1/2) * radmarg)
    .text("200+")

top_svg.append("text")
    .attr("x", top_height - xmarg - radmarg - 90).attr("y", top_width - ymarg + (1 / 2) * radmarg)
    .text("latency (ms):")

//power
top_svg.append("text")
    .attr("x", top_height - xmarg - radmarg - 90).attr("y", top_width - ymarg + 2*radmarg)
    .text("relative radius is relative")
top_svg.append("text")
    .attr("x", top_height - xmarg - radmarg - 80).attr("y", top_width - ymarg + 3*radmarg)
    .text("power (vectors/s)")

function drawTopology(latencies){
    //node = top_svg.selectAll(".node");
    //topology colour and radius scales
    top_r_scale.domain(d3.extent(powers));

    //remove any nodes no longer necessary
    diff = nodes.length - latencies.length;
    if(diff > 0){
        nodes.splice(latencies.length, diff)
    }
    //nodes = nodes.slice(0, d3.min([latencies.length, nodes.length]));
    //update latencies of known 
    for(i = 0; i < nodes.length; i++){
        nodes[i].c = latencies[i];
        if(i < powers.length)
            nodes[i].r = powers[i];
        else
            nodes[i].r = 0
    }
    for(; i < latencies.length; i++){
        if(i < powers.length)
        //if(typeof powers[i] != 'undefined')
            rad = powers[i];
        else
            rad = 0


        nodes.push({x: Math.random() * top_width, y: Math.random * top_height, 
            c:latencies[i], r:rad});
    }

    node = node.data(nodes);

    node.enter().append("circle")
        .attr("class", "node")
        .attr("r", function(d){ return top_r_scale(d.r); })
        .attr("fill", function(d,i){col = d3.hsl(color(i)); col.s = top_c_scale(d.c); return col;})
        .call(force.drag);

    node.transition().duration(500)
        .attr("r", function(d){ return top_r_scale(d.r); })
        .attr("fill", function(d,i){col = d3.hsl(color(i)); col.s = top_c_scale(d.c); return col;});
//        .attr("fill", 
 //           d3.rgb( function(d){ alert('test');console.log(d.c);return top_c_scale(d.c); },
   //         function(d){ return top_c_scale(d.c); },
     //       function(d){ return top_c_scale(d.c); }));
            //"black");

    node.exit().transition().duration(500).attr("r", 0).remove();
      
    force.start();

    //temp sanity check
    //console.log(latencies)
}


function tick() {
    node.each(collide(.5))
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
}

function collide(node) {
  var r = node.radius + 16,
      nx1 = node.x - r,
      nx2 = node.x + r,
      ny1 = node.y - r,
      ny2 = node.y + r;
  return function(quad, x1, y1, x2, y2) {
    if (quad.point && (quad.point !== node)) {
      var x = node.x - quad.point.x,
          y = node.y - quad.point.y,
          l = Math.sqrt(x * x + y * y),
          r = node.radius + quad.point.radius;
      if (l < r) {
        l = (l - r) / l * .5;
        node.x -= x *= l;
        node.y -= y *= l;
        quad.point.x += x;
        quad.point.y += y;
      }
    }
    return x1 > nx2
        || x2 < nx1
        || y1 > ny2
        || y2 < ny1;
  };
}

//test code   d3.select("body").append("svg").attr("width", 50).attr("height", 50).append("circle").attr("cx", 25).attr("cy", 25).attr("r", 25).style("fill", "purple");
