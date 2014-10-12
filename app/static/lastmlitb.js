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
    //  var res = [];
    //  for (var i = 0; i < n; i++) {
    //      res[i]=getVal();
    //  }
    //  return res;
    // }
    // var zeros = function (m,n, opt) {
    //  var test = typeof n == 'number' ? opt : n;
    //  var getVal = {};
    //  if (typeof test === 'undefined' || test === 'zero')
    //      getVal = function () {return 0;}
    //  else if (test === 'random')
    //      getVal = function () {return Math.random();}

    //  if (typeof n === 'number'){
    //      var res = [];
    //      for (var i = 0; i < m; i++)
    //          res[i] = zero(n,getVal)
    //      return res; 
    //  } else
    //      return zero(m, getVal);
    // }

    var clone_obj = function(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = global.clone_obj(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = global.clone_obj(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
  }

    var zeros = function(n) {
    // if(typeof(n)==='undefined' || isNaN(n)) { return []; }
    // if(typeof ArrayBuffer === 'undefined') {
    //   // lacking browser support
    //   var arr = new Array(n);
    //   for(var i=0;i<n;i++) { arr[i]= 0; }
    //   return arr;
    // } else {
    //   return new Float64Array(n);
    // }
    var arr = new Array(n);
    for(var i=0;i<n;i++) { arr[i]= 0; }
    return arr;
  }

  var Vector = function(item){
    this.v = item;
  }

  Vector.prototype = {
    add : function(other){
        result = global.zeros(l);
        var l = this.v.length;
        if (l == other.length){
            for (var i = 0; i < l; i++) {
                result[i] = this.v[i]+other[i];
            };
            
        } else if (typeof other==='number'){
            for (var i = 0; i < l; i++) {
                result[i] = this.v[i]+other;
            };
        }
        return result;
    },
    divide : function(other){
        result = global.zeros(l);
        var l = this.v.length;
        if (l == other.length){
            for (var i = 0; i < l; i++) {
                result[i] = this.v[i]/other[i];
            };
            
        } else if (typeof other==='number'){
            for (var i = 0; i < l; i++) {
                result[i] = this.v[i]/other;
            };
        }
        return result;
    }
  };

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
    global.Vector = Vector;
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
        },
        toJSON: function() {
      // todo: we may want to only save d most significant digits to save space
      var json = {}
      json.sx = this.sx; 
      json.sy = this.sy;
      json.depth = this.depth;
      json.data = this.data;
      return json;
      // we wont back up gradients to save space
    },
    fromJSON: function(json) {
      this.sx = json.sx;
      this.sy = json.sy;
      this.depth = json.depth;
      this.data = json.data;
      this.drv = global.zeros(this.data.length);
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
    this.conf_idx = conf.conf_idx;
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
    },
    getGrads : function () {
      return [];
    },
    getParams : function () {
      return [];
    },
    toJSON: function() {
      // todo: we may want to only save d most significant digits to save space
      var json = {}
      json.out_sx = this.out_sx;
      json.out_sy = this.out_sy;
      json.out_depth = this.out_depth;
      json.layer_type = this.layer_type;
      return json;
      // we wont back up gradients to save space
    },
    fromJSON: function(json) {
      this.out_sx = json.out_sx;
      this.out_sy = json.out_sy;
      this.out_depth = json.out_depth;
      this.layer_type = json.layer_type;
    }
  }

  global.InputLayer = InputLayer;

})(mlitb);
(function (global) {
  "use strict";
  var Vol = global.Vol;
  var ConvLayer = function (conf) {
    var conf = conf || {};
    //required
    this.conf_idx = conf.conf_idx;
    this.sx = conf.sx;
    this.in_sx = conf.in_sx;
    this.in_sy = conf.in_sy;
    this.in_depth = conf.in_depth;    
    this.out_depth = conf.filters;
    this.n_params = conf.filters;
    this.n_biases = 1;
    this.is_train = typeof conf.is_train !== 'undefined' ? conf.is_train : true; //default : train every layer
    //optional
    this.sy = typeof conf.sy !== 'undefined' ? conf.sy : conf.sx; //default is the same size with x
    this.stride = (typeof conf.stride !== 'undefined' && conf.stride <= Math.min(this.sx,this.sy)) ? conf.stride : 1; //default stride is 1 

    
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
                    a+=f.data[fi]*V.data[((V.sx * iy)+ix)+V.sx*V.sy*id]; //faster
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
                    f.drv[fi]+= V_in.data[((V_in.sx * iy)+ix)+V_in.sx*V_in.sy*id]*V_out.drv[oi];
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
      if (this.is_train){
        for (var i = 0; i < this.filters.length; i++) {
          out.push({params : this.filters[i].data, grads : this.filters[i].drv});
        };
        out.push({params : this.biases.data, grads : this.biases.drv});    
      }
      return out;
    },

    setParamsAndGrads : function (json, is_initialization) {
      if (this.is_train || is_initialization){
        for (var i = 0; i < this.filters.length; i++) {
          this.filters[i].data = json[i].params;
        };
        this.biases.data = json[json.length-1].params;
      }
      for (var i = 0; i < this.filters.length; i++) {
        this.filters[i].drv = json[i].grads;
      };
      this.biases.drv = json[json.length-1].grads;
    },

    getGrads : function () {
      var out = [];
      if (this.is_train){
        for (var i = 0; i < this.filters.length; i++) {
          out.push(this.filters[i].drv);
        };
        out.push(this.biases.drv);
      }
      return out;
    },

    setParams : function (json, is_initialization) {
      if (this.is_train || is_initialization){
        for (var i = 0; i < this.filters.length; i++) {
          this.filters[i].data = json[i];
        };
        // i should be filters.length
        this.biases.data = json[i];
      }
      for (var i = 0; i < this.filters.length; i++) {
        this.filters[i].drv = global.zeros(json[i].length);
      };
      // i should be filters.length
      this.biases.drv = global.zeros(json[i].length);
    },

    getParams : function () {
      var out = [];
      for (var i = 0; i < this.filters.length; i++) {
        out.push(this.filters[i].data);
      };
      out.push(this.biases.data);
      return out;
    },

    toJSON: function() {
      var json = {};
      json.sx = this.sx; // filter size in x, y dims
      json.sy = this.sy;
      json.stride = this.stride;
      json.in_depth = this.in_depth;
      json.out_depth = this.out_depth;
      json.out_sx = this.out_sx;
      json.out_sy = this.out_sy;
      json.layer_type = this.layer_type;
      json.conv_type = this.conv_type
      json.n_params = this.n_params;
      json.n_biases = this.n_biases;
      json.is_train = this.is_train;
      // json.l1_decay_mul = this.l1_decay_mul;
      // json.l2_decay_mul = this.l2_decay_mul;
      json.filters = [];
      for(var i=0;i<this.filters.length;i++) {
        json.filters.push(this.filters[i].toJSON());
      }
      json.biases = this.biases.toJSON();
      return json;
    },
    fromJSON: function(json) {
      this.out_depth = json.out_depth;
      this.out_sx = json.out_sx;
      this.out_sy = json.out_sy;
      this.layer_type = json.layer_type;
      this.conv_type = json.conv_type;
      this.sx = json.sx; // filter size in x, y dims
      this.sy = json.sy;
      this.stride = json.stride;
      this.in_depth = json.in_depth; // depth of input volume
      this.n_params = json.n_params;
      this.n_biases = json.n_biases;
      this.is_train = json.is_train;
      this.filters = [];
      // this.l1_decay_mul = typeof json.l1_decay_mul !== 'undefined' ? json.l1_decay_mul : 1.0;
      // this.l2_decay_mul = typeof json.l2_decay_mul !== 'undefined' ? json.l2_decay_mul : 1.0;
      for(var i=0;i<json.filters.length;i++) {
        var v = new Vol(0,0,0,0);
        v.fromJSON(json.filters[i]);
        this.filters.push(v);
      }
      this.biases = new Vol(0,0,0,0);
      this.biases.fromJSON(json.biases);
    }
  };
  global.ConvLayer = ConvLayer;
})(mlitb);
(function (global) {
  "use strict";
  var Vol = global.Vol;
  var FullConnLayer = function (conf) {
    var conf = conf || {};
    // assume conf contains information about the number of neurons and also the number connection come to each neuron
    this.conf_idx = conf.conf_idx;
    this.in_neurons = conf.in_neurons; //now we use in_neuron first, probably next we will use in_sx, in_sy, in_depth directly
    this.out_depth = typeof conf.num_neurons !== 'undefined' ? conf.num_neurons : 0;
    this.out_sx = 1;
    this.out_sy = 1;
    this.filters = new global.Vol(1, this.in_neurons, this.out_depth); // we assume y as the number of connection come to this layer
    this.biases = new global.Vol(1,1, this.out_depth, 0.1);
    this.n_params = 1;
    this.n_biases = 1;
    this.layer_type = 'fc';
    this.is_train = typeof conf.is_train !== 'undefined' ? conf.is_train : true; //default : train every layer
  }

  FullConnLayer.prototype = {
    forward : function (V, is_training) {
      this.V_in = V;
      var in_data = V.data; //since full conn, dimension is not important, can traverse and calculate directly without get method
      var Out = new global.Vol(1, 1, this.out_depth);
      var out_data = Out.data;
      var w = this.filters.data;
      var biases = this.biases;
      var idx = 0;
      for (var i = 0, m = this.out_depth; i < m; i++) {
        var a = 0.0;
        for (var j = 0, n= this.in_neurons;  j< n; j++, idx++) {
          //a += in_data[j]*filters.get(0, j, i) //function call here.. if take long time, than modif this later
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
      var w = this.filters.data;
      var dw = this.filters.drv
      var db = this.biases.drv;
      var in_data = this.V_in.data
      var idx = 0;
      for (var i = 0, m = this.out_depth; i < m; i++) {
        var delta = this.V_out.drv[i];
        for (var j = 0, n=this.in_neurons; j< n; j++,idx++) {
          drv[j] += delta*w[idx]; //delta * w  why do we accumulate this one?
          dw[idx] += delta*in_data[j]; //derivative w.r.t filters = delta*z -- accumulate for batch learning
        };
        db[i] += delta;
      };

    },
    addNeuron : function(N){
      this.out_depth+=N;
      var addedFilter = new global.Vol(1, this.in_neurons, N);
      this.filters.data = this.filters.data.concat(addedFilter.data);
      this.filters.drv = this.filters.drv.concat(addedFilter.drv);
      var addedBias = new global.Vol(1,1, N, 0.1);
      this.biases.data = this.biases.data.concat(addedBias.data);
      this.biases.drv = this.biases.drv.concat(addedBias.drv);
    },

    getParamsAndGrads : function () {
      var out = []
      out.push({params : this.filters.data, grads : this.filters.drv});
      out.push({params : this.biases.data, grads : this.biases.drv});
      return out;
    },
    setParamsAndGrads : function (json, is_initialization) {
      if (this.is_train || is_initialization){
        this.filters.data = json[0].params;  
        this.biases.data = json[1].params;
      }
      this.filters.drv = json[0].grads;
      this.biases.drv = json[1].grads;
    },
    getGrads : function () {
      var out = []
      if (this.is_train){
        out.push(this.filters.drv);
        out.push(this.biases.drv);
      }
      return out;
    },

    setParams : function (json, is_initialization) {
      if (this.is_train || is_initialization){
        this.filters.data = json[0];
        this.biases.data = json[1];
      }
      this.filters.drv = global.zeros(json[0].length);
      this.biases.drv = global.zeros(json[1].length);
    },
    getParams : function () {
      var out = []
      out.push(this.filters.data);
      out.push(this.biases.data);
      return out;
    },
    toJSON: function() {
      var json = {};
      json.in_neurons = this.in_neurons;
      json.out_depth = this.out_depth;
      json.out_sx = this.out_sx;
      json.out_sy = this.out_sy;
      json.filters = this.filters.toJSON();
      json.biases = this.biases.toJSON();
      json.layer_type = this.layer_type;
      json.n_params = this.n_params;
      json.n_biases = this.n_biases;
      json.is_train = this.is_train;
      return json;
    },
    fromJSON: function(json) {
      this.in_neurons = json.in_neurons;
      this.out_depth = json.out_depth;
      this.out_sx = json.out_sx;
      this.out_sy = json.out_sy;
      this.filters = new Vol(0,0,0,0);
      this.filters.fromJSON(json.filters);
      this.biases = new Vol(0,0,0,0);
      this.biases.fromJSON(json.biases);
      this.layer_type = json.layer_type;
      this.n_params = json.n_params;
      this.n_biases = json.n_biases;
      this.is_train = json.is_train;
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
    var conf = conf || {};
    // assume conf contains information about the number of neurons and also the number connection come to each neuron
    this.conf_idx = conf.conf_idx;
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
    },

    getGrads : function () {
      return [];
    },

    setParams : function (json) {
    },
    getParams : function () {
      return [];
    },

    toJSON : function(){
      json = {};
      json.out_sx = this.out_sx;
      json.out_sy = this.out_sy;
      json.out_depth = this.out_depth;
      json.layer_type = this.layer_type;
      return json;
    },
    fromJSON : function(json){
      this.out_sx = json.out_sx;
      this.out_sy = json.out_sy;
      this.out_depth = json.out_depth;
      this.layer_type = json.layer_type;
    }
  };

  var ReLuLayer = function (conf) {
    var conf = conf || {};
    //need information about neuron dimension, from the previous layer
    this.conf_idx = conf.conf_idx;
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
        if (V_in_data[i]<=0)  {Z_data[i] = 0}
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
    },

    getGrads : function () {
      return [];
    },

    setParams : function (json) {
    },
    getParams : function () {
      return [];
    },

    toJSON : function(){
      var json = {};
      json.out_sx = this.out_sx;
      json.out_sy = this.out_sy;
      json.out_depth = this.out_depth;
      json.layer_type = this.layer_type;
      return json;
    },
    fromJSON : function(json){
      this.out_sx = json.out_sx;
      this.out_sy = json.out_sy;
      this.out_depth = json.out_depth;
      this.layer_type = json.layer_type;
    }
  };

  var SoftmaxLayer = function(conf) {
    var conf = conf || {};

    // computed
    this.conf_idx = conf.conf_idx;
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
      // return -Math.log(this.V_out.data[y]);
      // to avoid infinity
      return 1-this.V_out.data[y];
    },
    addNeuron : function(N){
      this.num_inputs +=N; 
      this.out_depth = this.num_inputs; 
    },
    getParamsAndGrads : function () {
      return [];
    },

    getGrads : function () {
      return [];
    },

    setParams : function (json) {
    },
    getParams : function () {
      return [];
    },

    toJSON : function(){
      var json = {};
      json.num_inputs = this.num_inputs;
      json.out_sx = this.out_sx;
      json.out_sy = this.out_sy;
      json.out_depth = this.out_depth;
      json.layer_type = this.layer_type;
      return json;
    },
    fromJSON : function(json){
      this.num_inputs = json.num_inputs;
      this.out_sx = json.out_sx;
      this.out_sy = json.out_sy;
      this.out_depth = json.out_depth;
      this.layer_type = json.layer_type;
    }
  };

  var LinearLayer = function (conf) {
    var conf = conf || {};
    this.conf_idx = conf.conf_idx;
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
    },

    getGrads : function () {
      return [];
    },

    setParams : function (json) {
    },
    getParams : function () {
      return [];
    },

    toJSON : function(){
      var json = {};
      json.out_sx = this.out_sx;
      json.out_sy = this.out_sy;
      json.out_depth = this.out_depth;
      json.layer_type = this.layer_type;
      return json;
    },
    fromJSON : function(json){
      this.out_sx = json.out_sx;
      this.out_sy = json.out_sy;
      this.out_depth = json.out_depth;
      this.layer_type = json.layer_type;
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
    this.conf_idx = conf.conf_idx;
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
            for (var fyy = sty; fyy < this.sy+sty; fyy++) {
              for (var fxx = stx; fxx < this.sx+stx; fxx++) {
                var v = -999999999.0;
                var fx = fxx - hx;
                var fy = fyy - hy;
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
    },

    getGrads : function () {
      return [];
    },

    setParams : function (json) {
    },
    getParams : function () {
      return [];
    },

    toJSON : function(){
      var json = {};
      json.sx = this.sx;
      json.in_depth = this.in_depth;
      json.in_sx = this.in_sx;
      json.in_sy = this.in_sy;
      json.sy = this.sy;
      json.stride = this.stride;
      json.ignore_border = this.ignore_border;
      json.pool_type = this.pool_type;
      json.out_depth = this.out_depth;
      json.out_sx = this.out_sx;
      json.out_sy = this.out_sy;
      json.layer_type = this.layer_type;
      return json;
    },
    fromJSON : function(json){
      this.sx = json.sx; // filter size
      this.in_depth = json.in_depth;
      this.in_sx = json.in_sx;
      this.in_sy = json.in_sy;
      this.sy = json.sy;
      this.stride = json.stride;
      this.ignore_border = json.ignore_border;
      this.pool_type = json.pool_type;
      this.out_depth = json.out_depth;
      this.out_sx = json.out_sx;
      this.out_sy = json.out_sy;
      this.max_pos_x = global.zeros(this.out_sx*this.out_sy*this.out_depth);
      this.max_pos_y = global.zeros(this.out_sx*this.out_sy*this.out_depth);
      this.layer_type = json.layer_type;
    }
  },


  global.PoolLayer = PoolLayer;

})(mlitb);
(function (global) {
  "use strict";
  var Vol = global.Vol;

  var DropoutLayer = function (conf) {
    var conf = conf || {};
    this.conf_idx = conf.conf_idx;
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
      this.V_in = V;
      var Z = V.clone();

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
    },

    getGrads : function () {
      return [];
    },

    setParams : function (json) {
    },
    getParams : function () {
      return [];
    },

    toJSON : function(){
      var json = {};
      json.out_depth = this.out_depth;
      json.out_sx = this.out_sx;
      json.out_sy = this.out_sy;
      json.layer_type = this.layer_type;
      json.drop_prob = this.drop_prob;
      return json;
    },
    fromJSON : function(json){
      this.out_sx = json.out_sx;
      this.out_sy = json.out_sy;
      this.out_depth = json.out_depth;
      this.drop_prob = json.drop_prob;
      this.layer_type = json.layer_type;
      this.drop_index = [];
    }
      
  };
  global.DropoutLayer = DropoutLayer;
})(mlitb);
(function(global){
  var Net = function () {
    this.layers = [];
    this.layer_conf = [];
    this.conf = [];
    this.label2index = {}; //maps string label to index
    this.index2label = {}; //maps index to label
    
  }
  Net.prototype = {
    createLayers : function (conf) {
      this.layer_conf =this.parseConfs(conf);
      this.conf = conf; //original conf
      this.layers = []; //array of layer object
       //parsed layer config (e.g adding activation layer)
      this.constructNetwork(this.layer_conf,this.layers);
    },

    parseConfs : function(conf){
      //make sure the first layer is input type
      // if (conf[0].type !== 'input'){console.log('ERROR : First layer should be an input type layer')}
      var layer_conf = [];
      //add input, activation, and output layer
      for (var i = 0; i < conf.length; i++) {
        var c = conf[i];
        var conf_idx = i+this.conf.length;
        // var conf_idx =i;
        c.conf_idx = conf_idx;
        layer_conf.push(c);

        if (c.type === 'conv'){
          if (typeof c.activation !== 'undefined'){
            layer_conf.push({type : c.activation, conf_idx: conf_idx});
          } else {
            layer_conf.push({type : 'relu', conf_idx:conf_idx}); //default activation function for conv
          }
        } else if (c.type === 'fc'){
          if (typeof c.num_neurons === 'undefined'){
            c.num_neurons = 0;
          }
          if(c.num_neurons == null) {
            c.num_neurons = 0; 
          }
          if (typeof c.activation !== 'undefined'){
            layer_conf.push({type : c.activation, conf_idx:conf_idx});
          } else {
            layer_conf.push({type : 'linear', conf_idx:conf_idx}); //default activation function for fc
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
            layer_conf.push({type : 'dropout', drop_prob : drop_prob, conf_idx:conf_idx})
          }
        }
      };
      return layer_conf; //this structure can be saved and loaded in the future
    },

    constructNetwork : function(layer_conf,layers){
      //layer_conf is a list outputed by createLayers function
      //This function will construct Network as defined in this.layer_conf
      //This function can be called directly if we want to load prevous saved configuration
      var s = layers.length; //current layers size
      for (var i = 0; i < layer_conf.length; i++) {
        var conf = layer_conf[i];
        //complete the configuration details
        if (conf.type!=='input'){
          // console.log(i);
          var pl = layers[s+i-1]; //previous layer
          conf.in_sx = pl.out_sx;
          conf.in_sy = pl.out_sy
          conf.in_depth = pl.out_depth;
          conf.in_neurons = pl.out_sx*pl.out_sy*pl.out_depth;
        }
        
        if (conf.type === 'fc'){layers.push(new global.FullConnLayer(conf));}
        else if (conf.type === 'conv'){layers.push(new global.ConvLayer(conf));}
        else if (conf.type === 'sigmoid'){layers.push(new global.SigmoidLayer(conf));}
        else if (conf.type === 'softmax'){layers.push(new global.SoftmaxLayer(conf));}
        else if (conf.type === 'linear'){layers.push(new global.LinearLayer(conf));}
        else if (conf.type === 'relu'){layers.push(new global.ReLuLayer(conf));}
        else if (conf.type === 'pool'){layers.push(new global.PoolLayer(conf));}
        else if (conf.type === 'dropout'){layers.push(new global.DropOutLayer(conf));}
        else if (conf.type === 'input'){layers.push(new global.InputLayer(conf));}
      };
      return layers;
    },

    removeLayer : function(rm_conf_idx){
      //can't remove input layer for now
      //right now only applicable to the last layer
      //it's a bit tricky to remove the middle layer
      if (rm_conf_idx==0){console.log('ERROR : Can not remove input layer');}
      else {
        //update this.conf
        this.conf.splice(rm_conf_idx,1);//remove item from config
        console.log('WARNING : Removing a layer will reset the weights connections between this layer and the next layer');
        var prev_layer = {};
        var next_layer = {};
        var removed_layers_idx = [];
        for (var i in this.layers){
          var l = this.layers[i]
          if (l.conf_idx < rm_conf_idx){prev_layer=l.conf_idx;}
          else if (l.conf_idx==rm_conf_idx){
            removed_layers_idx.push(i);
            console.log('remove layer : ',l.layer_type);
          }
          else if (l.conf_idx> rm_conf_idx){next_layer=l.conf_idx; break;}
        }
        //remove physical layer, splice from the first removed index, for length of removed index
        this.layers.splice(removed_layers_idx[0],removed_layers_idx.length);
        this.layer_conf.splice(removed_layers_idx[0],removed_layers_idx.length);
      }
      //default remove the last layer only fc and it's activation
      // this.layers = this.layers.slice(0,this.layers.length-2);
      // this.layer_conf = this.layer_conf.slice(0,this.layer_conf.length-2);
    },

    addLayer : function(conf){
      var old_size = this.layers.length;
      var add_layer = this.parseConfs(conf);
      for (i in conf){
        this.conf.push(conf[i]);
      }
      this.constructNetwork(add_layer,this.layers);

    },

    //update is_train after creating the network
    //so we could update is_train at anytime not only before creating the network
    updateLayerTrain : function(idx, value){
      this.conf[idx].is_train = value;

      for (var i in this.layers){

        if (this.layers[i].conf_idx==idx){
          this.layers[i].is_train=value;
          this.layer_conf[i].is_train=value;
        }
      }
    },

    addLabel : function(list_new_labels){
      //now this should work only for the last full con layer.
      var updatePos = 0;
      var N=0; //number of unique new labels
      var currentLabelSize = Object.keys(this.index2label).length;

      //add string label to label2index and index2label
      //only add neuron if new labels are not exist
      for (var i in list_new_labels){
        var lab=list_new_labels[i];
        if (! (lab in this.label2index)){
          var index=currentLabelSize+N;
          this.label2index[lab]= index;
          this.index2label[index]=lab;
          N+=1;
        }
      }

      //find position of the last fc layer
      for (var i = this.layers.length-1; i>=0;i--){
        if (this.layers[i].layer_type === 'fc'){
          updatePos=i;
          break;
        }
      }

      //add new neuron for the last fc and all layers after it

      for (var i = updatePos;i<this.layers.length;i++){
        //update physical layer
        this.layers[i].addNeuron(N);
        //update layer_conf
        this.layer_conf[i].num_neurons+=N;
      }

      return this.label2index;
    },

    setLabel : function(list_labels){
      var orderedLabel = [];
      for (var i=0;i<list_labels.length;i++){
        var lab = list_labels[i];
        if (! this.label2index.hasOwnProperty(lab)){
          this.label2index[lab]=i;
          this.index2label[i]=lab;
          orderedLabel.push(lab);  
        }
      }
      return this.label2index;
    },

    forward : function (X) {
      var Prev_out = X;
      for (var i = 0; i < this.layers.length; i++) {
        var V_out = this.layers[i].forward(Prev_out);
        Prev_out = V_out;
      };
    },

    backward : function (Y) {
      //get label if input not number. 
      //label2index must be set trough setLabel function
      Y = typeof Y === 'number' ? Y : this.label2index[Y]
      if (Y==='undefined'){console.log('Error : Label not found...')}
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
      return out;
    },
    setParamsAndGrads : function(json, is_initialization){
      //is_initialization=true will always allow to set the net parameter, even is_train='no'
      // console.log(JSON.stringify(json));
      is_initialization = typeof is_initialization !== 'undefined' ? is_initialization : false;
      var last_pos = 0;
      for (var i = 0; i < this.layers.length; i++) {
        if (this.layers[i].is_train && (this.layers[i].layer_type === 'conv' || this.layers[i].layer_type === 'fc')){
          total_params = this.layers[i].n_params + this.layers[i].n_biases;
          var newjson = json.slice(last_pos,total_params+last_pos);
          this.layers[i].setParamsAndGrads(newjson,is_initialization);
          last_pos +=total_params;
        }
      };
    },

    getGrads : function () {
      var out = [];
      for (var i = 0; i < this.layers.length; i++) {
        var o = this.layers[i].getGrads();
        for (var j = 0; j < o.length; j++) {
          out.push(o[j]);
        };
      };
      return out;
    },

    setParams : function (json, is_initialization) {
      is_initialization = typeof is_initialization !== 'undefined' ? is_initialization : false;
      var last_pos = 0;
      for (var i = 0; i < this.layers.length; i++) {

        if ((this.layers[i].is_train || is_initialization) && (this.layers[i].layer_type === 'conv' || this.layers[i].layer_type === 'fc')){
          total_params = this.layers[i].n_params + this.layers[i].n_biases;
          var newjson = json.slice(last_pos,total_params+last_pos);
          this.layers[i].setParams(newjson,is_initialization);
          last_pos +=total_params;
        }
      };
    },
    getParams : function () {
      var out = [];
      for (var i = 0; i < this.layers.length; i++) {
        var o = this.layers[i].getParams();
        for (var j = 0; j < o.length; j++) {
          out.push(o[j]);
        };
      };
      return out;
    },

    // download parameter and configuration
    // store it separately
    // oneshot learning
    // transform mnist data to {label : []}
    getConfigsAndParams : function(){
      var json = {};
      json.params = this.getParams();
      json.configs = this.conf;
      json.label2index = this.label2index;
      json.index2label = this.index2label;
      return json;
    },

    setConfigsAndParams : function(json){
      this.createLayers(json.configs);
      this.setParams(json.params,true);
      this.label2index=json.label2index;
      this.index2label=json.index2label;
    },
    
    toJSON: function() {
      var json = {};
      json.layers = [];
      for(var i=0;i<this.layers.length;i++) {
        json.layers.push(this.layers[i].toJSON());
      }
      json.layer_conf = this.layer_conf;
      json.label2index = this.label2index; //maps string label to numbers
      json.index2label = this.index2label;
      return json;
    },
    fromJSON: function(json) {
      this.label2index = json.label2index;
      this.index2label = json.index2label;
      this.layers = [];
      for(var i=0;i<json.layers.length;i++) {
        var Lj = json.layers[i]
        var t = Lj.layer_type;
        var L;
        if(t==='input') { L = new global.InputLayer(); }
        if(t==='relu') { L = new global.ReLuLayer(); }
        if(t==='sigmoid') { L = new global.SigmoidLayer(); }
        if(t==='dropout') { L = new global.DropOutLayer(); }
        if(t==='conv') { L = new global.ConvLayer(); }
        if(t==='pool') { L = new global.PoolLayer(); }
        if(t==='softmax') { L = new global.SoftmaxLayer(); }
        if(t==='linear') { L = new global.LinearLayer(); }
        if(t==='fc') { L = new global.FullConnLayer(); }
        L.fromJSON(Lj);
        this.layers.push(L);
      }
    }
  }
  global.Net = Net;
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
    this.last_params = [];
    this.sum_square_gads = [];
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
      // if (this.last_params.length == 0){
      //  var pgs = this.net.getParamsAndGrads();
      //  this.last_params =  pgs;
      // }
      if (this.iteration % this.batch_size == 0){
        // console.log('sample seen : ',this.iteration);
        // console.log('loss : ',this.loss/this.iteration);
        console.log('loss : ',this.loss/this.batch_size);
        this.loss = 0.0;
        //perform the update

        // console.log("initialize last grad");
        //initialize the last gradient for the first time
        var pgs = global.clone_obj(this.net.getParamsAndGrads());
        
        if (this.last_grads.length == 0 && this.momentum > 0.0){
          for (var i = 0; i < pgs.length; i++) {
            this.last_grads.push(global.zeros(pgs[i].grads.length));
            this.sum_square_gads.push(global.zeros(pgs[i].grads.length));
          };
        }

        //iterate over each param and grad vector
        for (var i = 0; i < pgs.length; i++) {
          var pg = pgs[i];
          var p = pg.params;
          var g = pg.grads;
          
          var plen = p.length;
          var lg = this.last_grads[i];
          var ssg = this.sum_square_gads[i];
          for (var j = 0; j < plen; j++) {
            this.l2_loss += this.l2_decay*p[j]*p[j];
            this.l1_loss += this.l1_decay*Math.abs(p[j]);
            var l2_grad = this.l2_decay*p[j];
            var l1_grad = this.l1_decay*(p[j]>0 ? 1 : -1);
            if (typeof lg[j]==='undefined'){
              lg.push(0.0);
            }
            var lgj = lg[j];
            if (typeof ssg[j]==='undefined'){
              ssg.push(0.0);
            }
            var tess = Math.sqrt(ssg[j]);
            // console.log('tess',tess);
            if (tess<=1){
              tess=1;
            }
            // var tess=1
            var dw = (1.0-this.momentum)*(this.learning_rate/tess)*((l1_grad+l2_grad+g[j])/this.batch_size)+this.momentum*lgj;
            p[j] -= dw;
            lgj = dw;
            g[j] = 0.0;
          };
        };
        this.net.setParamsAndGrads(pgs);
      }

    },
    reduce : function(markovResults){
      //for the first time, get parameter from Net
      if (this.last_params.length == 0){
        var pgs = this.net.getParamsAndGrads();
        this.last_params =  pgs;
      }
      
      //only the first time to initialize the last grad
      if (this.last_grads.length == 0 && this.momentum > 0.0){
        for (var i = 0; i < this.last_params.length; i++) {
          this.last_grads.push(global.zeros(pgs[i].grads.length));
        };
      }

      //iterate over each param and grad vector
      for (var i = 0; i < this.last_params.length; i++) {
        var pg =this.last_params[i];
        var p = pg.params;
        var g = pg.grads;
        for (var gi = 0; gi < g.length; i++) {
          total_gi = 0.0;
          for (var k = 0; k < markovResults.length; k++) {
            console.log('could be problem at below');
            total_gi+=markovResults[k].parameters[i].grads[gi];
          };
          g[gi] = total_gi;
        };
        
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
      //set the new parameter to the markovResults
      for (var i = 0; i < markovResults.length; i++) {
        markovResults[i].parameters = this.last_params;
      };
    }
  };
  global.SGDTrainer = SGDTrainer;
})(mlitb);

if(typeof(module) !== 'undefined') {
    module.exports = mlitb;
}
