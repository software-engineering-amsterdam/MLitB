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
  this.l1_decay = typeof conf.l1_decay !== 'undefined' ? conf.l1_decay : 0.0;
  this.l2_decay = typeof conf.l2_decay !== 'undefined' ? conf.l2_decay : 0.0;
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
  this.lr_decay = typeof conf.lr_decay !== 'undefined' ? conf.lr_decay : 0.9;
  this.lr_threshold= typeof conf.lr_threshold !== 'undefined' ? conf.lr_threshold : 0.001;
  this.lr_decay_interval= typeof conf.lr_decay_interval !== 'undefined' ? conf.lr_decay_interval : 1;
};
    
SGDTrainer.prototype = {
  reduce : function(parameters, markovResults, step, sendTest, sendMonitor){
    var totalError=0.0;
    var totalVector=0;

    //for the first time, get parameter from any client
    //assume that in this situation, all client will send both param and grad
    if (!this.is_initialized){
      if (markovResults[0].parameter.parameters_type === 'params_and_grads'){
        this.last_params = markovResults[0].parameter.parameters[0];
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
      for (var mr = 0; mr < markovResults.length; mr++) {
        var markovParam = markovResults[mr].parameter;
        //ignore new client
        if (markovParam.parameters_type=='grads'){
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
          for (var k = 0; k < markovResults.length; k++) {
            //again ignore grads from new client
            if (markovResults[k].parameter.parameters_type=='grads'){
              if (typeof markovResults[k].parameter.parameters == 'undefined'){
                console.log(JSON.stringify(markovResults[k].parameter));
                console.log(this.iteration);  
              }
              total_gi += markovResults[k].parameter.parameters[i][gi];
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
          var lgj = lg[j];
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

      var max,min,l = 0;
      for( var key in this.proceeded_data ) {
        if ( this.proceeded_data.hasOwnProperty(key) ) {
          var val = this.proceeded_data[key];
          if (l==0){
            max = val;
            min = val;
          }
          if (val > max){max = val;}
          if (val < min){min = val;}
          l++;
        }
      }
      console.log('Data statistics :');
      console.log('Total : '+l);
      console.log('Max   : '+max);
      console.log('Min   : '+min);

      //
      var RMS = 0.0;
      var discrete_RMS = 0.0;
      var NData = 0;
      for (key in this.last_pred_loss){
        if (this.last_pred_loss.hasOwnProperty(key)){
          diff = 1-this.last_pred_loss[key][0];
          RMS+= diff;
          discrete_RMS+=this.last_pred_loss[key][1];
          NData++;
        }
      }
      // RMS = Math.sqrt(RMS)/NData;
      RMS = RMS/NData;
      // discrete_RMS = discrete_RMS/NData;
      //RMS all training data that has ever been proceeded by clients
      console.log('RMS all training data '+RMS);
      console.log('discrete RMS all training data '+discrete_RMS+'/'+NData+' = '+discrete_RMS/NData);

    }

    // set the new parameter to the markovResults
    // all chains receive same value, thus a P-SGD
    i = parameters.length;
    while(i--) {
      parameters[i] = {
        parameter: {
          parameters: this.last_params
        }
      }
    }

    sendTest({
      type: 'parameter',
      data: {
        'error': totalError/totalVector,
        'step': step,
        'parameter': {
          parameter: {
            parameters: this.last_params
          }
        }
      }
    });

  }
}

module.exports = SGDTrainer;
