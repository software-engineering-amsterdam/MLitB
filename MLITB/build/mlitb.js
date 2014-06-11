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
	// var zero = function (n, getVal) {
	// 	var res = [];
	// 	for (var i = 0; i < n; i++) {
	// 		res[i]=getVal();
	// 	}
	// 	return res;
	// }
	// var zeros = function (m,n, opt) {
	// 	var test = typeof n == 'number' ? opt : n;
	// 	var getVal = {};
	// 	if (typeof test === 'undefined' || test === 'zero')
	// 		getVal = function () {return 0;}
	// 	else if (test === 'random')
	// 		getVal = function () {return Math.random();}

	// 	if (typeof n === 'number'){
	// 		var res = [];
	// 		for (var i = 0; i < m; i++)
	// 			res[i] = zero(n,getVal)
	// 		return res;	
	// 	} else
	// 		return zero(m, getVal);
	// }


	var zeros = function(n) {
    if(typeof(n)==='undefined' || isNaN(n)) { return []; }
    if(typeof ArrayBuffer === 'undefined') {
      // lacking browser support
      var arr = new Array(n);
      for(var i=0;i<n;i++) { arr[i]= 0; }
      return arr;
    } else {
      return new Float64Array(n);
    }
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

	// Random number utilities
  var return_v = false;
  var v_val = 0.0;
  var gaussRandom = function() {
    if(return_v) { 
      return_v = false;
      return v_val; 
    }
    var u = 2*Math.random()-1;
    var v = 2*Math.random()-1;
    var r = u*u + v*v;
    if(r == 0 || r > 1) return gaussRandom();
    var c = Math.sqrt(-2*Math.log(r)/r);
    v_val = v*c; // cache this
    return_v = true;
    return u*c;
  }
  var randf = function(a, b) { return Math.random()*(b-a)+a; }
  var randi = function(a, b) { return Math.floor(Math.random()*(b-a)+a); }
  var randn = function(mu, std){ return mu+gaussRandom()*std; }

	global.zeros = zeros;
	global.dot = dot;
	global.add = add;
	global.normalize = normalize;
	global.clone = clone;
	global.randf = randf;
	global.randi = randi;
	global.randn = randn;
})(mlitb);
(function(global) {
	"use strict";
	var Vol = function  (sx, sy, depth, c) {
		//for non-convolutional layer, sx and sy = 1
		this.sx = sx;
		this.sy = sy;
		this.depth = depth;
		var n = sx*sy*depth;
		this.data = global.zeros(n);
		this.drv = global.zeros(n);
		if (typeof c ==='number' || typeof c === 'boolean'){
			for (var i = 0; i < n; i++) {
				this.data[i] = c
			};
		} else if(typeof c ==='object'){
      var prob = c.prob;
      for (var i = 0; i < n; i++) {
        this.data[i] = (Math.random()<prob ? 0 : 1);
      };
    } 
    else {
			var scale = Math.sqrt(1.0/(sx*sy*depth));
      for(var i=0;i<n;i++) { 
        this.data[i] = global.randn(0.0, scale);
      }
		}
	}

	Vol.prototype = {
		//index(x,y,d) for get and set start from 0
		get: function(x, y, d, opt) { 
			var idx = ((this.sx * y)+x)+this.sx*this.sy*d;
			if (typeof opt === 'undefined' || opt === 'data') {return this.data[idx];}
			else if (opt === 'drv') {return this.drv[idx];}
      
    },
    set: function(x, y, d, v, opt) { 
    	var idx = ((this.sx * y)+x)+this.sx*this.sy*d;
    	if (typeof opt === 'undefined' || opt === 'data') {this.data[idx] = v;}
			else if (opt === 'drv') {this.drv[idx] = v;}
    },
    cloneAndZeros: function() { return new Vol(this.sx, this.sy, this.depth, 0.0)},
    clone: function() {
      var V = new Vol(this.sx, this.sy, this.depth, 0.0);
      for(var i=0;i< this.data.length ;i++) { V.data[i] = this.data[i]; }
      return V;
		},
		getIndex : function (x, y, d) {
			// return ((this.sx * y)+x)*this.depth+d;
			return ((this.sx * y)+x)+this.sx*this.sy*d;
		}
	};
	global.Vol = Vol;
})(mlitb);
(function(global) {
  "use strict";
  var Vol = global.Vol; // convenience
  
  var InputLayer = function(conf) {

    var conf = conf || {};

    // required
    this.out_sx = conf.sx;
    this.out_sy = conf.sy;
    this.out_depth = conf.depth;
    this.layer_type = 'input';
  }

  InputLayer.prototype = {
    forward: function(V, is_training) {
      this.V_in = V;
      this.V_out = V;
      return this.V_out;
    },
    backward: function() { 
    },
    getParamsAndGrads : function () {
      return [];
    }
  }

  global.InputLayer = InputLayer;

})(mlitb);
(function (global) {
	"use strict";
	var Vol = global.Vol;
	var ConvLayer = function (conf) {
		//required
		this.sx = conf.sx;
		this.in_sx = conf.in_sx;
		this.in_sy = conf.in_sy;
		this.in_depth = conf.in_depth;		
		this.out_depth = conf.filters;

		//optional
		this.sy = typeof conf.sy !== 'undefined' ? conf.sy : conf.sx; //default is the same size with x
		this.stride = (typeof conf.stride !== 'undefined' && conf.stride <= Math.min(this.sx,this.sy)) ? conf.stride : 1; //default stride is 1 
		this.drop_conn_prob = typeof conf.drop_conn_prob === 'number' ? conf.drop_conn_prob : 0.0;

		
		this.out_sx = Math.ceil(conf.in_sx/this.stride); //could be floor for valid conv
		this.out_sy = Math.ceil(conf.in_sy/this.stride);

		this.filters = []; //
		for (var i = 0; i < conf.filters; i++) {
			this.filters.push(new Vol(this.sx, this.sy, this.in_depth));
		};
		this.biases = new global.Vol(1,1, this.out_depth, 0.1);

		this.conv_type = typeof conf.conv_type !=='undefined' ? conf.conv_type : 'same'; //probably for the future we want to try 'valid' and 'full' option. 
		
		this.layer_type = 'conv';
	}

	ConvLayer.prototype = {
		forward : function (V, is_training) {
			this.V_in = V;
			//Mask drop connect
			this.Mask = []
			if (is_training){
				for (var i = 0; i < this.filters.length; i++) {
					this.Mask.push(new Vol(this.sx, this.sy, this.in_depth,{type : 'bern', prob : this.drop_conn_prob}));
				};
			} else {
				for (var i = 0; i < this.filters.length; i++) {
					this.Mask.push(new Vol(this.sx, this.sy, this.in_depth,{type : 'bern', prob : 0.0}));
				};
			}
			
			var hx = Math.floor(this.sx/2.0);
			var hy = Math.floor(this.sy/2.0);
			var dim = this.out_sx*this.out_sy;

			var A = new global.Vol(this.out_sx, this.out_sy, this.out_depth,0.0);
			var A_data = A.data;
			//this one is faster
			for (var i=0,ij=0;i<A.depth;i++) {
				var b=this.biases.data[i];
				for (var j=0;j<A.sx*A.sy;j++,ij++){A_data[ij]=b}
			};
			for (var od=0;od<A.depth;od++) {
				var f=this.filters[od]; //filter/weight data
				var m=this.Mask[od];
				for (var id=0,oi=od*dim;id<f.depth;id++,oi=od*dim){ //reset index of output data. we want to refill from x=0 y=0 again
					for (var cy=0;cy<V.sy;cy+=this.stride) { //if use floor stride, then add an index here
						for (var cx=0;cx<V.sx; cx+=this.stride,oi++) {
							var a=0.0;
							var fi=id*f.sx*f.sy; //index for filter data
							for (var fy=cy;fy<f.sy+cy;fy++) {
								for (var fx=cx;fx<f.sx+cx;fx++,fi++) {
									var iy=fy-hy;
									var ix=fx-hx;
									if (ix>=0&&iy>=0&&ix<V.sx&&iy<V.sy){
										// a+=f.data[fi]*V.get(ix,iy,id); //try function call here
										a+=m.data[fi]*f.data[fi]*V.data[((V.sx * iy)+ix)+V.sx*V.sy*id]; //faster
									}
								};
							};
							// if(id==0){a+=this.biases.data[od]} //slower
							A_data[oi]+=a;
						};
					};	
				}
			};
			this.V_out = A;
			return this.V_out;
		},
		backward : function () {
			var V_in = this.V_in;
			var hx = Math.floor(this.sx/2.0);
			var hy = Math.floor(this.sy/2.0);
			var dim = this.out_sx*this.out_sy;

			var V_out = this.V_out;
			//this one is faster
			for (var i=0,ij=0;i<V_out.depth;i++) {
				for (var j=0;j<V_out.sx*V_out.sy;j++,ij++){this.biases.drv[i]+=V_out.drv[ij]}
			};
			for (var od=0;od<V_out.depth;od++) {
				var f=this.filters[od]; //filter/weight data
				var m = this.Mask[od];
				for (var id=0,oi=od*dim;id<f.depth;id++,oi=od*dim){ //reset index of output data. we want to refill from x=0 y=0 again
					for (var cy=0;cy<V_in.sy;cy+=this.stride) { //if use floor stride, then add an index here
						for (var cx=0;cx<V_in.sx; cx+=this.stride,oi++) {
							var fi=id*f.sx*f.sy; //index for filter data
							for (var fy=cy;fy<f.sy+cy;fy++) {
								for (var fx=cx;fx<f.sx+cx;fx++,fi++) {
									var iy=fy-hy;
									var ix=fx-hx;
									
									if (ix>=0&&iy>=0&&ix<V_in.sx&&iy<V_in.sy){
										// a+=f.data[fi]*V.get(ix,iy,id); //try function call here
										// a+=f.data[fi]*V.data[((V.sx * iy)+ix)+V.sx*V.sy*id]; //faster
										// console.log(ix,iy,id);
										V_in.drv[((V_in.sx * iy)+ix)+V_in.sx*V_in.sy*id] += f.data[fi]*V_out.drv[oi];
										f.drv[fi]+= m.data[fi]*V_in.data[((V_in.sx * iy)+ix)+V_in.sx*V_in.sy*id]*V_out.drv[oi];
									}
								};
							};
							// if(id==0){a+=this.biases.data[od]} //slower
						};
					};	
				}
			};
		},
		getParamsAndGrads : function () {
			var out = [];
			for (var i = 0; i < this.filters.length; i++) {
				out.push({params : this.filters[i].data, grads : this.filters[i].drv});
			};
			out.push({params : this.biases.data, grads : this.biases.drv});
			return out;
		}
	};
	global.ConvLayer = ConvLayer;
})(mlitb);
(function (global) {
	"use strict";
	var Vol = global.Vol;
	var FullConnLayer = function (conf) {
		// assume conf contains information about the number of neurons and also the number connection come to each neuron
		this.in_neurons = conf.in_neurons; //now we use in_neuron first, probably next we will use in_sx, in_sy, in_depth directly
		this.out_depth = conf.num_neurons;
		this.out_sx = 1;
		this.out_sy = 1;
		this.weights = new Vol(1, this.in_neurons, this.out_depth); // we assume y as the number of connection come to this layer
		this.biases = new Vol(1,1, this.out_depth, 0.1);
		this.drop_conn_prob = typeof conf.drop_conn_prob === 'number' ? conf.drop_conn_prob : 0.0;
		this.layer_type = 'fc';
	}

	FullConnLayer.prototype = {
		forward : function (V, is_training) {
			this.V_in = V;

			//Masking for drop connect
			if (is_training){
				this.Mask = new Vol(1, this.in_neurons, this.out_depth, {type: 'bern', prob : this.drop_conn_prob})	
			} else {
				this.Mask = new Vol(1, this.in_neurons, this.out_depth, {type: 'bern', prob : 0.0})
			}
			
			var M = this.Mask.data;
			var in_data = V.data; //since full conn, dimension is not important, can traverse and calculate directly without get method
			var Out = new Vol(1, 1, this.out_depth);
			var out_data = Out.data;
			var w = this.weights.data;
			var biases = this.biases;
			var idx = 0;
			for (var i = 0, m = this.out_depth; i < m; i++) {
				var a = 0.0;
				for (var j = 0, n= this.in_neurons;  j< n; j++, idx++) {
					//a += in_data[j]*weights.get(0, j, i) //function call here.. if take long time, than modif this later
					//console.log(j+" : "+w[i*n+j]);
					a += in_data[j]*w[idx]*M[idx];
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
			var M = this.Mask.data;
			var idx = 0;
			for (var i = 0, m = this.out_depth; i < m; i++) {
				var delta = this.V_out.drv[i];
				for (var j = 0, n=this.in_neurons; j< n; j++,idx++) {
					drv[j] += delta*w[idx]; //delta * w  why do we accumulate this one?
					dw[idx] += delta*in_data[j]*M[idx]; //derivative w.r.t weights = delta*z -- accumulate for batch learning
				};
				db[i] += delta;
			};

		},
		getParamsAndGrads : function () {
			var out = []
			out.push({params : this.weights.data, grads : this.weights.drv});
			out.push({params : this.biases.data, grads : this.biases.drv});
			return out;
		}
	};
	global.FullConnLayer = FullConnLayer;
})(mlitb);
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
(function(global) {
  "use strict";
  var Vol = global.Vol; // convenience
  
  var PoolLayer = function(conf) {

    var conf = conf || {};

    // required
    this.sx = conf.sx; // filter size
    this.in_depth = conf.in_depth;
    this.in_sx = conf.in_sx;
    this.in_sy = conf.in_sy;
    // optional
    this.sy = typeof conf.sy !== 'undefined' ? conf.sy : this.sx;
    //non overlap as default, forbid stride > than filter
    this.stride = (typeof conf.stride !== 'undefined' && conf.stride <= this.sx) ? conf.stride : this.sx; 
    //ignore border true can leave some area in conv map uncovered
    this.ignore_border = typeof conf.ignore_border !=='undefined' ? conf.ignore_border : false;  
    //later option for average
    this.pool_type = typeof conf.pool_type !=='undefined' ? conf.pool_type : 'max'; 
    // computed
    this.out_depth = this.in_depth;
    this.out_sx = Math.floor(this.in_sx / this.stride); // compute size of output volume
    this.out_sy = Math.floor(this.in_sy / this.stride);
    // save position at filter from which max value comes from
    this.max_pos_x = global.zeros(this.out_sx*this.out_sy*this.out_depth);
    this.max_pos_y = global.zeros(this.out_sx*this.out_sy*this.out_depth);
    this.layer_type = 'pool';
  }

  PoolLayer.prototype = {
    forward: function(V, is_training) {
      this.V_in = V;

      var Z = new Vol(this.out_sx, this.out_sy, this.out_depth, 0.0);
      var max_pos_x = this.max_pos_x;
      var max_pos_y = this.max_pos_y;
      var Z_data = Z.data;
      //half of filter size
      var hx = Math.floor(this.sx/2.0);
      var hy = Math.floor(this.sy/2.0);
      // var in_sx = V.sx; //used when compute index instead of call get function
      // var in_sy = V.sy;
      var n = 0; //index for output data;
      for (var d = 0; d < this.out_depth; d++) {
        for (var sty = 0, oy=0; oy < this.out_sy; sty+=this.stride, oy++) {
          for (var stx = 0, ox=0; ox < this.out_sx; stx+=this.stride, ox++,n++){
            var max_v = -99999999.0;
            var max_x = -1;
            var max_y = -1;
            for (var fy = sty; fy < this.sy+sty; fy++) {
              for (var fx = stx; fx < this.sx+stx; fx++) {
                var v = -999999999.0;
                if (fx < this.in_sx && fy < this.in_sy){
                  // v = V.get(fx,fy,d); // try function call here. compared with non function call later
                  v = V.data[((V.sx * fy)+fx)+V.sx*V.sy*d];
                }
                if (v> max_v){
                  max_v = v;
                  max_x = fx;
                  max_y = fy
                }
              };
            };
            // we can create 1 function to return index
            // var idx = Z.getIndex(ox,oy,d);
            Z.data[n] = max_v;
            // Z_data[idx] = max_v;
            max_pos_x[n] = max_x;
            max_pos_y[n] = max_y;
          };
        }
      };

      this.V_out = Z;
      return this.V_out;
    },
    backward: function() { 
      // pooling layers have no parameters, so simply compute 
      // gradient wrt data here
      var V_in = this.V_in;
      V_in.drv = global.zeros(V_in.data.length); // zero out gradient wrt data
      var V_in_drv = V_in.drv;
      var Z_drv = this.V_out.drv;
      var max_pos_x = this.max_pos_x;
      var max_pos_y = this.max_pos_y;
      var n = 0;
      for(var d=0;d<this.out_depth;d++) {
        for (var fy = 0; fy < this.out_sy; fy++) {
          for (var fx = 0; fx < this.out_sx; fx++, n++) {
            var idx = V_in.getIndex(max_pos_x[n], max_pos_y[n],d);
            V_in_drv[idx] += Z_drv[n];
          };
        };
      }
    },
    getParamsAndGrads : function () {
      return [];
    }
  },


  global.PoolLayer = PoolLayer;

})(mlitb);
(function (global) {
  "use strict";
  var Vol = global.Vol;

  var DropoutLayer = function (conf) {
    this.out_sx = conf.in_sx;
    this.out_sy = conf.in_sy;
    this.out_depth = conf.in_depth;
    this.drop_prob = typeof conf.drop_prob === "number" ? conf.drop_prob : 0.5;
    this.layer_type = 'dropout';
    this.drop_index = [];
    // this.dropped = new Vol(this.out_sx, this.out_sy, this.out_depth, false);
  }

  DropoutLayer.prototype = {
    forward : function (V, is_training) {
      this.drop_index = [];
      this.V_in = V;
      var Z = V.clone();

      //Drop only when training
      if (is_training){
        for (var i = 0; i < Z.data.length; i++) {
          if (Math.random()<this.drop_prob){Z.data[i]=0; this.drop_index.push(i)}
        };  
      }

      // for (var i = 0; i < Z.data.length; i++) {
      //   if (Math.random()<this.drop_prob){Z.data[i]=0; this.dropped[i]=true;}
      // };
      this.V_out = Z;     
      return this.V_out;
    },

    backward : function () {
      // console.log('Y : '+Y);
      var Z_data = this.V_out.data;
      var V_in_drv = this.V_in.drv; 
      V_in_drv = global.zeros(V_in_drv.length); // zero out gradient wrt data
      var N = this.V_in.data.length;
      for (var i = 0; i < this.drop_index.length; i++) {
        idx = this.drop_index[i];
        V_in_drv[idx]= this.V_out.drv[idx];
      };
      // for (var i = 0; i < N; i++) {
      //   if (this.dropped === false){V_in_drv = this.V_in_drv[i]}
      // };
    },
    getParamsAndGrads : function () {
      return [];
    }
      
  };
  global.DropoutLayer = DropoutLayer;
})(mlitb);
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
			
			var epsilon =0.0001;
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
(function (global) {
	"use strict";
	var SGDTrainer = function (net, conf) {
		this.net = net;
		this.loss =0.0;
		this.l2_loss = 0.0;
		this.l1_loss = 0.0;

		this.learning_rate = typeof conf.learning_rate !== 'undefined' ? conf.learning_rate : 0.01;
    this.l1_decay = typeof conf.l1_decay !== 'undefined' ? conf.l1_decay : 0.0;
    this.l2_decay = typeof conf.l2_decay !== 'undefined' ? conf.l2_decay : 0.0;
    this.batch_size = typeof conf.batch_size !== 'undefined' ? conf.batch_size : 1;
    this.momentum = typeof conf.momentum !== 'undefined' ? conf.momentum : 0.9;
    this.iteration = 0;
    this.last_grads = [];
	}
	

	SGDTrainer.prototype = {
		train : function (X, Y) {
			var start = new Date().getTime();
			this.net.forward(X, true);
			var fw = new Date().getTime()-start;
			var start = new Date().getTime();
			this.loss += this.net.backward(Y);
			var bw = new Date().getTime()-start;
			// console.log('loss : '+loss);
			this.iteration++;
			if (this.iteration % this.batch_size == 0){
				console.log('sample seen : ',this.iteration);
				console.log('loss : ',this.loss/this.iteration);
				// this.loss = 0.0;
				//perform the update

				// console.log("initialize last grad");
				//initialize the last gradient for the first time
				var pgs = this.net.getParamsAndGrads();
				
				if (this.last_grads.length == 0 && this.momentum > 0.0){
					for (var i = 0; i < pgs.length; i++) {
						this.last_grads.push(global.zeros(pgs[i].grads.length));
					};
				}

				//iterate over each param and grad vector
				for (var i = 0; i < pgs.length; i++) {
					var pg = pgs[i];
					var p = pg.params;
					var g = pg.grads;
					
					var plen = p.length;
					var lg = this.last_grads[i];
					for (var j = 0; j < plen; j++) {
						this.l2_loss += this.l2_decay*p[j]*p[j];
						this.l1_loss += this.l1_decay*Math.abs(p[j]);
						var l2_grad = this.l2_decay*p[j];
						var l1_grad = this.l1_decay*(p[j]>0 ? 1 : -1);
						var lgj = lg[j];
						var dw = (1.0-this.momentum)*this.learning_rate*((l1_grad+l2_grad+g[j])/this.batch_size)+this.momentum*lgj;
						p[j] -= dw;
						lgj = dw;
						g[j] = 0.0;
					};
				};
			}

		}
	};
	global.SGDTrainer = SGDTrainer;
})(mlitb);
var conf = []

conf.push({type : 'input', sx : 28, sy:28, depth :1});
conf.push({type : 'conv', sx : 5, stride : 1, filters : 8, activation : 'relu', drop_conn_prob : 0.0});
conf.push({type : 'pool', sx : 2, stride : 2});
conf.push({type : 'conv', sx : 5, stride : 1, filters : 16, activation : 'relu', drop_conn_prob : 0.0});
conf.push({type : 'pool', sx : 3, stride : 3, drop_prob : 0.5});
// conf.push({type : 'fc', num_neurons : 10, activation : 'relu'});
conf.push({type : 'fc', num_neurons : 10, activation : 'softmax'});

var Net = new mlitb.Net();
Net.createLayers(conf);
var SGD = new mlitb.SGDTrainer(Net, {learning_rate : 0.1, batch_size : 16, l2_decay : 0.001});


var PNG = require('png-js');
// PNG.decode(filename, function(pixels) {}

var train_labels = require('../../Data/Mnist/mnist_train_labels.json');
var test_labels = require('../../Data/Mnist/mnist_test_labels.json');
console.log(train_labels.length);
console.log(test_labels.length);

var loadedImages = [];
var testImages = [];
var parsePNG = function(filename, ln, storage, isGrayscale){
  var gs = typeof isGrayscale !== 'undefined' ? isGrayscale : true
  PNG.decode(filename, function(pixels) {
    // pixels is a 1d array of decoded pixel data
    var nImages = pixels.length/4/ln; //4 is rgba
    var n = ln;
    for (var i = 0; i< nImages; i++) {
      var image = mlitb.zeros(784);
      for (var k=0,j = i*n*4; j < (i+1)*n*4; j+=4,k++) {
        //for grayscale, RGB have the same value
        R = pixels[j]/255.0;
        // console.log(R);
        // G = pixels[j+1];
        // B = pixels[j+2];
        // A = pixels[j+3];
        image[k]=R;
      };
      storage.push(image);
    };
  }); 
  // return images;
}



parsePNG('../../Data/Mnist/mnist_train_all.png',784, loadedImages);
parsePNG('../../Data/Mnist/mnist_test_all.png',784, testImages);
var checkLoading = function () {
  if (loadedImages.length==60000){
    console.log('masuk');
    sampleAndTrainBatches();
  } else {
    console.log(loadedImages.length);
    setTimeout(checkLoading, 100);
  }
}
checkLoading();
var sampleAndTrainBatches = function () {
  var bi = Math.floor(Math.random()*20);
  var startIndex = bi*3000;
  var epoch = 100;
  var nTest = 100;
  var nTrain = 100;
  var correctTrain = 0;
  // var labelSI = bi*3000
  var it=1;
  for (var ep = 0; ep < epoch; ep++) {
    console.log('Epoch '+ep);
    for (var idx = startIndex; idx < startIndex+3000; idx++,it++) {
      // console.log(idx);
      var Input = new mlitb.Vol(28,28,1, 0.0);
      var xi = loadedImages[idx];
      var yi = train_labels[idx];
      // console.log("xi : ");
      // console.log(xi);
      // console.log("y");
      // console.log(yi);
      Input.data = xi;
      // console.log(yi);
      SGD.train(Input,yi);    
      var arr = Net.getPrediction().data;
      var max = 0;
      for (var j = 1; j < arr.length; j++) {
        if (arr[j]>arr[max]){max = j}
      };
      // console.log('label : ',yi,' output : ',arr.indexOf(Math.max.apply(Math, arr)));
      // console.log('label : ',yi,' output : ',max);
      if(yi===max){correctTrain+=1}


      if (it %16==0){
        correctTest = 0;
        // correctTrain = 0;
        // choose 10 random test images
        for (var i = 0; i < nTest; i++) {
          var ix = Math.floor(Math.random()*testImages.length);
          var Input = new mlitb.Vol(28,28,1, 0.0);
          var xi = testImages[ix];
          var yi = test_labels[ix];
          Input.data = xi;
          Net.forward(Input);
          var arr = Net.getPrediction().data;
          var max = 0;
          for (var j = 1; j < arr.length; j++) {
            if (arr[j]>arr[max]){max = j}
          };
          // console.log('label : ',yi,' output : ',arr.indexOf(Math.max.apply(Math, arr)));
          // console.log('label : ',yi,' output : ',max);
          if(yi===max){correctTest+=1}
        };
        // for (var i = 0; i < nTrain; i++) {
        //   var idx = Math.floor(Math.random()*train_labels.length);
        //   var Input = new mlitb.Vol(28,28,1, 0.0);
        //   var xi = loadedImages[idx];
        //   var yi = train_labels[idx];
        //   Input.data = xi;
        //   Net.forward(Input);
        //   var arr = Net.getPrediction().data;
        //   var max = 0;
        //   for (var j = 1; j < arr.length; j++) {
        //     if (arr[j]>arr[max]){max = j}
        //   };
        //   // console.log('label : ',yi,' output : ',arr.indexOf(Math.max.apply(Math, arr)));
        //   // console.log('label : ',yi,' output : ',max);
        //   if(yi===max){correctTrain+=1}
        // };
        console.log('Train accuracy : ',correctTrain/SGD.iteration);
        console.log('Test accuracy : ',correctTest/nTest);
      
      }
    };
    
  };
}


// var loadedBatches = [];
var loadBatches = function (nBatches) {
  for (var i = 0; i < nBatches; i++) {
    loadedImages = [];
    parsePNG('../../Data/Mnist/mnist_batch_'+i+'.png',784);
    var oneBatchInt = setInterval(function(){
    console.log(loadedImages.length); 
    if (loadedImages[0] && loadedImages[2999]) {
      clearInterval(oneBatchInt);
      console.log('lengkap');
    }},100);
    console.log('teseteswets');
  };
}

// }
