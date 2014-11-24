var Client = require('./client');

Boss = function(socket) {

	this.socket = socket;

    this.slaves = [];

};

Boss.prototype = new Client();
Boss.prototype.constructor = Boss;

module.exports = Boss;