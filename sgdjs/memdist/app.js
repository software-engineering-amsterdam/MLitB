express = require('express.io'),
app = require('express.io')()
  , stylus = require('stylus')
  , nib = require('nib')
  , http = require('http')
app.http().io()

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .set('compress', true)
    .use(nib())
}

app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))
app.use(stylus.middleware(
  { src: __dirname + '/public'
  , compile: compile
  }
))
app.use(express.static(__dirname + '/public'))


Array.prototype.average = function () {
    var sum = 0, j = 0; 
   for (var i = 0; i < this.length, isFinite(this[i]); i++) { 
          sum += parseFloat(this[i]); ++j; 
    } 
   return j ? sum / j : 0; 
};

// STATICS

// MAX DESKTOP = number of vectors a desktop machine can store.
// MAX_MOBILE = number of vectors a mobile device can store.
var MAX_DESKTOP       = 1000,
    MAX_MOBILE        = 500,
    // COVERAGE EQ: data redundancy level. Data with lower COVERAGE_EQ are prioritized in distribution.
    COVERAGE_EQ       = 3,
    // POWER_MEAN: number of historic vsec measures to average
    POWER_MEAN        = 5,
    // POWER_MEAN: number of historic isec measures to average
    LAG_HISTORY       = 10, // MIN = 3
    INITIAL_PARAMETER = 0.0;

var settings = {
  'currentPower' : 400
}

// Time a client runs:
// Default: 2000
// Higher: predictions take longer, thus workers are added more slowly by clients
// Lower: Clients with high latency (e.g. 500 MS or something) may starve.
var nodeSettings = {
  'runtime': 4000
}

// make this a online setting
var running = false;
var start = false;

var normalizeFactor;
var markovChain = [];
var markovLength;
var markovResults;
var markovFirstResult;
var markovIDs = [];
var parameters = [];
var markovRotationID = 0;
var parameterRotationID = 0;

var step = 0;

var initial_parameter = INITIAL_PARAMETER;

var timeouts = {};

var SGD;

var hrtime = function() {
  now = process.hrtime();
  return Math.floor((now[0] * 1e9 + now[1]) / 1000000);
}

var logger = function(req, text) {
  req.io.emit('log', text);
}

var dataworkersOnline = function() {
  return app.io.sockets.clients('dataworkers').length;
}

// returns number of clients connected
var clientsOnline = function() {
  return app.io.sockets.clients('room').length;
}

var getNodeById = function(id, fn, room) {
  var client;
  var i = fn();
  var clients = app.io.sockets.clients(room);

  while(i--) {
    client = clients[i];
    if(client.id == id) {
      return client;
    }
  }
  return;
}

var getClientById = function(id) {
  return getNodeById(id, clientsOnline, 'room');
}

var getDataworkerById = function(id) {
  return getNodeById(id, dataworkersOnline, 'dataworkers');
}

var getDataById = function(datamap, id) {
  var data;
  var i = datamap.length;
  while(i--) {
    data = datamap[i];
    if(data.id == id) {
      return data;
    }
  }
  return;
}

var datamap = [];
var nextIndex = 1;
/*
  map is build as such:
  id = index of remote data object.
  [
    {
      id: 1,
      data: [
        clientIDS
      ],
      allocated: [
        clientIDS
      ],
      processors: [
        clientIDS
      ]
    },
    ...
    {
      id: 1000,
      data: [
        clientIDS
      ],
      allocated: [
        clientIDS
      ],
      processors: [
        clientIDS
      ]
    },

  ]
*/

var dataToProxy = [];
var proxyTimeout;

var registerdata = function(req) {

  var data = req.data.data;
  var client = getClientById(req.data.client);
  var i = data.length;
  var piece;

  if(client.powertesting) {
    return;
  }

  while(i--) {

    piece = data[i];

    part = getDataById(datamap, piece);
    part.data.push(client.id);

  }

  if(!running) {

    running = true;
    run(parameters);

  }

}

var proxyData = function(req) {

  item = req.data;

  var client = getClientById(item.recipient);

  // check if client is alive
  if(client) {

  var dataworkerForClient = getDataworkerById(client.dataworker);

    dataworkerForClient.emit('downloadData', item);

  }

}

var uploadDataToClient = function(datamap, req) {
  var id, client;
  var dataIds = req.data.data;
  var recipient = req.data.worker;
  var i = dataIds.length;
  var dataset;

  var clientsets = {};

  while(i--) {
    id = dataIds[i];

    // just get first client for now.
    // implement any function here to determine fastest client.
    clientId = id.clients[0];

    obj = {
      id: id.id,
      recipient: recipient
    };

    if(!(clientId in clientsets)) {
      clientsets[clientId] = [];
    }

    clientsets[clientId].push(obj);

  }

  // send per client.
  for(var z in clientsets) {

    client = getClientById(z);

    if(client) {
      dataworkerOfClient = getDataworkerById(client.dataworker);

      dataset = clientsets[z];

      if(dataworkerOfClient) {

        dataworkerOfClient.emit('proxyDataToServer', {
          source: client.id,
          data: dataset
        });

      }

    }
  }

}

var addIndices = function(datamap, req) {
  // adds indexes of remote data objects to server datamap.

  var client = getClientById(req.data.id);

  if(!client) {
    // happens at client drop.
    return;
  }

  // from nextIndex, add length number of indices
  var i, index, newObject;
  var firstIndex = nextIndex;

  for(i = 0; i < req.data.data; i++) {
    index = i + nextIndex;
    newObject = {
      id: index,
      data: [],
      allocated: [client.id],
      processors: []
    }
    datamap.push(newObject);
  }

  client.allocation += req.data.data;

  nextIndex = index + 1;

  // communicate firstIndex to the client.
  req.io.emit('dataFirstIndex', {
    index: firstIndex,
    client: client.id
  });

}

var removeClient = function(datamap, client) {

  console.log('Dropped client:', client.id);

  client.leave('room');

  var i = datamap.length;
  var lostData = 0;

  while(i--){ 
    var item = datamap[i];

    // dump data
    var index = item.data.indexOf(client.id);
    if(index > -1) {
      item.data.splice(index, 1);
    }

    // dump allocated
    index = item.allocated.indexOf(client.id);
    if(index > -1) {
      item.allocated.splice(index, 1);
    }

    // dump as processor
    index = item.processors.indexOf(client.id);
    if(index > -1) {
      item.processors.splice(index, 1);
    }

    // when there is no redundancy, remove.
    if(!item.data.length) {
      datamap.splice(i, 1);
      lostData++;
    }
  }

  if(lostData) {
    console.log('Lost', lostData, 'data vectors from the network.');
  }

  if(!clientsOnline()) {
    running = false;
  }

  // determine if this client is working
  i = markovChain.length;

  var set, j, piece, node;
  while(i--) {
    
    chainClient = markovChain[i];

    if(!chainClient) {
      console.log('Last client left the network.');
      continue;
    }

    if(chainClient.client == client.id) {
      // the client is currently operating.
      // drop from the chain, it will be picked up later on
      // (when a new node joins, or at redistribution)
      
      console.log('-> Client was currently processing, cleaning up.');

      // remove client from markovIDs
      markovIDsIndex = markovIDs.indexOf(client.id);
      if(markovIDsIndex > -1) {
        markovIDs.splice(markovIDsIndex, 1);
      }

      if(!markovIDs.length) {

        console.log('-> Last client, continue with reduction');

        delay = process.hrtime(markovFirstResult).join('')

        reduce(markovResults);

        // run next chain
        run(parameters);

      } else {

        console.log('-> NOT last client, other client will initiate reduction.');

      }

    }

  }

}

var processingPower = function() {
  // calculates total processing power available in terms of data coverage
  var clients = app.io.sockets.clients('room')
  var total = 0;
  var i  = clients.length;
  while(i--) {
    var item = clients[i];
    if(item.device == 'mobile') {
      total += MAX_MOBILE;
    } else {
      total += MAX_DESKTOP;
    }
  }

  return total;

}

var coverage = function(datamap) { 
  // calculate coverage of the data.
  // do this simple for now, just add up all clients

  var total = 0;
  var i = datamap.length;
  while(i--) {
    total += datamap[i].allocated.length;
  }

  return total

}

var shortage = function(datamap) {

  var i = datamap.length;
  total = 0;
  while(i--) {
    if(datamap[i].allocated.length < COVERAGE_EQ) {
      total += 1;
    }
  }

  return total;
}

var zeros = function(n) {
  // if(typeof(n)==='undefined' || isNaN(n)) { return []; }
  // if(typeof ArrayBuffer === 'undefined') {
  //   // lacking browser support
  //   var arr = new Array(n);
  //   for(var i=0;i<n;i++) { arr[i]= 0; }
  //   return arr;
  // } else {
  //   return new Float64Array(n);
  // }
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
  this.last_params = [];
  this.total_data_seen = 0;
  this.is_initialized = false;
  this.last_pred_loss = {}; // data_id : [loss, discrete_loss]. discrete loss = 0 if y=y', 1 otherwise
  this.proceeded_data = {};
}
  
SGDTrainer.prototype = {
  // reduce2 : function(markovResults){

  //   // var i, j, gi, k, total_gi;
  //   var totalError=0.0;
  //   var totalVector=0;

  //   //for the first time, get parameter from any client
  //   //assume that in this situation, all client will send both param and grad
  //   if (!this.last_params.length ){
  //     var pgs = markovResults[0].parameter.parameters;
  //     this.last_params = pgs;
  //     // console.log('first length ',this.last_params[0].params.length);
  //   }
  //   // console.log('this is vector',markovResults[0].parameter.nVector);
  //   // console.log('this is error',markovResults[0].parameter.error);
  //   // console.log('awal',this.last_params[0].params.length);
  //   //only the first time to initialize the last grad
  //   if (!this.last_grads.length && this.momentum > 0.0){
  //     for (var i = 0; i < this.last_params.length; i++) {
  //     // i = this.last_params.length;     
  //     // while(i--) {
  //       this.last_grads.push(zeros(pgs[i].grads.length));
  //     }

  //   }

  //   // accumulate total error and total vectors
  //   for (var mr = 0; mr < markovResults.length; mr++) {
  //     totalError+=markovResults[mr].parameter.error;
  //     console.log(totalError);
  //     totalVector+=markovResults[mr].parameter.nVector;
  //     console.log(totalVector);
  //   };
  //   this.total_data_seen+=totalVector;
  //   console.log('total data seen : ', this.total_data_seen);
  //   console.log('error : ',totalError/totalVector);


  //   // console.log('before ',JSON.stringify(this.last_params[2].params));    
  //   //iterate over each param and grad vector
  //   for (var i = 0; i < this.last_params.length; i++) {
  //   // i = this.last_params.length;
  //   // while(i--) {
  //     var pg = this.last_params[i];
  //     var p = pg.params;
  //     // var p = this.last_params[i].params;
  //     // console.log('length ppp ',p.length);
      
  //     var g = pg.grads;
  //     //add up all gradient vectors
  //     for (var gi = 0; gi < g.length; gi++) {
  //     // gi = g.length;
  //     // while(gi--) {
        
  //       total_gi = 0.0;

        
  //       for (var k = 0; k < markovResults.length; k++) {
        

  //       // k = markovResults.length;
        
  //       // while(k--) {

  //         total_gi += markovResults[k].parameter.parameters[i].grads[gi];

  //       }

  //       g[gi] = total_gi;

  //     };

  //     // console.log('masuk');
      
  //     var plen = p.length;
  //     var lg = this.last_grads[i];
  //     // console.log('plen ',plen);
      
  //     for (var j = 0; j < plen; j++) {
      
  //       // console.log('masuk');
  //     // j = plen;
  //     // while(j--) {

  //       this.l2_loss += this.l2_decay*p[j]*p[j];
  //       this.l1_loss += this.l1_decay*Math.abs(p[j]);
  //       var l2_grad = this.l2_decay*p[j];
  //       var l1_grad = this.l1_decay*(p[j]>0 ? 1 : -1);
  //       var lgj = lg[j];
  //       var dw = (1.0-this.momentum)*this.learning_rate*((l1_grad+l2_grad+g[j])/totalVector)+this.momentum*lgj;
  //       p[j] -= dw;
  //       lgj = dw;
  //       g[j] = 0.0;

  //     }

  //   }

  //   console.log('param length ',JSON.stringify(this.last_params[2]));

  //   // set the new parameter to the markovResults
  //   // all chains receive same value, thus a P-SGD
  //   i = parameters.length;
  //   while(i--) {
  //     parameters[i] = {
  //       parameter: {
  //         parameters: this.last_params
  //       }
  //     }
  //   }

  //   sendMonitor({
  //     type: 'parameter',
  //     data: {
  //       'error': totalError/totalVector,
  //       'step': step
  //     }
  //   });

  // },

  reduce : function(markovResults){
    var totalError=0.0;
    var totalVector=0;

    //for the first time, get parameter from any client
    //assume that in this situation, all client will send both param and grad
    if (!this.is_initialized){
      if (markovResults[0].parameter.parameters_type === 'params_and_grads'){
        this.last_params = markovResults[0].parameter.parameters[0];
        for (var i = 0; i < this.last_params.length; i++) {
          this.last_grads.push(zeros(this.last_params[i].length));
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
        for (var j = 0; j < plen; j++) {
          this.l2_loss += this.l2_decay*p[j]*p[j];
          this.l1_loss += this.l1_decay*Math.abs(p[j]);
          var l2_grad = this.l2_decay*p[j];
          var l1_grad = this.l1_decay*(p[j]>0 ? 1 : -1);
          var lgj = lg[j];
          var dw = (1.0-this.momentum)*this.learning_rate*((l1_grad+l2_grad+g[j])/totalVector)+this.momentum*lgj;
          p[j] -= dw;
          lgj = dw;
          g[j] = 0.0;
        }
      }
    }
    
    this.iteration++;

    if (this.iteration%10==0){
      // USE CODE BELOW TO DECREASE LR OR INCREASE MOMENTUM
      // this.momentum = this.momentum+0.05 <=0.9 ? this.momentum+0.05 : 0.9;
      // this.learning_rate = this.learning_rate*0.9 > 0.01 ? this.learning_rate*0.9 : 0.01;
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

    sendMonitor({
      type: 'parameter',
      data: {
        'error': totalError/totalVector,
        'step': step
      }
    });

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

var reduce = function(markovResults) {

  // SAMPLE REDUCTION for P-MCMC
  // AVERAGE PARAMETERS

  if(step == 0) {
    //Create object SGD Trainer
    SGD = new SGDTrainer({}, {momentum : 0.9,learning_rate : 0.1, batch_size : 16, l2_decay : 0.001});
  }

  SGD.reduce(markovResults);

  step++;  
  // Result parameters from the nodes are stored in markovResults

  // var i = markovResults.length;
  // var piece;

  // while(i--) {
  //   piece = markovResults[i];

  //   parameter = piece.parameter;
  //   parameterId = piece.parameterId;

  //   // parameter from previous step
  //   previousParameter = parameters[parameterId];

  //   // new parameter
  //   newParameter = (previousParameter + parameter) / 2.0;

  //   // store parameter for next step.
  //   parameters[parameterId] = newParameter;

  // }

  // Optionally: output here.
  // Could be done with websocket.

}

var prereduce = function(req) {

  dropClient = false;

  parameter = req.data.parameters;
  parameterId = req.data.parameterId;
  speed = req.data.speed;
  runtime = req.data.runtime;

  id = req.io.socket.id;

  if(markovIDs.indexOf(id) == -1) {
    // impossible. but pass.
    return
  }

  // only for the first
  if(!markovResults.length) {
    markovFirstResult = process.hrtime()
  }

  // determine lag.
  lag = hrtime() - req.io.socket.mapTime - runtime;

  console.log('>> id/lag/AT/TRT:', id, lag, req.io.socket.runTime, runtime);

  if(lag < 0) {
    console.log('$$$ lag under zero:', lag);
    console.log('mapTime:', req.io.socket.mapTime, 'runtime:', req.io.socket.runTime)
  }

  req.io.socket.lagHistory.push(lag);
  req.io.socket.lagHistory = req.io.socket.lagHistory.slice(-1 * LAG_HISTORY, 2 * LAG_HISTORY);
  req.io.socket.lag = req.io.socket.lagHistory.average();

  // if lag is too big for one instance, ignore it.
  if(lag > (nodeSettings.runtime * 0.66)) {
    req.io.socket.lag = nodeSettings.runtime * 0.66;

    // if lag is too big three times, drop client.
    lagcheck = req.io.socket.lagHistory.slice(-3, 6);
    lagToBeat = (nodeSettings.runtime * 0.66) * 3.0;
    total = 0;
    var i = lagcheck.length;
    while(i--) {
      total += lagcheck[i];
    }

    if(total >= lagToBeat) {
      // drop client
      console.log('Dropped client for lagging:', req.io.socket.id);
      dropClient = true;
    }

  }


  // save speed of this worker
  if(req.io.socket.powerSet.length != POWER_MEAN) {
    req.io.socket.powerSet = Array.apply(null, new Array(POWER_MEAN)).map(Number.prototype.valueOf,speed);
  } else {
    req.io.socket.powerSet.push(speed);
  }

  req.io.socket.powerSet.push(speed);
  req.io.socket.powerSet = req.io.socket.powerSet.slice(-1 * POWER_MEAN, 2 * POWER_MEAN);
  req.io.socket.power = req.io.socket.powerSet.average();

  // reduce power by lag factor.
  // power index is determined on 1 second.
  // if the client lags 100 MS, then 100/1000 = factor 0.1 reduction of power.
  lagFactor = (req.io.socket.lag / 1000.0) + 1.0;

  req.io.socket.power /= lagFactor;

  markovResults.push({
    parameterId: parameterId,
    parameter: parameter
  });

  if(dropClient) {
    return removeClient(datamap, req.io.socket);
  }

  // remove client from markovIDs
  markovIDsIndex = markovIDs.indexOf(id);
  markovIDs.splice(markovIDsIndex, 1);

  // only for the last
  if(!markovIDs.length) {

    // what is the delay?
    delay = process.hrtime(markovFirstResult).join('')
    console.log('chain reception delay / last to arrive:', delay / 1000000, 'MS', req.io.socket.id);

    reduce(markovResults);

    markovResults = [];
    // run next chain
    run(parameters);

  }

}

var distributor = function(parameters) {

  markovResults = [];
  markovIDs = [];

  var i = markovChain.length;
  markovLength = i;

  var client, item, timeout, timeoutTime;

  while(i--) {

    item = markovChain[i];
    client = getClientById(item.client);

    // selects existing parameter results, or make new one.
    // this automatically addresses historical parameters.
    parameterId = (i + parameterRotationID) % markovChain.length;

    if(parameters[parameterId] === undefined) {
      parameters[parameterId] = initial_parameter;
    }

    parameter = parameters[parameterId];

    // register time of issuance.
    // use this to determine latency.
    client.mapTime = hrtime();

    // run according to lag fix.
    client.runTime = nodeSettings.runtime - client.lag;

    // make a list of clients at work
    markovIDs.push(client.id);

    // tell client to work.
    client.emit('map', {
      'list': item.set,
      'settings': {runtime: client.runTime},
      'parameters': parameter,
      'parameterId': parameterId,
      'lag': client.lag,
      'step': step
    });

  }

  parameterRotationID++;
  if(parameterRotationID == markovChain.length) {
    parameterRotationID = 0;
  }

}

var initiator = function(datamap, req) {

  // only consider nodes which actually 'have' the data
  // order by least coverage

  datamap = datamap.sort(function(a,b) { return b.data.length - a.data.length } );

  var total = 0;

  // for each client, select the most uncovered data pieces as work
  var i = clientsOnline();
  var j, localset;
  var set = [];
  while(i--) {

    client = app.io.sockets.clients('room')[i];

    if(client.powertesting) {
      continue;
    }

    localset = [];

    j = datamap.length;
    while(j--) {
      piece = datamap[j];

      if(piece.data.indexOf(client.id) > -1) {
        // assign
        localset.push(piece.id);
        if(localset.length >= client.allocatedPower) {
          break;
        }

      }

    }

    // measure to make sure not to include extreme slow machines
    // or when a new node joins.
    if(localset.length < 10) {
      j += localset.lenght;
      continue;
    }

    console.log('allocated power:', localset.length, client.id)

    set.push({
      'client': client.id,
      'set': localset
    });

    total += localset.length;

  }

  // now build a markov chain.
  // a schedule is made by looping over node IDS.

  var chain = [];
  var offset = 0;
  var n = set.length;
  var clientId;

  while(n--) {

    clientId = (n + markovRotationID) % set.length;

    chain.push(set[clientId]);
  }

  markovRotationID++;

  if(markovRotationID == set.length) {
    markovRotationID = 0;
  }

  return chain;

}

var run = function(parameters) {
  // run sample embedded job

  var chain;

  if(!start) {
    return;
  }

  console.log('> run job');
  if(!datamap.length) {
    console.log('no datamap');
    return;
  }

  if(!clientsOnline()) {
    console.log('no clients');
    return; 
  }

  if(!running) {
    console.log('clients not ready');
    return;
  }

  // done to redistribute client power.
  reallocate(datamap);

  markovChain = initiator(datamap);

  if(!markovChain.length) {
    console.log('could not build a processing set.');
    console.log('trying again in', nodeSettings.runtime, 'MS');
    setTimeout(run, nodeSettings.runtime);
    return;
  }

  distributor(parameters);

}

// new reallocate
var reallocate = function(datamap) {

  if(!datamap.length) {
    return;
  }

  // determine current power
  // add up the power of all nodes
  var powerAvailable = 0;
  var i = clientsOnline();
  while(i--) {
    
    client = app.io.sockets.clients('room')[i]
    
    // do not determine when powertesting
    if(!client.powertesting) {
      powerAvailable += client.power;
    }

  }

  console.log('> power:', powerAvailable);

  sendMonitor({
    type: 'power',
    data: {
      'power': powerAvailable,
      'clients': clientsOnline(),
      'step': step
    }
  });

  // normalize powerAvailable to the datamap size
  // each node divides his power by the normalizeFactor

  // normalization factor is reduced if the isecaverage < 30.
  normalizeFactor = powerAvailable / datamap.length;

  console.log('> normalization factor:', normalizeFactor);

  //if(normalizeFactor < 1.0) {
  //  normalizeFactor = 1.0;
  //}

  // tell each client his new power 'currentPower'
  i = clientsOnline();
  var power, client, currentPower, currentPowerFloat, clientMaxData, localUnderflow;
  var totalpower = 0;
  while(i--) {
    client = app.io.sockets.clients('room')[i]; 

    // do not determine when powertesting
    if(client.powertesting) {
      continue;
    }

    // determine underflow
    // when all clients add up their power, it must be 100%
    // thus fix the tiny gaps with underflow correction.
    currentPowerFloat = (client.power / normalizeFactor)
    currentPower = Math.floor(currentPowerFloat);

    diff = currentPowerFloat - currentPower;
    client.powerDiff = diff;

    console.log('client calculated power:', currentPower, client.id);

    // currentPower can not be more than allocated dataset
    if(client.device == 'mobile') {
      clientMaxData = MAX_MOBILE;
    } else {
      clientMaxData = MAX_DESKTOP;
    }

    if(currentPower > clientMaxData) {
      currentPower = clientMaxData;

      // cannot be used for remaining power division.
      client.favour = -1;
    } else if( (client.currentPower + 1) == client.previousPower) {
      // most favourable for power division (because 1 additional data == no change)
      client.favour = 1;
    } else if(client.currentPower == client.previousPower) {
      // least favourable.
      client.favour = 0;
    }

    previousPower = client.currentPower
    client.previousPower = previousPower;

    client.currentPower = currentPower;

    // set allocatedPower to 0 for easy calculation
    client.allocatedPower = 0;

    totalpower += client.currentPower;

  }
  
  // deal out the remaining power
  // 1 point at a time.
  // we do not want to skew performance too much.
  remainingPower = datamap.length - totalpower;

  var clientsRemaining = app.io.sockets.clients('room');

  // remove the clients at max data.
  clientsRemaining = clientsRemaining.filter(function(e) {
    return (e.favour > -1) && !e.powertesting;
  });

  while(remainingPower && clientsRemaining.length) {

    // remove the clients at max data. (again)
    clientsRemaining = clientsRemaining.filter(function(e) {
      return (e.favour > -1) && !e.powertesting;
    });
    
    // sort on favourableness
    clientsRemaining = clientsRemaining.sort(function(a,b) { 
      d = b.favour - a.favour;
      
      // order on the decimal difference, nearest to 1 is more favourable.
      if(d == 0) {
        return b.powerDiff - a.powerDiff; 
      }

      return b.favour - a.favour;
    });

    var j = clientsRemaining.length;

    while(j-- && remainingPower) {

      client = clientsRemaining[j];
      client.currentPower++;
      totalpower++;

      remainingPower--;

      client.favour = 0;

      if(client.device == 'mobile') {
        clientMaxData = MAX_MOBILE;
      } else {
        clientMaxData = MAX_DESKTOP;
      }

      // remove from next loop.
      if(client.currentPower == clientMaxData) {
        client.favour = -1;
      }

    }

  }

  // make a new datamap based on the power assigned.
  // first, re-build current datamap with current nodes, with new power settings.
  // second, assign new node the 'empty' spaces left by the other nodes
  // third, cover up rest of datamap by original method to reinforce coverage.

  // order it first, based on least allocated
  datamap = datamap.sort(function(a,b) { return b.allocated.length - a.allocated.length } );

  i = datamap.length;
  var piece, clients, client, j, allocated;
  var totalEmpty = 0;

  while(i--) {
    piece = datamap[i];
    // empty 'processors' if not yet done
    piece.processors = [];

    // client selection based on power allocated
    clients = piece.allocated;
    j = clients.length;

    allocated = false;

    while(j--) {
      client = getClientById(clients[j]);
      if(client.allocatedPower < client.currentPower) {
        // assign
        
        //if(piece.processors.indexOf(client.id) > -1) {
        //  continue;
        //}

        piece.processors.push(client.id);
        client.allocatedPower++;
        allocated = true;
        break;
      }
    }

    if(!allocated) {
      // no suitable client found to allocate (i.e. is allocated to client but client is full)
      totalEmpty += 1;
    }

  }

  if(totalEmpty) {
    console.log('manage unpowered data, number:', totalEmpty);

    // there are vectors in the datamap which are unprocessed, because some clients are full
    // find clients which are not full yet
    var clients = app.io.sockets.clients('room');
    var clientsUnderpowered = clients.filter(function(e) {
      return e.allocatedPower < e.currentPower;
    });

    var i = clientsUnderpowered.length;
    

    var assignedData;

    var infiniteloopbreak = 1000;

    while(i--) {
      client = clientsUnderpowered[i];

      // do not determine when powertesting
      if(client.powertesting) {
        continue;
      }

      // find unpowered data
      var dataUnpowered = datamap.filter(function(e) {
        return !e.processors.length;
      });

      var j = dataUnpowered.length;

      console.log('unpowered data left:', j);

      assignedData = [];

      // assign client to unpowered data
      while(j--) {

        // client: allocate and process
        piece = dataUnpowered[j];

        if(piece.allocated.indexOf(client.id) > -1) {
          continue;
        }

        piece.allocated.push(client.id);
        piece.processors.push(client.id);

        allocationObject = {
          id: piece.id,
          clients: piece.data
        }

        client.allocatedPower++;
        client.allocation++;

        assignedData.push(allocationObject);

        // client is full
        if(client.allocatedPower == client.currentPower) {
          break;
        }

      }

      // client is not full
      if(client.allocatedPower < client.currentPower) {

        console.log('allocatedpower / currentpower', client.allocatedpower, client.currentPower);
        console.log('$$$ crash due to underflow');
        process.kill()

        i++;
      } else {
        if(assignedData.length) {

          dwc = getDataworkerById(client.dataworker);

          // check if client is alive.
          if(dwc) {

            getDataworkerById(client.dataworker).emit('assignedData', {
              data: assignedData,
              worker: client.id
            });

          }
        }
      }
    }

  }

  // final allocation for coverage
  // each client has max_data - client.allocation left to fill up

  clients = app.io.sockets.clients('room');
  i = clients.length;

  while(i--) {
    client = clients[i];

    if(client.powertesting) {
      continue;
    }

    // order by least coverage
    datamap = datamap.sort(function(a,b) { return b.allocated.length - a.allocated.length } );

    j = datamap.length; 

    // based on device type, allocate data
    var max_data = MAX_DESKTOP;
    if(client.device == 'mobile') {
      max_data = MAX_MOBILE;
    }

    var allocationLeft = max_data - client.allocation;
    var total;
    if(allocationLeft > 0) {
      // dish out the data
      assignedData = [];
      total = 0;

      // while there is still data and allocation space left
      while(j-- && allocationLeft--) {

        piece = datamap[j];

        if(piece.allocated.indexOf(client.id) > -1) {
          allocationLeft++;
          continue;
        }

        piece.allocated.push(client.id);

        allocationObject = {
          id: piece.id,
          clients: piece.data
        }

        client.allocation++;
        total++;

        assignedData.push(allocationObject);

        if(j == 0) {
          // go cyclic, if there is still allocation space left
          j = datamap.length;
        }

      }

      if(assignedData.length) {
        
        // check if client is alive.
        if(client.dataworker) {
          dwc = getDataworkerById(client.dataworker);

          if(dwc) {

            dwc.emit('assignedData', {
              data: assignedData,
              worker: client.id
            });

          }
        }
      }

    }

  }

  // for debug purposes
  // print out allocation map coverage.
  /*
  var n = datamap.length;
  var piece;
  while(n--) {
    piece = datamap[n];
    process.stdout.write(piece.allocated.length + ' ');
  }
  */

}

var join = function(req, datamap, settings) {

  // predetermine device speed
  // need to determine this better.
  // power number of iterations per 100 vectors
  req.io.socket.power = 100;
  if(req.io.socket.device == 'mobile') {
    req.io.socket.power = 50;
  }

  // do not set, cannot be used at 1st iteration.
  req.io.socket.iterations = null;

  // to better estimate power of workers.
  // maximum length of POWER_MEAN, average is actual power.
  req.io.socket.powerSet = [];

  // set up all clients to initially lag for 100 MS (round trip)
  req.io.socket.lagHistory = [100];
  req.io.socket.lag = 100;

  req.io.socket.powerAllocated = 0;

  // based on device type, allocate data
  var max_data = MAX_DESKTOP;
  if(req.io.socket.device == 'mobile') {
    var max_data = MAX_MOBILE;
  }

  // test the power of the client before joining.
  // give 10 vectors, and determine vsec.

  req.io.socket.powertesting = false;
  
  // special condition for the first node when there is no data.
  // vsec is calculated on the run.
  if(!datamap.length) {
    req.io.join('room');
    return;
  }

  var testdata = [];

  // find 10 vectors
  var i = datamap.length;
  var piece;
  while(i--) {
    piece = datamap[i];
    if(piece.data.length) {

      allocationObject = {
        id: piece.id,
        clients: piece.data
      }

      testdata.push(allocationObject);

    }

    if(testdata.length == 10) {
      break;
    }

  }

  if(testdata.length < 10) {
    // do not test if there is not enoug data. special condition.
    req.io.join('room');
    return;
  }

  // check if client is alive.
  if(req.io.socket.dataworker) {
    dwc = getDataworkerById(req.io.socket.dataworker);
    if(dwc) {
      dwc.emit('assignedData', {
        data: testdata,
        worker: req.io.socket.id
      });
    }
  }

  req.io.socket.powertesting = true;
  req.io.emit('powertest'); 

  req.io.join('room');

}

var endpowertest = function(req) {

  req.io.socket.powerSet = Array.apply(null, new Array(POWER_MEAN)).map(Number.prototype.valueOf,req.data.speed);
  req.io.socket.power = req.data.speed;
  req.io.socket.powertesting = false;

}

var sendMonitor = function(data) {

  var i = app.io.sockets.clients('monitors').length;
  while(i--) {
    monitor = app.io.sockets.clients('monitors')[i];
    monitor.emit('monitor', data);
  }

}

var sendTest = function(data) {

  var i = app.io.sockets.clients('tests').length;
  while(i--) {
    monitor = app.io.sockets.clients('tests')[i];
    monitor.emit('test', data);
  }

}

var pings = {}

var ping = function() {

  // ping all available nodes
  var client;
  var i = clientsOnline();
  while(i--) {
    client =  app.io.sockets.clients('room')[i];
    client.emit('ping');

    pings[client.id] = setTimeout(function() {
      
      console.log('>> ping timeout for', client.id);
      //removeClient(datamap, client);

    }, nodeSettings.runtime + 1000);
  }

  setTimeout(function() {
    ping();
  }, 1000);

}

var pingReceived = function(req) {
  clearTimeout(pings[req.io.socket.id]);
}

var processworkerstart = function(req) {

  req.io.socket.device = req.data.device;
  req.io.socket.dataworker = req.data.dataworker;
  req.io.socket.allocation = 0;
  req.io.emit('myid', req.io.socket.id);
  join(req, datamap, settings);
  console.log('@ worker joined', req.io.socket.id);

}

var dataworkerstart = function(req) {
  req.io.join('dataworkers');
  req.io.emit('myid', req.io.socket.id);
}

var monitor = function(req) {
  req.io.join('monitors');
  console.log('@ monitor connected');
}

var test = function(req) {
  req.io.join('tests');
  console.log('@ test connected');
}

var startp = function(req) {

  console.log('!>> System started');
  start = true;
  run(parameters);

}

var stopp = function(req) {
  
  console.log('!>> System paused');
  start = false;

}

var reset = function(req) {
  
  console.log('!>> System reset');
  initial_parameter = INITIAL_PARAMETER;
  step = 0;
  parameters = [];
  markovResults = [];
  markovIDs = [];

}

app.io.set("heartbeat timeout", nodeSettings.runtime);

app.io.route('processworkerstart', processworkerstart);
app.io.route('dataworkerstart', dataworkerstart);
app.io.route('proxydata', proxyData);
app.io.route('endpowertest', endpowertest);
app.io.route('registerData', registerdata);

app.io.route('start', startp);
app.io.route('stop', stopp);
app.io.route('reset', reset);

app.io.route('monitor', monitor);
app.io.route('test', test);

app.io.route('disconnect', function(req) {
  // client disconnects
  removeClient(datamap, req.io.socket);
})

app.io.route('offerData', function(req) {
  // clients wants to add data to the pool.
  addIndices(datamap, req);
});

app.io.route('downloadData', function(req) {
  // clients want to receive data.
  uploadDataToClient(datamap, req);
});

app.io.route('reduce', function(req) {
  // reduce function
  prereduce(req);
});

app.io.route('ping', function(req) {
  pingReceived(req);
});


// Send the client html.
app.get('/', function(req, res) {
    res.render('index')
});

app.get('/monitor', function(req, res) {
    res.render('monitor', {
      step: nodeSettings.runtime,
      start: start
    })
});

app.get('/test', function(req, res) {
    res.render('test');
});

app.listen(8071);