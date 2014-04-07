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