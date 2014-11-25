var Client = require('./client');

Slave.prototype = new Client();
Slave.prototype.constructor = Slave;

function Slave(socket, boss) {
    
    this.socket = socket;

    this.boss = boss;

    this.nn = null;

    this.power = 100;
    this.latency = 10;
    this.linkspeed = 10;

    this.max_power = 500;

    this.assigned_power;

    this.cache = []; // real data
    this.uncached = []; // data to obtain

    this.assigned_cache = []; // real data + data to obtain

    this.process = []; // data assigned for processing

    this.labels = []; // current list of known labels

};

Slave.prototype.saturated = function() {
    return (this.assigned_power - this.assigned_cache.length) == 0
},

Slave.prototype.cache_left = function() {
    return this.max_power - this.assigned_cache.length;
}

Slave.prototype.process_cache = function(nn) {
    // manages uncached to cache

    data = {};

    var i = this.uncached.length;

    if(!this.uncached.length) {
        return;
    }

    var ids = [];

    while(i--) {
        ids.push(this.uncached[i].id);
    }
    
    this.uncached = [];

    this.boss.send('data_assignment', {
        slave_id: this.socket.id,
        data: ids
    });

    return;
}

Slave.prototype.work = function(nn) {

    var new_labels = [];

    // find intersection of labels.
    var i = nn.labels.length;
    while(i--) {
        var label = nn.labels[i];
        if(this.labels.indexOf(label) == -1) {
            new_labels.push(label);
            this.labels.push(label);
        }

    }

    var parameters = nn.parameters;
    if(!parameters) {
        parameters = nn.configuration.params;
    }

    var work_data = {

        type: 'work',
        data: this.process,
        iteration_time: nn.iteration_time, // fix for lag etc.
        parameters: parameters,
        step: nn.step,
        new_labels: new_labels

    }

    this.send('work', work_data);

    this.process = [];

}

Slave.prototype.track = function(nn) {

    var new_labels = [];

    // find intersection of labels.
    var i = nn.labels.length;
    while(i--) {
        var label = nn.labels[i];
        if(this.labels.indexOf(label) == -1) {
            new_labels.push(label);
            this.labels.push(label);
        }

    }

    var parameters = nn.parameters;
    if(!parameters) {
        parameters = nn.configuration.params;
    }

    var tracking_data = {

        type: 'track',
        parameters: parameters,
        step: nn.step,
        new_labels: new_labels

    }

    console.log(' $$ Send track');

    this.send('track', tracking_data);

    this.process = [];

}

module.exports = Slave;