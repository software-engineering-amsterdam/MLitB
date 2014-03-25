(function (window, document, undefined) {
	var dot_t = function(m1, m2){
		//dot product where m2 should be transposed, but try to avoid transpose first
		//so modify the multiplication algorithm
		var m1 = typeof m1[0].length == 'undefined' ? [m1] : m1;
		var m2 = typeof m2[0].length == 'undefined' ? [m2] : m2;
		var s1 = size(m1);
		var s2 = size(m2);
		if (s1[1] !== s2[1]) {
			console.log('ERROR!! matrix dimension does not match');
		} else{
			var result = [];
    	for (var i = 0; i < s1[0]; i++) {
        result[i] = [];
        for (var j = 0; j < s2[0]; j++) {
          var sum = 0;
          for (var k = 0; k < s1[1]; k++) {
            sum += m1[i][k] * m2[j][k];
          }
          result[i][j] = sum;
        }
    	}
    	return result[0]; //Assume the result alwasy a vector (1 x n)
		};
	}
})(window, document);

var mlitb = mlitb || { REVISION: 'ALPHA' };
(function(global){
	global.W = [];
})(mlitb);
(function (global) {
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
	global.zeros = zeros;
	global.dot = dot;
	global.add = add;
	
})(mlitb);
(function (global) {
	var fw_fn =  {
		sigmoid : function (a) {
			return 1/(1+Math.exp(-a));
		}
	}

	var bw_fn = {
		sigmoid : function (a) {
			return (1/(1+Math.exp(-a)))*(1-1/(1+Math.exp(-a)));
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
		this.outs = global.zeros(this.n_neuron);
		console.log("outs "+this.outs);
	}

	HiddenLayer.prototype = {
		forward : function () {
			//put this.in into activation function
			for (var i = 0; i < this.n_neuron; i++) {
				this.outs[i] = global.fw_fn[this.act_fn](this.act[i]);
			};

		},

		backward : function () {
			this.delta = [];
			for (var i = 0; i < this.n_neuron; i++) {
				this.delta[i] = global.bw_fn[this.act_fn](this.back_in[i]);
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
				this.outs[i] = global.fw_fn[this.act_fn](this.act[i]);
			};
			console.log("output "+this.outs);
		},

		backward : function (t) {
			console.log("target "+t);
			this.delta = [];
			for (var i = 0; i < this.n_neuron; i++) {
				this.delta[i] = this.outs[i] - t[i];
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
				global.W.push(global.zeros(conf[i].n_neuron,conf[i+1].n_neuron));
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
			this.layers[0].outs = X
			for (var i = 0; i < this.layers.length-1; i++) {
				this.layers[i+1].act = global.dot(this.layers[i].outs, W[i]);
				this.layers[i+1].forward();
			};
		},

		backward : function (Y) {
			var W = global.W;
			this.der = global.zeros(global.W.length)
			//this.layers[this.layers.length-1].backward(Y)
			//this.layers[this.layers.length-2].back_in = global.dot(this.layers[this.layers.length-1].delta, W[this.layers.length-2],'r'); //delta * w
			for (var i = this.layers.length - 1; i > 0; i--) {
				this.layers[i].backward(Y);
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
				global.W[i]=mlitb.add(global.W[i], mlitb.dot(this.net.der[i],this.learning_rate))
				//console.log("Der "+i+" "+this.net.der[i]);
			}
		}
	};
	mlitb.SGD = SGD;
})(mlitb);
//document.write('<script type="text/javascript" src="../src/mlitb_global_param.js"></script>');
//document.write('<script type="text/javascript" src="../src/mlitb_layer.js"></script>');
//document.write('<script type="text/javascript" src="../src/mlitb_net.js"></script>');

//simple regression neural network using sin function
var x = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
var label = (function(x){
	var r = [];
	for (var i in x){
		r.push(Math.sin(x[i]));
	} 
	return r
})(x);


//create network configuration
var conf = []
conf.push({n_neuron : 1})
conf.push({n_neuron : 10, act_fn : 'sigmoid'})
conf.push({n_neuron : 1, act_fn : 'sigmoid'})

//console.log(conf[1].afn);

//create network as many as number of client
//create new mlitb.Net(conf)
var Net = new mlitb.Net();
Net.initWeight(conf);
Net.createLayers(conf);
var SGD = new mlitb.SGD(Net,{learning_rate : 0.1});
for (var i=0; i<10; i++){
	idx = parseInt((Math.random() * (x.length)), 10); //random index
	SGD.train([x[idx]], [label[idx]])
}

//console.log(mlitb.W);
console.log(mlitb.zeros(4,'random'));
//train network
