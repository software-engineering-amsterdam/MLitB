var Client = function(socket) {

    this.socket = socket;

    //this.master = master;

}

Client.prototype = {

	send: function(type, data) {
	
		this.socket.emit('message', {
			type: type,
			data: data
		});

	}

}

module.exports = Client;