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
    this.last_params = newParams;
    console.log('length last param '+this.last_params.length);
    console.log('length last grad '+this.last_grads.length);

  },

  reduce : function(nn){

    old_parameters = nn.configuration.parameters;
    new_parameters = nn.operation_results;
    step = nn.step;


    var totalError=0.0;
    var totalVector=0;

    //for the first time, get parameter from any client
    //assume that in this situation, all client will send both param and grad
    //==========================MOVE TO INITIALISE===========================
    // if (!this.is_initialized){

    //   if (new_parameters[0].parameters_type === 'params_and_grads'){
        
    //     this.last_params = new_parameters[0].parameters[0];

    //   } else if (new_parameters[0].parameters_type === 'grads'){

    //     // this.last_params = new_parameters[0].parameters;

    //   } else {

    //     console.log('THERE IS SOMETHING WRONG');
    //     return;
        
    //   }

    //   for (var i = 0; i < this.last_params.length; i++) {
    //     this.last_grads.push(zeros(this.last_params[i].length));
    //     this.sum_square_gads.push(zeros(this.last_params[i].length));
    //   }

    //   this.is_initialized = true;

    // } else {
    //=================================================

      //there's possibility to have new labels, so we need to extend
      //this.last_params, this.last_grads, this.sum_square_grads
      //there may be 2 kinds of extension :
      //filter extension, or element extension

      for (var mr = 0; mr < new_parameters.length; mr++) {
      
        var markovParam = new_parameters[mr];
        //ignore new client

        if (markovParam.parameters_type == 'grads'){

          totalError+=markovParam.error;
          totalVector+=markovParam.nVector;

          //compute data statistics
          var l = markovParam.proceeded_data.length;
          while(l--){
            data_id = markovParam.proceeded_data[l][0];
            var new_val = (this.proceeded_data[data_id]||0)+1;
            this.proceeded_data[data_id] = new_val;
            this.last_pred_loss[data_id] = [markovParam.proceeded_data[l][1],markovParam.proceeded_data[l][2]];
          }
        }
      };

      this.total_data_seen+=totalVector;
      console.log('learning rate : ', this.learning_rate);
      console.log('total data seen : ', this.total_data_seen);
      console.log('error : ',totalError/totalVector);

      // console.log('before ',JSON.stringify(this.last_params[2].params));    
      //iterate over each param and grad vector
      for (var i = 0; i < this.last_params.length; i++) {
        // var pg = this.last_params[i];
        var p = this.last_params[i];
        var g = [];

        //add up all gradient vectors. grad length = param length
        for (var gi = 0; gi < p.length; gi++) {
          total_gi = 0.0;
          for (var k = 0; k < new_parameters.length; k++) {
            //again ignore grads from new client
            if (new_parameters[k].parameters_type == 'grads'){
              // if (typeof new_parameters[k].parameters == null){
              //   console.log(JSON.stringify(new_parameters[k]));
              //   console.log(this.iteration);  
              // }
              total_gi += new_parameters[k].parameters[i][gi];
            }
          }
          g.push(total_gi);
        };
        var plen = p.length;
        var lg = this.last_grads[i];
        var ssg = this.sum_square_gads[i];
        for (var j = 0; j < plen; j++) {
          this.l2_loss += this.l2_decay*p[j]*p[j];
          this.l1_loss += this.l1_decay*Math.abs(p[j]);
          var l2_grad = this.l2_decay*p[j];
          var l1_grad = this.l1_decay*(p[j]>0 ? 1 : -1);
          // add new gradient element for new added neuron
          if (typeof lg[j]==='undefined'){
            lg.push(0.0);
          }
          var lgj = lg[j];
          // add new gradient element for new added neuron
          if (typeof ssg[j]==='undefined'){
            ssg.push(0.0);
          }
          ssg[j] += ((g[j]/totalVector) *(g[j]/totalVector));
          var tess = Math.sqrt(ssg[j]);
          if (tess<=1){
            tess=1;
          }
          // tess=1;
          var dw = (1.0-this.momentum)*(this.learning_rate/tess)*((l1_grad+l2_grad+g[j])/totalVector)+this.momentum*lgj;
          p[j] -= dw;
          lgj = dw;
          g[j] = 0.0;
        }
      }
    // }

    
    this.iteration++;
    if (this.iteration % this.lr_decay_interval==0){
      this.learning_rate = this.learning_rate*this.lr_decay> this.lr_threshold ? this.learning_rate*this.lr_decay : this.lr_threshold;
    }
    if (this.iteration%5==0){
      
      // USE CODE BELOW TO DECREASE LR OR INCREASE MOMENTUM
      // this.momentum = this.momentum+0.05 <=0.9 ? this.momentum+0.05 : 0.9;
      // this.learning_rate = this.learning_rate*this.lr_decay > 0.001 ? this.learning_rate*this.lr_decay : 0.01;
      // ======================================

      // var max,min,l = 0;
      // for( var key in this.proceeded_data ) {
      //   if ( this.proceeded_data.hasOwnProperty(key) ) {
      //     var val = this.proceeded_data[key];
      //     if (l==0){
      //       max = val;
      //       min = val;
      //     }
      //     if (val > max){max = val;}
      //     if (val < min){min = val;}
      //     l++;
      //   }
      // }
      // console.log('Data statistics :');
      // console.log('Total : '+l);
      // console.log('Max   : '+max);
      // console.log('Min   : '+min);

      // //
      // var RMS = 0.0;
      // var discrete_RMS = 0.0;
      // var NData = 0;
      // for (key in this.last_pred_loss){
      //   if (this.last_pred_loss.hasOwnProperty(key)){
      //     diff = 1-this.last_pred_loss[key][0];
      //     RMS+= diff;
      //     discrete_RMS+=this.last_pred_loss[key][1];
      //     NData++;
      //   }
      // }
      // // RMS = Math.sqrt(RMS)/NData;
      // RMS = RMS/NData;
      // // discrete_RMS = discrete_RMS/NData;
      // //RMS all training data that has ever been proceeded by clients
      // console.log('RMS all training data '+RMS);
      // console.log('discrete RMS all training data '+discrete_RMS+'/'+NData+' = '+discrete_RMS/NData);

    }

    // set 'new' parameters.

    nn.parameters = this.last_params;
    nn.error = totalError/totalVector;

    console.log(this.last_params[0].length, this.last_params[1].length);

  }
}

module.exports = SGDTrainer;
