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