var SGDTrainer = require('./sgd');

var NN = function(master, id, name, configuration, iteration_time) {

    this.master = master; // master server

    this.running = false;

    this.id; // unique identifiable
    this.clients = []; // maps to slave nodes
    this.data = []; // data allocation array

    this.name = name; // verbose name

    this.configuration = configuration; // NN configuration layers

    this.iteration_time = iteration_time; // time per iteration

    this.runtime_elapsed = 0; // time elapsed

    this.realtime_elapsed = 0; // real time elapsed

    this.step = 0; // nn step

    this.data_seen = 0; // data points seen

    this.SGD; // well, the SGD
    this.parameters = null; // neural network parameter weights

    this.check_constructor(id);

    this.first_index = 1; // index used for adding data

    this.clients_operating = []; // clients currently at work
    this.operation_results = [];

    this.stats = []; // bosses connected to obtain stats

}

NN.prototype = {

    guid: function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                   .toString(16)
                   .substring(1);
        }
        
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
               s4() + '-' + s4() + s4() + s4();

    },

    check_constructor: function(id) {
        
        if(!id) {
            // set UUID

            this.id = this.guid();

        } else {
            this.id = id;
        }

    },

    slave_available: function(slave) {

        var i = this.clients.length;
        while(i--) {
            if(this.clients[i].id == slave.id) {
                return true
            }
        }

        return false

    },

    total_power: function() {
        sum = 0;
        var i = this.clients.length;
        while(i--) {
            sum += this.clients[i].power;
        }
        return sum;
    },

    add_data: function(client, data) {
        
        var first_index = this.first_index;

        var original_length = this.data.length;

        // FOWARD loop
        for(i = 0; i < data; i++) {
            var new_point = {
                id: this.first_index,
                assigned: [],
                cache: [],
                cache_wide: [],
                process: []
            }

            this.data.push(new_point);

            this.first_index++;
        }

        this.master.send_message_to_boss(client.boss, {
            type: 'upload_data_index',
            index: first_index
        });

    },

    register_data: function(slave, data) {

        client = this.slave_available(slave);

        if(!client) {
            console.log("! Cannot register data at (nn): (client) not available", this.id, slave.id);
            return
        }

        var i = data.length;
        while(i--) {

            var j = this.data.length;

            while(j--) {

                if(this.data[j].id == data[i].id) {
                    this.data[j].cache.push(slave);
                    this.data[j].cache_wide.push(slave);
                }

            }

        }

        this.run();

    },

    boss_in_stats: function(boss) {
        var i = this.stats.length;
        while(i--) {
            if(this.stats[i].id == boss.id) {
                return true;
            }
        }
        return false;
    },

    add_stats: function(boss) {

        if(!this.boss_in_stats(boss)) {
            this.stats.push(boss);
        }

    },

    remove_stats: function(boss) {

        var i = this.stats.length;
        while(i--) {
            if(this.stats[i].id == boss.id) {
                this.stats.splice(i, 1); // safe splice
            }
        }

    },

    send_stats: function(data) {

        var i = this.stats.length;
        while(i--) {
            var boss = this.stats[i];

            this.master.send_message_to_boss(boss, {
                type: 'send_stats',
                data: data
            });

        }

    },

    download_parameters: function(boss) {

        this.master.send_message_to_boss(boss, {
            type: 'download_parameters',
            data: {
                parameters: this.parameters,
                step: this.step,
                sgd: this.SGD
            }
        });

    },

    upload_parameters: function(boss, d) {

        parameters = d.parameters;
        step = d.step;
        sgd = d.sgd;

        this.parameters = parameters;
        this.step = step;

        this.SGD = new SGDTrainer({}, {});
        this.SGD.load(sgd);

        this.master.send_message_to_boss(boss, {
            type: 'upload_parameters_complete'
        });

    },

    add_client: function(client) {

        this.clients.push(client);

        client.nn = this;

        this.allocate();

    },

    remove_boss: function(boss) {

        this.remove_stats(boss);

    },

    remove_client: function(client) {

        var found = false;
        var i = this.clients.length;
        while(i--) {
            if(this.clients[i].id == client.id) {
                this.clients.splice(i, 1);
                found = true;
                break;
            }
        }

        if(!found) {
            console.log('! Cannot remove (client) from (NN): client not found', client.id, this.id);
            return;
        }

        // remove data
        var i = this.data.length;
        while(i--) {

            var j = this.data[i].assigned.length;
            while(j--) {
                if(this.data[i].assigned[j].id == client.id) {
                    this.data[i].assigned.splice(j, 1);
                }
            }

            var j = this.data[i].cache.length;
            while(j--) {
                if(this.data[i].cache[j].id == client.id) {
                    this.data[i].cache.splice(j, 1);
                }
            }

            var j = this.data[i].cache_wide.length;
            while(j--) {
                if(this.data[i].cache_wide[j].id == client.id) {
                    this.data[i].cache_wide.splice(j, 1);
                }
            }

        }

        console.log('> Removed (client) from (NN)', client.id, this.id);

        if(!this.clients.length) {
            // halt operation
            this.running = false;
            console.log('> Last client left, (NN) stopped', this.id);
        }

        client.nn = null;

    },

    remove_client_graceless: function(client) {

        // disconnect.

        console.log('> Graceless removal of (client) from (NN)', client.id, this.id);

        this.remove_client(client);

        var removed = false;

        // do things wrt. to the reduction step to make sure network continues.
        var i = this.clients_operating.length;
        while(i--) {
            if(this.clients_operating[i].id == client.id) {
                this.clients_operating.splice(i, 1);
                removed = true;
            }
        }

        if(removed) {
            console.log('> (client) was in operation for (NN), client shutdown.', client.id, this.id);
        }

        if(!this.clients_operating.length) {
            // was the last one.
            // do reduction function.
            console.log('> (client) was last in operation for (NN), client shutdown.', client.id, this.id);

            this.aggregation();

            console.log('> Reduce (NN)', this.id);

            // begin again

            this.running = false;
            this.run();
        }


    },

    run: function() {

        if(this.running) {
            console.log("! Cannot run (NN): already running", this.id);
            return
        }

        if(!this.data.length) {
            console.log("! Cannot run (NN): no data", this.id);
            return
        }

        if(!this.clients.length) {
            console.log("! Cannot run (NN): no clients attached", this.id);
            return
        }

        this.running = true;

        this.allocate();
        
        this.initiate();

    },

    allocate: function() {

        sort_data = function(a,b) {
            // low to high
            cache = a.cache.length - b.cache.length; 
            if(cache == 0) {
                return a.assigned.length - b.assigned.length;
            }
            return cache;
        }

        filter_unfilled_clients = function(a) {
            return !a.saturated()
        }

        filter_cache_clients = function(a) {
            return a.cache_left() > 0
        }

        in_slave_cache = function(point, client) {

            var m = point.assigned.length;
            while(m--) {
                if(point.assigned[m].id == client.id) {
                    return true;
                }
            }
            return false;

        }

        in_cache = function(point, client) {

            // check on BOSS, not on CLIENT.
            // if a BOSS drops, many CLIENTS drop.
            // else fake data coverage.

            var m = point.cache.length;
            while(m--) {
                if(point.cache[m].boss == client.boss) {
                    return true;
                }
            }

            var m = point.assigned.length;
            while(m--) {
                if(point.assigned[m].boss == client.boss) {
                    return true;
                }
            }
            return false;

        }

        total_power = this.total_power()

        normalize_factor = total_power / this.data.length;

        console.log("> (NN) allocates (power) with (factor):", this.id, total_power, normalize_factor);

        fraction_difference = 0;

        var i = this.clients.length;

        // assign all clients their power

        while(i--) {
            client = this.clients[i];

            power_float = client.power / normalize_factor;
            power_int = Math.floor(power_float);

            fraction_difference += power_float - power_int;

            if (Math.abs(fraction_difference - 1) < 0.000001) {
                power_int += 1;
                fraction_difference = 0;
            }

            if(power_int > client.max_power) {
                power_int = client.max_power;
            }

            client.assigned_power = power_int;

            // dump assigned cache
            client.assigned_cache = [];

        }

        var j = this.data.length;

        // assign data points to clients having it already in cache 

        while(j--) {

            point = this.data[j];

            point.process = [];

            var k = point.cache.length;

            while(k--) {

                var cache_client = point.cache[k];

                if(!cache_client.saturated()) {
                    cache_client.assigned_cache.push(point);
                    point.assigned.push(cache_client);

                    point.process.push(cache_client);

                    break;
                }

            }

        }

        this.data = this.data.sort(sort_data);

        unfilled_clients = this.clients.filter(filter_unfilled_clients);

        var j = unfilled_clients.length;

        var k = this.data.length;

        // assign remaining uncached data points

        while(j-- && k--) {

            var client = unfilled_clients[j];

            var point = this.data[k];

            if(!point.process.length) {

                client.assigned_cache.push(point);
                
                if(!in_slave_cache(point, client)) {
                    client.uncached.push(point);
                }
                
                point.assigned.push(client);

                point.process.push(client);

            }

            if(!client.saturated()) {
                j++;
            }

        }

        // assign for data coverage
        // pretty complicated

        // NOTE
        // THIS ALGORITHM IS _SIMPLIFIED_
        // IT IS CORRECT, BUT POTENTIALLY _SLOW_
        // LOOPING OVER this.data ONCE PER CLIENT MAY BE _SLOW_
        // NOT TO FORGET THE SORTING IS _SLOW_
        // ANY IMPROVEMENTS ARE *WELCOME*

        unfilled_clients = this.clients.filter(filter_cache_clients);

        var k = unfilled_clients.length;

        var client, point;

        while(k--) {

            this.data = this.data.sort(sort_data);

            client = unfilled_clients[k];

            var j = this.data.length;

            while(j--) {

                point = this.data[j];

                if(!in_cache(point, client)) {

                    client.assigned_cache.push(point);
                    
                    if(!in_slave_cache(point, client)) {
                        client.uncached.push(point);
                    }
                    
                    point.assigned.push(client);

                    if(!client.cache_left()) {
                        break;
                    }

                }

            }

        }

        var i = this.clients.length;
        while(i--) {
            this.clients[i].process_cache(this);
        }

    },

    initiate: function() {

        sort_data = function(a,b) {
            // low to high
            return a.cache.length - b.cache.length; 
        }

        filter_data = function(a) {
            return a.cache.length
        }

        sort_clients = function(a, b) {
            // low to high
            return a.assigned_power.length - b.assigned_power.length;
        }

        filter_clients = function(a) {
            return a.assigned_power >= 10; // at least 10 points, or too slow.
        }

        in_cache = function(point, client) {

            var m = point.cache.length;
            while(m--) {
                if(point.cache[m].id == client.id) {
                    return true;
                }
            }
            return false;

        }

        var datamap = this.data.filter(filter_data).sort(sort_data);

        if(!datamap.length) {
            console.log('> 1 (NN) cannot initiate: data not available on clients (yet)', this.id);
            return
        }

        // sort on client cache size
        var clients = this.clients.filter(filter_clients).sort(sort_clients);

        if(!clients.length) {
            // should not be possible because datamap checks this aswell above.
            console.log('> 2 (NN) cannot initiate: data not available on clients (yet)', this.id);
            return
        }

        var i = clients.length;
        while(i--) {
    
            // first the clients with least cache pick their choice
            var client = clients[i];

            var j = datamap.length;

            while(j--) {

                var point = datamap[j];

                if(in_cache(point,client)) {
                    // assign
                    client.process.push(point.id);

                    if(client.process.length == client.assigned_power) {

                        this.clients_operating.push(client);
                        client.work(this);
                        break;

                    }

                }

            }

        }

    },

    reduction: function(slave, data) {

        if(!this.running) {
            console.log("! Cannot reduce (slave) to (NN): NN not running", slave.id, this.id);
            return;
        }

        removed = false;

        var i = this.clients_operating.length;
        while(i--) {
            if(this.clients_operating[i].id == slave.id) {
                this.clients_operating.splice(i, 1);
                removed = true;
            }
        }

        if(!removed) {
            console.log("! Cannot reduce (slave) to (NN): Slave not active in this NN.", slave.id, this.id);
            return;
        }

        d = new Date().getTime();

        console.log(d);

        this.operation_results.push(data);

        this.runtime_elapsed += this.iteration_time;

        if(!this.clients_operating.length) {
            // was the last one.
            // do reduction function.

            this.aggregation();

            this.operation_results = [];

            console.log('> Reduce (NN)', this.id);

            // begin again

            this.realtime_elapsed += this.iteration_time;

            this.running = false;
            this.run();
        }

    },

    aggregation: function() {

        if(!this.operation_results.length) {
            console.log("! Cannot aggregate (NN): No operation results.", this.id);
            return;
        }

        if(this.step == 0) {
            //Create object SGD Trainer
            trainer_param = {

                learning_rate : 0.1, //starting value of learning rate
                lr_decay : 1, //multiplication factor
                lr_decay_interval : 5, //iteration interval of learning rate decay
                lr_threshold : 0.0, //0.001, //lower bound of learning rate
                momentum : 0.9,
                batch_size : 16, 
                l2_decay : 0.001

            }
            
            this.SGD = new SGDTrainer({}, trainer_param);
          
        }

        this.SGD.reduce(this);

        this.step++;  

    }

}

module.exports = NN;