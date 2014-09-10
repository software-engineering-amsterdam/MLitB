/*
    Slave instance for web browsers.
    Needs to inherit slave.js

    == USES WEB BROWSER JS APIs ==
    == DO NOT USE FOR NodeJS ==
 */


importScripts('/socket.io/socket.io.js');
importScripts('lastmlitb.js')
importScripts('slave.js');

var Worker = function() {
    this.port;
    this.socket;
}

Worker.prototype = new Slave();
Worker.prototype.contructor = Worker;

Worker.prototype.start_socket = function(id) {

    var that = this;

    var port = Math.floor(Math.random() * (8004 - 8001 + 1)) + 8001;

    this.socket = io('http://localhost:' + port);
    this.socket.on('message', function (d) { that.message_from_master(d); });

}

Worker.prototype.send_message_to_boss = function(type, data) {
        
    this.port.postMessage({
        type: type,
        data: data
    })

}

Worker.prototype.send_message_to_master = function(type, data) {

    this.socket.emit("message", {type: type, data: data});

}

var slave = new Worker();

slave.port = this;

onmessage = function(e) { slave.message_from_boss(e); }