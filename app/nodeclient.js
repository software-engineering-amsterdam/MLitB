var cluster = require('cluster');
var socket = require('socket.io-client');

var workers = function() {

    var Worker = require('./nodeworker');

    var w = new Worker();

}

var master = function() {

    var program = require('commander');
    var request = require('request');
    var uuid = require('node-uuid');
    var redis_lib = require("redis");
    var client = require('./static/client');

    var location, port, network, redis1, redis2, num_workers;
    var slaves = [];

    parse_commandline = function() {

        program
            .version('2.0.0 beta 1')
            .option('-h, --host [value]', 'Master host to connect to')
            .option('-p, --port <value>', 'Master port to connect to', parseInt)
            .option('-j, --workers <value>', 'Number of workers to attach', parseInt)
            .option('-n, --network [value]', 'Network ID to connect to')
            .parse(process.argv);

        if(!program.host) {
            location = 'http://localhost'
        } else {
            location = program.host;
        }

        if(!program.port) {
            port = 8001;
        } else {
            port = program.port;
        }

        if(!program.workers) {
            num_workers = require('os').cpus().length;
        } else {
            num_workers = program.workers;
        }

        if(!program.network) {
            console.log('No network ID supplied. Use with -n [id].');
            process.kill();
        }

        network = program.network;

        start();

    }

    var nns_info = 0;

    // SCOPE EXTENSIONS

    var scope = {
        
        update_log: function() {
            console.log(client.log_list[client.log_list.length - 1]);
        },

        update_nns: function() {
            
            nns_info++;

            if(nns_info == 1) {
                join_network();
            }

        }

    }

    // CLIENT EXTENSIONS
    new_worker_instance = function(slave, cb) {

        var nodeworker = function() {

            this.postMessage = function(e) {

                redis1.publish(this.redis_id, JSON.stringify(e));

            }

            this.redis_ready = function() {

                return cb(this);

            }

            this.redis_id = uuid.v4() 

            d = {
                id: this.redis_id,
                boss_id: client.id
            }

            // spin up our own custom worker with redis connection.
            cluster.fork(d);

        }

        slave = new nodeworker();
        slaves.push(slave);
        

    }

    redis_message = function(d) {

        if(d.data.type == 'redis_ready') {

            var i = slaves.length;
            while(i--) {
                if(slaves[i].redis_id == d.redis_id) {
                    slaves[i].redis_ready();
                }
            }

            return;

        }

        var i = slaves.length;
        while(i--) {
            if(slaves[i].redis_id == d.redis_id) {
                slaves[i].onmessage({
                    data: d.data
                });
            }
        }

    }


    request_hosts = function() {

        request(location + ':' + port + '/server_settings/', function (error, response, body) {
            if (error || response.statusCode != 200) {
                console.log('EXIT > Could not obtain server settings.');
                process.kill();
            }

            redis1 = redis_lib.createClient();
            redis2 = redis_lib.createClient();

            redis2.subscribe(client.id);
            redis2.on("message", function(c,d) { redis_message(JSON.parse(d)); });

            d = JSON.parse(body);

            client.portMin = d.portMin;
            client.portMax = d.portMax;
            client.host = d.location;

            for(var i = 0; i < num_workers; i++) {

                setTimeout(function() {
                    console.log('starting client');
                    client.start_slave(network); 
                }, 100 * i);

            }
            
        });

    }

    join_network = function() {

        if(!client.nn_exists(network)) {
            console.log('EXIT > (NN) not found at host:', network);
            process.kill();
        }

        // ask hosts info, continue from there
        request_hosts();

    }

    start = function() {

        client = new client(scope);

        client.new_worker_instance = this.new_worker_instance;

        client.socket = socket(location + ':' + port);

        client.socket.on('message', function (d) { client.message_from_master(d); });
        client.send_message_to_master('new_boss', null);

        client.logger("Client connected");
        

    }

    parse_commandline();

}

if (cluster.isMaster) {
    master();
} else { 
    workers() 
}