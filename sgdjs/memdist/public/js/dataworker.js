importScripts('/socket.io/socket.io.js');

var io, id, device, newData, processworkers;
var that = this;
var fileUploadRoundRobinId = 0;
var newProcessWorker;

var dataToExpect = {};

var logger = function(e){ 
	that.postMessage({
		type: 'log',
		data: e
	});
}

var processworkersLength = function() {

	var count = 0;
	for(prop in processworkers) {
		count++;
	}

	return count;

}

var setMyId = function(newid) {
	id = newid;
	logger('My ID is ' + id);

	that.postMessage({
		type: 'dataworkerid',
		data: id
	});

}

var setNewDataFirstIndex = function(data) {
	// add indices to newData starting from index.

	var i;
	var index = data.index;
	var client = data.client;

	// do not do this back to front
	for(i = 0; i < newData.length; i++) {
		newData[i].id = index;
		index++;
	}

	//Round robin the file uploads across available workers
	processworkers[client].postMessage({
		type: 'fileupload',
		data: newData
	});  

	fileUploadRoundRobinId = ((fileUploadRoundRobinId + 1) % processworkersLength());

	newData = [];

}

var assignedData = function(data) {
  // this client needs to download the data according to the indices.
  // data contains ID and list of clients.

  // this can be implemented in two ways:
  // 1. request server to proxy the data.
  // 2. peer-to-peer request the data (peerJS could do that.)

  // we do option 1 for now.

  // remember how many data each process worker is about to get
  worker = data.worker;
  size = data.data.length;

  if(!(worker in dataToExpect)) {
  	dataToExpect[worker] = {
  		size: 0,
  		data: []
  	}
  }

  dataToExpect[worker].size += size;

  // wait a bit, the server could still be registering the process worker.

  setTimeout(function() {
  	io.emit('downloadData', data);
  }, 100);

}

var proxyDataToServerRequest = function(e) {
  // other client requests data from YOU.
  // send to server, it will proxy the data to the recipient.

  // fetch this from the processworker

  var data = e.data;
  var processworker = e.source;

  processworkers[processworker].postMessage({
  	  type: 'senddata',
  	  data: data
  });

}

var proxyDataToServer = function(e) {

	// unpack data then send
	var i = e.data.length;
	var piece;

	while(i--) {
		piece = e.data[i];
		io.emit('proxydata', piece);
	}

}

var downloadData = function(e) {

	// need to keep book.
	var recipient = e.recipient;
	var data = e.data;
	var i, piece;
	var idset;

	dataToExpect[recipient].size--;
	dataToExpect[recipient].data.push(data);

	if(dataToExpect[recipient].size == 0) {
		processworkers[recipient].postMessage({
			type: 'downloaddata',
			data: dataToExpect[recipient].data
		});

		// register data
		i = dataToExpect[recipient].data.length;
		idset = [];
		while(i--) {
			piece = dataToExpect[recipient].data[i];
			idset.push(piece.id);
		}

		io.emit('registerData', {
			client: recipient,
			data: idset
		});

		dataToExpect[recipient].data = [];

	}


}

var start = function(e) {

	processworkers = {};

	device = e.data;
	io = io.connect();

	io.on('log', function(e){
		logger(e);
	});

	io.on('myid', setMyId);
	io.on('dataFirstIndex', setNewDataFirstIndex);
	io.on('assignedData', assignedData);
	io.on('proxyDataToServer', proxyDataToServerRequest);
	io.on('downloadData', downloadData);

	io.emit('dataworkerstart');

}

var fileupload = function(e) {

	var prop;
	var count = 0;
	var processworkerprop;

	newData = e.data;

	// select any process worker round-robin based to send file to.
	for(prop in processworkers) {
		if(count == fileUploadRoundRobinId) {
			processworkerprop = prop;
			break;
		}
		count++;
	}

	io.emit('offerData', {
		data: newData.length,
		id: processworkerprop
	});

}

var registerprocessworker = function(e) {

	processworkerid = e.data;
	processworkers[processworkerid] = newProcessWorker;

}

var processworkermessage = function(e) {

	if(e.data.type == 'registerprocessworker') {
		registerprocessworker(e.data);
	} else if(e.data.type == 'senddata') {
		proxyDataToServer(e.data);
	}

}

var addprocessworker = function(e) {

	newProcessWorker = e.ports[0];
	newProcessWorker.onmessage = processworkermessage;

}

var removeprocessworker = function(e) {

	delete processworkers[e.data];

}

var onmessage = function(e) {
	
	if(e.data.type == 'start') {
		start(e.data);
	} else if(e.data.type == 'fileupload') {
		fileupload(e.data);
	} else if(e.data.type == 'addprocessworker') {
		addprocessworker(e);
	} else if(e.data.type == 'removeprocessworker') {
		removeprocessworker(e.data);
	}

}

this.onmessage = onmessage;