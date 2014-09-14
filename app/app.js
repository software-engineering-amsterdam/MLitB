var cluster = require('cluster');
var program = require('commander');

workers = function() {

    var express = require('express');
    var app = express();
    var http = require('http').Server(app);
    var io = require('socket.io')(http);
    var fs = require('fs');
    var url = require('url');
    var redis_lib = require("redis");
    var uuid = require('node-uuid');
    
    app.use(express.static(__dirname + '/static'));

    var location = process.env['location'];
    var portMin = parseInt(process.env['portMin']);
    var portMax = parseInt(process.env['portMax']);

    app.get('/server_settings/', function(req, res) {
        res.send({
            location: location,
            portMin: portMin,
            portMax: portMax
        });
    });

    var Worker = function() {

        this.redis1 = redis_lib.createClient();
        this.redis2 = redis_lib.createClient();
        this.clusterid = cluster.worker.id;
        this.port = (portMin - 1) + this.clusterid;

        this.id = uuid.v4();

        this.clients = [];

    }

    Worker.prototype = {

        start: function() {

            var that = this;

            io.set('destroy buffer size', Infinity);

            http.listen(this.port);

            this.redis2.subscribe(this.id);
            this.redis2.on("message", function(c,d) { that.receive_message_from_master(c, d); });

            io.on('connection', function(s) { that.connection(s); });

            console.log('listening on port/uuid', this.port, this.id);

        },

        receive_message_from_master: function(channel, data) {

            d = JSON.parse(data);

            socket = d.socket;
            message = d.data;

            var i = this.clients.length;
            while(i--) {
                if(this.clients[i].id == socket) {
                    this.clients[i].emit('message', message);
                }
            }


        },

        send_message_to_master: function(socket, message) {

            d = {
                server: this.id,
                socket: socket.id,
                data: message
            }

            this.redis1.publish("master", JSON.stringify(d));
        },

        proxy_data: function(message) {
            // ONLY for boss->server->server->boss messaging!
            // ignores master! efficient!

            var server = message.server;
            var socket = message.socket;
            var data = message.data;

            var d = {
                socket: socket,
                data: data
            }

            this.redis1.publish(server, JSON.stringify(d));


        },

        connection: function (socket) {

            var that = this;

            this.clients.push(socket);

            socket.on('disconnect', function() { that.disconnect(this); });

            socket.on('message', function(d) { that.send_message_to_master(socket, d); });

            socket.on('proxy_data', function(d) { that.proxy_data(d); });

        },

        disconnect: function(socket) {

            var i = this.clients.length;
            while(i--) {
                if(this.clients[i].id == socket.id) {
                    this.clients.splice(i, 1);
                    break
                }
            }

            this.send_message_to_master(socket, {
                type: 'client_disconnected'
            })

        }

    }

    w = new Worker();
    w.start();

}

if (cluster.isMaster) {

    function range(val) {
        return val.split('-').map(Number);
    }

    program
        .version('2.0.0 beta 1')
        .option('-h, --host [value]', 'Host to bind to (http(s) + ip)')
        .option('-p, --port <a>-<b>', '(optional) Port range', range)
        .parse(process.argv);

        if(!program.host) {
            console.log('Host not defined. Run with -h [host] (e.g. http://localhost)');
            console.log('Look up node app.js --help for options');
            process.kill();
        }

        if(!program.port) {
            portMin = 8001;
            portMax = 8000 + require('os').cpus().length;
        } else {
            portMin = program.port[0];
            portMax = program.port[1];
        }

        location = program.host;
        

        ports = portMax - portMin + 1

        var d = {
            location: location,
            portMin: portMin,
            portMax: portMax
        }

    for (var i = 0; i < ports; i++) { cluster.fork(d) } 

} else { workers() }