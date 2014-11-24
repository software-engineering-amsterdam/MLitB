var Boss = function(angular) {

    this.angular = angular;

    this.id;
    this.socket;

    this.host = 'http://localhost';
    this.port = 8000;

    this.running = false;

    this.slaves = [];

    this.nns = [];

    this.downloader = null; // the web worker for downloading data

    this.log = [];

}

Boss.prototype = {

    logger: function(t) {

        text = new Date().toLocaleString();
        text += ' > ';
        text += t
        text += '\n';

        this.log.push(text);
        this.log = this.log.slice(-100, 200);

        this.angular.apply();
    },

    nn_by_id: function(id) {

        var i = this.nns.length;
        while(i--) {
            if(this.nns[i].id == id) {
                return this.nns[i];
            }
        }

        return false;

    },

    nn_name_by_id: function(id) {

        return this.nn_by_id(id).name;

    },

    slave_by_id: function(slave_id) {

        var i = this.slaves.length;
        while(i--) {
            if(this.slaves[i].id == slave_id) {
                return this.slaves[i];
            }
        }

        return false;

    },

    slaves_by_nn_id: function(nn_id) {

        var filtered = this.slaves.filter(function(a) {
            return a.nn == nn_id;
        });

        return filtered;

    },

    number_of_nn_my_slaves_by_id: function(nn_id) {

        return this.slaves.filter(function(a) {
            return a.nn == nn_id;
        }).length;

    },

    change_status: function(slave, text) {

        slave.state = data;
        this.angular.apply();

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
        } else if(type == 'download_done') {
            this.download_done();
        } else if(type == 'status') {
            this.change_status(that, data);            
        }

    },

    message_to_slave: function(slave, type, data, buffer) {

        var buffer = (typeof buffer === "undefined") ? null : buffer;

        slave.postMessage({
            type: type,
            data: data
        }, buffer);

    },

    message_to_master: function(type, data) {

        this.socket.emit("message", {type: type, data: data});

    },

    new_slave_instance: function(slave, cb) {

        slave = new Worker('/static/js/webworker.js');
        return cb(slave);

    },

    start_slave: function(nn_id) {

        var that = this;
        var slave;

        if(!this.nn_by_id(nn_id)) {
            this.logger('! Cannot start slave: NN does not exist: ' + nn_id);
            return;   
        }

        this.new_slave_instance(slave, function(slave) {

            slave.onmessage = function(e) { that.message_from_slave(this, e); }

            that.message_to_slave(slave, 'start', {
                boss_id: that.id,
                nn_id: nn_id
            });

            slave.nn = nn_id;

            slave.state = 'idle';
            slave.data_cached = 0;
            slave.data_allocated = 0;

            that.slaves.push(slave);

            that.angular.apply();

        });

    },

    download_done: function() {
        // signal for the downloader to continue downloading.
        this.message_to_downloader('continue');
    },

    set_slave_status: function(data) {

        var id = data.slave_id;
        var status = data.status;

        var slave = this.slave_by_id(id);
        var nn = this.nn_by_id(slave.nn);

        slave.state = status;

        this.logger('Changed slave status at NN "' + nn.name + '" to "' + status + '"');

        //this.angular.apply();

    },

    data_assignment: function(data) {

        var slave = this.slave_by_id(data.slave_id);
        slave.data_allocated = data.data.length;

        this.logger('Data assignment for slave "' + data.slave_id + '": ' + data.data.length + ' points.');

        this.message_to_downloader('download', {
            destination: data.slave_id,
            ids: data.data
        });

        this.angular.apply();

    },

    save_hyperparameters: function(nn_id) {

        var nn = this.nn_by_id(nn_id);

        if(!nn) {
            this.logger('! Cannot update hyperparameters: NN does not exist: ' + nn_id);
            return;   
        }

        this.message_to_master('save_hyperparameters', {
            nn_id: nn_id,
            hyperparameters: nn.hyperparameters
        });

    },

    start_nn: function(nn_id) {

        var nn = this.nn_by_id(nn_id);

        if(!nn) {
            this.logger('! Cannot start NN: NN does not exist: ' + nn_id);
            return;   
        }

        this.message_to_master('start_nn', {
            nn_id: nn_id
        });

    },

    pause_nn: function(nn_id) {

        var nn = this.nn_by_id(nn_id);

        if(!nn) {
            this.logger('! Cannot pause NN: NN does not exist: ' + nn_id);
            return;   
        }

        this.message_to_master('pause_nn', {
            nn_id: nn_id
        });

    },

    reboot_nn: function(nn_id) {

        var nn = this.nn_by_id(nn_id);

        if(!nn) {
            this.logger('! Cannot reboot NN: NN does not exist: ' + nn_id);
            return;   
        }

        this.message_to_master('reboot_nn', {
            nn_id: nn_id
        });

    },

    add_data: function(nn_id, ids_raw) {

        var nn = this.nn_by_id(nn_id);

        if(!nn) {
            this.logger('! Cannot upload data to NN: NN does not exist: ' + nn_id);
            return;   
        }

        var ids = JSON.parse(ids_raw);

        this.message_to_master('add_data', {
            nn_id: nn_id,
            ids: ids.ids
        });

    },

    data_upload_done: function(data) {

        this.logger('Done uploading data: ' + data + ' points.');

    },

    init: function(id) {

        this.id = id;

        this.logger('Boss connected');

        this.socket.emit('message', {
            type: 'register_boss',
            data: ''
        });

    },

    list_nns: function(nns) {

        this.nns = nns;
        this.angular.apply();

    },

    message_from_master: function(d) {

        var type = d.type;
        var data = d.data;

        if(type == 'init') {
            this.init(data);
        } else if(type == 'logger') {
            this.logger(data);
        } else if(type == 'list_nns') {
            this.list_nns(data);    
        } else if(type == 'slave_status') {
            this.set_slave_status(data);
        } else if(type == 'data_assignment') {
            this.data_assignment(data);
        } else if(type == 'data_upload_done') {
            this.data_upload_done(data);
        }

    },

    add_nn: function(nn, location) {

        var that = this;

        var new_nn = new mlitb.Net();
        new_nn.addLayer(nn.configuration);

        var pkg = nn;
        pkg.nn = new_nn.getConfigsAndParams();
        pkg.boss = this.id;

        var xhr = new XMLHttpRequest();
        xhr.open('POST', this.host + ':' + this.port + '/add-nn/', true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

        xhr.onload = function () {

            that.logger('New neural added done.');

        }
            
        xhr.send(JSON.stringify(pkg));

    },

    slave_work: function(nn_id, slave_id) {

        var slave;

        if(!this.nn_by_id(nn_id)) {
            this.logger('! Cannot set slave to work: NN does not exist: ' + nn_id);
            return;   
        }

        if(!this.slave_by_id(slave_id)) {
            this.logger('! Cannot set slave to work: Slave does not exist: ' + slave_id);
            return;   
        }

        this.message_to_master('slave_work', {
            nn_id: nn_id,
            slave_id: slave_id
        });

    },

    remove_slave: function(slave_id) {

        var slave;

        slave = this.slave_by_id(slave_id);

        if(!slave) {
            this.logger('! Cannot remove slave: Slave does not exist: ' + slave_id);
            return;   
        }

        this.message_to_slave(slave, 'remove');

        var i = this.slaves.length;
        while(i--) {
            if(this.slaves[i].id == slave_id) {
                this.slaves.splice(i, 1);
                break
            }
        }

        this.angular.apply();

    },

    process_data: function(a, slave) {

        var that = this;

        var ids = [];

        var nn = this.nn_by_id(slave.nn);

        opop = function(obj) {
          for (var key in obj) {
            // Uncomment below to fix prototype problem.
            // if (!Object.hasOwnProperty.call(obj, key)) continue;
            var result = obj[key];
            // If the property can't be deleted fail with an error.
            if (!delete obj[key]) { throw new Error(); }
            return result;
          } 
        }

        process = function(a) {

            var file = opop(a);
            if(!file) {
                
                that.logger('Uploading data to worker done.');
                
                // report to master
                that.message_to_master('register_data', {
                    ids: ids,
                    slave_id: slave.id,
                    nn_id: slave.nn
                });

                slave.state = 'downloading done - waiting for master';
                that.angular.apply();

                that.download_done();
                return;
            }

            var id = parseInt(file.name.split('.')[0]);
            ids.push(id);

            var b = file.asUint8Array();

            var blob = new Blob([b], {'type': 'image/jpeg'});
            var url = URL.createObjectURL(blob);

            var img = new Image();

            img.src = url;

            img.onload = function() {

                var width = nn.configuration[0].sx;
                var height = nn.configuration[0].sy;

                var canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                var mpImg = new MegaPixImage(img);
                mpImg.render(canvas, {width: width, height: height});

                var context = canvas.getContext('2d');

                var data = context.getImageData(0, 0, width, height).data;

                // may remove alpha channel here later.
                // this is awful now, we just slice off the last 4th part.
                // fix this.
                // please never do this.

                data = data.subarray(0, (data.length / 4) * 3 );

                var tranferobject = {
                    id: id,
                    data: data,
                    label: file.comment
                }

                that.message_to_slave(slave, 'download_data', tranferobject, [tranferobject.data.buffer]);

                slave.data_cached += 1;

                img = null;
                blob = null;
                url = null;
                mpImg = null;
                context = null;
                canvas = null;

                process(a);

            }

        }

        process(a);

    },

    data_for_slave: function(data) {

        var slave_id = data.slave_id;
        var data = data.data;

        var slave = this.slave_by_id(slave_id);

        if(!slave) {
            this.logger('! Cannot transfer data to slave: Slave does not exist: ' + slave_id);
            
            // signal downloader to continue.
            this.download_done();

            return;   
        }

        slave.state = 'downloading data';
        this.angular.apply();

        var new_zip = new JSZip();
        new_zip.load(data);

        this.process_data(new_zip.files, slave);

    },

    new_downloader_instance: function(downloader, cb) {

        downloader = new Worker('/static/js/downloader.js');
        return cb(downloader);

    },

    message_to_downloader: function(type, data) {

        this.downloader.postMessage({
            type: type,
            data: data
        });

    },

    message_from_downloader: function(that, e) {

        type = e.data.type;
        data = e.data.data;

        if(type == 'logger') {
            this.logger(data);
        } else if(type == 'data_for_slave') {
            this.data_for_slave(data);
        }

    },

    start_downloader: function() {

        var downloader;
        var that = this;

        this.new_downloader_instance(downloader, function(downloader) {

            downloader.onmessage = function(e) { that.message_from_downloader(this, e); }

            that.downloader = downloader;

            that.message_to_downloader('start', {
                boss_id: that.id
            });

            
        });

    },

    start: function() {

        var that = this;

        if(this.running) {
            this.logger('Boss is already connected');
            return;
        }

        this.socket = io.connect();

        this.socket.on('message', function (d) { that.message_from_master(d); });

        this.start_downloader();

    }

};

if(typeof(module) !== 'undefined') {
    module.exports = Boss;
}