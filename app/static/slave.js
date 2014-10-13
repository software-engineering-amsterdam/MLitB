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
    this.is_initialised;

    this.is_train = true;

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

        // frame data

        var frames = Math.ceil(result.length / 1000);

        var i;
        for(i = 0; i < frames; i++) {

            start = i * 1000;
            end = (i+1) * 1000;

            this.send_message_to_boss('data_from_slave', {
                data: result.slice(start, end),
                destination: destination,
                server: server,
                boss: boss,
                nn: nn
            });         

        }

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
        new_labels = d.new_labels;

        is_train = d.is_train; // only for headless configurations
        
        is_ever_train_false = d.is_ever_train_false;
        drop_last_layer = d.drop_last_layer;
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

                that.Net = new that.mlitb.Net();
                that.Net.createLayers(configuration);

                if(new_labels.length) {
                    that.Net.addLabel(new_labels);
                }

                new_labels=[];

                if(parameters) {

                    var pl = parameters.parameters.length;

                    var newpar = that.Net.getParams(true);
                    var nl = newpar.length;

                    if (drop_last_layer){
                        
                        //need to use parameter from the random one, discard the pretrained param for the last param and bias

                        parameters.parameters[pl-2]=newpar[nl-2]; //param
                        parameters.parameters[pl-1]=newpar[nl-1]; //bias
                    } else {
                        
                        // if there's new added label, then the number of param will not the same with the pretrained
                        // merge the pretrained+new random param.
                        if (parameters.parameters[pl-2].length !== newpar[nl-2].length){
                            
                            //there is new added label
                            //merge param
                            for (var i = parameters.parameters[pl-2].length; i<newpar[nl-2].length;i++){
                                parameters.parameters[pl-2].push(newpar[nl-2][i]);   
                            }
                            
                            //merge bias
                            for (var i = parameters.parameters[pl-1].length; i<newpar[nl-1].length;i++){
                                parameters.parameters[pl-1].push(newpar[nl-1][i]);   
                            }
                            
                        }
                    }

                }

            }

            // add new labels, if there are any
            if(new_labels.length) {
                that.Net.addLabel(new_labels);
            }

            vol_input = configuration[0];

        }

        learn = function() {

            if (parameters != null) {

                if(is_ever_train_false && that.is_train) {
                    that.Net.setParams(parameters.parameters, true);
                    that.is_train = false;

                } else { 

                    // copy the parameters and gradients
                    that.Net.setParams(parameters.parameters);

                }

            }

            while(true) {

                if(!workingset.length) {
                    shuffle_data();
                }

                point = workingset.pop();

                Input = new that.mlitb.Vol(vol_input.sx, vol_input.sy, vol_input.depth, 0.0);
                Input.data = point.data;
                that.Net.forward(Input,true);

                newerr = that.Net.backward(point.label);

                error += newerr;
                
                nVector++;

                current_time = (new Date).getTime();

                if(current_time > (start_time + iteration_time)) {
                    return;
                }

            }

        }

        reduction = function() {
            
            // PROBLEM parameters never null
            // if (parameters == null){
            //let's use step=0, is that correct ?

            if (step == 0){
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

            console.log(' $ error: ' + error);

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

        host = data.host;
        portMin = data.portMin;
        portMax = data.portMax;

        port = Math.floor(Math.random() * (portMax - portMin + 1)) + portMin;

        this.boss_id = id;
        this.start_socket(id, host, port);
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

if(typeof(module) !== 'undefined') {
    module.exports = Slave;
}