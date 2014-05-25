(function (global) {
	var clone = function (a) {
		var result = [];
		if (typeof a[0].length === 'undefined' && typeof a.length ==='number'){
			for (var i=0 ; i< a.length ; i++){
				result[i] = a[i];
			}
			return result;
		} else if (typeof a[0].length === 'number'){
			for (var i=0;i<a.length; i++){
				result[i] = []
				for (var j=0; j<a[0].length; j++)
					result[i][j] = a[i][j]
			}
			return result;
		}
		
	}
	// var zero = function (n, getVal) {
	// 	var res = [];
	// 	for (var i = 0; i < n; i++) {
	// 		res[i]=getVal();
	// 	}
	// 	return res;
	// }
	// var zeros = function (m,n, opt) {
	// 	var test = typeof n == 'number' ? opt : n;
	// 	var getVal = {};
	// 	if (typeof test === 'undefined' || test === 'zero')
	// 		getVal = function () {return 0;}
	// 	else if (test === 'random')
	// 		getVal = function () {return Math.random();}

	// 	if (typeof n === 'number'){
	// 		var res = [];
	// 		for (var i = 0; i < m; i++)
	// 			res[i] = zero(n,getVal)
	// 		return res;	
	// 	} else
	// 		return zero(m, getVal);
	// }


	var zeros = function(n) {
    if(typeof(n)==='undefined' || isNaN(n)) { return []; }
    if(typeof ArrayBuffer === 'undefined') {
      // lacking browser support
      var arr = new Array(n);
      for(var i=0;i<n;i++) { arr[i]= 0; }
      return arr;
    } else {
      return new Float64Array(n);
    }
  }

	var add = function (A, B) {
		if (typeof A === 'object' && typeof B === 'object'){
			var sa = size(A);
			var sb = size(B);
			
			if (sa[0] === sb[0] && sa[1] === sb[1]){
				var res = [];
				for (var i = 0; i < sa[0]; i++) {
					res[i] = [];
					for (var j = 0; j< sa[1]; j++)
						res[i][j] = A[i][j]+B[i][j];
				}
				return res;
			} else {
				console.log('ERROR!! matrix dimension does not match');
			}
		}else if (typeof A === 'object' && typeof B === 'number'){
			var sa = size(A);
			var res = [];
			for (var i = 0; i < sa[0]; i++) {
				res[i]=[];
				for (var j = 0; j < sa[1]; j++) {
					res[i][j] = A[i][j] + B;
				};
			}
			return res;
		}
	}

	var dot = function(m1, m2, opt){
		if (typeof m1==='number' && typeof m2==='number')
			return m1*m2
		else if (typeof m1==='object' && typeof m2 === 'number'){
			var m1 = typeof m1[0].length == 'undefined' ? [m1] : m1;	
			var res = [];
			for (var i = 0; i < m1.length; i++) {
				res[i] = [];
				for (var j = 0; j < m1[0].length; j++) {
					res[i][j] = m1[i][j]*m2;
				}
			}
			return res;
		} else {
			var m1 = typeof m1[0].length == 'undefined' ? [m1] : m1;
			var m2 = typeof m2[0].length == 'undefined' ? [m2] : m2;
			var s1 = size(m1);
			var s2 = size(m2);

			if (typeof opt === 'undefined' && s1[1] !== s2[0]) {
				console.log('ERROR!! matrix dimension does not match');
			} else if (opt === 'r' && s1[1] !== s2[1]) { //multiply with transposed right matrix
				console.log('ERROR!! matrix dimension does not match');
			} else if (opt === 'l' && s1[0] !== s2[0]) { //multiply with transposed left matrix
				console.log('ERROR!! matrix dimension does not match');
			} else{
				var result = [];
				var p = opt === 'l' ? s1[1] : s1[0];
				var q = opt === 'r'? s2[0] : s2[1];
				var r = opt === 'l' ? s1[0] : s1[1];
				if (typeof opt === 'undefined')
					var getDot = function(m1,m2,i,j,k){return m1[i][k] * m2[k][j];}
				else if (opt === 'r') 
					var getDot = function(m1,m2,i,j,k){return m1[i][k] * m2[j][k];}
				else if (opt === 'l')
					var getDot = function(m1,m2,i,j,k){return m1[k][i] * m2[k][j];}
    		for (var i = 0; i < p; i++) {
        	result[i] = [];
        	for (var j = 0; j < q; j++) {
        		var sum = 0;
        		for (var k = 0; k < r; k++) {
        			sum += getDot(m1,m2,i,j,k)
        		}
        		result[i][j] = sum;
        	}
    		}
    		return result.length === 1 ? result[0] : result; 
			}
		}
	}

	var size = function (m) {
		var m = typeof m[0].length == 'undefined' ? [m] : m
		return [m.length, m[0].length];
	}

	var normalize = function (arr, LB, UB) {
		var max = Math.max.apply(null, arr);
		var min = Math.min.apply(null, arr);
		var result = []
		for (var i=0; i<arr.length; i++){
			result.push((arr[i] - min)/(max - min)*(UB - LB)+LB)
		}
		return result
	}

	var checkGrad = function () {
		// body...
	}

	// Random number utilities
  var return_v = false;
  var v_val = 0.0;
  var gaussRandom = function() {
    if(return_v) { 
      return_v = false;
      return v_val; 
    }
    var u = 2*Math.random()-1;
    var v = 2*Math.random()-1;
    var r = u*u + v*v;
    if(r == 0 || r > 1) return gaussRandom();
    var c = Math.sqrt(-2*Math.log(r)/r);
    v_val = v*c; // cache this
    return_v = true;
    return u*c;
  }
  var randf = function(a, b) { return Math.random()*(b-a)+a; }
  var randi = function(a, b) { return Math.floor(Math.random()*(b-a)+a); }
  var randn = function(mu, std){ return mu+gaussRandom()*std; }

	global.zeros = zeros;
	global.dot = dot;
	global.add = add;
	global.normalize = normalize;
	global.clone = clone;
	global.randf = randf;
	global.randi = randi;
	global.randn = randn;
})(mlitb);
