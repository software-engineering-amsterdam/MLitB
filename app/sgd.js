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
    for(var i=0;i<n;i++) { arr[i]= 0; }
  return arr;
}


var SGDTrainer = function (net, conf) {
  this.net = net;
  this.loss =0.0;
  this.l2_loss = 0.0;
  this.l1_loss = 0.0;

  this.learning_rate = typeof conf.learning_rate !== 'undefined' ? conf.learning_rate : 0.01;
  this.l1_decay = typeof conf.l1_decay !== 'undefined' ? conf.l1_decay : 0.0001;
  this.l2_decay = typeof conf.l2_decay !== 'undefined' ? conf.l2_decay : 0.0001;
  this.batch_size = typeof conf.batch_size !== 'undefined' ? conf.batch_size : 1;
  this.momentum = typeof conf.momentum !== 'undefined' ? conf.momentum : 0.9;
  this.iteration = 0;
  this.last_grads = [];
  this.sum_square_gads = [];
  this.last_params = [];
  this.total_data_seen = 0;
  this.is_initialized = false;
  this.last_pred_loss = {}; // data_id : [loss, discrete_loss]. discrete loss = 0 if y=y', 1 otherwise
  this.proceeded_data = {};
  this.lr_decay = typeof conf.lr_decay !== 'undefined' ? conf.lr_decay : 0.999;
  this.lr_threshold= typeof conf.lr_threshold !== 'undefined' ? conf.lr_threshold : 0.000001;
  this.lr_decay_interval= typeof conf.lr_decay_interval !== 'undefined' ? conf.lr_decay_interval : 1;
};
    
SGDTrainer.prototype = {

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

  reduce : function(nn){

    old_parameters = nn.parameters;
    new_parameters = nn.operation_results;
    step = nn.step;


    var totalError=0.0;
    var totalVector=0;

    //for the first time, get parameter from any client
    //assume that in this situation, all client will send both param and grad
    if (!this.is_initialized){
      if (new_parameters[0].parameters_type === 'params_and_grads'){
        this.last_params = new_parameters[0].parameters[0];
        for (var i = 0; i < this.last_params.length; i++) {
          this.last_grads.push(zeros(this.last_params[i].length));
          this.sum_square_gads.push(zeros(this.last_params[i].length));
        }
        this.is_initialized = true;
      } else{
        console.log('THERE IS SOMETHING WRONG');
      }
    } 
    else {
    // updateParams = function(){
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
    }

    
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
    nn.parameters = {
        parameters: this.last_params
    }

    nn.send_stats({
      type: 'parameter',
      data: {
        'error': totalError/totalVector,
        'step': step,
        'parameters': this.last_params,
        'configuration': nn.configuration,
        'labels': nn.labels
      }
    });

  }
}

module.exports = SGDTrainer;

