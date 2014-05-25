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