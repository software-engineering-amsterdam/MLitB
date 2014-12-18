var Client = require('./client');

Slave.prototype = new Client();
Slave.prototype.constructor = Slave;

function Slave(socket, boss) {
    
    this.socket = socket;

    this.boss = boss;

    this.nn = null;

    // this.power = 1000;
    this.latency = 10;
    this.linkspeed = 10;

    // this.max_power = 10000;

    this.max_storage = 10000;

    this.delay = 0;
    this.working_power = 100; //number of data to be processed in this step

    this.limit_working_data; //will be assigned evenly for the first time
    this.working_data = [];  //save the working ids for this slave
    this.working_powers = []; // save the last n working power

    this.cache = []; // real data in cache
    this.uncached = []; // data to obtain
    this.caching = []; //data id that are being cached

};

Slave.prototype.saturated = function() {
    return (this.limit_working_data - this.working_data.length) == 0
},

Slave.prototype.cache_left = function() {
    return this.max_storage - (this.cache.length+this.uncached.length+this.caching.length);
}

Slave.prototype.process_cache = function() {
    // manages uncached to cache

    data = {};

    var UL = this.uncached.length;

    if(!UL) {
        return;
    }

    var ids = [];

    i=0;
    var TP = this.power; //transfer power
    while (i<UL && TP--)
        ids.push(this.uncached[i].id);
        i++;
    }

    this.caching = this.uncached.splice(0,i);

    console.log('process cache '+ids.length);
    // console.log(JSON.stringify(ids));
    // this.uncached = [];

    this.boss.send('data_assignment', {
        slave_id: this.socket.id,
        data: ids
    });

    return;
}

Slave.prototype.work = function(nn) {

    var work_data = {
        
        data: this.process,
        // iteration_time: nn.iteration_time, // fix for lag etc.
        step: nn.step,
        // assigned_power: this.assigned_power,
        // power: this.power,
        delay : this.delay,
        working_power : this.working_power,
        working_data : this.working_data
    }

    this.working_powers.push(this.working_power);
    if (this.working_powers.length>5){
        this.working_powers.splice(0,1);    
    }
    

    console.log(' $$ slave', this.socket.id, 'works on', this.process.length, 'data points');

    this.send('job', work_data);

    this.working_data = []; //empty working data

}

module.exports = Slave;