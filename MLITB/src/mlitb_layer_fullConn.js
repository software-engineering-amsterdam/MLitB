(function (global) {
	"use strict";
	var Vol = global.Vol;
	var FullConnLayer = function (conf) {
		// assume conf contains information about the number of neurons and also the number connection come to each neuron
		this.in_neurons = conf.in_neurons; //now we use in_neuron first, probably next we will use in_sx, in_sy, in_depth directly
		this.out_depth = conf.n_neurons;
		this.out_sx = 1;
		this.out_sy = 1;
		this.weights = new global.Vol(1, this.in_neurons, this.out_depth); // we assume y as the number of connection come to this layer
		this.biases = new global.Vol(1,1, this.out_depth, 1.0);
		this.layer_type = 'fc';
	}

	FullConnLayer.prototype = {
		forward : function (V, is_training) {
			this.V_in = V;
			// console.log("V");
			// console.log(V);
			// console.log("W");
			// console.log(this.weights);
			var in_data = V.data; //since full conn, dimension is not important, can traverse and calculate directly without get method
			var Out = new global.Vol(1, 1, this.out_depth);
			var out_data = Out.data;
			var w = this.weights.data;
			var biases = this.biases;
			var idx = 0;
			for (var i = 0, m = this.out_depth; i < m; i++) {
				var a = 0.0;
				for (var j = 0, n= this.in_neurons;  j< n; j++, idx++) {
					//a += in_data[j]*weights.get(0, j, i) //function call here.. if take long time, than modif this later
					//console.log(j+" : "+w[i*n+j]);
					a += in_data[j]*w[idx]
				};
				// bias will be added later here
				a += biases.data[i];
				out_data[i] = a;
			};
			this.V_out = Out;
			return this.V_out;
		},
		backward : function () {
			var drv = this.V_in.drv;
			var w = this.weights.data;
			var dw = this.weights.drv
			var db = this.biases.drv;
			var in_data = this.V_in.data
			var idx = 0;
			for (var i = 0, m = this.out_depth; i < m; i++) {
				var delta = this.V_out.drv[i];
				for (var j = 0, n=this.in_neurons; j< n; j++,idx++) {
					drv[j] += delta*w[idx]; //delta * w  why do we accumulate this one?
					dw[idx] += delta*in_data[j]; //derivative w.r.t weights = delta*z -- accumulate for batch learning
				};
				db[i] += delta;
			};

		}
	};
	global.FullConnLayer = FullConnLayer;
})(mlitb);