var Client = function(socket) {

    this.socket = socket;

    /*

	this.ping_time;
	this.ping_timeout;
	this.reping_timeout;

	this.max_pong_time = 10000;

	*/

}

Client.prototype.send = function(type, data) {

	this.socket.emit('message', {
		type: type,
		data: data
	});

}

/*

Client.prototype.ping = function() {

	var that = this;

	clearTimeout(this.reping_timeout);

	this.ping_time = Date.now();

	console.log(' $$ send ping');

	this.send('ping', null);

	this.ping_timeout = setTimeout(function() {
		that.timeout();
	}, that.max_pong_time)

}

Client.prototype.timeout = function() {

	console.log(' $$ ping timeout');

	clearTimeout(this.ping_timeout);

	if(this.socket) {
		console.log(' $$ socket already gone');
		// could be gone for long already
		this.socket.disconnect();	
	}
	
	// disconnect functions in neuralnetwork are called automatically.
	return;

}

Client.prototype.pong = function(type, data) {

	var that = this;

	console.log(' $$ received pong');

	clearTimeout(this.ping_timeout);

	this.reping_timeout = setTimeout(function() {
		that.ping(); 
	}, that.max_pong_time);

}

*/

module.exports = Client;