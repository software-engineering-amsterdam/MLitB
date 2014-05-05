(function (global) {
	"use strict";
	var SGDTrainer = function (net, conf) {
		this.net = net;
		this.loss =0;

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
			this.net.forward(X, true);
			this.loss += this.net.backward(Y);
			// console.log('loss : '+loss);
			this.iteration++;
			if (this.iteration % this.batch_size == 0){
				console.log('loss : '+this.loss/this.batch_size);
				this.loss = 0;
				//perform the update

				// console.log("initialize last grad");
				//initialize the last gradient for the first time
				var pgs = this.net.getParamsAndGrads();
				
				if (this.last_grads.length == 0 && this.momentum > 0.0){
					for (var i = 0; i < pgs.length; i++) {
						// console.log(global.zeros(6));
						// console.log(global.zeros(pgs[i].grads.length));
						this.last_grads.push(global.zeros(pgs[i].grads.length));
					};
				}

				// console.log("update param");
				// console.log(this.last_grads);
				//iterate over each param and grad vector
				for (var i = 0; i < pgs.length; i++) {
					var pg = pgs[i];
					var p = pg.params;
					var g = pg.grads;
					
					var plen = p.length;
					var lg = this.last_grads[i];
					for (var j = 0; j < plen; j++) {
						//use normal equation for momentum.
						// console.log("i,j : "+i+" -- "+j)
						// console.log("get params");
						// console.log(g);
						var lgj = lg[j];
						// if (isNaN(g[j])){
						// 	console.log("NaN Value here");
						// 	console.log(i+" "+j);
						// 	console.log(g[j]);
						// }
						// console.log("lr "+this.learning_rate);
						// console.log("g "+g[j]);
						// console.log("batch "+this.batch_size);
						// console.log("momentum "+this.momentum);
						// console.log("lgj "+lgj);
						var dw = (1.0-this.momentum)*this.learning_rate*(g[j]/this.batch_size)+this.momentum*lgj;
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