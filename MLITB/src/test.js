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
// console.log(x);
// console.log(label);

var V = new mlitb.Vol(1,1,2, 1);
var FC = new mlitb.FullConnLayer({'in_neurons':2,'num_neurons' : 3});
var FCfw = FC.forward(V);
// console.log(FCfw);
var SIG = new mlitb.SigmoidLayer({'out_sx':1,'out_sy' : 1, 'out_depth' : 3});
var SIGfw = SIG.forward(FCfw);
// console.log(SIGfw);
SIG.V_out.data = [0.5, 0.5, 0.5];
var target = [1.0, 1.0, 1.0];
var SIGbw = SIG.backward(target);
// console.log(SIG.V_in);
// console.log(SIGbw);
var FCbw = FC.backward();
// console.log(FC.weights);
// console.log(FC.V_in);

var inputpool = [1, 1, 2, 2, 3, 
								 0, 0, 0, 0, 0, 
								 1, 1, 1, 1, 1, 
								 0, 0, 0, 0, 0,
								 0, 0, 0, 0, 0, 

								 0, 0, 0, 0, 0, 
								 0, 0, 0, 0, 0, 
								 0, 0, 0, 0, 0, 
								 1, 2, 3, 4, 5,
								 1, 1, 1, 1, 1,]

var Vpool = new mlitb.Vol(5,5,2);

Vpool.data = inputpool;
// console.log(Vpool.get(0,0,0));
// console.log(Vpool.getIndex(1,1,1))
// var pool = new mlitb.PoolLayer({'sx': 2,'in_sx' : 5, 'in_sy':5, 'in_depth': 2, 'stride':1});
// var rp = pool.forward(Vpool)
// console.log(rp.data);

var conv = new mlitb.ConvLayer({'stride':2,'sx':3, 'in_sx':5, 'in_sy' :5, 'in_depth' : 2, 'filters':2});
var start = new Date().getTime();
// for (var i = 0; i < 1000000; i++) {
	// var rc = conv.forward(Vpool);
	// conv.V_out.drv = [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2 ]
// };

// console.log(rc)
// conv.backward()
// console.log(conv.V_in)
// var end = new Date().getTime();
// var time = end - start;
// console.log('Execution time: ' + time);


x = [[0,0],[0,1],[1,0],[1,1]];
y = [0, 0, 0, 1];
y = mlitb.normalize(y, 0.1, 0.9)

var x = [0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1];
x = mlitb.dot(x,Math.PI)[0]
var label = (function(x){
	var r = [];
	for (var i in x){
		r.push(Math.sin(x[i]));
	} 
	return r
})(x);

y = mlitb.normalize(label, 0.1, 0.9)

var conf = []

conf.push({type : 'input', sx : 1, sy:1, depth :1});
conf.push({type : 'fc', num_neurons : 20, activation : 'relu'});
conf.push({type : 'fc', num_neurons : 20, activation : 'relu'});
conf.push({type : 'fc', num_neurons : 1, activation : 'linear'});

var Net = new mlitb.Net();
Net.createLayers(conf);
var SGD = new mlitb.SGDTrainer(Net, {learning_rate : 0.1, batch_size : 1});

for (var i = 0; i < 10000; i++) {
	var idx = Math.floor(Math.random() * 4) + 0;
	// var idx = i%4;
	var xi = x[idx];
	var yi = y[idx];
	var Input = new mlitb.Vol(1,1,1);
	console.log("xi : ");
	console.log(xi);
	console.log("y");
	console.log(yi);
	Input.data = [xi];
	SGD.train(Input,yi);
}
// Net.forward(Vpool);
// Net.backward([1]);