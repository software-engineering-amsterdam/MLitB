/* 
	needs to be inherited by native worker instance
	
	functions to be inherited:
	- start_socket(boss_id) : connection with master
	- send_message_to_boss(type, data) : message to boss
	- send_message_to_master(type, data) : message to master 

	== JS LOGIC ONLY ==
	== DO NOT USE APIs NOT SUPPORTED BY NodeJS OR VICE VERSA ==

*/

var Slave = function() {
	this.id;
	this.boss_id;

	this.data = {};

	this.Net; // the NN
	this.is_initialised

}

Slave.prototype = {

	logger: function(text) {
		t = this.id + ' > ' + text;
		this.send_message_to_boss('logger', t);
	},

	get_data: function(ids, nn) {

		// speed improvements are welcome.
		// if ids are sorted it may be faster with large data stores.

		// for now: run over local data once, check every point in request id array.
		// reverse may work as well, might be faster or not, i do not know.
		// intersections are bad for blood pressure.

		result = [];

		i = this.data[nn].length;

		while(i--) {

			j = data.length;

			while(j--) {

				if(ids[j] == this.data[nn][i].id) {
					result.push(this.data[nn][i]);
				}

			}

		}

		return result;

	},

	set_slave_id: function(id) {
		
		this.id = id;
		this.send_message_to_boss('slave_id', id);

	},

	send_data_to_boss: function(d) {

		nn = d.nn;
		data = d.data;
		destination = d.destination;
		server = d.server;
		boss = d.boss;

		result = this.get_data(data, nn);

		this.send_message_to_boss('data_from_slave', {
			data: result,
			destination: destination,
			server: server,
			boss: boss,
			nn: nn
		});

	},

	download_data: function(d) {
		// from boss to this slave

		data = d.data;
		nn = d.nn;

		if(!(nn in this.data)) {
			this.data[nn] = [];
		}

		this.data[nn] = this.data[nn].concat(data);

		this.logger('Download complete: ' + data.length + ' points');

	},

	work: function(d) {

		var that = this;

		// start time immediately
		var start_time = (new Date).getTime();

		data = d.data;
		iteration_time = d.iteration_time - 10; // subtract 10MS for spare time, to do reduction step.
		configuration = d.configuration;
		parameters = d.parameters;
		nn = d.nn;
		step = d.step;

		var vol_input;
		var workingset = [];

		var error = 0.0;
    	var nVector = 0;
    	var proceeded_data = [];

		shuffle = function(o){
		    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
		    return o;
		};

		shuffle_data = function() {

		    workingset = that.data[nn].filter(function(e) {
		        return (data.indexOf(e.id) > -1);
		    });

		    workingset = shuffle(workingset);

		}

		initialise = function() {

			if(step == 0) {
				// happens only once, at very first step of NN
				that.is_initialised = false;
			}

			if(!that.is_initialised) {

				// squish configuration
				conf = [];
				for(var i = 0; i < configuration.length; i++) {
					layer = configuration[i].conf;
					layer.type = configuration[i].type;
					conf.push(layer);
				}

				that.Net = new mlitb.Net();
      			that.Net.createLayers(conf);
      			that.is_initialised = true;     

			}

			vol_input = configuration[0].conf;


		}

		learn = function() {

			if (parameters != null) {
		        // copy the parameters and gradients
		        that.Net.setParams(parameters.parameters);
		    }

			while(true) {

				if(!workingset.length) {
			        shuffle_data();
			    }

			    point = workingset.pop();

				Input = new mlitb.Vol(vol_input.sx, vol_input.sy, vol_input.depth, 0.0);
			    Input.data = point.data;
			    that.Net.forward(Input,true);
			    error += that.Net.backward(point.label);
			    nVector++;

			    current_time = (new Date).getTime();

			    if(current_time > (start_time + iteration_time)) {
			    	return;
			    }

			}

		}

		reduction = function() {

			if (parameters == null){
	          	param = [that.Net.getParams(), that.Net.getGrads()];
	          	param_type = 'params_and_grads';
	        } else {
	          	param = that.Net.getGrads();
	          	param_type = 'grads';
	        }

	        parameters = {
	          	parameters : param,
	          	parameters_type : param_type,
	          	error : error,
	          	nVector : nVector,
	          	proceeded_data : proceeded_data
	        };

	        that.logger(nVector.toString() + ' points processed');

			that.send_message_to_master('reduction', {
				slave: that.id,
				nn: nn,
				data: parameters
			});	

		}

		initialise();
		learn();
		reduction();

	},

	start: function(data) {

		id = data.boss_id;
		nn = data.nn;

		this.boss_id = id;
		this.start_socket(id);
		this.send_message_to_master('new_slave', { 
			boss_id: this.boss_id ,
			nn: nn
		});

	},

	message_from_master: function(data) {

		if(data.type == 'slave_id') {
			this.set_slave_id(data.data);
		} else if(data.type == 'work') {
			this.work(data);
		}

	},

	message_from_boss: function(e) {
        
	    data = e.data;

	    if(data.type == 'start') {
	        this.start(data.data);
	    } else if(data.type == 'download_data') {
	    	this.download_data(data.data);
	    } else if(data.type == 'send_data_to_boss') {
	    	this.send_data_to_boss(data.data);
	    }
	    
	}

}