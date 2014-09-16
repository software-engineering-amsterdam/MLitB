var redis_lib = require("redis");
var socket = require('socket.io-client');

var mlitb = require('./static/lastmlitb');
var Slave = require('./static/slave');

var Worker = function() {

    var that = this;

    this.host;
    this.port;
    this.socket;

    this.mlitb = mlitb;

    this.redis_id = process.env['id'];
    this.boss_id = process.env['boss_id']; // redundant later on, but needed now

    this.redis1 = redis_lib.createClient();
    this.redis2 = redis_lib.createClient();

    this.redis2.subscribe(this.redis_id);
    this.redis2.on("message", function(c,d) { that.message_from_boss({data: JSON.parse(d) }); });

    setTimeout(function() {

        that.redis1.publish(that.boss_id, JSON.stringify({
            redis_id: that.redis_id,
            data: {
                type: 'redis_ready'
            }
        }));

    }, 500);

}

Worker.prototype = new Slave();
Worker.prototype.contructor = Worker;

Worker.prototype.start_socket = function(id, host, port) {

    var that = this;

    this.socket = socket(host + ':' + port);
    this.socket.on('message', function (d) { 

        that.message_from_master(d); 
    });

}

Worker.prototype.send_message_to_boss = function(type, data) {

    this.redis1.publish(this.boss_id, JSON.stringify({
        redis_id: this.redis_id,
        data: {
            type: type,
            data: data
        }
    }));

}

Worker.prototype.send_message_to_master = function(type, data) {

    this.socket.emit("message", {type: type, data: data});

}

module.exports = Worker;