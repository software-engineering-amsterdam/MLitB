var Client = function(master, server, id, boss) {
    
    this.id = id;
    this.master = master;
    this.server = server;
    this.boss = boss[1];
    this.boss_server = boss[0];

    this.nn = null;

    this.power = 100;
    this.latency = 10;
    this.linkspeed = 10;

    this.max_power = 3000;

    this.assigned_power;

    this.cache = []; // real data
    this.uncached = []; // data to obtain

    this.assigned_cache = []; // real data + data to obtain

    this.process = []; // data assigned for processing

    this.labels = []; // current list of known labels

}

Client.prototype = {

    saturated: function() {
        return (this.assigned_power - this.assigned_cache.length) == 0
    },

    cache_left: function() {
        return this.max_power - this.assigned_cache.length;
    },

    process_cache: function(nn) {
        // manages uncached to cache

        data = {};

        var j = this.uncached.length;

        if(!j) {
            return;
        }

        while(j--) {
            point = this.uncached[j];

            // fetch point from cache or cache_wide
            // some sorting may be implemented to select best uploader

            if(point.cache.length) {
                client = point.cache[0];
            } else if(point.cache_wide.length) {
                client = point.cache_wide[0];
            } else {
                // point mysteriously has no client
                // could be transition period for disconnecting clients
                // do nothing
                continue;
            }

            if(!(client.id in data)) {
                data[client.id] = [];
            }

            data[client.id].push(point.id);

        }

        this.uncached = [];

        if(!Object.keys(data).length) {
            // again a mystery (or not if saturated)
            return;
        }

        // tell the clients holding the data to send to requester
        for(var client_id in data) {

            client = this.master.slave_by_id(client_id);
            
            // send the BOSS of the SENDER the info.
            this.master.send_message_to_boss(client.boss, {
                type: 'data_assignment',
                sender: client_id,
                recipient: this.id,
                boss: this.boss,
                server: this.boss_server, // this is IMPORTANT. We do not want to relay data via the master, so tell boss who is the other server.
                data: data[client_id],
                nn: nn.id
            });

        }

    },

    get_new_labels: function(labels) {

        // returns a list of NEW labels for this client

        var new_labels = [];

        var i = labels.length;
        while(i--) {

            if(this.labels.indexOf(labels[i]) == -1) {

                this.labels.push(labels[i]);
                
                new_labels.push(labels[i]);

            }

        }

        return new_labels;

    },

    work: function(nn) {

        var work_data = {

            type: 'work',
            data: this.process,
            iteration_time: nn.iteration_time, // fix for lag etc.
            configuration: nn.configuration,
            parameters: nn.parameters,
            step: nn.step,
            nn: nn.id,
            new_labels: nn.labels,
            is_train: nn.is_train

        }

        console.log(nn.parameters.parameters[0].length);
        console.log(nn.parameters.parameters[1].length);

        this.master.send_message_to_slave(this, work_data);

        this.process = [];

    }

}

module.exports = Client;