(function(global){
	var Net = function () {
		this.layers = [];
		this.layer_conf = [];
		
	}
	Net.prototype = {
		createLayers : function (conf) {
			//make sure the first layer is input type
			if (conf[0].type !== 'input'){console.log('ERROR : First layer should be an input type layer')}
			var layer_conf = [];
			//add input, activation, and output layer
			for (var i = 0; i < conf.length; i++) {
				var c = conf[i]
				layer_conf.push(c);

				if (c.type === 'conv'){
					if (typeof c.activation !== 'undefined'){
						layer_conf.push({type : c.activation});
					} else {
						layer_conf.push({type : 'relu'}); //default activation function for conv
					}
				} else if (c.type === 'fc'){
					if (typeof c.num_neurons === 'undefined'){
						console.log("ERROR : number of neuron parameter \'num_neurons\' is not defined")
					}
					if (typeof c.activation !== 'undefined'){
						layer_conf.push({type : c.activation});
					} else {
						layer_conf.push({type : 'linear'}); //default activation function for fc
					}
				} else if (c.type === 'pool'){
					if (typeof c.sx === 'undefined'){console.log('ERROR : pool size parameter \'sx\' is not defined')}
					if (typeof c.stride === 'number'){
						var sz = typeof c.sy === 'number' ? Math.min(c.sx,c.sy) : c.sx;
						if (c.stride > sz){console.log('BAD PARAMETER : stride should <= pooling size')}
					} else {
						console.log("WARNING : \'stride\' parameter is not defined. Using default = 1")
					}
					if (typeof drop_prob !== 'undefined'){
						layer_conf.push({type : 'dropout', drop_prob : drop_prob})
					}
				}
			};
			this.layer_conf = layer_conf; //this structure can be saved and loaded in the future
			this.constructNetwork();
		},

		constructNetwork : function(){
			//layer_conf is a list outputed by createLayers function
			//This function will construct Network as defined in this.layer_conf
			//This function can be called directly if we want to load prevous saved configuration
			var layer_conf = this.layer_conf;
			//create input layer
			this.layers.push(new global.InputLayer(layer_conf[0]))
			for (var i = 1; i < layer_conf.length; i++) {
				//complete the configuration details
				var pl = this.layers[i-1]; //previous layer
				var conf = layer_conf[i];
				conf.in_sx = pl.out_sx;
				conf.in_sy = pl.out_sy
				conf.in_depth = pl.out_depth;
				conf.in_neurons = pl.out_sx*pl.out_sy*pl.out_depth;
				
				// switch(conf.type){
				// 	case 'fc' : this.layers.push(new global.FullConnLayer(conf)); break;
				// }
				if (conf.type === 'fc'){this.layers.push(new global.FullConnLayer(conf));}
				else if (conf.type === 'conv'){this.layers.push(new global.ConvLayer(conf));}
				else if (conf.type === 'sigmoid'){this.layers.push(new global.SigmoidLayer(conf));}
				else if (conf.type === 'softmax'){this.layers.push(new global.SoftmaxLayer(conf));}
				else if (conf.type === 'linear'){this.layers.push(new global.LinearLayer(conf));}
				else if (conf.type === 'relu'){this.layers.push(new global.ReLuLayer(conf));}
				else if (conf.type === 'pool'){this.layers.push(new global.PoolLayer(conf));}
				else if (conf.type === 'dropout'){this.layers.push(new global.DropOutLayer(conf));}
			};
		},

		forward : function (X, is_training) {
			var Prev_out = X;
			for (var i = 0; i < this.layers.length; i++) {
				var V_out = this.layers[i].forward(Prev_out, is_training);
				Prev_out = V_out;
				// console.log('V_out '+i);
				// console.log(V_out);
			};
			// console.log("predict  : "+Prev_out.data);
			
		},

		backward : function (Y) {
			// console.log(" Y inside backward");
			// console.log(Y);
			var loss = this.layers[this.layers.length-1].backward(Y);
			for (var i = this.layers.length - 2; i >= 0; i--) {
				this.layers[i].backward();
			};
			return loss;
		},

		saveNetwork : function (){
			var json = {}
			json.layer_conf = this.layer_conf;
			return json;
		},

		loadNetwork : function(json){
			this.layer_conf = json.layer_conf;
			this.constructNetwork();
		},

		getPrediction : function(){
			return this.layers[this.layers.length-1].V_out;
		},

		getParamsAndGrads : function(){
			var out = [];
			for (var i = 0; i < this.layers.length; i++) {
				var o = this.layers[i].getParamsAndGrads();

				for (var j = 0; j < o.length; j++) {
					out.push(o[j]);
				};
			};
			// console.log("get params");
			// console.log(out);
			return out;
		}
	}
	global.Net = Net;
})(mlitb);