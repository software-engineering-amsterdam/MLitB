cluster = require('cluster')

numCPUs = 4; //require('os').cpus().length;

workers = function() {

    var app = require('http').createServer(h)
    var io = require('socket.io')(app);
    var fs = require('fs');
    var url = require('url');
    var redis_lib = require("redis");
    var staticResource = require('static-resource');
    var uuid = require('node-uuid');

    var handler = staticResource.createHandler(fs.realpathSync('./static'));

    function h (req, res) {
        var path = url.parse(req.url).pathname;

        if(!handler.handle(path, req, res)) {
            res.writeHead(404);
            res.write('404');
            res.end();
        }
    }

    var Worker = function() {


        this.redis1 = redis_lib.createClient();
        this.redis2 = redis_lib.createClient();
        this.clusterid = cluster.worker.id;
        this.port = 8000 + this.clusterid;
        this.id = uuid.v4();

        this.clients = [];

    }

    Worker.prototype = {

        start: function() {

            var that = this;

            io.set('destroy buffer size', Infinity);

            app.listen(this.port);

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

            server = message.server;
            socket = message.socket;
            data = message.data;

            d = {
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
    for (var i = 0; i < numCPUs; i++) { cluster.fork() } 
} else { workers() }