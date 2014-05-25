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