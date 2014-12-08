/*
    Slave instance for web browsers.
    Needs to inherit slave.js

    == USES WEB BROWSER JS APIs ==
    == DO NOT USE FOR NodeJS ==
 */


importScripts('/socket.io/socket.io.js');
importScripts('/static/js/mlitb.js');
importScripts('/static/js/slave.js');


var Worker = function() {
    this.socket;

    this.mlitb = mlitb;

}

Worker.prototype = new Slave();
Worker.prototype.contructor = Worker;

Worker.prototype.start_socket = function(id) {

    var that = this;

    this.socket = io();
    this.socket.on('message', function (d) { that.message_from_master(d); });
    this.socket.on('disconnect', function (d) { 
        that.disconnect(); 
        this.port.close();
    });

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

Worker.prototype.remove = function() {

    this.socket.close();

}

var slave = new Worker();

slave.port = this;

onmessage = function(e) { slave.message_from_boss(e); }