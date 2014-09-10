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
				for (var i = 0; i < this.filters.length i++) {
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