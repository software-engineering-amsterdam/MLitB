/*
	Implementation from
	http://www.searsmerritt.com/blog/2013/7/parallel-stochastic-gradient-descent-for-logistic-regression-in-python
*/

importScripts('sylvester.js');

function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

random_array = function(n) {
	// array with random numbers [0..1]
	return Array.apply(null, Array(n)).map(function (_, i) {
		return Math.random();
	});
};

arange = function(n) {
	// similar to python arange
	return Array.apply(null, Array(n)).map(function (_, i) {
		return i;
	});
}

h = function(x, theta) {
	// hypothesis function
	var s = theta.x(-1.0);
	var exp = x.x(theta.x(-1.0)).elements[0]
	return 1.0 / (1.0 + Math.pow(Math.E, exp));
};

sgd = function(x, y, a, iter) { 

	var dim = x.dimensions();
	var m = dim.rows;
	var n = dim.cols;

	var theta = $M(random_array(n));
	var z = arange(m);
	for(i = 0; i < iter; i++) {
		// randomizing happens by shuffling indices, not the elements themselves.
		z = shuffle(z);
		for(j = 0; j < z.length; j++) {
			var idx = z[j];
			var xe = $M(x.elements[idx]).transpose();
			var ye = $M(y.elements[idx]).elements[0][0];
			
			var cost = xe.x( a * (ye - (h(xe,theta))) ).elements[0];
			theta = theta.add(cost);
		}
	}
	return theta;
}

this.onmessage = function(e) {
	var job = JSON.parse(e.data.d);
	var x = $M(job.x);
	var y = $M(job.y);
	var theta = sgd(x, y, job.a, job.iter);
	var JSONtheta = JSON.stringify(theta.elements);
	this.postMessage({id: e.data.id, d: JSONtheta});
}