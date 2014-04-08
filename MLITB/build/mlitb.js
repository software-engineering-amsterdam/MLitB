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
		if (typeof c ==='number'){
			for (var i = 0; i < n; i++) {
				this.data[i] = c
			};
		} else {
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
(function (global) {
	"use strict";
	var Vol = global.Vol;
	var ConvLayer = function (conf) {
		this.sx = conf.sx;
		this.in_sx = conf.in_sx;
		this.in_sy = conf.in_sy;
		this.in_depth = conf.depth;		
		
		//optional
		this.sy = typeof conf.sy !== 'undefined' ? conf.sy : conf.sx; //default is the same size with x
		this.stride = (typeof conf.stride !== 'undefined' && conf.stride <= Math.min(this.sx,this.sy)) ? conf.stride : 1; //default stride is 1 

		this.out_depth = conf.filters;
		this.out_sx = Math.floor(conf.in_sx/this.stride);
		this.out_sy = Math.floor(conf.in_sy/this.stride);

		this.filters = [] //
		for (var i = 0; i < conf.filters; i++) {
			this.filters.push(new Vol(this.sx, this.sy, this.in_depth));
		};
		this.biases = new global.Vol(1,1, this.out_depth, 1.0);

		this.conv_type = typeof conf.conv_type !=='undefined' ? conf.conv_type : 'same'; //probably for the future we want to try 'valid' and 'full' option. 
		
		this.layer_type = 'conv';
	}

	ConvLayer.prototype = {
		forward : function (V, is_training) {
			this.V_in = V;
			// console.log("V");
			// console.log(V);
			// console.log("W");
			// console.log(this.weights);
			var hx = Math.floor(this.sx/2.0);
			var hx = Math.floor(this.sy/2.0);

			// var in_sx = V.sx; //used when compute index instead of call get function
      // var in_sy = V.sy;

			var in_data = V.data; //since full conn, dimension is not important, can traverse and calculate directly without get method
			var A = new global.Vol(this.out_sx, this.out_sy, this.out_depth,0.0);
			var A_data = A.data;
			var filters = this.filters;
			var biases = this.biases;
			var idx = 0;
			var sx = this.sx;
			var sy = this.sy;
			
			for (var od = 0; od < this.out_depth; od++) {
				var filter = filters[i].data; //filter/weight data
				var ix_out = od*this.out_sx*this.out_sy; //index for output data
				for (var id = 0; id < this.in_depth; id++){
					
					for (var oy = 0, sty=0; oy < this.out_y; oy++, sty+=this.stride) {
						for (var ox = 0, stx=0; ox < this.out_x; ox++, stx+=this.stride) {
							var a = 0;
							var ix_f =id*sx*sy; //index for filter data
							for (var fy = sty, fyy=0; fy < sy+sty; fyy++, fy++) {
								for (var fx = stx, fxx=0; fx < sx+stx; fxx++, fx++, ix_f++) {
									var ix = fy-hy;
									var iy = fx-hx;
									var v = 0; //if outside image
									if (ix >= 0 && iy >=0 && ix < this.in_sx && iy < this.in_sy){
										v = V.get(ix, iy, id); //try function call here
										// v = V.data[((in_sx * fy)+fx)+in_sx*in_sy*d];  //alternative of function call
									}
									a += v* filter[ix_f];
								};
							};
							A_data[ix_out] += a;
							ix_out++;
						};
					};	
					//reset index of output data
					ix_out = od*this.out_sx*this.out_sy;
				}
				
			};



			this.V_out = Out;
			return this.V_out;
		},
		backward : function () {
			// var drv = this.V_in.drv;
			// var w = this.weights.data;
			// var dw = this.weights.drv
			// var db = this.biases.drv;
			// var in_data = this.V_in.data
			// var idx = 0;
			// for (var i = 0, m = this.out_depth; i < m; i++) {
			// 	var delta = this.V_out.drv[i];
			// 	for (var j = 0, n=this.in_neurons; j< n; j++,idx++) {
			// 		drv[j] += delta*w[idx]; //delta * w  why do we accumulate this one?
			// 		dw[idx] += delta*in_data[j]; //derivative w.r.t weights = delta*z -- accumulate for batch learning
			// 	};
			// 	db[i] += delta;
			// };

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
		this.out_sx = conf.out_sx;
		this.out_sy = conf.out_sy;
		this.out_depth = conf.out_depth;
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
      
		}
	};

	var ReLuLayer = function (conf) {
		//need information about neuron dimension, from the previous layer
		this.out_sx = conf.out_sx;
		this.out_sy = conf.out_sy;
		this.out_depth = conf.out_depth;
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
      var Z_data = this.V_out_data;
      var N = V_in.data.length;
      var V_in_drv = global.zeros(N); // zero out gradient wrt data
      for(var i=0;i<N;i++) {
        if(Z_data[i] <= 0) V_in_drv[i] = 0; // threshold
        else V_in_drv[i] = Z_drv[i];
      }
      this.V_in.drv = V_in_drv;
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

      V_in_drv = global.zeros(this.V_in.data.length); // zero out the gradient of input Vol

      for(var i=0;i<this.out_depth;i++) {
        var indicator = i === y ? 1.0 : 0.0;
        V_in_drv[i] = -(indicator - this.Z_data[i]);
      }
      // compute and accumulate gradient wrt weights and bias of V_in layer (previous layer)
      this.V_in.drv = V_in_drv;

      // loss is the class negative log likelihood
      return -Math.log(this.V_out.data[y]);
    },
  };

  var LinearLayer = function (conf) {
  	this.out_sx = conf.out_sx;
		this.out_sy = conf.out_sy;
		this.out_depth = conf.out_depth;
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
			var Z_data = this.V_out.data;
      var V_in_drv = global.zeros(N); // zero out gradient wrt data
			var N = this.V_in.data.length;
			Y = typeof Y === "number" ? [Y] : Y;
			var loss = 0.0;
			for(var i=0;i<N;i++) {
	      var drv = Z_data[i] - Y[i];
        V_in_drv[i] = drv;
        loss += (drv*drv)/2.0
      }
      this.V_in.drv = V_in_drv;
			return loss;
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
    // store switches for x,y coordinates for where the max comes from, for each output neuron
    // this.switchx = global.zeros(this.out_sx*this.out_sy*this.out_depth);
    // this.switchy = global.zeros(this.out_sx*this.out_sy*this.out_depth);
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
      var n = 0; //index for max_pos;
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
                  v = V.get(fx,fy,d); // try function call here. compared with non function call later
                  // v = V.data[((in_sx * fy)+fx)+in_sx*in_sy*d];
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
            Z.set(ox,oy,d, max_v);
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
  }

  global.PoolLayer = PoolLayer;

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

var V = new mlitb.Vol(1,1,2, 1);
var FC = new mlitb.FullConnLayer({'in_neurons':2,'n_neurons' : 3});
var FCfw = FC.forward(V);
console.log(FCfw);
var SIG = new mlitb.SigmoidLayer({'out_sx':1,'out_sy' : 1, 'out_depth' : 3});
var SIGfw = SIG.forward(FCfw);
console.log(SIGfw);
SIG.V_out.data = [0.5, 0.5, 0.5];
var target = [1.0, 1.0, 1.0];
var SIGbw = SIG.backward(target);
console.log(SIG.V_in);
console.log(SIGbw);
var FCbw = FC.backward();
console.log(FC.weights);
console.log(FC.V_in);

var inputpool = [1, 2, 3, 4, 5, 
								 5, 4, 3, 2, 1, 
								 9, 0, 0, 9, 0, 
								 0, 0, 0, 0, 0,
								 0, 0, 0, 0, 0, 

								 1, 2, 3, 4, 5, 
								 5, 4, 3, 2, 1, 
								 9, 0, 0, 9, 0, 
								 0, 0, 0, 0, 0,
								 0, 0, 0, 0, 0,]

var Vpool = new mlitb.Vol(5,5,2);

Vpool.data = inputpool;
console.log(Vpool.get(0,0,0));
console.log(Vpool.getIndex(1,1,1))
var pool = new mlitb.PoolLayer({'sx': 2,'in_sx' : 5, 'in_sy':5, 'in_depth': 2, 'stride':1});
var rp = pool.forward(Vpool)
console.log(rp.data);


//train network
