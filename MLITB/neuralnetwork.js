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
    this.unassigned_data =[]; //data that have not been assigned to any slave's working data

    this.labels = []; // full collection of labels

    this.name = data.name; // verbose name

    this.slaves_connected = [];
    this.slaves_operating = []; // slaves currently at work
    this.slaves_tracking = []; // slaves tracking parameters
    this.operation_results = [];

    // this.slaves_allocation_data={}; //data that have been or will be in slaves cache
    // this.slaves_working_data = {}; //working could be less than allocated
    // this.slaves_working_powers = {}; //save the last n (e.g 5) working power to monitor the speed

    this.is_allocated = false;

    this.slaves_reduction = []; //slaves buffer in reduction
    
    this.configuration = data.nn; // NN configuration
    this.initial_batch_size = 200;

    this.parameters = {};  //actively updated parameters for the last n step
    this.final_parameters = {}; //the synchronized parameters
    this.error = 0.0;

    this.iteration_time = data.iteration_time; // time per iteration
    this.runtime_elapsed = 0; // time elapsed
    this.realtime_elapsed = 0; // real time elapsed
    this.step = 0; // nn step
    this.data_seen = 0; // data points seen
    this.is_reducing = false;
    this.start_reduce_time;
    this.active_slaves_per_step = {};
    // this.fastest_working_time;
    // this.fastest_start_time;
    this.total_working_speed;
    this.delayed_slaves = [];
    this.reallocation_interval = 20;
    this.total_real_processed_data = 0;
    this.slaves_uncached_data = {};
    this.total_error = {0:0};
    this.total_vector = {0:0};

    

    this.param_permutation = {};  //store the last n param permutation index for each machine
    this.param_chunk = [];
    // this.SGDs = []; //sgd for the last n step

    this.SGD; // well, the SGD



    this.hyperparameters_changed = false; // needed for signaling, else continous overwrite.
    this.hyperparameters = {

        learning_rate : 0.01, //starting value of learning rate
        lr_decay : 0.999, //multiplication factor
        lr_decay_interval : 5, //iteration interval of learning rate decay
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

    // console.log('constructor '+JSON.stringify(this.labels));

    this.Net = new mlitb.Net();
    this.Net.setConfigsAndParams(this.configuration);
    var newParams = this.Net.getParams();

    // var clonedParam = this.clone_parameter(newParams);
    // this.parameters[this.step] = clonedParam;

    this.SGD = new SGDTrainer(this, {});
    this.SGD.set_parameters(this.hyperparameters);
    // this.SGD.resize_param(clonedParam); 
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
            configuration: this.configuration.configs,
            power: this.total_power()
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
        // download config when new client join the network
        // return this.configuration;
        // use the latest state of configs and params
        return {
            step: this.step,
            net: this.Net.getConfigsAndParams()
        }

    },

    download_parameters: function() {

        console.log('nn download_parameters');
        var parameters = this.final_parameters[this.step-1];
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
                cache: [],
                caching : []
            }

            this.data.push(new_point);
            this.unassigned_data.push(new_point);

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
            // console.log('add new labels, resize param '+JSON.stringify(new_labels));
            //add new label to our copy nn
            this.Net.addLabel(new_labels);

            var newParams = this.Net.getParams();
            // console.log('##set final param for step '+this.step+', last length '+newParams.length+' '+newParams[newParams.length-1].length);
            var clonedParam = this.clone_parameter(newParams);
            // console.log('##set final param for step '+this.step+', last length '+clonedParam.length+' '+clonedParam[clonedParam.length-1].length);
            this.parameters[this.step] = clonedParam;
            // this.parameters = newParams;
            //tell SGD to accomodate this new labels
            // console.log('sent to server '+newParams.length);
            // no new label for now
            this.SGD.resize_param(clonedParam);    
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

        slave.cache_count+=ids.length;

        var i = ids.length;
        while(i--) {
            var j = this.data.length;
            var point;
            while(j--) {
                var data = this.data[j];
                if(data.id == ids[i]) {
                    data.cache.push(slave);
                    point = data;
                    break;
                }
            }
            //remove from slave.caching
            // var C = slave.caching.length;
            // for (var k=0;k<C;k++){
            //     if (slave.caching[k].id == ids[i]){
            //         slave.caching.splice(k,1);
            //         break;
            //     }
            // }
            //remove from data.caching
            var s = point.caching.length;
            while (s--){
                if (point.caching[s]==slave.socket.id){
                    point.caching.splice(s,1);
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

        // this.slaves_allocation_data[found.socket.id]=[]; //data that have been or will be in slaves cache
        // this.slaves_working_data[found.socket.id]=[]; //working could be less than allocated
        // this.slaves_working_powers[found.socket.id]=0;

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

        while(i--) {

            var j = this.data[i].cache.length;
            while(j--) {
                if(this.data[i].cache[j].socket.id == client.socket.id) {
                    this.data[i].cache.splice(j, 1);
                    break;
                }
            }
        }

        //put back data in slave working to unassigned_data
        this.unassigned_data = this.unassigned_data.concat(client.working_data);
        // delete this.slaves_allocation_data[client.socket.id];

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

    clone_parameter: function(param){
        var newParam = [];
        for (var i=0;i<param.length;i++){
            newParam.push(param[i].slice(0));
        }
        return newParam;
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


        if (!this.is_allocated){
            this.assign_slaves_limit_working_data();
            this.allocate_data();    
        }

        var i = this.slaves.length;
        var delay = 0
        while(i--){
            this.slaves[i].delay = delay;
            delay++;
            this.slave_job(this.slaves[i],this.initial_batch_size);
        }
        
        // if (!this.param_chunk.length){
        //     this.chunk_param();
        // }
        

    },

    assign_slaves_limit_working_data : function(){
        console.log('assign number of working data');
        this.is_allocated = true;
        var s = this.slaves.length;
        var total = 0;
        while (s--){
            total+=this.slaves[s].avg_working_speed();
        }

        console.log('total average working speed '+total);

        //divide data working power proportionally to working speed
        var s = this.slaves.length;
        var u = this.data.length;
        var assigned = 0;
        while (s--){
            var slave = this.slaves[s];
            var n = Math.round((slave.avg_working_speed()/total)*u);
            if (s==1){
                //the last slave
                if (u-assigned < n)
                    n = u-assigned;
            }
            n = slave.set_total_working_data(n);
            assigned += n;
        }

        console.log('first step result :');
        var s=this.slaves.length;
        while (s--){
            var slave = this.slaves[s];
            console.log('$$ '+slave.socket.id+' is assigned with '+slave.total_working_data+' working data');
        }

        var s = this.slaves.length;
        var unfilled_slaves = [];
        while (s--){
            var slave = this.slaves[s];
            if (slave.max_storage - slave.total_working_data > 0){
                unfilled_slaves.push(slave);
            }
        }
        //remaining point = u-assigned
        var r = Math.max(u-assigned,0); //to be safe
        var i=0;
        while (r--){
            var idx = i % unfilled_slaves.length; 
            var slave = unfilled_slaves[idx];
            slave.total_working_data+=1;
            if (slave.max_storage - slave.total_working_data == 0){
                unfilled_slaves.splice(idx,1);
            }   
            i++;

            if (!unfilled_slaves.length){
                break;
            }
        }

        var s=this.slaves.length;
        while (s--){
            var slave = this.slaves[s];
            console.log('$$ '+slave.socket.id+' is assigned with '+slave.total_working_data+' working data');
        }
    },

    allocate_data : function(){
        //call everytime new slave join/remove or add new data
        //or check sometime to do balancing
        //devide data evenly for now

        //move data in uncached if possible
        //priority to assign cached data as working data

        console.log('allocate data to slaves');

        var ns = this.slaves.length;
        var empty = true;
        for (var s=0;s<ns;s++){
            if (this.slaves[s].total_cache()>0){
                empty= false;
                break;
            }
        }

        //first case, fresh distribution
        if (empty){
            for (var s=0;s<ns;s++){
                var slave = this.slaves[s];
                var data = this.unassigned_data.splice(0,slave.total_working_data);
                // slave.uncached = data;
                this.slaves_uncached_data[slave.socket.id] = data.slice(0);
                slave.working_data = data;
                // var dl = data.length;
                // for (var i=0;i<dl;i++){
                //     slave.working_data.push(data[i].id);
                // }
            }

        } else {
            //second case, redistribute data
            // find slaves that have total_working_data > working_data.length
            for (var s=0;s<ns;s++){
                var slave = this.slaves[s];
                var r = slave.working_data.length-slave.total_working_data;
                if (r>0){
                    var over = slave.working_data.splice(slave.total_working_data,r);
                    this.unassigned_data = over.concat(this.unassigned_data);
                    //remove from uncached
                    var ol = over.length;
                    while(ol--){
                        var point = over[ol];
                        var uncached = this.slaves_uncached_data[slave.socket.id];
                        var ul = uncached.length;
                        while(ul--){
                            if (uncached[ul].id === point.id){
                                uncached.splice(ul,1);
                            }
                        }
                    }
                }
            }

            console.log('after cutting overworking data');
            var s=this.slaves.length;
            while (s--){
                var slave = this.slaves[s];
                slave.change_working_data = true;
                console.log('$$ '+slave.socket.id+' has '+slave.working_data.length+' data in working data, '+this.slaves_uncached_data[slave.socket.id].length+' in uncached');
            }

            sort_slaves = function(a,b){
                var c =  a.cache_count-b.cache_count;
                if (c==0){
                    c = a.caching_count - b.caching_count;
                }
                return c;
            }

            //distribute the data, by prioritizing cache
            // var nu = this.unassigned_data.length;
            var u = this.unassigned_data.length;
            console.log('nu : '+u);
            // console.log(JSON.stringify(this.unassigned_data));
            // for (var u=0;u<nu;u++){
            while(u--){
                var data = this.unassigned_data[u];
                var cache_slaves = data.cache.slice(0);
                var caching_slaves = data.caching.slice(0);
                var assigned = false;
                if (cache_slaves.length){
                    cache_slaves.sort(sort_slaves);
                    for (var i=0;i<cache_slaves.length;i++){
                        var slave = cache_slaves[i];
                        if (!slave.saturated()){
                            slave.working_data.push(data);
                            assigned = true;
                            break;
                        }        
                    }
                }
                if (! assigned && caching_slaves.length){
                    // caching_slaves.sort(sort_slaves);
                    // var slave = caching_slaves[0];
                    // slave.working_data.push(data);
                    caching_slaves.sort(sort_slaves);
                    for (var i=0;i<caching_slaves.length;i++){
                        var slave = caching_slaves[i];
                        if (!slave.saturated()){
                            slave.working_data.push(data);
                            assigned = true;
                            break;
                        }        
                    }
                } 
                if (! assigned) {
                    //fill until full
                    var s =this.slaves.length;
                    while (s--){
                        var slave = this.slaves[s];
                        if (slave.working_data.length<slave.total_working_data){
                            assigned = true
                            slave.working_data.push(data);
                            // slave.uncached.push(data);
                            this.slaves_uncached_data[slave.socket.id].push(data);
                            break;
                        }
                    }
                }
                if (assigned){
                    this.unassigned_data.splice(u,1);
                }
            }

        }

        console.log('un assigned data : '+this.unassigned_data.length);


        var s=this.slaves.length;
        while (s--){
            var slave = this.slaves[s];
            slave.change_working_data = true;
            console.log('$$ '+slave.socket.id+' has '+slave.working_data.length+' data in working data, '+this.slaves_uncached_data[slave.socket.id].length+' in uncached');
        }
    },

    reallocate_data : function(){
        //reallocation if there's any worker's speed that less than threshold
        //call e.g in each 20 iterations
        //check if slaves avg_working_speed/working_data.length is less than 75% of the fastest
        console.log('checking data reallocation');
        var slaves = this.slaves.slice(0);
        var s = slaves.length;
        var max = slaves[--s];
        var min = slaves[s];
        while (s--){
            var slave = slaves[s];
            var r = slave.avg_working_speed()/slave.working_data.length;
            var rmax = max.avg_working_speed()/max.working_data.length;
            var rmin = min.avg_working_speed()/min.working_data.length;
            if (r > rmax){
                max = slave;
            } else if (r < rmin){
                min = slave;
            }
            rmax = max.avg_working_speed()/max.working_data.length;
            rmin = min.avg_working_speed()/min.working_data.length;
            if (rmin < 0.85*rmax){
                console.log('Need to reallocate data !!');
                this.assign_slaves_limit_working_data();
                this.allocate_data();
                return;
            }
        }
        console.log('No need for reallocation');

    },

    slave_job : function(slave, working_power){
        slave.working_power = working_power;
        slave.process_cache(this);
        if (slave.cache_count){
            slave.work(this);    
            return true;
        } else {
            console.log('no data in slave cache ');
            return false;
        }
        
    },

    next_step : function(){
        //step is increased everytime all clients that pickup parameter at time t have returned their gradients
        //or the fastest client has return

        this.error = this.total_error[this.step]/this.total_vector[this.step];

        var clonedParam = this.clone_parameter(this.parameters[this.step]);
        // console.log('set final param for step '+this.step+', last length '+clonedParam[clonedParam.length-1].length);
        this.final_parameters[this.step] = clonedParam;
        //set param to the dummy NN
        this.Net.setParams(clonedParam);

        //remove old parameters
        if (this.final_parameters[this.step-4]){
            delete this.final_parameters[this.step-4];
        }
        if (this.parameters[this.step-4]){
            delete this.parameters[this.step-4];
        }

        if (typeof this.active_slaves_per_step[this.step-4] !== 'undefined'){
            delete this.active_slaves_per_step[this.step-4];
        }

        if (typeof this.total_error[this.step-4] !== 'undefined'){
            delete this.total_error[this.step-4];
        }

        if (typeof this.total_vector[this.step-4] !== 'undefined'){
            delete this.total_vector[this.step-4];
        }

        var s =this.slaves.length;
        var total = 0;
        while (s--){
            var slave = this.slaves[s];
            total+= slave.avg_working_speed();
        }
        console.log('total working speed '+total);
        this.total_working_speed = total;



        this.step++;

        this.total_error[this.step] = 0;
        this.total_vector[this.step] = 0;

        if (this.step%this.reallocation_interval==0){
            this.reallocate_data();
        }

    },

    reduction: function(slave, parameters) { //, new_labels) {

        // console.log('reduction');
        console.log('');
        console.log('');

        if(!this.running) {
            console.log("! Cannot reduce (slave) to (NN): NN not running", slave.socket.id, this.id);
            return;
        }

        // removed = false;

        // var i = this.slaves_operating.length;
        // while(i--) {
        //     if(this.slaves_operating[i].socket.id == slave.socket.id) {
        //         this.slaves_operating.splice(i, 1);
        //         removed = true;
        //     }
        // }

        this.active_slaves_per_step[parameters.step]--;

        // if(!removed) {
        //     console.log("! Cannot reduce (slave) to (NN): Slave not active in this NN.", slave.socket.id, this.id);
        //     return;
        // }

        
        

        // d = new Date().getTime();

        this.operation_results.push(parameters);

        this.runtime_elapsed += parseInt(this.iteration_time);
        this.data_seen += slave.working_power;

        // slave.power = parameters.nVector;

        if(!this.slaves_operating.length && this.running == false) {

            // standstill. broadcast.

            this.master.broadcast_log('Network standstill: ' +  this.nn);

            return;

        }



        // if(!this.slaves_operating.length) {
        //     // was the last one.
        //     // do reduction function.
        //     this.is_reducing = false;

        //     var wait_time = new Date().getTime()-this.start_reduce_time;
        //     // console.log('waiting time '+d-this.start_reduce_time);
            
        //     this.aggregation();

        //     this.operation_results = [];
        //     console.log('waiting time ', wait_time);
        //     console.log('> Reduce (NN)', this.id);

        //     // begin again

        //     this.realtime_elapsed += parseInt(this.iteration_time);

        //     this.run();

        // }

        this.slaves_reduction.push(slave);
        
        var fastest = false;
        var or = this.operation_results.length; //for now this will always have length 1
        while (or--){
            var param = this.operation_results[or];
            // console.log('param.step '+param.step+' this.step '+this.step);
            if (param.step== this.step){
                fastest = true;
                this.next_step();
                // this.step++;   
                // this.permute_param();
            }

            this.total_error[param.step+1]+= param.error;
            this.total_vector[param.step+1]+=param.nVector;
            // if (!param.chunk.length){
            //     continue;
            // }
            // var slave_position = this.param_permutation[param.step].indexOf(param.slave_id);
            // var SGD = this.SGDs[slave_position];
            
            //write to param.step+1
            // if parameter t+1 has not been sealed
            var thrown=false;
            if (!this.final_parameters[param.step+1]){
                this.parameters[param.step+1]=this.SGD.reduce(this);
                slave.total_real_processed_data += param.nVector;
                this.total_real_processed_data += param.nVector;
            } 
            else {
                thrown=true;
                // console.log('throw parameters from '+slave.socket.id);
                this.delayed_slaves.push(slave);
                slave.thrown_param_count+=1;
                // throw the parameters because it's too old.
            }
            
            
        }

        // //set new batch size for this slave
        // console.log(JSON.stringify(this.active_slaves_per_step));
        // //for the fastest slave
        // var wp;
        // if (!this.active_slaves_per_step[this.step]){
        //     //the fastest step
        //     console.log('the fastest');
        //     wp = this.initial_batch_size;
        //     this.fastest_working_time = parameters.working_time;
        //     this.fastest_start_time =  new Date().getTime();
            
        // } else {
        //     var remaining_time = this.fastest_working_time - (new Date().getTime() - this.fastest_start_time);
        //     if (remaining_time>500){
        //         console.log('higher than 500');
        //         wp = Math.round((parameters.nVector/parameters.working_time)*remaining_time);
        //     } else {
        //         wp = Math.round((parameters.nVector/parameters.working_time)*this.fastest_working_time);
        //     }
        // }
        

        var wp = Math.round((slave.avg_working_speed()/this.total_working_speed)*(this.initial_batch_size*this.slaves.length));

        console.log('working power : '+wp);

        slave.add_working_time(parseInt(parameters.working_time));

        // console.log('finish reduction');
        // this.notify_bosses();
        this.master.broadcast_nns();

        this.operation_results=[];
        this.slaves_reduction =[];

        if (!thrown){
            var release_slaves = [slave];
            if (fastest){
                console.log(this.delayed_slaves.length+' slaves in delayed_slaves');
                release_slaves = release_slaves.concat(this.delayed_slaves);
                this.delayed_slaves = [];
            }

            var r = release_slaves.length;
            while (r--){
                var slave = release_slaves[r];
                this.slave_job(slave, wp);

                // find parameter chunk for this slave
                // var slave_chunk = this.param_chunk[slave_position];
                // console.log('save chunk '+JSON.stringify(slave_chunk));
                slave.send('parameters', {
                    // type: 'parameters',
                    chunk: [],
                    step : this.step

                });    
            }
                
        }
           
        
        // var o = this.slaves_reduction.length;
        // while (o--){
        //     var slave = this.slaves_reduction[o];
        //     // console.log(JSON.stringify(this.param_permutation));
        //     // var slave_position = this.param_permutation[this.step].indexOf(slave.socket.id);
        //     this.slave_job(slave, wp);

        //     // find parameter chunk for this slave
        //     // var slave_chunk = this.param_chunk[slave_position];
        //     // console.log('save chunk '+JSON.stringify(slave_chunk));
        //     slave.send('parameters', {
        //         // type: 'parameters',
        //         chunk: [],
        //         step : this.step

        //     });    
        // }

        

        

        

    }

    // aggregation: function() {

        // if(!this.operation_results.length) {
        //     console.log("! Cannot aggregate (NN): No operation results.", this.id);
        //     return;
        // }

        // console.log('aggregation');

        // if(this.hyperparameters_changed) {
        //     console.log('Updated (NN) with new hyperparameters.', this.id);
        //     this.SGD.set_parameters(this.hyperparameters);
        //     this.hyperparameters_changed = false;
        // }

        // this.SGD.reduce(this);
        // var or = this.operation_results.length; //for now this will always have length 1
        // while (or--){
        //     var param = this.operation_results[or];
        //     if (param.step== this.step){
        //         this.step++;   
        //         this.permute_param();
        //     }
        //     if (!param.chunk.length){
        //         continue;
        //     }
        //     var slave_position = this.param_permutation[param.step].indexOf(param.slave_id);
        //     var SGD = this.SGDs[slave_position];
        //     SGD.reduce(this); // operation result should be consistent with SGD
            
        // }
        
        // var o = this.slaves_reduction.length;
        // while (o--){
        //     var slave = this.slaves_reduction[o];
        //     console.log(JSON.stringify(this.param_permutation));
        //     var slave_position = this.param_permutation[this.step].indexOf(slave.socket.id);
        //     this.slave_job(slave);

        //     // find parameter chunk for this slave
        //     var slave_chunk = this.param_chunk[slave_position];
        //     console.log('save chunk '+JSON.stringify(slave_chunk));
        //     slave.send('parameters', {
        //         // type: 'parameters',
        //         chunk: slave_chunk,
        //         step : this.step

        //     });    
        // }

        // console.log('finish aggregation');
        

        // // this.notify_bosses();
        // this.master.broadcast_nns();

    // }

    // chunk_param : function() {
    //     this.param_chunk = [];
    //     var params=this.Net.getParams();
    //     var p=params.length; //for now don't consider length of filter
    //     var s=this.slaves.length;
    //     var chunk = Math.ceil(p/s);
    //     var pi=0;
    //     while (s--){
    //         var idxes = [];
    //         var param_chunk = [];
    //         var c = chunk;
    //         while (c-- && pi < p){
    //             idxes.push(pi);
    //             param_chunk.push(params[pi]);
    //             pi++;
    //         }
    //         this.param_chunk.push(idxes);
    //         var SGD = new SGDTrainer(this, {});
    //         SGD.set_parameters(this.hyperparameters);
    //         SGD.resize_param(param_chunk);
    //         SGD.chunk = idxes;
    //         this.SGDs.push(SGD);
    //     }
    // },


    // permute_param : function(){
    //     //do this after we know how many slaves connected
    //     //probably when click run ? & everytime this.step increase
    //     if (this.param_permutation[this.step]){
    //         //permutation already exist
    //         console.log('permutation for step '+this.step+ 'alread exist');
    //         return;
    //     }

    //     shuffle = function(o){
    //         for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    //         return o;
    //     };

    //     sortNumber = function(a,b) {
    //         return a - b;
    //     }
    //     var s = this.slaves.length;
    //     var permutation=[];
    //     while (s--){
    //         permutation.push(this.slaves[s].socket.id);
    //     }
    //     permutation = shuffle(permutation);

    //     this.param_permutation[this.step]=permutation;
        
    //     //remove old history
    //     var keys = Object.keys(this.param_permutation);
    //     if (keys.length>5){
    //         delete this.param_permutation[keys.map(Number).sort(sortNumber)[0]];
    //     }
        
        
    // },

    // ,

    // allocate: function() {

    //     sort_data = function(a,b) {
    //         //prioritize less assigned data
    //         // sort hight assigned to low, but process from the end of list
    //         // cache = a.cache.length - b.cache.length; 
    //         cache = b.assigned_ctr - a.assigned_ctr;
    //         if(cache == 0) {
    //             return a.cache.length - b.cache.length;
    //         }
    //         return cache;
    //     }

    //     // sort_slaves = function(a, b) {
    //     //     // low to high
    //     //     cache = b.assigned_cache.length - a.assigned_cache.length;
    //     //     if(cache == 0) {
    //     //         return a.assigned_power.length - b.assigned_power.length;
    //     //     }
    //     //     return cache;
    //     // }

    //     filter_unfilled_slaves = function(a) {
    //         return !a.saturated()
    //     }

    //     filter_cache_slaves = function(a) {
    //         return a.cache_left() > 0
    //     }

    //     in_slave_cache = function(point, slave) {
    //         //in cache or on the way
            
    //         var m = point.assigned.length;
    //         while(m--) {
    //             if(point.assigned[m].socket.id == slave.socket.id) {
    //                 return true;
    //             }
    //         }
    //         // return false;

    //         var m = point.cache.length;
    //         while(m--) {
    //             if(point.cache[m].socket.id == slave.socket.id) {
    //                 return true;
    //             }
    //         }
    //         return false;

            
    //     }

    //     rm_assigned = function(point, slave) {
    //         //on the way
    //         // var m = point.assigned.length;
    //         // while(m--) {
    //         //     if(point.assigned[m].socket.id == slave.socket.id) {
    //         //         return true;
    //         //     }
    //         // }
    //         // return false;

    //         var j = point.assigned.length;

    //         while(j--) {
    //             if(point.assigned[j].socket.id == slave.socket.id) {
    //                 point.assigned.splice(j, 1);
    //             }
    //         }

    //     }

    //     // in_cache = function(point, slave) {

    //     //     // check on BOSS, not on CLIENT.
    //     //     // if a BOSS drops, many CLIENTS drop.
    //     //     // else fake data coverage.

    //     //     var m = point.cache.length;
    //     //     while(m--) {
    //     //         if(point.cache[m].boss.socket.id == slave.boss.socket.id) {
    //     //             return true;
    //     //         }
    //     //     }

    //     //     // var m = point.assigned.length;
    //     //     // while(m--) {
    //     //     //     if(point.assigned[m].boss.socket.id == slave.boss.socket.id) {
    //     //     //         return true;
    //     //     //     }
    //     //     // }
    //     //     return false;

    //     // }

    //     // in_cache = function(point, slave) {

    //     //     var m = point.cache.length;
    //     //     while(m--) {
    //     //         if(point.cache[m].socket.id == slave.socket.id) {
    //     //             return true;
    //     //         }
    //     //     }
    //     //     return false;

    //     // }

    //     total_power = this.total_power()

    //     normalize_factor = total_power / this.data.length;

    //     console.log("> (NN) allocates (power) with (factor):", this.id, total_power, normalize_factor);

    //     fraction_difference = 0;

    //     var i = this.slaves.length;

    //     // assign all slaves their power

    //     while(i--) {
    //         slave = this.slaves[i];

    //         power_float = slave.power / normalize_factor;
    //         power_int = Math.ceil(power_float);

    //         if(power_int > slave.max_power) {
    //             power_int = slave.max_power;
    //         }

    //         slave.assigned_power = power_int

    //         // dump assigned cache
    //         slave.assigned_cache = [];
    //         slave.process = [];

    //     }


    //     // sort data descending by #allocated/processed
    //     this.data = this.data.sort(sort_data);

    //     var un_cached =0;
    //     var uncached_list = [];


    //     // assign data points to slaves having it already in cache or on the way/assigned
    //     var j = this.data.length;
    //     while(j--) {

    //         point = this.data[j];

    //         point.process = [];
    //         point.selected = false;

    //         var k = point.assigned.length;

    //         while(k--) {

    //             var cache_slave = point.assigned[k];

    //             if(!cache_slave.saturated() ) {
    //                 cache_slave.assigned_cache.push(point);
    //                 point.process.push(cache_slave);

    //                 break;
    //             }

    //         }

    //         if (! point.process.length){
    //             un_cached +=1;
    //             uncached_list.push(point); //now the remaining list become ascending
    //         }

    //     }

    //     console.log('uncached  data '+un_cached);
    //     var U = uncached_list.length; //here the list is ascending
    //     var slaves = this.slaves;



    //     // console.log('AFTER ASSIGN CACHE');
    //     // var ll = this.slaves.length;
    //     // while(ll--){
    //     //     if (!this.slaves[ll].saturated()){
    //     //         console.log('#### '+this.slaves[ll].socket.id+' NOT SATURATED');    
    //     //     }
    //     // }

    //     // var UA = un_assigned.length;
    //     var un_processed = [];
    //     for (var u=0;u<U;u++){

    //         var point = uncached_list[u];
    //         //point is not in anybody cache, and not being transferred
    //         //to preserve consistent order of traversing slaves, start from the first
    //         var L = slaves.length;
    //         var l = slaves.length;

    //         while (l--){
    //             var slave = slaves[l];
    //             if ( (!slave.saturated()) && (slave.uncached.length < slave.power)){
    //                 slave.assigned_cache.push(point);
                
    //                 if(!in_slave_cache(point, slave)) {
    //                     // slave.uncached.push(point);
                         
                        
    //                 }
    //                 rm_assigned(point,slave);
    //                 point.assigned.push(slave);    
                    
    //                 point.process.push(slave);
                    
    //                 break;
    //             }

    //         }
    //         if (!point.process.length){
    //             un_processed.push(point);
    //         }
    //     }

    //     console.log('unproccessed data '+un_processed.length);

        
        
        

        

    //     var I = this.slaves.length;
    //     for (var i=0;i<I;i++){
    //     // while(i--) {
    //         // this.slaves[i].process_cache(this);
    //     }

    // },

    // initiate: function() {

    //     sort_data = function(a,b) {
    //         //prioritize less assigned data
    //         // low to high
    //         // cache = a.cache.length - b.cache.length; 
    //         cache = b.assigned_ctr - a.assigned_ctr;
    //         if(cache == 0) {
    //             return b.cache.length - a.cache.length;
    //         }
    //         return cache;
    //     }

    //     filter_data = function(a) {
    //         return a.cache.length
    //     }

    //     sort_slaves = function(a, b) {
    //         // low to high
    //         return a.assigned_power.length - b.assigned_power.length;
    //     }

    //     filter_slaves = function(a) {
    //         return a.assigned_power >= 10; // at least 10 points, or too slow.
    //     }

    //     in_cache = function(point, slave) {

    //         var m = point.cache.length;
    //         while(m--) {
    //             if(point.cache[m].socket.id == slave.socket.id) {
    //                 return true;
    //             }
    //         }
    //         return false;

    //     }

    //     console.log("Initiating (NN)", this.id);

    //     var datamap = this.data.filter(filter_data)//sort(sort_data);

    //     if(!datamap.length) {
    //         console.log('> 1 (NN) cannot initiate: data not available on slaves (yet)', this.id);
    //         this.running = false;
    //         return
    //     }

    //     // sort on slave cache size
    //     // var slaves = this.slaves.filter(filter_slaves).sort(sort_slaves);
    //     var slaves = this.slaves.filter(filter_slaves)
    //     //var slaves = this.slaves.sort(sort_slaves);

    //     if(!slaves.length) {
    //         // should not be possible because datamap checks this aswell above.
    //         console.log('> 2 (NN) cannot initiate: data not available on slaves (yet)', this.id);
    //         this.running = false;
    //         return
    //     }

        

    //     var slaves_to_work = 0;

    //     var j = datamap.length;

    //     console.log('datamap length '+datamap.length);
    //     var notincache=0;
    //     while (j--){
    //         var point = datamap[j]
    //         var slave = point.process[0]; //data has been filtered, so there's must be at least one (or exactly one) slave

    //         if (!point.process.length){
    //             continue;
    //             //not assigned, but in cache
    //             //what to do?
    //         }
            
    //         if(in_cache(point,slave)) {
    //             // assign
    //             if (slave.process.length< slave.assigned_power){
    //                 slave.process.push(point.id);

    //                 point.selected = true;
    //                 point.assigned_ctr+=1
    //             }
    //             // else if(slave.process.length == slave.assigned_power) {
    //             //     console.log('THIS SHOULD HAPPEN ONCE OR NEVER');
    //             // }

    //         } else {
    //             //weird sometime this happen
    //             notincache +=1
    //         }
    //     }
    //     //weird sometime this appear
    //     console.log('not in cache '+notincache);

    //     var i = slaves.length;
    //     while (i--){
    //         var slave = slaves[i];
    //         if(slave.process.length > 0) {

    //             this.slaves_operating.push(slave);
    //             slave.work(this);

    //             slaves_to_work += 1;

    //         }
    //     }


    //     // Test.dataset_should_be_fully_allocated(this);

    //     console.log('(NN) sent', slaves_to_work, 'slaves to work:', this.id);

    // },

}

module.exports = NeuralNetwork;