var neuralnetwork = require('./neuralnetwork'),
	Slave         = require('./slave'),
	Boss          = require('./boss'),
    sgd           = require('./sgd');

var Master = function() {

    this.bosses = [];
    this.slaves = [];

    this.nns = [];

}

Master.prototype = {

	logger: function(d) {

		var text = new Date().toLocaleString() + ' > ' + d + '\n';
		console.log(text);

	},

	boss_by_id: function(id) {

		var i = this.bosses.length;
        while(i--) {
            if(this.bosses[i].socket.id == id) {
                return this.bosses[i];
            }
        }

        return false;

	},

    slave_by_id: function(id) {

        i = this.slaves.length;
        while(i--) {
            if(this.slaves[i].socket.id == id) {
                return this.slaves[i];
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

	list_nns: function() {

		var nns = [];
		var i = this.nns.length;
		while(i--) {
			nns.push(this.nns[i].list());
		}

		return nns;

	},

	broadcast_nns: function() {

		var nns = this.list_nns();

		var i = this.bosses.length;
		while(i--) {
			this.bosses[i].send('list_nns', nns);
		}

	},

    broadcast_log: function(text) {

        var nns = this.list_nns();

        text = 'Master > ' + text;

        var i = this.bosses.length;
        while(i--) {
            this.bosses[i].send('logger', text);
        }

    },

	add_nn: function(boss, data) {

        var nn = new neuralnetwork(data, this);

        this.nns.push(nn);

        this.logger('New (NN) added: ' + nn.id);

        this.broadcast_nns();

    },

    download_nn: function(nn_id) {

        var nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Could not download NN: NN not found (NN id): ", nn_id);
            return false;
        }

        return nn.download();

    },

    save_hyperparameters: function(d) {

        var nn_id = d.nn_id;
        var hyperparameters = d.hyperparameters;

        var nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Could not update NN hyperparameters: NN not found (NN id): ", nn_id);
            return
        }

        nn.hyperparameters_changed = true;

        nn.hyperparameters = hyperparameters;

        this.broadcast_nns();

    },

	register_boss: function(socket) {

		var new_boss = new Boss(socket);

		this.bosses.push(new_boss);

		this.logger('New boss connected: ' + new_boss.socket.id);

		new_boss.send('list_nns', this.list_nns());

	},

	new_slave: function(data, socket) {

        if(!('boss_id' in data)) {
            console.log("! Could not connect slave: no boss_id given: ", socket);
            return
        }

        if(!('nn' in data)) {
            console.log("! Could not connect slave: no NN ID given: ", socket);
            return
        }

        var boss = null;

        var i = this.bosses.length;
        while(i--) {
            if (this.bosses[i].socket.id == data.boss_id) {
                boss = this.bosses[i];
                break;
            }
        }

        if(!boss) {
            console.log("! Could not connect slave: boss not found (boss id): ", socket, data.boss_id);
            return
        }

        nn_id = data.nn;
        nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Could not connect slave: NN not found (NN id): ", socket, nn_id);
            return
        }

        new_slave = new Slave(socket, boss);

        this.slaves.push(new_slave);

        new_slave.send('slave_id', new_slave.socket.id)

        console.log("> New slave connected (with boss):", new_slave.socket.id, new_slave.boss.socket.id);

        nn.add_slave(new_slave);

        this.broadcast_nns();

    },

    client_disconnected: function(socket) {

        // walk over bosses, is a shorter list (should be)

        var found = false;

        var i = this.bosses.length;
        while(i--) {
            if(this.bosses[i].socket.id == socket.id) {
                this.boss_disconnected(this.bosses[i].socket);
                found = true;
                break;
            }
        }

        if(!found) {
            this.slave_disconnected(socket);
        }

    },

    boss_disconnected: function(socket) {

        /* slaves should disconnect by themselves */
        var removed = false;

        var i = this.bosses.length;
        while(i--) {
            if(this.bosses[i].socket.id == socket.id) {
                this.bosses.splice(i, 1);
                removed = true;
                break;
            }
        }

        if(removed) {
            console.log("> Boss disconnected:", socket.id);
        } else {
            console.log("! Could not disconnect boss (not found)", socket.id);
        }

        /*
        var i = this.nns.length;
        while(i--) {
            this.nns[i].remove_boss(socket);
        }
        */

    },

    slave_disconnected: function(socket) {

        var removed_slave = false;

        var i = this.slaves.length;
        while(i--) {
            if(this.slaves[i].socket.id == socket.id) {
                removed_slave = this.slaves[i];
                this.slaves.splice(i, 1);
                break;
            }
        }

        if(removed_slave) {
            console.log("> Slave disconnected:", socket.id);
        } else {
            console.log("! Could not disconnect slave (not found)", socket.id);
            return
        }

        // remove from nn.
        // bit of a wraparound
        removed_slave.nn.remove_client_graceless(removed_slave);

        this.broadcast_nns();

    },

    slave_work: function(data) {

        var nn_id = data.nn_id;
        var slave_id = data.slave_id;

        var nn = this.nn_by_id(nn_id);
        var slave = this.slave_by_id(slave_id);

        if(!nn) {
            console.log("! Could not set slave to work: NN not found (NN id): ", slave_id, nn_id);
            return
        }

        if(!slave) {
            console.log("! Could not set slave to work: Slave not found (NN id): ", slave_id, nn_id);
            return
        }

        nn.slave_work(slave);

        this.broadcast_nns();

    },

    add_data: function(socket, data) {

        var nn_id = data.nn_id;
        var ids = data.ids;

        var nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Could not add data to NN: NN not found: ", nn_id);
            return
        }

        nn.add_data(socket, ids);

    },

    register_data: function(d) {

        ids = d.ids;
        slave_id = d.slave_id;
        nn_id = d.nn_id;

        slave = this.slave_by_id(slave_id);

        if(!slave) {
            console.log("! Cannot register data at (slave): slave does not exist", slave_id);
            return;
        }

        nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Cannot upload data to (NN): NN does not exist", nn_id);
            return;
        }        

        nn.register_data(slave, ids);

    },

    start_nn: function(d) {

        nn_id = d.nn_id;
        nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Cannot start NN: NN does not exist", nn_id);
            return;
        }

        nn.start();

    },

    pause_nn: function(d) {

        nn_id = d.nn_id;
        nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Cannot pause NN: NN does not exist", nn_id);
            return;
        }

        nn.pause();

    },

    reboot_nn: function(d) {

        nn_id = d.nn_id;
        nn = this.nn_by_id(nn_id);

        if(!nn) {
            console.log("! Cannot reboot NN: NN does not exist", nn_id);
            return;
        }

        nn.reboot();

    },

    reduction: function(d) {

        nn_id = d.nn_id;
        slave_id = d.slave;
        parameters = d.parameters;
        new_labels = d.new_labels;

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

        nn.reduction(slave, parameters, new_labels);

    },

}

module.exports = Master;
