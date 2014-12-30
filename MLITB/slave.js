var Client = require('./client');

Slave.prototype = new Client();
Slave.prototype.constructor = Slave;

function Slave(socket, boss) {
    
    this.socket = socket;

    this.boss = boss;

    this.nn = null;

    this.transfer_power = 100;
    this.latency = 10;
    this.linkspeed = 10;

    // this.max_power = 10000;

    this.max_storage = 10000;

    this.delay = 0;
    this.working_power = 100; //number of data to be processed in this step

    this.total_working_data; //will be assigned evenly for the first time
    this.working_data = [];  //save the working ids for this slave
    this.working_powers = []; // save the last n working power
    this.working_times = []; // save the last n working time
    this.change_working_data = false;

    // this.cache = []; // real data in cache
    this.cache_count = 0;
    this.uncached = []; // data to obtain
    this.uncached_count = 0;
    // this.caching = []; //data id that are being cached
    this.caching_count = 0;

    this.thrown_param_count = 0;
    this.total_real_processed_data = 0;

    this.vector_record = [];
    this.time_record = [];
    this.latencies = [];
    this.wait_time_record = [];

};

Slave.prototype.saturated = function() {
    return (this.total_working_data - this.working_data.length) == 0;
},

Slave.prototype.set_total_working_data = function(v){
    if (v>this.max_storage){
        console.log('total_working_data is higher than max_storage');
        v = this.max_storage;
    } 
    this.total_working_data = v;
    return v;
}

Slave.prototype.cache_left = function() {
    return this.max_storage - (this.cache_count+this.uncached_count+this.caching_count);
}

Slave.prototype.total_cache = function(){
    return this.cache_count+this.uncached_count+this.caching_count;
}

Slave.prototype.avg_working_speed = function(){
    if (!this.working_powers.length || !this.working_times.length){
        return this.working_power;
    }
    var wp = this.working_powers.reduce(function(pv, cv) { return pv + cv; }, 0);
    var wt = this.working_times.reduce(function(pv, cv) { return pv + cv; }, 0)/1000; //convert to second
    return (wp/wt);
}

Slave.prototype.last_working_speed = function(){
    if (!this.working_powers.length || !this.working_times.length){
        return this.working_power;
    }
    var wp = this.working_powers[this.working_powers.length-1];
    var wt = this.working_times[this.working_times.length-1];
    return (wp/wt);
}

Slave.prototype.add_working_time = function(v){
    this.working_times.push(v);
    if (this.working_times.length>5){
        this.working_times.splice(0,1);    
    }
}

Slave.prototype.process_cache = function(nn) {
    // manages uncached to cache
    // console.log('process cache ');
    data = {};

    // var UL = this.uncached.length;
    var uncached = nn.slaves_uncached_data[this.socket.id];
    var UL = uncached.length;

    if(!UL) {
        return;
    }

    var ids = [];

    i=0;
    var TP = this.transfer_power; //transfer power
    while (i<UL && TP--){
        var data = uncached[i];
        ids.push(data.id);
        data.caching.push(this);
        i++;
    }

    uncached.splice(0,i);
    this.uncached_count = uncached.length;
    this.caching_count+=i;

    // console.log(this.socket.id+' caching '+ids.length+' points');
    // console.log(JSON.stringify(ids));
    // this.uncached = [];

    this.boss.send('data_assignment', {
        slave_id: this.socket.id,
        data: ids
    });

    return;
}

Slave.prototype.work = function(nn) {
    var wd;
    if (this.change_working_data){
        wd = []
        var wl = this.working_data.length;
        while (wl--){
            wd.push(this.working_data[wl].id)
        }
        this.change_working_data = false;
    }

    var work_data = {
        
        data: this.process,
        step: nn.step,
        delay : this.delay,
        working_power : this.working_power,
        working_data : wd
    }

    this.working_powers.push(this.working_power);
    if (this.working_powers.length>5){
        this.working_powers.splice(0,1);    
    }

    if (nn.active_slaves_per_step[nn.step]){
        nn.active_slaves_per_step[nn.step]+=1;
    
    } else {
        nn.active_slaves_per_step[nn.step]=1;
    }

    // if (this.delay==0){
    //     console.log(JSON.stringify(this.working_data));
    //     console.log(this.total_working_data);
    // }
    

    console.log(' $$', this.socket.id, 'works on', this.working_power, 'data, '+this.thrown_param_count+' thrown, '+(this.total_real_processed_data/nn.total_real_processed_data*100).toFixed(2)+' % real processed data, '+(this.working_data.length/nn.data.length*100).toFixed(2)+' % working data');

    this.send('job', work_data);

    // this.working_data = []; //empty working data

}

module.exports = Slave;