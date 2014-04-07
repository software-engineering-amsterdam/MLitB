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
