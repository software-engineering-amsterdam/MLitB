/* 
 * Implementation of ConvNetJS reduction step.
 * Code (re)written by Said Al Faraby
 * University of Amsterdam
 * said.al.faraby@gmail.com
 *
 * ConvNetJS original code by Andrej Karpathy
 * Stanford University
 * andrej.karpathy@gmail.com
 */

// helper function to make array of zeroes
var zeros = function(n) {
    var arr = new Array(n);
  
    for(var i=0;i<n;i++) { 
        arr[i] = 0; 
    }

    return arr;
}


var SGDTrainer = function (nn, net) {
  this.net = net;
  this.loss = 0.0;
  this.l2_loss = 0.0;
  this.l1_loss = 0.0;
  this.iteration = 0;
  this.last_grads = [];
  this.sum_square_gads = [];
  this.last_params = [];
  this.total_data_seen = 0;
  this.is_initialized = false;
  this.last_pred_loss = {}; // data_id : [loss, discrete_loss]. discrete loss = 0 if y=y', 1 otherwise
  this.proceeded_data = {};
  this.chunk = []; //index of parameter filters specified for this sgd

};
    
SGDTrainer.prototype = {

  set_parameters: function(hyperparameters) {

    this.learning_rate = hyperparameters.learning_rate;
    this.l1_decay = hyperparameters.l1_decay;
    this.l2_decay = hyperparameters.l2_decay;
    this.batch_size = hyperparameters.batch_size;
    this.momentum = hyperparameters.momentum;
    this.lr_decay = hyperparameters.lr_decay;
    this.lr_threshold = hyperparameters.lr_threshold;
    this.lr_decay_interval = hyperparameters.lr_decay_interval;

  },

  load: function(sgd) {
    this.net = sgd.net;
    this.loss = sgd.loss;
    this.l2_loss = sgd.l2_loss;
    this.l1_loss = sgd.l1_loss;

    this.learning_rate = sgd.learning_rate;
    this.l1_decay = sgd.l1_decay;
    this.l2_decay = sgd.l2_decay;
    this.batch_size = sgd.batch_size;
    this.momentum = sgd.momentum;
    this.iteration = sgd.iteration;
    this.last_grads = sgd.last_grads;
    this.sum_square_gads = sgd.sum_square_gads;
    this.last_params = sgd.last_params;
    this.total_data_seen = sgd.total_data_seen;
    this.is_initialized = sgd.is_initialized;
    this.last_pred_loss = sgd.last_pred_loss;
    this.proceeded_data = sgd.proceeded_data;
    this.lr_decay = sgd.lr_decay;
    this.lr_threshold = sgd.lr_threshold;
    this.lr_decay_interval = sgd.lr_decay_interval;

  },

  // initialise : function(initParams){
        
  //   this.last_params = initParams;


  //   for (var i = 0; i < this.last_params.length; i++) {
  //     this.last_grads.push(zeros(this.last_params[i].length));
  //     this.sum_square_gads.push(zeros(this.last_params[i].length));
  //   }

  //   this.is_initialized = true;
  // },
  clone_parameter: function(param){
        var newParam = [];
        for (var i=0;i<param.length;i++){
            newParam.push(param[i].slice(0));
        }
        return newParam;
    },

  resize_param : function(newParams){
    if (newParams.length==0){
      return;
    }
    //this should be call from neuralnetwork when receiving new labels from uploaded data/camera
    //there are 3 kinds of resizing : 
    //0 : initialization for the first time
    //1 : adding new filters (last layer is conv as in NiN case), 
    //2 : only adding new elements (fc)
    //check for the first condition
    var NL = newParams.length;
    var LL = this.last_params.length;
    if (NL-LL > 0){
      //first case, resize this.last_grads & this.sum_square_grads
      for (var i=LL; i< NL;i++){
        this.last_grads.push(zeros(newParams[i].length));
        this.sum_square_gads.push(zeros(newParams[i].length));
      }

    } else {
      //second case, new elements in the last 2 parameters (fc filter and bias)

      for (var i = NL-2 ;i< NL;i++){
        var temp = this.last_grads[i].concat(zeros(newParams[i].length-this.last_grads[i].length))
        this.last_grads[i]=temp;
        var temp = this.sum_square_gads[i].concat(zeros(newParams[i].length-this.sum_square_gads[i].length))
        this.sum_square_gads[i]=temp;
      }

    }

    //assume we always update NN in neuralnetworks.js, so we can just assige newParams to this.last_params
    this.last_params = this.clone_parameter(newParams);
    console.log('length last param '+this.last_params.length);
    console.log('length last grad '+this.last_grads.length);

  },

  reduce : function(param){
    start_reduce = new Date().getTime();
    // old_parameters = nn.configuration.parameters;
    new_parameters = param;

    // step = nn.step;


    var totalError=0.0;
    var totalVector=0;



    totalError+=new_parameters.error;
    totalVector+=new_parameters.nVector;


    this.total_data_seen+=totalVector;
    console.log('learning rate : ', this.learning_rate);
    console.log('total data seen : ', this.total_data_seen);
    console.log('totalError : ',totalError);
    console.log('totalVector : ',totalVector);
    console.log('error : ',totalError/totalVector);

    //iterate over each param and grad vector
    //this.last_params is a list containing the current state of parameters/weights of all layers
    //e.g there are two conv layers, each has 2 and 3 filters, 
    //then last_params will store [conv1_filter1,conv1_filter2,conv1_bias,conv2_filter1,...] total 7 parameter vectors.
    //thus, i is index to the parameter/bias vector.
    for (var i = 0; i < this.last_params.length; i++) {
      var p = this.last_params[i];
      var g = new_parameters.parameters[i];

      for (var j=0,len=p.length;j<len;j++){
        p[j]=(0.8*p[j]+0.2*g[j]);
      }

    }

    return this.last_params;

  }

  //     //for example here we want to update conv1_filter1
  //     //add up all gradient vectors corresponds to conv1_filter1 from clients. grad length = param length
  //     for (var gi = 0; gi < p.length; gi++) {
  //       total_gi = 0.0;
  //       for (var k = 0; k < new_parameters.length; k++) {
  //         //again ignore grads from new client
  //         total_gi += new_parameters[k].parameters[i][gi];
  //       }
  //       g.push(total_gi);
  //     };

  //     var plen = p.length; 
  //     var lg = this.last_grads[i];
  //     //ssg is used for adagrad
  //     var ssg = this.sum_square_gads[i];
  //     //plen = parameter length, e.g length of conv1_filter1 (kernel_size^2*depth of previous output layer)
  //     //thus j, is index for parameter/weight value. 
  //     //e.g conv1_filter1=[0.123, 0.345, 0.567], then plen=3, and i is index to those values
  //     for (var j = 0; j < plen; j++) {
  //       this.l2_loss += this.l2_decay*p[j]*p[j];
  //       this.l1_loss += this.l1_decay*Math.abs(p[j]);
  //       var l2_grad = this.l2_decay*p[j];
  //       var l1_grad = this.l1_decay*(p[j]>0 ? 1 : -1);
  //       // add new gradient element for new added neuron
  //       if (typeof lg[j]==='undefined'){
  //         lg.push(0.0);
  //       }
  //       // var lgj = lg[j];
  //       // add new gradient element for new added neuron
  //       if (typeof ssg[j]==='undefined'){
  //         ssg.push(0.0);
  //       }
  //       ssg[j] += ((g[j]/totalVector) *(g[j]/totalVector));
  //       var tess = Math.sqrt(ssg[j]);
  //       if (tess<=1){
  //         tess=1;
  //       }
  //       // tess=1;
  //       // var dw = (1.0-this.momentum)*(this.learning_rate/tess)*((l1_grad+l2_grad+g[j])/totalVector)+this.momentum*lg[j];
  //       var dw = this.learning_rate/tess*((l1_grad+l2_grad+g[j])/totalVector);
  //       p[j] -= dw; //x = x - gradient
  //       // lg[j] = dw; //save the last gradient values
  //       // g[j] = 0.0;
  //     }
  //   }
  //   // }

    
  //   this.iteration++;
  //   // if (this.iteration % this.lr_decay_interval==0){
  //   //   this.learning_rate = this.learning_rate*this.lr_decay> this.lr_threshold ? this.learning_rate*this.lr_decay : this.lr_threshold;
  //   // }
  //   // if (this.iteration%5==0){
      

  //   // }

  //   // set 'new' parameters.
  //   // var cl = this.chunk.length;
  //   // if (cl){
  //   //   while (cl--){
  //   //     nn.parameters[this.chunk[cl]]=this.last_params[cl];  
  //   //   }  
  //   // } else { //if empty chunk, assume for whole params
  //   //   nn.parameters = this.last_params;
  //   // }
    
  //   // nn.error = totalError/totalVector;
  //   rtime = new Date().getTime() - start_reduce;
  //   console.log('SGD reduce time',rtime);
  //   console.log('last gradient '+this.last_grads[0][0]);
  //   console.log('gradient '+new_parameters[0].parameters[0][0]);
  //   return this.last_params;
  //   // console.log(this.last_params[0].length, this.last_params[1].length);

  // }
}

module.exports = SGDTrainer;
