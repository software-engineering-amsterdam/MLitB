importScripts('/socket.io/socket.io.js');

var io, id, device, parent, dataworker, port, f;
var data = [];
var that = this;
var powertesting = false;
var terminate = false;

var vsec, isec;

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

  logger('downloaded data: ' + id);

  // only at start
  if(powertesting) {
    runpowertest();
  }

}

var dataworkermessage = function(e) {

	if(e.data.type == 'fileupload') {
		fileupload(e.data);
	} else if(e.data.type == 'senddata') {
		senddata(e.data);
	} else if(e.data.type == 'downloaddata') {
		downloaddata(e.data);
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

var map = function(obj) {

  var list = obj.list;
  var parameters = obj.parameters;
  var parameterId = obj.parameterId;
  var lag = obj.lag;
  var settings = obj.settings;
  var time = (new Date).getTime();

  // get working set from local data set
  var workingset = data.filter(function(e) {
    return (list.indexOf(e.id) > -1);
  });

  var iterations = 0;

  fn = function() {

    // do computation
    var piece, i, j, vector;
    var total = 0;
    var currentTime;

    while(true) {

      // do process

      // COMPUTATION STARTS FROM HERE
      // workingset = the data you are working with.

      i = workingset.length;
      while(i--) {

        piece = workingset[i];

        // NOTE. piece = single working datapoint (object)
        // in this case, piece is an array with 1000 floats.

        // SAMPLE COMPUTATION.
        // ADD ALL NUMBERS AND DIVIDE
        j = piece.data.length;
        while(j--) {
          vector = piece.data[j];
          parameters += vector;
          total++;
        }

      }

      parameters /= total;

      // END OF COMPUTATION

      iterations++;

      currentTime = (new Date).getTime();

      if(currentTime > (time + settings.runtime)) {
        break;
        
      }
   
    }

    return finish();

  }

  finish = function() {

    // calculate speed v / 1000i

    vsec = ((iterations / 1000) * list.length) / (settings.runtime / 1000);
    isec = iterations / (settings.runtime / 1000);

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
      'speed': vsec
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

  fn();

}

var start = function(e) {

	device = e.data.data.device;
	dataworker = e.data.data.dataworker;
	port = e.ports[0];

	port.onmessage = dataworkermessage;

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

}

var clientmessage = function(e) {
	
	if(e.data.type == 'start') {
		start(e);
	} else if(e.data.type == 'terminate') {
    io.disconnect();
    terminate = true;
  }

}

this.onmessage = clientmessage;