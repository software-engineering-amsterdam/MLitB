//document.write('<script type="text/javascript" src="../src/mlitb_global_param.js"></script>');
//document.write('<script type="text/javascript" src="../src/mlitb_layer.js"></script>');
//document.write('<script type="text/javascript" src="../src/mlitb_net.js"></script>');

//simple regression neural network using sin function
var x = [0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1];
x = mlitb.dot(x,Math.PI)[0]
var label = (function(x){
	var r = [];
	for (var i in x){
		r.push(Math.sin(x[i]));
	} 
	return r
})(x);

label = mlitb.normalize(label, 0.1, 0.9)

x = [[0,0],[0,1],[1,0],[1,1]]
y = [0, 0, 0, 1]
label = mlitb.normalize(y, 0.1, 0.9)
console.log(x);
console.log(label);

//create network configuration
var conf = []
conf.push({n_neuron : 2})
conf.push({n_neuron : 20, act_fn : 'sigmoid'})
conf.push({n_neuron : 1, act_fn : 'linear'})

//console.log(conf[1].afn);

//create network as many as number of client
//create new mlitb.Net(conf)
var Net = new mlitb.Net();
Net.initWeight(conf);
Net.createLayers(conf);
var SGD = new mlitb.SGD(Net,{learning_rate : 0.25});
for (var i=0; i<1000; i++){
	idx = parseInt((Math.random() * (x.length)), 10); //random index
	console.log("input "+x[idx]);
	//SGD.train([x[idx]], [label[idx]])
	SGD.train(x[idx], [label[idx]])
}
SGD.checkGrad(x[3],[y[3]])

//console.log(mlitb.W);

//console.log(mlitb.zeros(2,4));

//train network