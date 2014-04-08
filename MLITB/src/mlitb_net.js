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