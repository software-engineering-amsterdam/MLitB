importScripts('/js/last_mlitb.js')

var Net, conf;

var discrete_loss,piece;
var lastParameter;
var log_list = [];
var is_initialized = false;
var nData;

test_data = [];

var data = function(data) {

  if(!test_data.length) {
  	return;
  }

  if(data.step == 0) {
	is_initialized = false;
  }

  if (!is_initialized) { 

    Net = new mlitb.Net();
    conf = []
    conf.push({type : 'input', sx : 28, sy:28, depth :1});
    conf.push({type : 'conv', sx : 5, stride : 1, filters : 8, activation : 'relu'});
    conf.push({type : 'pool', sx : 2, stride : 2});
    conf.push({type : 'conv', sx : 5, stride : 1, filters : 16, activation : 'relu'});
    conf.push({type : 'pool', sx : 3, stride : 3});
    conf.push({type : 'fc', num_neurons : 10, activation : 'relu'});
    conf.push({type : 'fc', num_neurons : 10, activation : 'softmax'});
    
    Net.createLayers(conf);

    is_initialized = true;      

  }

  if (data.parameters !== 0.0) {
    // copy the parameters and gradients
    Net.setParams(data.parameter.parameter.parameters);
  }

  var l=test_data.length;
  discrete_loss = 0;
  while (l--){
    piece = test_data[l];
    Input = new mlitb.Vol(28,28,1, 0.0);
    Input.data = piece.data;
    Net.forward(Input);
    var arr = Net.getPrediction().data;
    var pred_val = arr[piece.label];
    var pred_label =0;
    for (var j = 1; j < arr.length; j++) {
      if (arr[j]>arr[pred_label]){pred_label = j}
    };
    discrete_loss += pred_label == piece.label ? 0 : 1;
  }
  
  //console.log('Misclassify : '+discrete_loss);

  delta = 0.0;
  if(lastParameter) {
    delta = discrete_loss - lastParameter;
    delta = delta.toFixed(3);
  }

  lastParameter = discrete_loss;

  this.postMessage({
    data: {
    	discrete_loss: discrete_loss,
    	delta: delta,
      nData : nData,
      step : data.step
    }
  });

}

var fileupload = function(data) {

	test_data = data;
  nData = test_data.length;

}

this.onmessage = function(e) {
	
	if(e.data.type == 'data') {
		data(e.data.data);
	} else if(e.data.type == 'fileupload') {
		fileupload(e.data.data);
	}

}