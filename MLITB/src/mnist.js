var conf = []

conf.push({type : 'input', sx : 28, sy:28, depth :1});
conf.push({type : 'conv', sx : 5, stride : 1, filters : 8, activation : 'relu'});
conf.push({type : 'pool', sx : 2, stride : 2});
conf.push({type : 'conv', sx : 5, stride : 1, filters : 16, activation : 'relu'});
conf.push({type : 'pool', sx : 3, stride : 3, drop_prob : 0.5});
// conf.push({type : 'fc', num_neurons : 10, activation : 'relu'});
conf.push({type : 'fc', num_neurons : 10, activation : 'softmax'});

var Net = new mlitb.Net();
Net.createLayers(conf);
var SGD = new mlitb.SGDTrainer(Net, {learning_rate : 0.1, batch_size : 16, l2_decay : 0.001});


var PNG = require('png-js');
// PNG.decode(filename, function(pixels) {}

var train_labels = require('../../Data/Mnist/mnist_train_labels.json');
var test_labels = require('../../Data/Mnist/mnist_test_labels.json');
console.log(train_labels.length);
console.log(test_labels.length);

var loadedImages = [];
var testImages = [];
var parsePNG = function(filename, ln, storage, isGrayscale){
  var gs = typeof isGrayscale !== 'undefined' ? isGrayscale : true
  PNG.decode(filename, function(pixels) {
    // pixels is a 1d array of decoded pixel data
    var nImages = pixels.length/4/ln; //4 is rgba
    var n = ln;
    for (var i = 0; i< nImages; i++) {
      var image = mlitb.zeros(784);
      for (var k=0,j = i*n*4; j < (i+1)*n*4; j+=4,k++) {
        //for grayscale, RGB have the same value
        R = pixels[j]/255.0;
        // console.log(R);
        // G = pixels[j+1];
        // B = pixels[j+2];
        // A = pixels[j+3];
        image[k]=R;
      };
      storage.push(image);
    };
  }); 
  // return images;
}



parsePNG('../../Data/Mnist/mnist_train_all.png',784, loadedImages);
parsePNG('../../Data/Mnist/mnist_test_all.png',784, testImages);
var checkLoading = function () {
  if (loadedImages.length==60000){
    console.log('masuk');
    sampleAndTrainBatches();
  } else {
    console.log(loadedImages.length);
    setTimeout(checkLoading, 100);
  }
}
checkLoading();
var sampleAndTrainBatches = function () {
  var bi = Math.floor(Math.random()*20);
  var startIndex = bi*3000;
  var epoch = 100;
  var nTest = 100;
  var nTrain = 100;
  var correctTrain = 0;
  // var labelSI = bi*3000
  var it=1;
  for (var ep = 0; ep < epoch; ep++) {
    console.log('Epoch '+ep);
    for (var idx = startIndex; idx < startIndex+3000; idx++,it++) {
      // console.log(idx);
      var Input = new mlitb.Vol(28,28,1, 0.0);
      var xi = loadedImages[idx];
      var yi = train_labels[idx];
      // console.log("xi : ");
      // console.log(xi);
      // console.log("y");
      // console.log(yi);
      Input.data = xi;
      // console.log(yi);
      SGD.train(Input,yi);    
      var arr = Net.getPrediction().data;
      var max = 0;
      for (var j = 1; j < arr.length; j++) {
        if (arr[j]>arr[max]){max = j}
      };
      // console.log('label : ',yi,' output : ',arr.indexOf(Math.max.apply(Math, arr)));
      // console.log('label : ',yi,' output : ',max);
      if(yi===max){correctTrain+=1}


      if (it %16==0){
        correctTest = 0;
        // correctTrain = 0;
        // choose 10 random test images
        for (var i = 0; i < nTest; i++) {
          var ix = Math.floor(Math.random()*testImages.length);
          var Input = new mlitb.Vol(28,28,1, 0.0);
          var xi = testImages[ix];
          var yi = test_labels[ix];
          Input.data = xi;
          Net.forward(Input);
          var arr = Net.getPrediction().data;
          var max = 0;
          for (var j = 1; j < arr.length; j++) {
            if (arr[j]>arr[max]){max = j}
          };
          // console.log('label : ',yi,' output : ',arr.indexOf(Math.max.apply(Math, arr)));
          // console.log('label : ',yi,' output : ',max);
          if(yi===max){correctTest+=1}
        };
        // for (var i = 0; i < nTrain; i++) {
        //   var idx = Math.floor(Math.random()*train_labels.length);
        //   var Input = new mlitb.Vol(28,28,1, 0.0);
        //   var xi = loadedImages[idx];
        //   var yi = train_labels[idx];
        //   Input.data = xi;
        //   Net.forward(Input);
        //   var arr = Net.getPrediction().data;
        //   var max = 0;
        //   for (var j = 1; j < arr.length; j++) {
        //     if (arr[j]>arr[max]){max = j}
        //   };
        //   // console.log('label : ',yi,' output : ',arr.indexOf(Math.max.apply(Math, arr)));
        //   // console.log('label : ',yi,' output : ',max);
        //   if(yi===max){correctTrain+=1}
        // };
        console.log('Train accuracy : ',correctTrain/SGD.iteration);
        console.log('Test accuracy : ',correctTest/nTest);
      
      }
    };
    
  };
}


// var loadedBatches = [];
var loadBatches = function (nBatches) {
  for (var i = 0; i < nBatches; i++) {
    loadedImages = [];
    parsePNG('../../Data/Mnist/mnist_batch_'+i+'.png',784);
    var oneBatchInt = setInterval(function(){
    console.log(loadedImages.length); 
    if (loadedImages[0] && loadedImages[2999]) {
      clearInterval(oneBatchInt);
      console.log('lengkap');
    }},100);
    console.log('teseteswets');
  };
}

// }