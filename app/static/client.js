
var Client = function(scope) {

    this.scope = scope;

    this.id;
    this.slaves = [];
    this.socket;

    this.log_list = [];
    this.log_text;

    this.round_robin = 0;
    this.upload_slave;

    this.new_data;

    this.running = false;

    this.nns = [];

    this.host;
    this.port;

    this.classify_input_data;

}

Client.prototype = {

    display_log: function() {

        text = "";

        var i = this.log_list.length;

        while(i--) {
            text += this.log_list[i];
        }

        this.log_text = text;

        this.scope.update_log();

    },

    logger: function(t) {

        text = new Date().toLocaleString();
        text += ' > ';
        text += t
        text += '\n';

        this.log_list.push(text);
        this.log_list = this.log_list.slice(-100, 200);

        return this.display_log();

    },

    nn_exists: function(id) {

        var i = this.nns.length;
        while(i--) {
            nn = this.nns[i];

            if(nn.id == id) {
                return nn;
            }
        }

        return false;

    },

    slave_by_id: function(id) {

        i = this.slaves.length;

        while(i--) {

            if(this.slaves[i].id == id) {
                return this.slaves[i];
            }

        }

        return false;

    },

    slaves_by_nn: function(id) {

        return this.slaves.filter(function(s) {
            return s.nn == id;
        });

    },

    slaveMessage: function(e) {

        console.log('msg');

    },

    set_boss_id: function(id) {
        
        this.id = id;

        this.logger("Received boss id: " + id);

    },

    update_boss_info: function(data) {

        this.nns = data.data;
        this.scope.update_nns();

    },

    add_stats: function(nn_id) {

        if(!this.nn_exists(nn_id)) {
            return;
        }

        this.send_message_to_master('add_stats', {
            boss: this.id,
            nn: nn_id
        });

    },

    update_stats: function(data) {

        this.scope.update_stats(data);

    },

    remove_stats: function(nn_id) {

        if(!this.nn_exists(nn_id)) {
            return;
        }

        this.send_message_to_master('remove_stats', {
            boss: this.id,
            nn: nn_id
        });

    },

    request_download_parameters: function(nn_id) {

        if(!this.nn_exists(nn_id)) {
            return;
        }


        this.send_message_to_master('download_parameters', {
            boss: this.id,
            nn: nn_id
        });

    },

    download_parameters: function(d) {

        parameters = d.data;

        var blob = new Blob([JSON.stringify(parameters)], {type: "application/json;charset=utf-8"});
        saveAs(blob, "parameters.json");

    },

    upload_parameters: function(nn_id, data) {

        if(!this.nn_exists(nn_id)) {
            return;
        }

        this.send_message_to_master('upload_parameters', {
            boss: this.id,
            nn: nn_id,
            data: data
        });
    },

    upload_parameters_complete: function() {

        this.logger('Parameter upload complete.');

    },

    request_nn_classifier: function(nn_id) {
        // retrieves params + conf from master.
        // this might be a bit of a workaround requesting params + conf every time
        // a classification is done.
        // but it works for now.
        // later, the client can 'subscribe' to parameters + conf at master
        // so it receives it on push basis.

        var nn = this.nn_exists(nn_id);
        
        if(!nn) {
            return;
        }

        this.send_message_to_master('request_nn_classifier', {
            boss: this.id,
            nn: nn_id
        });


    },

    desaturate_image: function(img) {

        var new_image = [];

        var third = img.length / 3;

        // loop only over 1 channel
        for(i = 0; i < third; i++) {

            r = img[i];
            g = img[i + third];
            b = img[i + third + third];

            gs = r + g + b / 3;

            new_image.push(Math.round(gs));

        }

        return new_image;

    },

    receive_nn_classifier: function(d) {

        configuration = d.configuration;
        parameters = d.parameters.parameters;
        labels = d.labels;

        // squish configuration
        conf = [];
        for(var i = 0; i < configuration.length; i++) {
          layer = configuration[i].conf;
          layer.type = configuration[i].type;
          conf.push(layer);
        }

        vol_input = configuration[0].conf;

        if(vol_input.depth == 1 && this.classify_input_data.length == ((vol_input.sx * vol_input.sy) * 3)) {
            // desaturate image
            this.classify_input_data = this.desaturate_image(this.classify_input_data);
        }

        if(this.classify_input_data.length != (vol_input.sx * vol_input.sy * vol_input.depth)) {
            this.logger('Cannot classify image: Incorrect format.');
            return;
        }

        Net = new mlitb.Net();
        Net.createLayers(conf);
        Net.setParams(parameters);

        Net.addLabel(labels);

        Input = new mlitb.Vol(vol_input.sx, vol_input.sy, vol_input.depth, 0.0);
        Input.data = this.classify_input_data;
        Net.forward(Input);
        var arr = Net.getPrediction().data;

        // add labels to arr

        var labeledResults = []

        var j = arr.length;
        while(j--) {
            labeledResults.push([Net.index2label[j], arr[j].toFixed(6)]);
        }

        labeledResults = labeledResults.sort(function(a,b) {
            return b[1] - a[1];
        });

        console.log(labeledResults);

        this.scope.classifier_results(labeledResults);

    },

    classify_input: function(nn_id, input) {

        var nn = this.nn_exists(nn_id);
        
        if(!nn) {
            return;
        }

        this.classify_input_data = input;

        this.request_nn_classifier(nn_id);

    },

    add_label_with_data: function(nn_id, label) {

        r = {};
        r[label] = [this.classify_input_data];

        data_file = {
            target: {
                result: JSON.stringify(r)
            }
            
        }

        this.logger('Add label with data: ' + label);

        // register data at master
        // this is the public version, other clients may download
        this.process_uploaded_data(data_file, nn_id);

    },

    add_label: function(nn_id, label) {

        var nn = this.nn_exists(nn_id);
        
        if(!nn) {
            return;
        }

        this.logger('Add label (msg): ' + label);

        this.send_message_to_master('add_label', {
            label: label,
            nn: nn_id
        });

    },

    data_from_slave: function(d) {

        // send data to local or remote recipient

        data = d.data;
        destination = d.destination;
        nn = d.nn;
        server = d.server;
        boss = d.boss;

        slave = this.slave_by_id(destination);

        if(slave) {
            // destination is local slave

            this.message_to_slave(slave, 'download_data', {
                data: data,
                nn: nn
            });

            // immediately report to master.
            this.send_message_to_master('register_data', {
                data: data,
                destination: destination,
                nn: nn
            });

        } else {
            // destination is remote slave
            // use server to send efficiently.

            // send in batches of 100

            frames = Math.ceil(data.length / 100);

            var i;
            for(i = 0; i < frames; i++) {

                start = i * 100;
                end = (i+1) * 100;

                this.socket.emit("proxy_data", {
                    server: server,
                    socket: boss,
                    data: {
                        type: 'upload_to_slave',
                        destination: destination,    
                        nn: nn,
                        data: data.slice(start, end)
                    }
                    
                });

            }

        }

    },

    get_data_from_slave: function(slave, nn, destination, server, boss, data) {

        this.message_to_slave(slave, 'send_data_to_boss', {
            nn: nn,
            data: data,
            destination: destination,
            server: server,
            boss: boss
        });

    },

    data_assignment: function(d) {

        sender = d.sender;
        recipient = d.recipient;
        boss = d.boss;
        server = d.server;
        data = d.data;
        nn = d.nn;

        slave = this.slave_by_id(sender);

        this.logger(sender + " > Data assignment: " + data.length + " points to " + recipient);
        
        if(!slave) {
            // only possible if slave left after master assigned data.
            this.logger(sender + " ! Data assignment failed: sender not here.");
            return
        } 

        this.get_data_from_slave(slave, nn, recipient, server, boss, data);

    },

    upload_to_slave: function(d) {

        destination = d.destination;
        nn = d.nn;
        data = d.data;

        slave = this.slave_by_id(destination);

        if(!slave) {
            // only possible if slave left after master assigned data.
            this.logger(this.id + " ! Data assignment failed: recipient not here: " + destination);
            return
        }

        this.message_to_slave(slave, 'download_data', {
            data: data,
            nn: nn
        });
        
        // immediately report to master.
        this.send_message_to_master('register_data', {
            data: data,
            destination: destination,
            nn: nn
        });

    },

    upload_data_index: function(data) {

        index = data.index;

        var j = this.new_data.length;

        var i;
        
        // FOWARD loop
        for(i = 0; i < j; i++) {
            this.new_data[i].id = index + i;
        }

        // move to slave
        this.upload_to_slave({
            destination: this.upload_slave.id,
            nn: this.upload_nn,
            data: this.new_data
        });

        this.new_data = null;
        this.upload_slave = null;
        this.upload_nn = null;


    },

    process_uploaded_data: function(file, nn) {

        newData = JSON.parse(file.target.result);

        parsedData = [];

        for(var key in newData) {

            var data = newData[key];
            var i = data.length;
            while(i--) {

                parsedData.push({
                    label: key,
                    data: data[i]
                })

            }

            // tell master of (new) labels
            this.add_label(nn, key);

        }

        var msg = "File select not OK.";
        if(parsedData.length) {
            msg = "File select OK, length: " + parsedData.length;
        }

        this.logger(msg);

        this.new_data = parsedData;

        slaves_with_nn = this.slaves_by_nn(nn);

        // select slave round robin base to upload
        if(slaves_with_nn[this.round_robin] == undefined) {
            this.round_robin = 0;
        }

        slave = slaves_with_nn[this.round_robin];

        this.round_robin++;

        this.upload_slave = slave;
        this.upload_nn = nn;

        this.logger('Uploading to slave: ' + slave.id)

        this.send_message_to_master('upload_data', {
            nn: nn,
            size: this.new_data.length,
            slave: slave.id
        })


    },

    handle_file_upload: function(nn, files) {

        var that = this;

        if(this.newData) {
            this.logger("Cannot upload new data: an upload is still in progress.");
            return
        }

        slaves_with_nn = this.slaves_by_nn(nn.id);

        if(!slaves_with_nn.length) {
            this.logger("Cannot upload new data: no workers added to NN.");
            return
        }

        // Loop through the FileList and render image files as thumbnails.
        for (var i = 0, f; f = files[i]; i++) {

            var reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = (function(theFile) {
                return function(e) {
                    that.process_uploaded_data(e, nn.id);
                };
            })(f);

            // Read in the image file as a data URL.
            reader.readAsText(f);
        
        }
    
    },

    add_nn: function(conf) {

        this.send_message_to_master('add_nn', conf);

    },

    message_from_master: function(data) {

        if(data.type == 'boss_id') {
            this.set_boss_id(data.data);
        } else if(data.type == 'data_assignment') {
            this.data_assignment(data);
        } else if(data.type == 'upload_data_index') {
            this.upload_data_index(data);
        } else if(data.type == 'update') {
            this.update_boss_info(data);
        

        } else if(data.type == 'upload_to_slave') {

            // this is a special case, where the message is not from 'master'
            // but from boss->server->server->boss communication.

            this.upload_to_slave(data);
        } else if(data.type == 'send_stats') {
            this.update_stats(data);
        } else if(data.type == 'download_parameters') {
            this.download_parameters(data);
        } else if(data.type == 'upload_parameters_complete') {
            this.upload_parameters_complete();
        } else if(data.type == 'receive_nn_classifier') {
            this.receive_nn_classifier(data.data);
        }

    },

    send_message_to_master: function(type, data) {

        this.socket.emit("message", {type: type, data: data});

    },

    message_from_slave: function(that, e) {

        type = e.data.type;
        data = e.data.data;

        if(type == 'slave_id') {
            // do inline, because socket is available (in 'this')
            that.id = data;
            this.logger('Slave active with id: ' + data);
        } else if(type == 'logger') {
            this.logger(data);
        }  else if(type == 'data_from_slave') {
            this.data_from_slave(data);
        }

    },

    message_to_slave: function(slave, type, data) {

        slave.postMessage({
            type: type,
            data: data
        });

    },

    new_worker_instance: function(slave, cb) {

        slave = new Worker('webworker.js');
        return cb(slave);

    },

    start_slave: function(nn) {

        var that = this;
        var slave;

        if(!this.id) {
            this.logger('! Cannot start slave: not connected to server.');
            return;
        }

        if(!this.nn_exists(nn)) {
            this.logger('! Cannot start slave: NN does not exist: ' + nn);
            return;   
        }

        this.new_worker_instance(slave, function(slave) {

            slave.onmessage = function(e) { that.message_from_slave(this, e); }

            that.message_to_slave(slave, 'start', {
                boss_id: that.id,
                nn: nn,
                host: that.host,
                portMin: that.portMin,
                portMax: that.portMax
            });

            slave.nn = nn;

            that.slaves.push(slave);

        });

        

    },

    start_boss: function() {

        if(this.running) {
            this.logger('Client already started.');
            return;
        }

        var that = this;

        $.ajax({
          url: "/server_settings/",
        }).done(function(data) {
          
            that.portMin = data.portMin;
            that.portMax = data.portMax;

            that.port = Math.floor(Math.random() * (that.portMax - that.portMin + 1)) + that.portMin;
            that.host = data.location;

            that.socket = io(that.host + ':' + that.port);
            
            that.socket.on('message', function (d) { that.message_from_master(d); });

            that.send_message_to_master('new_boss', null);

            that.logger("Client connected");

        });

        

    }
}

if(typeof(module) !== 'undefined') {
    module.exports = Client;
}