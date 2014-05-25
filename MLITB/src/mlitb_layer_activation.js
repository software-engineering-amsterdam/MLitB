(function (global) {
	"use strict";

	var Vol = global.Vol;

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

	var SigmoidLayer = function (conf) {
		// assume conf contains information about the number of neurons and also the number connection come to each neuron
		this.out_sx = conf.in_sx;
		this.out_sy = conf.in_sy;
		this.out_depth = conf.in_depth;
		this.layer_type = 'sigmoid';
	}

	SigmoidLayer.prototype = {
		forward : function (V, is_training) {
			this.V_in = V;
			var Z = V.cloneAndZeros();
			var N = V.data.length;
			for (var i = 0; i < N; i++) {
				//console.log("i :"+i);
				Z.data[i] = 1/(1+Math.exp(-V.data[i]));
				//console.log(Z);
			};
			this.V_out = Z
			return this.V_out;
		},

		backward : function (Y) {
			var Z_data = this.V_out.data;
      var V_in_drv = global.zeros(N); // zero out gradient wrt data
			var N = this.V_in.data.length;
			if (typeof Y === "undefined"){ // used as activation on hidden layer
				var Z_drv = this.V_out.drv; // contains inf about error/sensitivity from next layer
      	for(var i=0;i<N;i++) {
	        var z = Z_data[i];
        	V_in_drv[i] =  z * (1.0 - z) * Z_drv[i];
      	}
      	this.V_in.drv = V_in_drv;	
			} else { //here if sigmoid is used as activation of output layer
				Y = typeof Y === "number" ? [Y] : Y;
				var loss = 0.0;
				for(var i=0;i<N;i++) {
	        var z = Z_data[i];
	        var drv = z - Y[i];
        	V_in_drv[i] =  z * (1.0 - z) * drv;
        	loss += (drv*drv)/2.0
      	}
      	this.V_in.drv = V_in_drv;
				return loss;
			}
      
		},
		getParamsAndGrads : function () {
			return [];
		}
	};

	var ReLuLayer = function (conf) {
		//need information about neuron dimension, from the previous layer
		this.out_sx = conf.in_sx;
		this.out_sy = conf.in_sy;
		this.out_depth = conf.in_depth;
		this.layer_type = 'relu';
	}

	ReLuLayer.prototype = {
		forward : function (V, is_training) {
			this.V_in = V;
			var Z = V.clone();
			var Z_data = Z.data;
			var V_in_data = V.data;
			var N = V.data.length;
			for (var i = 0; i < N; i++) {
				if (V_in_data[i]<=0)	{Z_data[i] = 0}
			};
			this.V_out = Z;
			return this.V_out;
		},

		backward : function (Y) {
      var Z_drv = this.V_out.drv; // contains inf about error/sensitivity from next layer
      var Z_data = this.V_out.data;
      var N = this.V_in.data.length;
      var V_in_drv = global.zeros(N); // zero out gradient wrt data
      for(var i=0;i<N;i++) {
        if(Z_data[i] <= 0) V_in_drv[i] = 0; // threshold
        else V_in_drv[i] = Z_drv[i];
      }
      this.V_in.drv = V_in_drv;
		},
		getParamsAndGrads : function () {
			return [];
		}
	};

	var SoftmaxLayer = function(conf) {
    var conf = conf || {};

    // computed
    this.num_inputs = conf.in_sx * conf.in_sy * conf.in_depth;
    this.out_depth = this.num_inputs;
    this.out_sx = 1;
    this.out_sy = 1;
    this.layer_type = 'softmax';
  }

  SoftmaxLayer.prototype = {
    forward: function(V, is_training) {
      this.V_in = V;

      var Z = new Vol(1, 1, this.out_depth, 0.0);
      // compute max
      var a = V.data;
      var max_a = V.data[0];
      for(var i=1;i<this.out_depth;i++) {
        if(a[i] > max_a) max_a = a[i];
      }
      // compute exponentials (scale data to range [-inf,0])
      var Z_data = global.zeros(this.out_depth);
      var sum_a = 0.0;
      for(var i=0;i<this.out_depth;i++) {
        Z_data[i] = Math.exp(a[i] - max_a);
        sum_a += Z_data[i];
      }

      // normalize and output to sum to one
      for(var i=0;i<this.out_depth;i++) {
        Z_data[i] /= sum_a;
        //Z.w[i] = Z_data[i];
      }
      Z.data = Z_data;

      this.Z_data = Z_data; // save these for backprop
      this.V_out = Z;
      return this.V_out;
    },
    backward: function(y) {

      var V_in_drv = global.zeros(this.V_in.data.length); // zero out the gradient of input Vol

      for(var i=0;i<this.out_depth;i++) {
        var indicator = i === y ? 1.0 : 0.0;
        V_in_drv[i] = this.Z_data[i]-indicator;
      }
      // compute and accumulate gradient wrt weights and bias of V_in layer (previous layer)
      this.V_in.drv = V_in_drv;

      // loss is the class negative log likelihood
      return -Math.log(this.V_out.data[y]);
    },
    getParamsAndGrads : function () {
			return [];
		}
  };

  var LinearLayer = function (conf) {
  	this.out_sx = conf.in_sx;
		this.out_sy = conf.in_sy;
		this.out_depth = conf.in_depth;
		this.layer_type = 'linear';
  }

  LinearLayer.prototype = {
		forward : function (V, is_training) {
			this.V_in = V;
			var Z = V.clone();
			this.V_out = Z;			
			return this.V_out;
		},

		backward : function (Y) {
			// console.log('Y : '+Y);
			var Z_data = this.V_out.data;
      var V_in_drv = global.zeros(N); // zero out gradient wrt data
			var N = this.V_in.data.length;
			if (typeof Y ==='undefined') {
				var drv = this.V_out.drv;
				for(var i=0;i<N;i++) {
					V_in_drv[i] = drv[i];
				}
				this.V_in.drv = V_in_drv;
				
			} else {
				var Y = typeof Y === "number" ? [Y] : Y;

				var loss = 0.0;
				for(var i=0;i<N;i++) {
					var drv = Z_data[i] - Y[i];
					V_in_drv[i] = drv;
					loss += (drv*drv)/2.0
				}
				this.V_in.drv = V_in_drv;
				return loss;	
			}
		},
		getParamsAndGrads : function () {
			return [];
		}
			
	};

	global.LinearLayer = LinearLayer;
  global.SoftmaxLayer = SoftmaxLayer;
	global.ReLuLayer = ReLuLayer;
	global.SigmoidLayer = SigmoidLayer;
	global.fw_fn = fw_fn;
	global.bw_fn = bw_fn;
})(mlitb);