/*
 * Machine Learning in the Browser (MLitB)
 * Source code for reference for Master's thesis "Machine Learning in the Browser"
 * by Remco Hendriks.
 * Master Software Engineering 2013-2014
 * University of Amsterdam
 * r3mcohendriks@gmail.com
 *
 * Source code licence: MIT
 *
 * PROTOTYPE VERSION.
 *
 * Usage:
 * node app.js
 *
 * Currently only operational in Google Chrome or Safari web browser.
 *
 * Worker instance:
 * URL: [localhost]:8071.
 *
 * Control panel instance:
 * URL: [localhost]:8071/monitor
 *
 * Network testing instance:
 * URL: [localhost]:8071/test
 *
 * Quick start:
 * 1. Start server instance (master node) by running 'node app.js'
 * 2. Open one worker instance, press start, press upload-> select train dataset file from /Data/
 * 3. Open one network testing instance, press upload-> select test dataset file filefrom /Data/
 * 4. Open one control panel instance, press start.
 * 5. Network is now operational and working. Network testing instance may be slow due to predicting the full dataset size each update.
 * (6.) Observe generalization error results in the network testing instance.
 *
 * Add more working instances (slave nodes):
 * In worker instance, press + to add slave node (web worker). Optimal number is (number of CPU processing units * 2) - 1.
 * 
 */

// Express + Socket IO setup

express = require('express.io'),
app = require('express.io')()
  , stylus = require('stylus')
  , nib = require('nib')
  , http = require('http')
  , program = require('commander')
  , SGDTrainer = require('./reduction')
app.http().io()


program.version('0.2.0')
  .option('-t, --time <t>', 'Training time', parseInt)
  .parse(process.argv);

if(!program.time) {
  console.log('No training time supplied, run [node app.js -t <time>]');
} 

if(program.time < 2000) {
  console.log('Training time too short, set at least 2000 MS');
}

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

// Average function for simple averaging of arrays of ints/floats
// i.e. [1,2,3,4,5].average()
Array.prototype.average = function () {
    var sum = 0, j = 0; 
   for (var i = 0; i < this.length, isFinite(this[i]); i++) { 
          sum += parseFloat(this[i]); ++j; 
    } 
   return j ? sum / j : 0; 
};

// Network configuration constants.

// MAX DESKTOP = number of vectors a desktop machine can store.
// MAX_MOBILE = number of vectors a mobile device can store.
var MAX_DESKTOP       = 1000,
    MAX_MOBILE        = 500,
    // COVERAGE EQ: data redundancy level. Data with lower COVERAGE_EQ are prioritized in distribution.
    COVERAGE_EQ       = 3,
    // POWER_MEAN: number of historic vsec measures to average
    POWER_MEAN        = 5,
    // LAG_HISTORY: number of historic latency measures to average
    LAG_HISTORY       = 10, // MIN = 3
    // INITIAL_PARAMETER: The first theta parameter to send to the first slave node in the first repetition.
    INITIAL_PARAMETER = 0.0;

var settings = {
  'currentPower' : 400
}

// Time a client runs:
// Default: 4000
// Higher: predictions take longer, thus workers are added more slowly by clients
// Lower: Clients with high latency (e.g. 500 MS or something) may starve.
var nodeSettings = {
  'runtime': program.time
}

var running = false;
var start = false;

var normalizeFactor, markovLength, markovResults, markovFirstResult, proxyTimeout, SGD;
var markovChain = [];
var markovIDs = [];
var parameters = [];
var dataToProxy = [];
var latency_avg = [];
var datamap = [];
var timeouts = {};

var markovRotationID = 0;
var parameterRotationID = 0;
var step = 0;
var latency_min = 9999;
var latency_max = 0;
var nextIndex = 1;

var initial_parameter = INITIAL_PARAMETER;

// helper functions

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

// send data to control panel monitor
var sendMonitor = function(data) {

  var i = app.io.sockets.clients('monitors').length;
  while(i--) {
    monitor = app.io.sockets.clients('monitors')[i];
    monitor.emit('monitor', data);
  }

}

// send data to network test instances
var sendTest = function(data) {

  var i = app.io.sockets.clients('tests').length;
  while(i--) {
    monitor = app.io.sockets.clients('tests')[i];
    monitor.emit('test', data);
  }

}

/*
  map is build as such:
  id = index of remote data object.

  note: the server node does not record any difference between S_n and D_n, they are both 'data'

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

// Router endpoints

// Registers data indices in the datamap. These clients are available to upload data to others.
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

// Called by uploading client to send data to downloading client.
var proxyData = function(req) {

  item = req.data;

  var client = getClientById(item.recipient);

  // check if client is alive
  if(client) {

  var dataworkerForClient = getDataworkerById(client.dataworker);

    dataworkerForClient.emit('downloadData', item);

  }

}

// Selects client to tell them to upload data to another client.
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


// Used when client uploads training dataset into the network.
// Registers new indices for this new data in the datamap.
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

// Called by router when client leaves.
var removeClient = function(datamap, client) {

  console.log('Dropped client:', client.id);

  client.leave('room');

  var i = datamap.length;
  var lostData = 0;

  // Remove client references from datamap
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
    // this means data is lost.
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

// Reduction step in MapReduce
// Called once when all slave nodes are done working.
var reduce = function(markovResults) {

  if(step == 0) {
    //Create object SGD Trainer
    trainer_param = {
      learning_rate : 0.1, //starting value of learning rate
      lr_decay : 1, //multiplication factor
      lr_decay_interval : 5, //iteration interval of learning rate decay
      lr_threshold : 0.0, //0.001, //lower bound of learning rate
      momentum : 0.9,
      batch_size : 16, 
      l2_decay : 0.001
    }
    SGD = new SGDTrainer({}, trainer_param);
  }

  SGD.reduce(parameters, markovResults, step, sendTest, sendMonitor);

  step++;  

  /*
   * Default implementation of a reducer.
   * Accepts a single float from each slave node.
   * 
   * Result parameters from the nodes are stored in markovResults

   * var i = markovResults.length;
   * var piece;

   * while(i--) {
   *   piece = markovResults[i];

   *   parameter = piece.parameter;
   *   parameterId = piece.parameterId;

   *   // parameter from previous step
   *   previousParameter = parameters[parameterId];

   *   // new parameter
   *   newParameter = (previousParameter + parameter) / 2.0;

   *   // store parameter for next step.
   *   parameters[parameterId] = newParameter;

   * }

   * Optionally: output here.
   * Could be done with websocket.
   */

}


// Called by an individual slave node when done working.
// Primarily for management and bookkeeping.
// Calls prereduce when it's the last slave node to reduce in a repetition step.
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

  // only for the first slave node to arrive, to determine latency
  if(!markovResults.length) {
    markovFirstResult = process.hrtime()
  }

  // determine lag.
  lag = hrtime() - req.io.socket.mapTime - runtime;

  if(lag < latency_min) { 
    latency_min = lag;
  }

  if(lag > latency_max) { 
    latency_max = lag;
  }

  latency_avg.push(lag);

  // Store average latency
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

  // save power of this worker
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

  // only for the last slave node to arrive
  if(!markovIDs.length) {

    // what is the delay?
    delay = process.hrtime(markovFirstResult).join('')
    console.log('chain reception delay / last to arrive:', delay / 1000000, 'MS', req.io.socket.id);

    avg = latency_avg.average();

    sendMonitor({
      type: 'latency',
      data: {
        'min': latency_min,
        'max': latency_max,
        'avg': avg,
        'step': step
      }
    });

    latency_min = 9999;
    latency_max = 0;
    latency_avg = [];

    // call reducer
    reduce(markovResults);

    markovResults = [];
    // run next chain
    run(parameters);

  }

}

// dispatcher of the slave nodes to start working.
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

    // assign new parameter...
    if(parameters[parameterId] === undefined) {
      parameters[parameterId] = initial_parameter;
    }

    // ... or select an existing one
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

// determines which slave nodes are ready to work.
// based on the training data available in the network.
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

    set.push({
      'client': client.id,
      'set': localset
    });

    total += localset.length;

  }

  // now build a markov chain.
  // a schedule is made by looping over node IDS.
  // with SGD this makes only 1 'chain'

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

// entry point function to start the network.
// called by the monitor (control panel)
// or when previous repetition is done.
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

  // redistribute the training data.
  reallocate(datamap);

  // select clients & build markov chains
  markovChain = initiator(datamap);

  if(!markovChain.length) {
    console.log('could not build a processing set.');
    console.log('trying again in', nodeSettings.runtime, 'MS');
    setTimeout(run, nodeSettings.runtime);
    return;
  }

  // dispatches slave nodes to work
  distributor(parameters);

}

/*
 * Reallocate = Power based allocation algorithm.
 * Partitions the training data over all available slave nodes based on their processing power
 */
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

  // for display purposes
  sendMonitor({
    type: 'power',
    data: {
      'power': powerAvailable,
      'clients': clientsOnline(),
      'step': step
    }
  });

  // normalize powerAvailable to the datamap size
  // each node divides his power by the normalizeFactor (factor G)

  normalizeFactor = powerAvailable / datamap.length;

  console.log('> normalization factor G:', normalizeFactor);

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

    // Determines shard size |S_n| (float)

    currentPowerFloat = (client.power / normalizeFactor)
    currentPower = Math.floor(currentPowerFloat);

    // Determines decimal part of |S_n|
    // |S_n| can only be an integer, so try to distribute the fraction

    diff = currentPowerFloat - currentPower;
    client.powerDiff = diff;

    // currentPower can not be more than allocated dataset
    if(client.device == 'mobile') {
      clientMaxData = MAX_MOBILE;
    } else {
      clientMaxData = MAX_DESKTOP;
    }

    // 'Favour' algorithm
    // The fraction left is redistributed as a single point
    // When |S_n| == M, client is FULL = not possible to add point
    // When |S_n^(t+1)| == |S_n^t| + 1 == 1 point different than last repetition = very favourable
    // When |S_n^(t+1)| == |S_n^t| == same as last repetition, less favourable

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
  // 1 point at a time, based on favour
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

    // there are vectors in the datamap which are unprocessed, because some clients are full
    // find clients which are not full yet
    var clients = app.io.sockets.clients('room');
    var clientsUnderpowered = clients.filter(function(e) {
      return e.allocatedPower < e.currentPower;
    });

    var i = clientsUnderpowered.length;
    var assignedData;

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
  // each client has max_data - client.allocation left to fill up (D_n = M - |S_n|)

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
      // assign data
      assignedData = [];
      total = 0;

      coverage_required = true;
      coverage_count = 0;

      // while there is still data and allocation space left
      while(j-- && allocationLeft--) {

        piece = datamap[j];

        // already allocated to this client
        if(piece.allocated.indexOf(client.id) > -1) {
          allocationLeft++;
          continue;
        }

        // already is covered enough
        if(piece.allocated.length >= COVERAGE_EQ && coverage_required == true) {
          allocationLeft++;
          coverage_count++;
          // when full dataset is covered, allocation is allowed
          if(coverage_count == datamap.length) {
            coverage_required = false;
          }
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

// called when a new slave node enters the network
var join = function(req, datamap, settings) {

  // predetermine device speed
  // power number of iterations per 100 vectors
  // is improved after power testing.
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
  // i.e. no power testing (because no sample training data is available)
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

// called by slave node when power testing is done, gives P_n
var endpowertest = function(req) {

  req.io.socket.powerSet = Array.apply(null, new Array(POWER_MEAN)).map(Number.prototype.valueOf,req.data.speed);
  req.io.socket.power = req.data.speed;
  req.io.socket.powertesting = false;

}

// called by 'process worker' (slave node) at join
var processworkerstart = function(req) {

  req.io.socket.device = req.data.device;
  req.io.socket.dataworker = req.data.dataworker;
  req.io.socket.allocation = 0;
  req.io.emit('myid', req.io.socket.id);
  join(req, datamap, settings);
  console.log('@ worker joined', req.io.socket.id);

}

// called by 'data worker' at join
var dataworkerstart = function(req) {
  req.io.join('dataworkers');
  req.io.emit('myid', req.io.socket.id);
}

// connects control panel monitor
var monitor = function(req) {
  req.io.join('monitors');
  console.log('@ monitor connected');
}

// connects network test instance
var test = function(req) {
  req.io.join('tests');
  console.log('@ test connected');
}

// used by control panel:
// starts network
var startp = function(req) {
  console.log('!>> System started');
  start = true;
  run(parameters);
}

// pauses network
var stopp = function(req) {
  console.log('!>> System paused');
  start = false;
}

// resets network
// NB: resets only theta parameters.
// Training data remains on the slave nodes.
var reset = function(req) {
  console.log('!>> System reset');
  initial_parameter = INITIAL_PARAMETER;
  step = 0;
  parameters = [];
  markovResults = [];
  markovIDs = [];
}

/* Socket IO Settings */
app.io.set('log', true);
app.io.set('log level', 2);
app.io.set('destroy buffer size', Infinity);

/* Socket IO Router */

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
  removeClient(datamap, req.io.socket);
})

app.io.route('offerData', function(req) {
  addIndices(datamap, req);
});

app.io.route('downloadData', function(req) {
  uploadDataToClient(datamap, req);
});

app.io.route('reduce', function(req) {
  prereduce(req);
});

/* HTML server */

// Slave node
app.get('/', function(req, res) {
    res.render('index')
});

// Control panel
app.get('/monitor', function(req, res) {
    res.render('monitor', {
      step: nodeSettings.runtime,
      start: start
    })
});

// Network test instances
app.get('/test', function(req, res) {
    res.render('test');
});

// Listen on HTTP port
app.listen(8071);



