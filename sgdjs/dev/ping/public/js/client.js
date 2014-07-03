ping = function(e) {
	io.emit('ping', e);	
}

io = io.connect();

io.on('ping', ping);

io.emit('start');