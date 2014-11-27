importScripts('/static/js/webworker/jszip.js');

var Downloader = function() {

	this.boss_id;
	this.imagehost;

	this.download_queue = [];

	this.working = false;

}

Downloader.prototype = {

	logger: function(text) {
        t = 'Downloader > ' + text;
        this.send_message_to_boss('logger', t);
    },

	start: function(data) {

		this.boss_id = data.boss_id;
		this.imagehost = data.imagehost;

		this.logger('worker started.');

	},

	download: function(data) {

		this.download_queue.push(data);
		
		if(!this.working) {
			this.process_download_queue();
		}

	},

	process_download_queue: function() {

		var that = this;

		if(!this.download_queue.length) {
			return;
		}

		if(this.working == true) {
			return;
		}

		this.working = true;
		
		var task = this.download_queue.shift();

		var xhr = new XMLHttpRequest();

		xhr.open('POST', this.imagehost + '/download/', true);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.responseType = 'arraybuffer';

		xhr.onload = function() {
			
			that.logger('Download complete: ' + task.ids.length + ' points for worker ' + task.destination);
			
			that.port.postMessage({
				type: 'data_for_slave',
				data: {
					data: this.response,
					slave_id: task.destination
				}
			}, [this.response]);

			that.working = false;
			
		}

		that.logger('Starting download for ' + task.ids.length + ' points for worker ' + task.destination);

		xhr.send(JSON.stringify({
			ids: task.ids
		}));

	},

	continue_work: function() {

		this.process_download_queue();

	},

	send_message_to_boss: function(type, data) {
        
	    this.port.postMessage({
	        type: type,
	        data: data
	    })

	},

	message_from_boss: function(e) {
        
        data = e.data;

        if(data.type == 'start') {
            this.start(data.data);
        } else if(data.type == 'download') {
        	this.download(data.data);
        } else if(data.type == 'continue') {
        	this.continue_work();
        }
        
    }

}

var downloader = new Downloader();

downloader.port = this;

onmessage = function(e) { downloader.message_from_boss(e); }