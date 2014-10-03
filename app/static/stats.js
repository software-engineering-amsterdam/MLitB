importScripts('lastmlitb.js')

var Net, conf;

var discrete_loss,piece;
var lastParameter;
var log_list = [];
var is_initialized = false;
var nData;
var configuration;
var vol_input;

var test_data = [];

var labels = [];

var interrupt = false; // used for extraction of parameters

var data = function(d) {

  labels = d.labels;

  if(!test_data.length) {
    console.log('no test data');
    return;
  }

  if(d.step == 0) {
       is_initialized = false;
  }

  if (!is_initialized) { 

    configuration = d.configuration;
    

    // squish configuration
    conf = [];
    for(var i = 0; i < configuration.length; i++) {
      layer = configuration[i].conf;
      layer.type = configuration[i].type;
      conf.push(layer);
    }

    Net = new mlitb.Net();  
    Net.createLayers(conf);

    vol_input = configuration[0].conf;
    is_initialized = true;      

  }

  // add labels, new or not
  Net.addLabel(labels);

  if (d.parameters !== null) {
    // copy the parameters and gradients
    Net.setParams(d.parameters);
  }

  var l=test_data.length;
  discrete_loss = 0;
  while (l-- && !interrupt){

    piece = test_data[l];
    Input = new mlitb.Vol(vol_input.sx, vol_input.sy, vol_input.depth, 0.0);
    Input.data = piece.data;
    Net.forward(Input);

    var predictions = Net.getPrediction().data;
    var predicted_index = 0;

    var j = predictions.length;

    while(j--) {
      if(predictions[j] > predictions[predicted_index]) {
        predicted_index = j;
      }
    }

    var predicted_label = Net.index2label[predicted_index];

    discrete_loss += predicted_label == piece.label ? 0 : 1;

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
      step : d.step
    }
  });

}

var fileupload = function(data) {

    test_data = data;
    nData = test_data.length;

}

var download_parameters = function() {

    interrupt = true;

    var a = Net.getConfigsAndParams();

    this.postMessage({
      type: 'download_parameters',
      data: a
    });

    interrupt = false;

}

this.onmessage = function(e) {
    
    if(e.data.type == 'data') {
        data(e.data.data);
    } else if(e.data.type == 'fileupload') {
        fileupload(e.data.data);
    } else if(e.data.type == 'download_parameters') {
        download_parameters();
    }

}