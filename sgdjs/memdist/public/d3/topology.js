//topology visualisation
//todo: check leave behaviour; margin; autoscale; collision detection http://bl.ocks.org/mbostock/3231298 ; sync power latency

top_width = 500;
top_height = 400;
var top_svg = d3.select("#d3vis").append("svg")
    .attr("width", top_width)
    .attr("height", top_height)
    .attr("border", 1);

var borderPath = top_svg.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("height", top_height)
    .attr("width", top_width)
    .style("stroke", 'black')
    .style("fill", "none")
    .style("stroke-width", 1);

//start graphcode
var force = d3.layout.force()
    .size([top_width, top_height])
    .charge(-60)
    .on("tick", tick);

var nodes = force.nodes(),
    node = top_svg.selectAll(".node");


var top_r_scale = d3.scale.linear()
    .domain([0,100]).range([10,25]);

var top_c_scale = d3.scale.linear()
    .domain([0,100]).range([200,0]);

function savePower(pows){
//    a = pows.slice(0)
//    top_r_scale.domain(d3.extent(pows));
//    console.log(a)
//    console.log(a[0])
//    top_svg.selectAll("circle").transition().duration(500).attr("r",
//        function(d,i){ console.log(pows[i]);return top_r_scale(pows[i]); });
}

////alert(data.clients.toString());
function drawTopology(latencies){
    //node = top_svg.selectAll(".node");
    top_c_scale.domain(d3.extent(latencies));
    top_r_scale.domain(d3.extent(latencies));

    //remove any nodes no longer necessary
    diff = nodes.length - latencies.length;
    if(diff > 0){
        nodes.splice(nodes.length, diff)
    }
    //nodes = nodes.slice(0, d3.min([latencies.length, nodes.length]));
    //update latencies of known 
    for(i = 0; i < nodes.length; i++){
        nodes[i].c = latencies[i];
    }
    for(; i < latencies.length; i++)
        nodes.push({x: Math.random() * top_width, y: Math.random * top_height, 
            c:latencies[i]});


    node = node.data(nodes);

    //random colors
    var color = d3.scale.category20();

    node.enter().append("circle")
        .attr("class", "node")
        .attr("r", function(d){ return top_r_scale(d.c); })
        .attr("fill", function(d,i){return color(i);})
        .call(force.drag);

    node.transition().duration(500)
        .attr("r", function(d){ return top_r_scale(d.c); })
//        .attr("fill", 
 //           d3.rgb( function(d){ alert('test');console.log(d.c);return top_c_scale(d.c); },
   //         function(d){ return top_c_scale(d.c); },
     //       function(d){ return top_c_scale(d.c); }));
            //"black");

    node.exit().transition().duration(500).attr("r", 0).remove();
      
    force.start();

    //temp sanity check
    console.log(latencies)
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
