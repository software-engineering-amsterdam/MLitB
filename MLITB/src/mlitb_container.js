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