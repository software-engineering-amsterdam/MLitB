var mlitb = mlitb || { REVISION: 'ALPHA' };
(function(global){
	global.W = [];
})(mlitb);
(function (global) {
	var clone = function (a) {
		var result = [];
		if (typeof a[0].length === 'undefined' && typeof a.length ==='number'){
			for (var i=0 ; i< a.length ; i++){
				result[i] = a[i];
			}
			return result;
		} else if (typeof a[0].length === 'number'){
			for (var i=0;i<a.length; i++){
				result[i] = []
				for (var j=0; j<a[0].length; j++)
					result[i][j] = a[i][j]
			}
			return result;
		}
		
	}
	var zero = function (n, getVal) {
		var res = [];
		for (var i = 0; i < n; i++) {
			res[i]=getVal();
		}
		return res;
	}
	var zeros = function (m,n, opt) {
		var test = typeof n == 'number' ? opt : n;
		var getVal = {};
		if (typeof test === 'undefined' || test === 'zero')
			getVal = function () {return 0;}
		else if (test === 'random')
			getVal = function () {return Math.random();}

		if (typeof n === 'number'){
			var res = [];
			for (var i = 0; i < m; i++)
				res[i] = zero(n,getVal)
			return res;	
		} else
			return zero(m, getVal);
	}

	var add = function (A, B) {
		if (typeof A === 'object' && typeof B === 'object'){
			var sa = size(A);
			var sb = size(B);
			
			if (sa[0] === sb[0] && sa[1] === sb[1]){
				var res = [];
				for (var i = 0; i < sa[0]; i++) {
					res[i] = [];
					for (var j = 0; j< sa[1]; j++)
						res[i][j] = A[i][j]+B[i][j];
				}
				return res;
			} else {
				console.log('ERROR!! matrix dimension does not match');
			}
		}else if (typeof A === 'object' && typeof B === 'number'){
			var sa = size(A);
			var res = [];
			for (var i = 0; i < sa[0]; i++) {
				res[i]=[];
				for (var j = 0; j < sa[1]; j++) {
					res[i][j] = A[i][j] + B;
				};
			}
			return res;
		}
	}

	var dot = function(m1, m2, opt){
		if (typeof m1==='number' && typeof m2==='number')
			return m1*m2
		else if (typeof m1==='object' && typeof m2 === 'number'){
			var m1 = typeof m1[0].length == 'undefined' ? [m1] : m1;	
			var res = [];
			for (var i = 0; i < m1.length; i++) {
				res[i] = [];
				for (var j = 0; j < m1[0].length; j++) {
					res[i][j] = m1[i][j]*m2;
				}
			}
			return res;
		} else {
			var m1 = typeof m1[0].length == 'undefined' ? [m1] : m1;
			var m2 = typeof m2[0].length == 'undefined' ? [m2] : m2;
			var s1 = size(m1);
			var s2 = size(m2);

			if (typeof opt === 'undefined' && s1[1] !== s2[0]) {
				console.log('ERROR!! matrix dimension does not match');
			} else if (opt === 'r' && s1[1] !== s2[1]) { //multiply with transposed right matrix
				console.log('ERROR!! matrix dimension does not match');
			} else if (opt === 'l' && s1[0] !== s2[0]) { //multiply with transposed left matrix
				console.log('ERROR!! matrix dimension does not match');
			} else{
				var result = [];
				var p = opt === 'l' ? s1[1] : s1[0];
				var q = opt === 'r'? s2[0] : s2[1];
				var r = opt === 'l' ? s1[0] : s1[1];
				if (typeof opt === 'undefined')
					var getDot = function(m1,m2,i,j,k){return m1[i][k] * m2[k][j];}
				else if (opt === 'r') 
					var getDot = function(m1,m2,i,j,k){return m1[i][k] * m2[j][k];}
				else if (opt === 'l')
					var getDot = function(m1,m2,i,j,k){return m1[k][i] * m2[k][j];}
    		for (var i = 0; i < p; i++) {
        	result[i] = [];
        	for (var j = 0; j < q; j++) {
        		var sum = 0;
        		for (var k = 0; k < r; k++) {
        			sum += getDot(m1,m2,i,j,k)
        		}
        		result[i][j] = sum;
        	}
    		}
    		return result.length === 1 ? result[0] : result; 
			}
		}
	}

	var size = function (m) {
		var m = typeof m[0].length == 'undefined' ? [m] : m
		return [m.length, m[0].length];
	}

	var normalize = function (arr, LB, UB) {
		var max = Math.max.apply(null, arr);
		var min = Math.min.apply(null, arr);
		var result = []
		for (var i=0; i<arr.length; i++){
			result.push((arr[i] - min)/(max - min)*(UB - LB)+LB)
		}
		return result
	}

	var checkGrad = function () {
		// body...
	}

	global.zeros = zeros;
	global.dot = dot;
	global.add = add;
	global.normalize = normalize;
	global.clone = clone;
})(mlitb);
(function (global) {
	var fw_fn =  {
		sigmoid : function (a) {
			return 1/(1+Math.exp(-a));
		},

		sigmoid_bipolar : function (a) {
			return -1 + 2/(1 + Math.exp(-a));
		},

		linear : function (a) {
			return a
		}
	}

	var bw_fn = {
		sigmoid : function (a) {
			return (1/(1+Math.exp(-a)))*(1-1/(1+Math.exp(-a)));
		},

		sigmoid_bipolar : function (a) {
			return 0.5 * (1 + (-1 + 2/(1 + Math.exp(-a)))) * (1 - (-1 + 2/(1 + Math.exp(-a))) );
		},

		linear : function (a) {
			return 1
		}
	}

	global.fw_fn = fw_fn;
	global.bw_fn = bw_fn;
})(mlitb);
(function(global){
	var InputLayer = function (conf) {
		this.n_neuron = conf.n_neuron;
		this.outs = global.zeros(this.n_neuron);
	}

	InputLayer.prototype = {
		forward : function (conf) {
			//assume we got W from server
		},

		backward : function (conf) {
			// body...
		}
	}

	var HiddenLayer = function (conf) {
		this.n_neuron = conf.n_neuron;
		this.act_fn = conf.act_fn;
		//this.outs = global.zeros(this.n_neuron);
	}

	HiddenLayer.prototype = {
		forward : function () {
			//put this.in into activation function
			this.outs = []
			for (var i = 0; i < this.n_neuron; i++) {
				this.outs[i] = global.fw_fn[this.act_fn](this.ins[i]);
			};
			this.outs.push(1); //add a bias

		},

		backward : function () {
			this.delta = [];
			//this.err = [];
			for (var i = 0; i < this.n_neuron; i++) {
			//for (var i = 0; i < this.n_neuron+1; i++) { //-------------------------
				this.delta[i] = this.back_in[i]*global.bw_fn[this.act_fn](this.outs[i]);
			};
		}
	}

	var OutputLayer = function (conf) {
		this.n_neuron = conf.n_neuron;
		this.act_fn = conf.act_fn;
		this.outs = global.zeros(this.n_neuron);
	}

	OutputLayer.prototype = {
		forward : function (conf) {
			for (var i = 0; i < this.n_neuron; i++) {
				this.outs[i] = global.fw_fn[this.act_fn](this.ins[i]);
			};
			//console.log("output "+this.outs);
		},

		backward : function (t) {
			//console.log("target "+t);
			this.delta = [];
			this.err = 0
			for (var i = 0; i < this.n_neuron; i++) {
				console.log("output "+this.outs[i]);
				console.log("error "+(t[i]-this.outs[i]));
				this.err = this.err + 0.5*Math.pow((t[i]-this.outs[i]),2)
				this.delta[i] = (t[i]-this.outs[i])*global.bw_fn[this.act_fn](this.outs[i])
			};
		}
	}

	global.InputLayer = InputLayer;
	global.HiddenLayer = HiddenLayer;
	global.OutputLayer = OutputLayer;

})(mlitb);
(function(global){
	var Net = function () {
		this.layers = [];
		
	}
	Net.prototype = {
		initWeight : function (conf) {
			//initiate weight connecting each layer, now assume full connected
			//number of weight matrices are n_layer -1
			for (var i=0; i<conf.length-1;i++){
				//weight matrix dimesnion = n_neuron in layer i times n_neuron in layer i+1
				//global.W.push(global.zeros(conf[i].n_neuron,conf[i+1].n_neuron, 'random'));
				global.W.push(global.zeros(conf[i].n_neuron+1,conf[i+1].n_neuron, 'random')); //--------------------------------
			}
		},
		createLayers : function (conf) {
			for (var i = 0; i < conf.length; i++) {
				if (i == 0) //input layer
					this.layers.push(new global.InputLayer(conf[i]));
				else if (i == conf.length-1) //output layer
					this.layers.push(new global.OutputLayer(conf[i]));
				else
					this.layers.push(new global.HiddenLayer(conf[i]));
			};
		},

		forward : function (X) {
			//when the data is augmented into input layer?
			var W = global.W;
			this.layers[0].outs = global.clone(X)
			this.layers[0].outs.push(1) //add bias for input ------------------------------------------
			for (var i = 0; i < this.layers.length-1; i++) {
				console.log("W ");
				console.log(W[i]);

				this.layers[i+1].ins = global.dot(this.layers[i].outs, W[i]);
				this.layers[i+1].forward();
				console.log("outs ");
				console.log(this.layers[i+1].outs);
			};
		},

		backward : function (Y) {
			var W = global.W;
			this.der = global.zeros(global.W.length)
			console.log("target "+Y);
			//this.layers[this.layers.length-1].backward(Y)
			//this.layers[this.layers.length-2].back_in = global.dot(this.layers[this.layers.length-1].delta, W[this.layers.length-2],'r'); //delta * w
			for (var i = this.layers.length - 1; i > 0; i--) {
				this.layers[i].backward(Y);
				//console.log(global.dot(this.layers[i].delta, W[i-1],'r'));
				this.layers[i-1].back_in = global.dot(this.layers[i].delta, W[i-1],'r'); //delta * w
				this.der[i-1] = global.dot(this.layers[i-1].outs, this.layers[i].delta, 'l'); //delta * z
			};
		}
	}
	global.Net = Net;
})(mlitb);
(function (global) {
	var SGD = function (net, conf) {
		this.net = net
		this.learning_rate = typeof conf.learning_rate !== 'undefined' ? conf.learning_rate : 0.01;
    	//this.l1_decay = typeof conf.l1_decay !== 'undefined' ? conf.l1_decay : 0.0;
    	//this.l2_decay = typeof conf.l2_decay !== 'undefined' ? conf.l2_decay : 0.0;
    	//this.batch_size = typeof conf.batch_size !== 'undefined' ? conf.batch_size : 1;
    	//this.momentum = typeof conf.momentum !== 'undefined' ? conf.momentum : 0.9;

    	//if(typeof conf.momentum !== 'undefined') this.momentum = conf.momentum;
    	this.k = 0; // iteration counter

    	this.last_gs = []; // last iteration gradients (used for momentum calculations)
	}

	SGD.prototype =  {
		train : function (x, y) {
			this.net.forward(x)
			this.net.backward(y)

			for (var i = 0; i<this.net.der.length;i++){
				//console.log("derivative ke "+i);
				//console.log(this.net.der[i]);
				//console.log("weight before ");
				//console.log(global.W[i]);
				global.W[i]=mlitb.add(global.W[i], mlitb.dot(this.net.der[i],this.learning_rate))
				//console.log("weight after ");
				//console.log(global.W[i]);
				//console.log("Der "+i+" "+this.net.der[i]);
			}
		},

		checkGrad : function (x, y) {

			this.net.forward(x)
			var curW = []
			var curDW = []
			for (var i = 0; i<global.W.length; i++){
				curW[i] = global.clone(global.W[i]);
			}
			console.log("current W");
			console.log(curW);
			this.net.backward(y)
			var err1 = this.net.layers[this.net.layers.length-1].err
			console.log("error");
			console.log(err1);
			for (var i = 0; i<global.W.length; i++){
				curDW[i] = global.clone(this.net.der[i]);
			}
			console.log("derivative");
			console.log(curDW);
			console.log("adding epsilon to current W");
			
			var epsilon =0.00001;
			global.W[0][0][0] = global.W[0][0][0] + epsilon;
			
			this.net.forward(x)
			this.net.backward(y)
			var err2 = this.net.layers[this.net.layers.length-1].err
			console.log("error");
			console.log(err2);
			console.log("manual grad");
			console.log((err2 - err1)/epsilon);
		}
	};
	mlitb.SGD = SGD;
})(mlitb);
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

SGD.checkGrad(x[3],[y[3]])

//console.log(mlitb.W);

//console.log(mlitb.zeros(2,4));

//train network
