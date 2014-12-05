var Client     = require('./client'),
    Boss       = require('./boss'),
    master     = require('./master'),
    SGDTrainer = require('./sgd'),
    Test = require('./tests'),
    mlitb = require('./static/js/mlitb');

var Test = new Test();

var id = 0;

var NeuralNetwork = function(data, master) {

    this.running = false;

    this.master = master;

    id += 1;

    this.running = false;

    this.id = id; // unique identifiable
    this.slaves = []; // maps to slave nodes
    this.data = []; // data allocation array
    this.labels = []; // full collection of labels

    this.name = data.name; // verbose name

    this.slaves_connected = [];
    this.slaves_operating = []; // slaves currently at work
    this.slaves_tracking = []; // slaves tracking parameters
    this.operation_results = [];
    
    this.configuration = data.nn; // NN configuration

    this.parameters;
    this.error = 0.0;

    this.iteration_time = data.iteration_time; // time per iteration
    this.runtime_elapsed = 0; // time elapsed
    this.realtime_elapsed = 0; // real time elapsed
    this.step = 0; // nn step
    this.data_seen = 0; // data points seen

    this.SGD; // well, the SGD

    this.hyperparameters_changed = false; // needed for signaling, else continous overwrite.
    this.hyperparameters = {

        learning_rate : 0.01, //starting value of learning rate
        lr_decay : 0.999, //multiplication factor
        lr_decay_interval : 2, //iteration interval of learning rate decay
        lr_threshold : 0.00001, //0.001, //lower bound of learning rate
        momentum : 0.9,
        batch_size : 16, 
        l2_decay : 0.000, 
        l1_decay : 0.000

    }

    // fix labels for new NNs:

    for(var key in data.nn.index2label) {
        this.labels.push(data.nn.index2label[key]);
    }

    console.log('constructor '+JSON.stringify(this.labels));

    this.Net = new mlitb.Net();
    this.Net.setConfigsAndParams(this.configuration);
    
    this.SGD = new SGDTrainer(this, {});
    this.SGD.set_parameters(this.hyperparameters);
}

NeuralNetwork.prototype = {

    list: function() {
        return {
            id: this.id,
            name: this.name,
            slaves: this.slaves.length,
            slaves_connected: this.slaves_connected.length,
            data: this.data.length,
            iteration_time: this.iteration_time,
            runtime_elapsed: this.runtime_elapsed,
            realtime_elapsed: this.realtime_elapsed,
            step: this.step,
            data_seen: this.data_seen,
            error: this.error.toFixed(6),
            hyperparameters: this.hyperparameters,
            running: this.running,
            configuration: this.configuration.configs
        }
    },

    remove: function() {

        // before removal, disconnect all slaves.
        // disconnect events in the NN are called automatically.
        var i = this.slaves_connected.length;
        while(i--) {
            this.slaves_connected[i].socket.disconnect()
        }

        return;

    },

    download: function() {

        // return this.configuration;
        // use the latest state of configs and params
        return {
            step: this.step,
            net: this.Net.getConfigsAndParams()
        }

    },

    download_parameters: function() {

        console.log('nn download_parameters');
        var parameters = this.parameters;
        if(!parameters) {
            parameters = this.configuration.params;
        }

        return {
            parameters: parameters,
            step: this.step,
            new_labels : this.Net.getLabel()
        }

    },

    add_data: function(socket, ids, labels) {


        var i = ids.length;
        while(i--) {

            var new_point = {
                id: ids[i],
                assigned: [],
                cache: [],
                process: [],
                assigned_ctr : 0
            }

            this.data.push(new_point);

        }

        var i = labels.length;
        var new_labels = [];

        while(i--) {
            var t = this.add_label(labels[i]);
            if (t){
                new_labels.push(labels[i])
            }
        }

        if (new_labels.length){
            console.log('add new labels, resize param '+JSON.stringify(new_labels));
            //add new label to our copy nn
            this.Net.addLabel(new_labels);

            var newParams = this.Net.getParams();
            //tell SGD to accomodate this new labels
            // console.log('sent to server '+newParams.length);
            this.SGD.resize_param(newParams);    
        }
        

        socket.emit('message', {
            type: 'data_upload_done',
            data: ids.length
        });

    },

    register_data: function(slave, ids) {

        slave = this.slave_available(slave);

        if(!slave) {
            console.log("! Cannot register data at (nn): (client) not available", this.id, slave.socket.id);
            return
        }

        var i = ids.length;
        while(i--) {

            var j = this.data.length;

            while(j--) {

                if(this.data[j].id == ids[i]) {

                    this.data[j].cache.push(slave);

                }

            }

        }

    },

    add_label: function(label) {

        var label = label.toLowerCase();

        if(this.labels.indexOf(label) > -1) {
            // already exists.
            return false;
        }

        this.labels.push(label);

        return true;

    },

    slave_available: function(slave) {

        var i = this.slaves_connected.length;
        while(i--) {
            if(this.slaves_connected[i].socket.id == slave.socket.id) {
                return this.slaves_connected[i];
            }
        }

        return false

    },

    add_slave: function(slave) {

        slave.nn = this;

        this.slaves_connected.push(slave);
        return;

    },

    slave_work: function(slave) {

        var found = false;
        var i = this.slaves_connected.length;
        while(i--) {
            if(this.slaves_connected[i].socket.id == slave.socket.id) {
                found = this.slaves_connected[i];
                break;
            }
        }

        if(!found) {
            console.log('! Cannot set slave to work at (NN): slave not found', slave.socket.id, this.id);
            return;
        }


        var i = this.slaves.length;
        while(i--) {
            if(this.slaves[i].socket.id == slave.socket.id) {
                console.log('! Cannot set slave to work at (NN): slave already at work', slave.socket.id, this.id);
                return;
            }
        }

        this.slaves.push(found);

        slave.boss.send('slave_status', {
            slave_id: found.socket.id,
            status: 'assigned to work'
        });

    },

    slave_track: function(slave) {

        var found = false;
        var i = this.slaves_connected.length;
        while(i--) {
            if(this.slaves_connected[i].socket.id == slave.socket.id) {
                found = this.slaves_connected[i];
                break;
            }
        }

        if(!found) {
            console.log('! Cannot set slave to track at (NN): slave not found', slave.socket.id, this.id);
            return;
        }

        var i = this.slaves_tracking.length;
        while(i--) {
            if(this.slaves_tracking[i].socket.id == slave.socket.id) {
                console.log('! Cannot set slave to track (NN): slave already slaves_tracking', slave.socket.id, this.id);
                return;
            }
        }

        this.slaves_tracking.push(slave);

        slave.boss.send('slave_status', {
            slave_id: found.socket.id,
            status: 'tracking'
        });

    },

    remove_client: function(client) {

        var found = false;
        var i = this.slaves_connected.length;
        while(i--) {
            if(this.slaves_connected[i].socket.id == client.socket.id) {
                this.slaves_connected.splice(i, 1);
                found = true;
                break;
            }
        }

        if(!found) {
            console.log('! Cannot remove (client) from (NN): client not found', client.socket.id, this.id);
            return;
        }

        var i = this.slaves.length;
        while(i--) {
            if(this.slaves[i].socket.id == client.socket.id) {
                this.slaves.splice(i, 1);
                break;
            }
        }

        var i = this.slaves_tracking.length;
        while(i--) {
            if(this.slaves_tracking[i].socket.id == client.socket.id) {
                this.slaves_tracking.splice(i, 1);
                break;
            }
        }

        // remove data
        var i = this.data.length;

        var points_lost = 0;

        while(i--) {

            var j = this.data[i].assigned.length;
            while(j--) {
                if(this.data[i].assigned[j].socket.id == client.socket.id) { //shouldn't it assigned[j].socke.assignedt.id ?
                    this.data[i].assigned.splice(j, 1);
                }
            }

            var j = this.data[i].cache.length;
            while(j--) {
                if(this.data[i].cache[j].socket.id == client.socket.id) {
                    this.data[i].cache.splice(j, 1);
                }
            }

        }

        console.log('> Removed (client) from (NN)', client.socket.id, this.id);

        client.nn = null;

    },

    remove_client_graceless: function(client) {

        // disconnect.

        console.log('> Graceless removal of (slave) from (NN)', client.socket.id, this.id);

        this.remove_client(client);

        var removed = false;

        // do things wrt. to the reduction step to make sure network continues.
        var i = this.slaves_operating.length;
        while(i--) {
            if(this.slaves_operating[i].socket.id == client.socket.id) {
                this.slaves_operating.splice(i, 1);
                removed = true;
            }
        }

        if(removed) {
            console.log('> (slave) was in operation for (NN), slave shutdown.', client.socket.id, this.id);

            if(!this.slaves_operating.length) {
                // was the last one.
                // do reduction function.
                console.log('> (slave) was last in operation for (NN), slave shutdown.', client.socket.id, this.id);

                //this.aggregation();

                console.log('> Reduce (NN)', this.id);

                // begin again
                //this.run();
            }

        }

    },

    total_power: function() {
        sum = 0;
        var i = this.slaves.length;
        while(i--) {
            sum += this.slaves[i].power;
        }
        return sum;
    },

    start: function() {

        if(this.running) {
            console.log("! Cannot start (NN): already started", this.id);
            return
        }

        this.running = true;

        this.master.broadcast_nns();

        this.run();

    },

    pause: function() {

        if(!this.running) {
            console.log("! Cannot pause (NN): already paused", this.id);
            return
        }

        this.running = false;

        this.master.broadcast_nns();

    },

    reboot: function() {

        this.running = false;

        this.master.broadcast_nns();

    },

    notify_bosses: function() {

        // instead of server-side event, send all bosses with active workers a notification to download parameters with XHR
        var bosses_ids = [];
        var bosses = [];

        console.log(' $$ notifying bosses');

        var i = this.slaves.length;
        while(i--) {

            var boss = this.slaves[i].boss;

            if(bosses_ids.indexOf(boss.socket.id) == -1) {
                bosses_ids.push(boss.socket.id);
                bosses.push(boss);
            }

        }

        var i = this.slaves_tracking.length;
        while(i--) {

            var boss = this.slaves_tracking[i].boss;

            if(bosses_ids.indexOf(boss.socket.id) == -1) {
                bosses_ids.push(boss.socket.id);
                bosses.push(boss);
            }

        }

        var i = bosses.length;
        console.log(' $$ notifying', i, 'bosses');
        while(i--) {
            bosses[i].send('download_new_parameters', this.id);
        }

    },

    run: function() {

        if(!this.running) {
            return;
        }

        if(!this.data.length) {
            console.log("! Cannot run (NN): no data", this.id);
            return
        }

        if(!this.slaves_connected.length) {
            console.log("! Cannot run (NN): no slaves assigned to work", this.id);
            return
        }

        this.allocate();
        
        this.initiate();

    },

    allocate: function() {

        sort_data = function(a,b) {
            //prioritize less assigned data
            // sort hight assigned to low, but process from the end of list
            // cache = a.cache.length - b.cache.length; 
            cache = b.assigned_ctr - a.assigned_ctr;
            if(cache == 0) {
                return a.cache.length - b.cache.length;
            }
            return cache;
        }

        // sort_slaves = function(a, b) {
        //     // low to high
        //     cache = b.assigned_cache.length - a.assigned_cache.length;
        //     if(cache == 0) {
        //         return a.assigned_power.length - b.assigned_power.length;
        //     }
        //     return cache;
        // }

        filter_unfilled_slaves = function(a) {
            return !a.saturated()
        }

        filter_cache_slaves = function(a) {
            return a.cache_left() > 0
        }

        in_slave_cache = function(point, slave) {
            //in cache or on the way
            
            var m = point.assigned.length;
            while(m--) {
                if(point.assigned[m].socket.id == slave.socket.id) {
                    return true;
                }
            }
            // return false;

            var m = point.cache.length;
            while(m--) {
                if(point.cache[m].socket.id == slave.socket.id) {
                    return true;
                }
            }
            return false;

            
        }

        rm_assigned = function(point, slave) {
            //on the way
            // var m = point.assigned.length;
            // while(m--) {
            //     if(point.assigned[m].socket.id == slave.socket.id) {
            //         return true;
            //     }
            // }
            // return false;

            var j = point.assigned.length;

            while(j--) {
                if(point.assigned[j].socket.id == slave.socket.id) {
                    point.assigned.splice(j, 1);
                }
            }

        }

        // in_cache = function(point, slave) {

        //     // check on BOSS, not on CLIENT.
        //     // if a BOSS drops, many CLIENTS drop.
        //     // else fake data coverage.

        //     var m = point.cache.length;
        //     while(m--) {
        //         if(point.cache[m].boss.socket.id == slave.boss.socket.id) {
        //             return true;
        //         }
        //     }

        //     // var m = point.assigned.length;
        //     // while(m--) {
        //     //     if(point.assigned[m].boss.socket.id == slave.boss.socket.id) {
        //     //         return true;
        //     //     }
        //     // }
        //     return false;

        // }

        // in_cache = function(point, slave) {

        //     var m = point.cache.length;
        //     while(m--) {
        //         if(point.cache[m].socket.id == slave.socket.id) {
        //             return true;
        //         }
        //     }
        //     return false;

        // }

        total_power = this.total_power()

        normalize_factor = total_power / this.data.length;

        console.log("> (NN) allocates (power) with (factor):", this.id, total_power, normalize_factor);

        fraction_difference = 0;

        var i = this.slaves.length;

        // assign all slaves their power

        while(i--) {
            slave = this.slaves[i];

            power_float = slave.power / normalize_factor;
            power_int = Math.ceil(power_float);

            if(power_int > slave.max_power) {
                power_int = slave.max_power;
            }

            slave.assigned_power = power_int

            // dump assigned cache
            slave.assigned_cache = [];
            slave.process = [];

        }


        // sort data descending by #allocated/processed
        this.data = this.data.sort(sort_data);

        var un_cached =0;
        var uncached_list = [];


        // assign data points to slaves having it already in cache or on the way/assigned
        var j = this.data.length;
        while(j--) {

            point = this.data[j];

            point.process = [];
            point.selected = false;

            var k = point.assigned.length;

            while(k--) {

                var cache_slave = point.assigned[k];

                if(!cache_slave.saturated() ) {
                    cache_slave.assigned_cache.push(point);
                    point.process.push(cache_slave);

                    break;
                }

            }

            if (! point.process.length){
                un_cached +=1;
                uncached_list.push(point); //now the remaining list become ascending
            }

        }

        console.log('uncached  data '+un_cached);
        var U = uncached_list.length; //here the list is ascending
        var slaves = this.slaves;



        // console.log('AFTER ASSIGN CACHE');
        // var ll = this.slaves.length;
        // while(ll--){
        //     if (!this.slaves[ll].saturated()){
        //         console.log('#### '+this.slaves[ll].socket.id+' NOT SATURATED');    
        //     }
        // }

        // var UA = un_assigned.length;
        var un_processed = [];
        for (var u=0;u<U;u++){

            var point = uncached_list[u];
            //point is not in anybody cache, and not being transferred
            //to preserve consistent order of traversing slaves, start from the first
            var L = slaves.length;
            var l = slaves.length;

            while (l--){
                var slave = slaves[l];
                if ( (!slave.saturated()) && (slave.uncached.length < slave.power)){
                    slave.assigned_cache.push(point);
                
                    if(!in_slave_cache(point, slave)) {
                        slave.uncached.push(point);
                         
                        
                    }
                    rm_assigned(point,slave);
                    point.assigned.push(slave);    
                    
                    point.process.push(slave);
                    
                    break;
                }

            }
            if (!point.process.length){
                un_processed.push(point);
            }
        }

        console.log('unproccessed data '+un_processed.length);

        
        
        

        

        var I = this.slaves.length;
        for (var i=0;i<I;i++){
        // while(i--) {
            this.slaves[i].process_cache(this);
        }

    },

    initiate: function() {

        sort_data = function(a,b) {
            //prioritize less assigned data
            // low to high
            // cache = a.cache.length - b.cache.length; 
            cache = b.assigned_ctr - a.assigned_ctr;
            if(cache == 0) {
                return b.cache.length - a.cache.length;
            }
            return cache;
        }

        filter_data = function(a) {
            return a.cache.length
        }

        sort_slaves = function(a, b) {
            // low to high
            return a.assigned_power.length - b.assigned_power.length;
        }

        filter_slaves = function(a) {
            return a.assigned_power >= 10; // at least 10 points, or too slow.
        }

        in_cache = function(point, slave) {

            var m = point.cache.length;
            while(m--) {
                if(point.cache[m].socket.id == slave.socket.id) {
                    return true;
                }
            }
            return false;

        }

        console.log("Initiating (NN)", this.id);

        var datamap = this.data.filter(filter_data)//sort(sort_data);

        if(!datamap.length) {
            console.log('> 1 (NN) cannot initiate: data not available on slaves (yet)', this.id);
            this.running = false;
            return
        }

        // sort on slave cache size
        // var slaves = this.slaves.filter(filter_slaves).sort(sort_slaves);
        var slaves = this.slaves.filter(filter_slaves)
        //var slaves = this.slaves.sort(sort_slaves);

        if(!slaves.length) {
            // should not be possible because datamap checks this aswell above.
            console.log('> 2 (NN) cannot initiate: data not available on slaves (yet)', this.id);
            this.running = false;
            return
        }

        

        var slaves_to_work = 0;

        var j = datamap.length;

        console.log('datamap length '+datamap.length);
        var notincache=0;
        while (j--){
            var point = datamap[j]
            var slave = point.process[0]; //data has been filtered, so there's must be at least one (or exactly one) slave

            if (!point.process.length){
                continue;
                //not assigned, but in cache
                //what to do?
            }
            
            if(in_cache(point,slave)) {
                // assign
                if (slave.process.length< slave.assigned_power){
                    slave.process.push(point.id);

                    point.selected = true;
                    point.assigned_ctr+=1
                }
                // else if(slave.process.length == slave.assigned_power) {
                //     console.log('THIS SHOULD HAPPEN ONCE OR NEVER');
                // }

            } else {
                //weird sometime this happen
                notincache +=1
            }
        }
        //weird sometime this appear
        console.log('not in cache '+notincache);

        var i = slaves.length;
        while (i--){
            var slave = slaves[i];
            if(slave.process.length > 0) {

                this.slaves_operating.push(slave);
                slave.work(this);

                slaves_to_work += 1;

            }
        }


        Test.dataset_should_be_fully_allocated(this);

        console.log('(NN) sent', slaves_to_work, 'slaves to work:', this.id);

    },

    reduction: function(slave, parameters) { //, new_labels) {

        if(!this.running) {
            console.log("! Cannot reduce (slave) to (NN): NN not running", slave.socket.id, this.id);
            return;
        }

        removed = false;

        var i = this.slaves_operating.length;
        while(i--) {
            if(this.slaves_operating[i].socket.id == slave.socket.id) {
                this.slaves_operating.splice(i, 1);
                removed = true;
            }
        }

        if(!removed) {
            console.log("! Cannot reduce (slave) to (NN): Slave not active in this NN.", slave.socket.id, this.id);
            return;
        }

        d = new Date().getTime();

        this.operation_results.push(parameters);

        this.runtime_elapsed += parseInt(this.iteration_time);
        this.data_seen += parameters.nVector;

        /*
        var i = new_labels.length;
        while(i--) {
            this.add_label(new_labels[i]);
        }
        */

        if(!this.slaves_operating.length && this.running == false) {

            // standstill. broadcast.

            this.master.broadcast_log('Network standstill: ' +  this.nn);

            return;

        }

        if(!this.slaves_operating.length) {
            // was the last one.
            // do reduction function.

            this.aggregation();

            this.operation_results = [];

            console.log('> Reduce (NN)', this.id);

            // begin again

            this.realtime_elapsed += parseInt(this.iteration_time);

            this.run();
        }

    },

    aggregation: function() {

        if(!this.operation_results.length) {
            console.log("! Cannot aggregate (NN): No operation results.", this.id);
            return;
        }

        if(this.hyperparameters_changed) {
            console.log('Updated (NN) with new hyperparameters.', this.id);
            this.SGD.set_parameters(this.hyperparameters);
            this.hyperparameters_changed = false;
        }

        this.SGD.reduce(this);

        this.step++;

        this.notify_bosses();
        this.master.broadcast_nns();

        /*

        var i = this.slaves_tracking.length;
        while(i--) {
            this.slaves_tracking[i].track(this);
        }

        */

        

    }

}

module.exports = NeuralNetwork;