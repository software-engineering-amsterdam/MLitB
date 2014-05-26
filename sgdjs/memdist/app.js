express = require('express.io'),
app = require('express.io')()
  , stylus = require('stylus')
  , nib = require('nib')
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


// STATICS
var MAX_DESKTOP = 800,
    MAX_MOBILE  = 200,
    COVERAGE_EQ = 3;

var settings = {
  'currentPower' : 400
}

var nodeSettings = {
  'runtime': 3000
}

// make this a online setting
var normalizeFactor;
var markovChain = [];
var markovLength;
var markovResults;
var markovFirstResult;
var currentChain = [];

var logger = function(req, text) {
  req.io.emit('log', text);
}

// returns number of clients connected
var clientsOnline = function() {
  return app.io.sockets.clients('room').length;
}

var getClientById = function(id) {
  var client;
  var i = clientsOnline();
  var clients = app.io.sockets.clients('room');
  while(i--) {
    client = clients[i];
    if(client.id == id) {
      return client;
    }
  }
  return;
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

var proxyData = function(datamap, req) {

  var client = getClientById(req.recipient);

  client.emit('uploadData', req.data);

  // make sure to register this!
  var data = getDataById(datamap, req.data.id);
  data.data.push(req.recipient);

}

var uploadDataToClient = function(datamap, req) {
  var id, client;
  var dataIds = req.data;
  var i = dataIds.length;

  // handle PER DATA ITEM.
  while(i--) {
    id = dataIds[i];

    // just get first client for now.
    // implement any function here to determine fastest client.
    client = getClientById(id.clients[0]);

    obj = {
      id: id.id,
      recipient: req.io.socket.id
    };

    // ask client to send the data to the server, to proxy to the recipient.
    client.emit('proxyDataClient', obj);

  }

}

var addIndices = function(datamap, req) {
  // adds indexes of remote data objects to server datamap.

  // from nextIndex, add length number of indices
  var i, index, newObject;
  var firstIndex = nextIndex;

  for(i = 0; i < req.data; i++) {
    index = i + nextIndex;
    newObject = {
      id: index,
      data: [req.io.socket.id],
      allocated: [req.io.socket.id],
      processors: []
    }
    datamap.push(newObject);
  }

  req.io.socket.allocation += req.data;

  nextIndex = index + 1;

  // communicate firstIndex to the client.
  req.io.emit('dataFirstIndex', firstIndex);

  reallocate(datamap);

}

var removeClient = function(datamap, req) {

  client = req.io.socket.id;

  console.log('Dropped client:', client);

  var i = datamap.length;
  while(i--){ 
    var item = datamap[i];

    // dump data
    var index = item.data.indexOf(client);
    if(index > -1) {
      item.data.splice(index, 1);
    }

    // dump allocated
    index = item.allocated.indexOf(client);
    if(index > -1) {
      item.allocated.splice(index, 1);
    }

    // dump as processor
    index = item.processors.indexOf(client);
    if(index > -1) {
      item.processors.splice(index, 1);
    }

    // when there is no redundancy, remove.
    if(!item.data.length) {
      datamap.splice(i, 1);
      console.log('data lost')
    }
  }

  req.io.leave('room');

  reallocate(datamap);

  if(markovChain.length) {
    // check if there is a markovchain running with this client in.

    // fix markovChain if the client is in there
    i = markovChain.length;

    var chain, j, set;

    while(i--) {
      chain = markovChain[i];

      j = chain.length;

      while(j--) {

        set = chain[j];

        if(set.client == client) {

          console.log("-> Dropped client from planned job in chain.");

          // remove from chain.
          chain.splice(j, 1);

        }

      }
      

    }

  }

  // determine if this client is/was working
  i = currentChain.length;
  var set, j, piece, node;
  while(i--) {
    
    chainClient = currentChain[i];
    if(chainClient.client == client) {
      // the client is currently operating.
      // HELL BREAKS LOOSE!

      // difficult issue.
      // other nodes could pick up the dropped client, but would stall the whole operation.

      // two viable options (for now):
      // 1. Accept the current chain for what is is, without output of the dropped node.
      //    Continue with the reduction step, and after that the next reduction step.
      // 2. Drop the current chain and do it all over again with a new chain.

      // Option 1 gives the least overhead as the system can keep on processing.
      // It gives bias as the entire shard is unprocessed.
      // It is probably possible to mitigate this by some smart reduction function
      // which can handle lost clients.

      // Option 2 gives the least bias, but it stalls the chain operation by at least 1 step.
      // The most fair, but potentially very distruptive.
      // Many nodes could join and leave in a short time, causing to lose many chain iterations.
      // But could be viable.

      // We choose option 1 for now. The perceived bias is not as much as probably many other
      // chain iterations are done.

      console.log('-> Client was currently processing, cleaning up.');

      markovLength--;

      if(markovResults.length == markovLength) {

        console.log('-> Last client, continue with reduction');

        parameter = reduce(markovResults);

        // run next chain
        distributor(parameter);

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

var reduce = function(res) {

  // SAMPLE REDUCTION
  // ONLY ADD UP
  var i = markovResults.length;
  var total = 0;
  var piece;
  while(i--) {
    piece = markovResults[i];

    total += piece;
  }

  return total;

}

var prereduce = function(req) {

  parameter = req.data.parameters;
  speed = req.data.speed;

  // only for the first
  if(!markovResults.length) {
    markovFirstResult = process.hrtime().join('');
  }

  // for all
  markovResults.push(parameter);

  // save speed of this worker
  req.io.socket.power = speed;

  // only for the last
  if(markovResults.length == markovLength) {

    // what is the delay?
    delay = process.hrtime().join('') - markovFirstResult
    console.log('chain reception delay:', delay, 'NS,', delay / 1000, 'uS,', delay / 1000000, 'MS');

    parameter = reduce(markovResults);

    // run next chain
    distributor(parameter);

  }

}

var output = function(parameter) {

  // runs when a full markov chain is done.
  // parameter == end result
  // log to all clients, for example.
  // normally, you would run the chain again.
  // i.e. run initiator again with a parameter.

  // report
  i = clientsOnline();
  while(i--) {
    client = app.io.sockets.clients('room')[i];
    client.emit('log', 'Markov chain done! Result: ' + parameter);
  }

  // the END

  // run again !
  run(datamap);


}

var distributor = function(parameter) {

  // read markov chain, pop item. (does not matter if backwards)

  if(!markovChain.length) {
    // chain is empty. all is done. run output
    return output(parameter);
  }

  markovResults = [];

  currentChain = markovChain.pop();

  var i = currentChain.length;

  markovLength = i;

  var client, item;
  while(i--) {

    item = currentChain[i];
    client = getClientById(item.client);

    // tell client to work.
    client.emit('map', {
      'list': item.set,
      'settings': nodeSettings,
      'parameters': parameter
    });

  }

}

var initiator = function(datamap, req) {

  // build a single markov chain
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

    localset = [];

    console.log('data for client:', client.id);
    j = datamap.length;
    while(j--) {
      piece = datamap[j];

      if(piece.data.indexOf(client.id) > -1) {
        // assign
        localset.push(piece.id);
        if(localset.length == client.allocatedPower) {
          break;
        }

      }

    }

    set.push({
      'client': client.id,
      'set': localset
    });

    total += localset.length;

  }

  // now make a full markov chain
  // with n = set.length
  // size = n*n
  var chain = [];
  var offset = 0;
  var n = set.length;
  var clientId;
  i = n;

  while(i--) {
    // first dim

    currentSet = []

    j = n;
    while(j--) {
      // second dim

      clientId = (j + offset) % set.length;

      currentSet.push(set[clientId]);
    }

    offset++;

    chain.push(currentSet);
  }

  // store chain
  markovChain = chain;

  // run distributor.
  distributor(0);

}

var run = function(datamap) {
  // run sample embedded job

  console.log('run job, sample markov chain');
  if(!datamap.length) {
    console.log('no datamap');
    return;
  }

  if(!clientsOnline()) {
    console.log('no clients');
    return; 
  }

  // done to redistribute client power.
  reallocate(datamap);

  initiator(datamap);

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
    powerAvailable += app.io.sockets.clients('room')[i].power;
  }

  console.log('power available:', powerAvailable);

  // normalize powerAvailable to the datamap size
  // each node divides his power by the normalizeFactor
  normalizeFactor = powerAvailable / datamap.length;

  console.log('normalization factor:', normalizeFactor);

  // tell each client his new power 'currentPower'
  i = clientsOnline();
  var power, client, currentPower, currentPowerFloat, clientMaxData, localUnderflow;
  var underflow = 0;
  var underflowOffset = false;
  while(i--) {
    client = app.io.sockets.clients('room')[i]; 
    // causes underflow, but will be solved.

    // determine underflow
    currentPowerFloat = client.power / normalizeFactor;
    currentPower = Math.floor(currentPowerFloat);

    localUnderflow = currentPowerFloat - currentPower;
    underflow += localUnderflow;

    // use epsilon to avoid awful rounding
    if(underflow > 1.0e-12) {
      // add 1 power to this client to solve underflow
      currentPower += 1;
      underflow -= 1.0;
      underflowOffset = true;
    }
  
    // currentPower can not be more than allocated dataset
    if(client.device == 'mobile') {
      clientMaxData = MAX_MOBILE;
    } else {
      clientMaxData = MAX_DESKTOP;
    }

    if(currentPower > clientMaxData) {
      currentPower = clientMaxData;

      // cannot add underflow point when at max. so remove.
      if(underflowOffset) {
        underflow += 1;
        underflowOffset = false;
      }

    } 

    client.currentPower = currentPower;
    console.log('current power of client:', currentPower, client.id);

    // set allocatedPower to 0 for easy calculation
    client.allocatedPower = 0;
  }


  // make a new datamap based on the 'new' power available.
  // first, re-build current datamap with current nodes, with new power settings.
  // second, assign new node the 'empty' spaces left by the other nodes
  // third, cover up rest of datamap by original method to reinforce coverage.

  // use 'processors' in the datamap
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
    // todo: new data means only 1 client has allocation, so move other clients to help process.
    clients = piece.allocated;
    j = clients.length;

    allocated = false;

    while(j--) {
      client = getClientById(clients[j]);
      if(client.allocatedPower < client.currentPower) {
        // assign
        if(piece.processors.indexOf(client.id) > -1) {
          continue;
        }

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

  // report
  i = clientsOnline();
  while(i--) {
    client = app.io.sockets.clients('room')[i];
    client.emit('log', 'Assigned ' + client.allocatedPower + ' vectors in memory as processing set');
  }

  if(totalEmpty) {
    console.log('manage unpowered data, number:', totalEmpty);

    // there are vectors in the datamap which are unprocessed, because some clients are full
    // find clients which are not full yet
    var clients = app.io.sockets.clients('room');
    var clientsUnderpowered = clients.filter(function(e) {
      return e.allocatedPower < e.currentPower;
    });

    // find unpowered data
    var dataUnpowered = datamap.filter(function(e) {
      return !e.processors.length;
    });

    var i = clientsUnderpowered.length;
    var j = dataUnpowered.length;

    var assignedData;
    while(i--) {
      client = clientsUnderpowered[i];

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
        i++;
      } else {
        if(assignedData.length) {
          client.emit('assignedData', assignedData);
          client.emit('log', 'Assigned ' + client.allocatedPower + ' vectors not in memory as processing set');
        }
      }
    }

  }

  // final allocation for coverage
  // each client has max_data - client.allocation left to fill up

  // order by least coverage
  datamap = datamap.sort(function(a,b) { return b.allocated.length - a.allocated.length } );

  clients = app.io.sockets.clients('room');
  i = clients.length;

  j = datamap.length;

  while(i--) {
    client = clients[i];

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
          j++;
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

      client.emit('assignedData', assignedData);
      client.emit('log', 'Assigned ' + total + ' vectors as spare set');

    }

  }

  // report
  i = clientsOnline();
  while(i--) {
    client = app.io.sockets.clients('room')[i];
    client.emit('log', 'Memory size: ' + client.allocation);
  }

}
 
var join = function(req, datamap, settings) {

  // predetermine device speed
  // need to determine this better.
  // power number of iterations per 100 vectors
  req.io.socket.power = 400;
  if(req.io.socket.device == 'mobile') {
    req.io.socket.power = 100;
  }

  req.io.socket.powerAllocated = 0;

  // based on device type, allocate data
  var max_data = MAX_DESKTOP;
  if(req.io.socket.device == 'mobile') {
    var max_data = MAX_MOBILE;
  }

  // just fill op the 'holes' in the datamap.
  // items of a shard do not need to be adjacent.

  // first: determine lowest coverage number.
  // order datamap by NR of clients.
  if(!datamap.length && clientsOnline() > 0) {
    logger(req, 'Cannot join network. No data available. First add data, then clients.');
    return;
  }

  req.io.join('room');

  reallocate(datamap);

}

// Setup the ready route, and emit talk event.
app.io.route('ready', function(req) {
  req.io.socket.device = req.data;
  req.io.socket.allocation = 0;
  req.io.emit('log', 'clients online:' + clientsOnline())
  req.io.emit('log', 'My ID: ' + req.io.socket.id);
  join(req, datamap, settings);
  console.log('MY ID:', req.io.socket.id);
});

app.io.route('disconnect', function(req) {
  // client disconnects
  removeClient(datamap, req);
})

app.io.route('offerData', function(req) {
  // clients wants to add data to the pool.
  addIndices(datamap, req);
});

app.io.route('downloadData', function(req) {
  // clients want to receive data.
  uploadDataToClient(datamap, req);
});

app.io.route('proxyData', function(req) {
  // client wants to send data to other client (through server).
  proxyData(datamap, req.data);
});

app.io.route('downloadDone', function(req) {
  // client is done downloading
  // for debug use now.
  //console.log(datamap);
});

app.io.route('run', function(req) {
  // run sample embedded job
  run(datamap);
});

app.io.route('reduce', function(req) {
  // reduce function
  prereduce(req);
});

app.io.route('datamap', function(req) {
  console.log(datamap);
  console.log('normalization factor', normalizeFactor);
  console.log('shortage:', shortage(datamap));
  var i = clientsOnline();
  var client;
  var total = 0;
  while(i--) {
    client = app.io.sockets.clients('room')[i]; 
    console.log('client, power', client.id, client.allocatedPower);
    total += client.allocatedPower;
  }
  console.log('power coverage:', total);

});

// Send the client html.
app.get('/', function(req, res) {
    res.render('index')
});

app.listen(8071);
