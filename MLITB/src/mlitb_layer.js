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