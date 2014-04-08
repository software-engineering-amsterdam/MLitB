    //bn in name stands for basicnet; to avoid re-using var names
    //In case margins are desired, set them
    var emptyMarginbn = { top:0, right:0, bottom:0, left:0 };
    //Axis and labels take up space we need to take into account:
    //graph should not yet be drawn where the numbers start
    var axisMarginbn = { top: 0, left: 0, bottom: 0, right: 0 };
    //Total margin
    var marginbn = { top:emptyMarginbn.top + axisMarginbn.top,
        bottom:emptyMarginbn.bottom + axisMarginbn.bottom,
        right:emptyMarginbn.right + axisMarginbn.right,
        left:emptyMarginbn.left + axisMarginbn.left };

    var widthbn = 1000 - marginbn.left - marginbn.right;
    var heightbn = 600 - marginbn.top - marginbn.bottom;
    
    //svg container for the graph showing decision boundaries
    //apply margins by adding all items to a transformed group
    var basicnet = d3.select("#basicnet").append("svg")
        .attr("width", widthbn + marginbn.left + marginbn.right)
        .attr("height", heightbn + marginbn.top + marginbn.bottom)
       .append("g")
        .attr("transform", "translate(" + emptyMarginbn.left + "," + emptyMarginbn.top + ")");

    var nodeboxw = 150;
    var nodeinfo = d3.select("#basicnet").append("svg")
        .attr("width", nodeboxw).attr("height", nodeboxw)
        .style("border", "1px solid black")
        

    updateBNet();


    //Keep calling whenever we want to draw difference in weights/activations
    function updateBNet(){
        console.log('UpdateBNet');

        //Forward to get proper activation values
        var netx = new convnetjs.Vol(1,1,2);
        netx.w[0] = points[points.length - 1].x;
        netx.w[1] = points[points.length - 1].y;
        var a = net.forward(netx, false);
        
        //Loop through layers
        var nlayers = net.layers.length;
        //max nodes in any one layer
        var maxnodes = d3.max(net.layers, function(d){ return d.out_depth; });

        //Set up scales
        var heightscalebn = d3.scale.linear().domain([-1, maxnodes])
            .range([axisMarginbn.top, heightbn - axisMarginbn.bottom]);
        var widthscalebn = d3.scale.linear().domain([-1, net.layers.length])
            .range([axisMarginbn.left, widthbn - axisMarginbn.left]);

        //how large a node could be and without overlapping with others
        //(only considers height! once they overlap in width you can't see
        //much anyway and need to zoom out)
        var nodewidth = 0.5 * (heightscalebn(2) - heightscalebn(1));
        

        for(var i = 0; i < nlayers; i++) {
            var L = net.layers[i];

            //nodes in layer get sized depending on their value
            var sizescale = d3.scale.linear().domain(
                d3.extent(L.out_act.w, function(d){ return Math.abs(d); }))
                .range([0.4 * nodewidth, 1 * nodewidth]);
            
            //scale for weights in this layer
            var weightscale = -1
            if(L.layer_type==='fc'){
                weightscale = d3.scale.linear().domain([ 
                    d3.max(L.filters, function(d){ return d3.max(d.w, function(d){ return Math.abs(d);}) }),
                    d3.min(L.filters, function(d){ return d3.min(d.w, function(d){ return Math.abs(d); }) })])
                    .range([3, 0]);
            }
            if(L.layer_type==='relu' || L.layer_type==='softmax'){
                weightscale = d3.scale.linear()
                    .domain(d3.extent(L.in_act.w, function(d){
                        return Math.abs(d);
                    })).range([0, 3]);
            }

            

        
        

            //check type and draw accordingly (from this we can infer weight
            //structure)
          //  console.log(L);

            //Every layer will get its own g and id in first iteration
            if(basicnet.select("#layer"+i).empty()){
                //a group for all weights so that they are drawn on the
                //background
                var weightlayer = basicnet.insert("g", ":first-child").attr("id", 'weightgroup' + i);
                //placeholder in case no other elements are present in layer
                //and we want to randomly select a child
                weightlayer.append("rect");
                //node layer
                var layer = basicnet.append("g").attr("id", 'layer' + i);

                
                //add bias node once; doesnt need to change weights
                if(L.layer_type==='fc'){
                    layer.append("circle")
                    .attr("cx", widthscalebn(i - 0.5))
                    .attr("cy", heightscalebn(maxnodes - 1))
                    .attr("r", 10)
                    .style("stroke", "purple") 
                    .style("fill", "lightpink");
                }
            }
            else{
                var weightlayer = basicnet.select('#weightgroup' + i);
                var layer = basicnet.select("#layer"+i);
            }
            
            //L.out_act.w is
            layer.attr("class",L.layer_type);
            
            //should probably treat different layers differently
//            if(L.layer_type==='input'){

            
            //should probably treat different layers differently in some cases
            //fc should be seperate due to assumption of having ? can we just
            //put it around L.filters and biases?
            if(L.layer_type==='fc' || L.layer_type==='relu' || L.layer_type==='softmax'){
                for(j = 0; j < L.out_depth; j++){
                    if(L.layer_type==='fc')
                    weights = weightlayer.selectAll(".weight" + j).data(L.filters[j].w)
                    else
                        weights = weightlayer.selectAll(".weight" + j).data([L.in_act.w[j]]);

                    //adjust
                    weights.attr("stroke-width", function(d) { 
                        if(L.layer_type==='fc') return weightscale(Math.abs(d));
                        return 1; })
                       .attr("stroke", function(d){
                        if(L.layer_type==='fc' && d < 0) return "hotpink";
                            return "lightpink"});
                  
 /* a failed attempt at randomly inserting them so that there is less visual
    bias on the strength of node weights going to the bottom nodes of a layer
    .insert("line", function(d, i) {

                            windex = Math.floor(Math.random() * (i+1));
                            wvalue = weightlayer.select(":nth-child("+windex+")");
                            console.log(wvalue);
                            if(wvalue.empty()) return "#bollocks";
                            //console.log(":nth-child("+windex+")")
                            return weightlayer.select(":nth-child("+windex+")");
                            return ":nth-child("+windex+")";
                            })
    
    
    
    attempt2
         //.append("line")
                        .insert("line", 
                            d3.select(this)
                            d3.select(":nth-child("+
                            (1 + Math.floor(Math.random() * (d3.select(this)[0][0].childElementCount)))
                            +")")
                        )
                    
    */
                    //first enter() should create a unit for every output node
                    weights.enter()
                        //.append("line")
                        .insert("line", function(d) {
                            layer2 = d3.select(this);
                            windex = 1 + Math.floor(Math.random() * (layer2[0][0].childElementCount));
                            return layer2.select(":nth-child("+windex+")").node()
                        })
                        .attr("class", "weight" + j)
                        .attr("x1", widthscalebn(i - 1))
                        .attr("y1", function(d, index){ 
                            if(L.layer_type==='fc')
                                return (maxnodes / (1 + net.layers[i - 1].out_act.w.length)) * heightscalebn(index);
                            else if(L.layer_type==='relu' || L.layer_type==='softmax')
                                return (maxnodes / (1 + net.layers[i - 1].out_act.w.length)) * heightscalebn(j);

                                })
                        .attr("x2", widthscalebn(i))
                        .attr("y2", function(d, index){ return (maxnodes / (1 + L.out_act.w.length)) * heightscalebn(j); })
                        .attr("stroke-width", function(d) { 
                            if(L.layer_type==='fc') return weightscale(Math.abs(d));
                            return 1;})
                        .attr("stroke", function(d) {
                            if(d < 0 && L.layer_type==='fc') return "hotpink";
                            return "lightpink"});

                    weights.exit().remove();
           if(L.layer_type==='fc') 
                var biases = weightlayer.selectAll(".bias" + j).data([L.biases.w[j]]);
                if(L.layer_type==='fc')
                biases.enter()
                        //biases not most interesting; put on background
                        .insert("line", ":first-child")
                        .attr("class", "bias" + j)
                        .attr("x1", widthscalebn(i - 0.5))
                        .attr("y1", function(d, index){ return heightscalebn(maxnodes - 1); })
                        .attr("x2", widthscalebn(i))
                        .attr("y2", function(d, index){ return (maxnodes / (1 + L.out_act.w.length)) * heightscalebn(j); })
                        .attr("stroke-width", function(d) { return weightscale(Math.abs(d)) })
                        .attr("stroke", function(d) {
                            if(d > 0) return "hotpink";
                            return "violet"});

                }
            }
            

                
                var nodes = layer.selectAll(".node").data(L.out_act.w);
                
                //adjustments
                //TODO refactor colour selection into function
                nodes.attr("r", function(d){ return sizescale(Math.abs(d)); })
                    .style("fill", function(d){
                        if(L.layer_type==='fc' && d < 0) return "hotpink";
                            return "lightpink"});
                //new nodes
                nodes.enter().append("circle")
                    .attr("id", function(d, index) { return i + " " + index; })
                    .attr("class", "node")
                    .attr("cx", widthscalebn(i))
                    .attr("cy", function(d, i){ return (maxnodes / (1 + L.out_act.w.length)) * heightscalebn(i); })
                    .attr("r", function(d){ return sizescale(Math.abs(d)); })
                    //with stroke there can be slight overlap between nodes
                    .style("stroke", "purple")
                    .style("fill", function(d){
                        if(d >0) return "lightpink";
                        return "hotpink"})
                    .on("click", nodeClick);
                //removements (untested
                nodes.exit().remove();
  //          }

            if(i == nlayers - 1){
                probs = basicnet.selectAll("text").data(L.out_act.w);
                probs.text(function(d, i) { return d; })
                probs.enter()
                    .append("text")
                    .attr("x", widthscalebn(i) + nodewidth + 10)
                    .attr("y", function(d, i){ return (maxnodes / (1 + L.out_act.w.length)) * heightscalebn(i) + 3; })
                    .text(function(d, i) { return d; })
                    .style("font", "10px sans-serif")
               }
        }
    }

    function nodeClick(){
        //[layerid, nodeid for that layer]
        identify = d3.select(this).attr("id").split(" ")
        console.log(identify)
        infodata = nodeinfo.selectAll("text").data([identify]);

        infodata.enter().append("text").attr("x", 0).attr("y", 15)

        //both the new ones and old
        infodata.text(function(d){ return "layer " + d[0] + " node " + d[1] })
    }
