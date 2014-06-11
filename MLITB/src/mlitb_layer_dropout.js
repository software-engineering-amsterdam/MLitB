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