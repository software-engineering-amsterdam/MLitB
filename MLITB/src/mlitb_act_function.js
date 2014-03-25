(function (global) {
	var fw_fn =  {
		sigmoid : function (a) {
			return 1/(1+Math.exp(-a));
		},

		sigmoid_bipolar : function (a) {
			return -1 + 2/(1 + Math.exp(-a));
		},

		linear : function (a) {
			return a
		}
	}

	var bw_fn = {
		sigmoid : function (a) {
			return (1/(1+Math.exp(-a)))*(1-1/(1+Math.exp(-a)));
		},

		sigmoid_bipolar : function (a) {
			return 0.5 * (1 + (-1 + 2/(1 + Math.exp(-a)))) * (1 - (-1 + 2/(1 + Math.exp(-a))) );
		},

		linear : function (a) {
			return 1
		}
	}

	global.fw_fn = fw_fn;
	global.bw_fn = bw_fn;
})(mlitb);