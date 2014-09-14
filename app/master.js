var redis_lib = require("redis");
var NN = require("./nn");
var Client = require("./client");

var Master = function() {

    this.redis1 = redis_lib.createClient();
    this.redis2 = redis_lib.createClient();

    this.bosses = [];
    this.slaves = [];

    this.nns = [];

}

Master.prototype = {

    slave_by_id: function(id) {

        i = this.slaves.length;
        while(i--) {
            if(this.slaves[i].id == id) {
                return this.slaves[i];
            }
        }

        return false;

    },

    boss_by_id: function(id) {

        i = this.bosses.length;
        while(i--) {
            if(this.bosses[i][1] == id) {
                return this.bosses[i][1];
            }
        }

        return false;

    },

    nn_by_id: function(id) {

        i = this.nns.length;
        while(i--) {
            if(this.nns[i].id == id) {
                return this.nns[i];
            }
        }

        return false;
    },

    nns_summary: function() {

        var i = this.nns.length;

        nns = [];

        while(i--) {

            nn = this.nns[i];

            nns.push({
                id: nn.id,
                name: nn.name,
                clients: nn.clients.length,
                runtime_elapsed: nn.runtime_elapsed,
                realtime_elapsed: nn.realtime_elapsed,
                iteration_time: nn.iteration_time,
                power: nn.total_power(),
                data_seen: nn.data_seen
            });

        }

        return nns;

    },

    assign_slave: function(slave) {

        sort_nn = function(a,b) {
            // MIN TO MAX
            return b.clients.length - a.clients.length;
        }

        if(!this.nns.length) {
            console.log("! Cannot assign slave: no NNs available");
            return
        }

        // assign slave based on less-assigned
        nn_sorted = this.nns.sort(sort_nn);

        // assign to first nn in sorted list
        nn_sorted[0].add_client(slave);
        
        console.log("> Assigned (slave) to (NN):", slave.id, nn_sorted[0].id);

    },

    send_message_to_slave: function(client, data) {

        var send = false;

        var d = {
            socket: client.id,
            data: data
        }

        var i = this.slaves.length;
        while(i--) {

            if(this.slaves[i].id == client.id) {
                this.redis1.publish(this.slaves[i].server, JSON.stringify(d));
                send = true;
            }
        }

        if(!send) {
            console.log("! Could not send message to slave:", client.id, data);
        }

    },

    send_message_to_boss: function(socket, data) {

        var send = false;

        var d = {
            socket: socket,
            data: data
        }

        var i = this.bosses.length;
        while(i--) {

            if(this.bosses[i][1] == socket) {

                this.redis1.publish(this.bosses[i][0], JSON.stringify(d));
                send = true;
            }
        }

        if(!send) {
            console.log("! Could not send message to boss:", socket, data);
        }

    },

    update_boss_info: function(boss) {

        this.send_message_to_boss(boss, {
            type: 'update',
            data: this.nns_summary()
        });

    },

    new_boss_connected: function(data, server, socket) {

        this.bosses.push([server, socket]);

        console.log("> New boss connected:", socket);

        this.send_message_to_boss(socket, {
            type: 'boss_id',
            data: socket
        });

        this.update_boss_info(socket);

    },

    new_slave_connected: function(data, server, socket) {

        if(!('boss_id' in data.data)) {
            console.log("! Could not connect slave: no boss_id given: ", socket);
            return
        }

        if(!('nn' in data.data)) {
            console.log("! Could not connect slave: no NN ID given: ", socket);
            return
        }

        var boss = null;

        var i = this.bosses.length;
        while(i--) {
            if (this.bosses[i][1] == data.data.boss_id) {
                boss = this.bosses[i];
                break;
            }
        }

        if(!boss) {
            console.log("! Could not connect slave: boss not found (boss id): ", socket, data.data.boss_id);
            return
        }

        nn_id = data.data.nn;
        nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Could not connect slave: NN not found (NN id): ", socket, nn_id);
            return
        }

        new_client = new Client(this, server, socket, boss);

        this.slaves.push(new_client);

        this.send_message_to_slave(new_client, {
            type: 'slave_id',
            data: new_client.id
        });

        console.log("> New slave connected (with boss):", new_client.id, new_client.boss);

        nn.add_client(new_client);

        this.update_boss_info(new_client.boss);

    },

    boss_disconnected: function(socket) {

        /* slaves should disconnect by themselves */
        var removed = false;

        var i = this.bosses.length;
        while(i--) {
            if(this.bosses[i][1] == socket) {
                this.bosses.splice(i, 1);
                removed = true;
                break;
            }
        }

        if(removed) {
            console.log("> Boss disconnected:", socket);
        } else {
            console.log("! Could not disconnect boss (not found)", socket);
        }

        var i = this.nns.length;
        while(i--) {
            this.nns[i].remove_boss(socket);
        }

    },

    slave_disconnected: function(socket) {

        var removed_slave = false;

        var i = this.slaves.length;
        while(i--) {
            if(this.slaves[i].id == socket) {
                removed_slave = this.slaves[i];
                this.slaves.splice(i, 1);
                break;
            }
        }

        if(removed_slave) {
            console.log("> Slave disconnected:", socket);
        } else {
            console.log("! Could not disconnect slave (not found)", socket);
            return
        }

        // remove from nn.
        // bit of a wraparound
        removed_slave.nn.remove_client_graceless(removed_slave);


    },

    client_disconnected: function(socket) {

        // walk over bosses, is a shorter list (should be)

        var found = false;

        var i = this.bosses.length;
        while(i--) {
            if(this.bosses[i][1] == socket) {
                this.boss_disconnected(socket);
                found = true;
                break;
            }
        }

        if(!found) {
            this.slave_disconnected(socket);
        }

    },

    upload_data: function(data) {

        size = data.size;
        slave_id = data.slave;
        nn_id = data.nn;

        slave = this.slave_by_id(slave_id);

        if(!slave) {
            console.log("! Cannot upload data at (slave): slave does not exist", slave_id);
            return;
        }

        nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Cannot upload data to (NN): NN does not exist", nn_id);
            return;
        }

        nn.add_data(slave, size);

    },

    register_data: function(d) {

        data = d.data;
        destination = d.destination;
        nn_id = d.nn;

        console.log('register data:', destination);

        slave = this.slave_by_id(destination);

        if(!slave) {
            console.log("! Cannot register data at (slave): slave does not exist", destination);
            return;
        }

        nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Cannot upload data to (NN): NN does not exist", nn_id);
            return;
        }        

        nn.register_data(slave, data);

    },

    reduction: function(d) {

        nn_id = d.nn;
        slave_id = d.slave;
        data = d.data;

        slave = this.slave_by_id(slave_id);

        if(!slave) {
            console.log("! Cannot reduce slave: slave does not exist", nn_id);
            return;
        }

        nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Cannot reduce (slave) to (NN): NN does not exist", slave_id, nn_id);
            return;
        }

        nn.reduction(slave, data);

    },

    add_stats: function(d) {

        nn_id = d.nn;
        boss_id = d.boss;

        boss = this.boss_by_id(boss_id);

        if(!boss) {
            console.log("! Cannot add stats listener (boss) to (NN): boss does not exist", boss_id, nn_id);
            return;
        }

        nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Cannot add stats listener (boss) to (NN): NN does not exist", boss_id, nn_id);
            return;
        }

        nn.add_stats(boss);

    },

    remove_stats: function(d) {

        nn_id = d.nn;
        boss_id = d.boss;

        boss = this.boss_by_id(boss_id);

        if(!boss) {
            console.log("! Cannot remove stats listener (boss) to (NN): boss does not exist", boss_id, nn_id);
            return;
        }

        nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Cannot remove stats listener (boss) to (NN): NN does not exist", boss_id, nn_id);
            return;
        }

        nn.remove_stats(boss);
    },

    download_parameters: function(d) {

        nn_id = d.nn;
        boss_id = d.boss;

        boss = this.boss_by_id(boss_id);

        if(!boss) {
            console.log("! Cannot download parameters to (boss) of (NN): boss does not exist", boss_id, nn_id);
            return;
        }

        nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Cannot download parameters to (boss) of (NN): NN does not exist", boss_id, nn_id);
            return;
        }

        nn.download_parameters(boss);

    },

    upload_parameters: function(d) {

        nn_id = d.nn;
        boss_id = d.boss;
        data = d.data;

        boss = this.boss_by_id(boss_id);

        if(!boss) {
            console.log("! Cannot upload parameters from (boss) to (NN): boss does not exist", boss_id, nn_id);
            return;
        }

        nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Cannot upload parameters from (boss) to (NN): NN does not exist", boss_id, nn_id);
            return;
        }

        nn.upload_parameters(boss, data);

    },

    master_message: function(data) {

        data = JSON.parse(data);

        socket = data.socket;
        server = data.server;
        message = data.data;

        if(message.type == "new_boss") {
            this.new_boss_connected(message, server, socket);
        } else if(message.type == "new_slave") {
            this.new_slave_connected(message, server, socket);
        } else if(message.type == "client_disconnected") {
            this.client_disconnected(socket);
        } else if(message.type == "upload_data") {
            this.upload_data(message.data);
        } else if(message.type == "register_data") {
            this.register_data(message.data);
        } else if(message.type == "add_nn") {
            this.add_nn(socket, message.data);
        } else if(message.type == "reduction") {
            this.reduction(message.data);
        } else if(message.type == "add_stats") {
            this.add_stats(message.data);
        } else if(message.type == "remove_stats") {
            this.remove_stats(message.data);
        } else if(message.type == "download_parameters") {
            this.download_parameters(message.data);
        } else if(message.type == "upload_parameters") {
            this.upload_parameters(message.data);
        } else {
            console.log("! Received unknown message from client:", socket, message);
        }

    },

    message: function(channel, data) {

        if(channel == "master") {
            this.master_message(data);
        }

    },

    start: function() {

        that = this;
        
        this.redis2.on("message", function(c, d) { that.message(c,d); });
        this.redis2.subscribe("master");

        console.log("System ready");

    },

    add_nn: function(boss, data) {

        demo_data = function(size) {
            data = [];
            while(size--) {
                data.push(size);
            }
            return data;
        }

        // called externally to add NN

        var nn = new NN(this, null, data.name, data.conf, data.iteration_time);

        this.nns.push(nn);

        console.log("> New (NN) added", nn.id);

        this.update_boss_info(boss);

    }

}


module.exports = Master;

master = new Master();
master.start();
