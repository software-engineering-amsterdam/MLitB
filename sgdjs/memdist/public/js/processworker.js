importScripts('/socket.io/socket.io.js');
importScripts('/js/last_mlitb.js')

var io, id, device, parent, dataworker, port, f;
var data = [];
var that = this;
var powertesting = false;
var terminate = false;

var ITER_AVERAGE_SAMPLES = 3;

var vsec, isec;

Array.prototype.average = function () {
    var sum = 0, j = 0; 
    for (var i = 0; i < this.length, isFinite(this[i]); i++) { 
        sum += parseFloat(this[i]); ++j; 
    } 
    return j ? sum / j : 0; 
};

var logger = function(e){ 
	this.postMessage({
		type: 'log',
		data: e
	});
}

var getDataByid = function(id) {

	var i = data.length;
	while(i--) {
		if(data[i].id == id) {
			return data[i];
		}
	}

	return false;

}

var setMyId = function(newid) {
	id = newid;
	logger('My ID is ' + id);

	port.postMessage({
		type: 'registerprocessworker',
		data: id
	});

  that.postMessage({
    type: 'registerprocessworker',
    data: id
  });
}

var senddata = function(e) {
	
	// make package
	dataToSend = [];

	var i = e.data.length;
	var piece;

	while(i--) {
		piece = e.data[i];

		dataToSend.push({
			recipient: piece.recipient,
			data: getDataByid(piece.id)
		});
	}

  logger('uploaded data: ' + id);

	port.postMessage({
		type: 'senddata',
		data: dataToSend
	})

}

var downloaddata = function(e) {

	var i = e.data.length;
	while(i--) {
		data.push(e.data[i]);
	}

  logger('downloaded data length/id: ' + e.data.length + ' ' + id);

  // only at start
  if(powertesting) {
    runpowertest();
  }

}

var runpowertest = function() {

  // the 10 test data vectors have arrived, start testing.

  list = data.map(function(o) {
    return o.id;
  });

  mapObject = {
    list: list,
    parameters: 0.0,
    settings: {runtime: 1000}
  }

  map(mapObject);

}

var endpowertest = function(vsec) {

  powertesting = false;

  data = [];

  io.emit('endpowertest', {
    'speed': vsec
  });

}

var powertest = function(obj) {
  // powertest is done before node joins the processing network.
  // with this the vsec is calculated, so there is little need for stabilisation later on.
  // this reduces the isec wobble on the other nodes due to skewed reallocation by arbitrary vsec at start.

  // are the 10 test data vectors arrived? set a marker for it
  powertesting = true;

}


var is_initialized = false;
var Net, conf;

var map = function(obj) {

  shuffle = function(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  };

  var list = obj.list;
  var workingsetslice = obj.workingsetslice;
  var parameters = obj.parameters;
  var parameterId = obj.parameterId;
  var lag = obj.lag;
  var settings = obj.settings;
  var time = (new Date).getTime();
  var trueTime;

  var iterations = 0;

  var slice = Math.round(list.length / workingsetslice);  

  if(slice < 1.0) {
    slice = 1.0;
  }

  workingset = data.filter(function(e) {
    return (list.indexOf(e.id) > -1);
  });

  logger('slice size: ' + slice.toString());

  workingset = shuffle(workingset);

  // initialize the network for the first time
  initialize = function() {

    if (!is_initialized) {

      Net = new mlitb.Net();
      conf = []
      conf.push({type : 'input', sx : 28, sy:28, depth :1});
      //conf.push({type : 'conv', sx : 5, stride : 1, filters : 8, activation : 'relu'});
      //conf.push({type : 'pool', sx : 2, stride : 2});
      conf.push({type : 'conv', sx : 5, stride : 1, filters : 16, activation : 'relu'});
      conf.push({type : 'pool', sx : 3, stride : 3, drop_prob : 0.5});
      // conf.push({type : 'fc', num_neurons : 10, activation : 'relu'});
      conf.push({type : 'fc', num_neurons : 10, activation : 'softmax'});

      Net.createLayers(conf);

    }
  }

  fn = function() {
    // do computation
    var piece, i, j, vector;
    var total = 0;
    var startTime, currentTime, iterTime, Input;
    var iterTimes = [];

    if (is_initialized) {
      // copy the parameters and gradients
      Net.setParamsAndGrads(parameters.parameter.parameters);
    }

    startTime = (new Date).getTime();
    iterTime = startTime;
    var error = 0.0;
    var nVector = 0;

    while(true) {

      if(workingsetslice) {

        if(workingset.length < slice) {
          // reset workingset

          workingset = data.filter(function(e) {
            return (list.indexOf(e.id) > -1);
          });

          workingset = shuffle(workingset);

        }

        subset = workingset.slice(0, slice);
        workingset = workingset.slice(slice, workingset.length);

      } else {
        subset = workingset;
      }

      // COMPUTATION STARTS FROM HERE
      // workingset = the data you are working with.
      // parameters = the parameters from previous node.

      i = subset.length;
      while(i--) {

        piece = subset[i];

        // NOTE. piece = single working datapoint (object)s.

        Input = new mlitb.Vol(28,28,1, 0.0);
        Input.data = piece.data;
        cTime = (new Date).getTime();
        Net.forward(Input,true);
        error+=Net.backward(piece.label);
        nTime = (new Date).getTime();
        tt = nTime-cTime;
        nVector++;

      }

      // END OF COMPUTATION

      iterations++;

      currentTime = (new Date).getTime();

      // predict if the next iteration does not pass the settings.runtime.
      iterDiff = currentTime - iterTime;
      iterTime = currentTime;

      iterTimes.push(iterDiff);
      iterTimes.slice(-1 * ITER_AVERAGE_SAMPLES, 2 * ITER_AVERAGE_SAMPLES);
      iterPredict = Math.round(iterTimes.average());

      if((currentTime > (time + settings.runtime)) || (iterPredict + currentTime) > (time + settings.runtime)) {

        trueTime = currentTime - startTime;

        parameters = {
          parameters : Net.getParamsAndGrads(),
          error : error,
          nVector : nVector
        };
        logger('runtime ' + tt); 
        break;
        
      }
   
    }

    logger('iterations: ' + iterations);

    logger('assigned list / remaining: ' + list.length + ' / ' + workingset.length);

    is_initialized = true;

    return finish();

  }


  finish = function() {

    // calculate speed v / i

    if(workingsetslice) {
      sl = slice;
    } else {
      sl = list.length;
    }

    vsec = (iterations * sl) / (settings.runtime / 1000);
    isec = (iterations / (settings.runtime / 1000));

    if(workingsetslice) {
      isec /= workingsetslice;
    }

    if(vsec <= 1.0) {
      vsec = 1.0;
    }

    // happens only when node just joined.
    if(powertesting) {
      return endpowertest(vsec);
    }

    // reduce
    io.emit('reduce', {
      'parameters': parameters,
      'parameterId' :parameterId,
      'speed': vsec,
      'iterations': isec,
      'runtime': trueTime
    });

    // tell dataworker the performance. It may decide to shut this worker down
    // if peformance is irky.
    this.postMessage({
      type: 'performance',
      id: id,
      vsec: vsec,
      isec: isec,
      lag: lag
    })

    if(terminate) {
      logger('Shutting down.');
      self.close();
    }

  }

  initialize();
  fn();

}

var start = function(e) {

	device = e.data.data.device;
	dataworker = e.data.data.dataworker;
	port = e.ports[0];

	port.onmessage = function(e) {

    if(e.data.type == 'fileupload') {
      fileupload(e.data);
    } else if(e.data.type == 'senddata') {
      senddata(e.data);
    } else if(e.data.type == 'downloaddata') {
      downloaddata(e.data);
    }
  };

	io = io.connect();

	io.on('log', function(e){
		logger(e);
	});

	io.on('myid', setMyId);
  io.on('powertest', powertest);
	io.on('map', map);	

	// tell server where to send data items.
	io.emit('processworkerstart', {
		device: device,
		dataworker: dataworker
	});

}

var fileupload = function(e) {

	data = data.concat(e.data);

  logger('file uploaded, length: ' + e.data.length);

}

this.onmessage = function(e) {
	
	if(e.data.type == 'start') {
		start(e);
	} else if(e.data.type == 'terminate') {
    io.disconnect();
    terminate = true;
  }

}