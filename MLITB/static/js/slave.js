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
    this.nn_id;

    this.data = {};

    this.Net; // the NN
    this.is_initialised;

    this.is_train = true;

    this.labels = [];

    this.new_labels = [];

}

Slave.prototype = {

    logger: function(text) {
        t = this.id + ' > ' + text;
        this.send_message_to_boss('logger', t);
    },

    status: function(text) {
        this.send_message_to_boss('status', text);
    },

    download_data: function(data) {
        // from boss to this slave
        console.log('download_data');
        this.data[data.id] = {
            data: data.data,
            label: data.label
        }

        // check if this label is new. Should not exist in known label list, and newly added label list.
        if(this.labels.indexOf(data.label) == -1 && this.new_labels.indexOf(data.label) == -1) {
            this.labels.push(data.label);
            this.new_labels.push(data.label);
        }

    },

    work: function(d) {

        var that = this;
        
        this.send_message_to_boss('workingset', d.data.length);
        that.status('working');

        // start time immediately
        var start_time = (new Date).getTime();

        data = d.data;
        iteration_time = d.iteration_time - 10; // subtract 10MS for spare time, to do reduction step.

        parameters = d.parameters;
        step = d.step;
        
        new_labels = d.new_labels; 

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

            workingset = [];

            var i = data.length;

            while(i--) {
               
                workingset.push(that.data[data[i]]);

            }

            workingset = shuffle(workingset);

        }

        initialise = function() {
            console.log('step '+step);
            console.log('before par'+parameters.length);
            // parameters = parameters.slice(parameters.length-2,parameters.length);
            if (parameters != null) {

                // if(is_ever_train_false && that.is_train) {
                //     that.Net.setParams(parameters, true);
                //     that.is_train = false;

                // } else { 

                    // copy the parameters and gradients
                    that.Net.setParams(parameters);


                // }

            }

            if(new_labels.length) {

                var i = new_labels.length;
                while(i--) {
                    var label = new_labels[i];
                    // new label does not exist in new_labels or existing labels.
                    if(that.labels.indexOf(label) == -1 && that.new_labels.indexOf(label) == -1) {
                        that.labels.push(label);
                        that.new_labels.push(label);
                    }
                }

            }
            //if there's new added labels, in the middle of training, then we need to tell server
            //so server can accomodate these new parameters
            //we also need to send initial value for this parameters to server
            //how ?
            if(that.new_labels.length) {

                that.Net.addLabel(that.new_labels);

            }

            // if(parameters) {

                // var pl = parameters.length;

                // var newpar = that.Net.getParams(true);
                // var nl = newpar.length;

                // //we don't need this since we get the latest config
                // //from server
                // if (drop_last_layer){
                    
                //     //need to use parameter from the random one, discard the pretrained param for the last param and bias

                //     parameters[pl-2]=newpar[nl-2]; //param
                //     parameters[pl-1]=newpar[nl-1]; //bias

                // } else {
                    
                //     // if there's new added label, then the number of param will not the same with the pretrained
                //     // merge the pretrained+new random param.
                //     if (parameters[pl-2].length !== newpar[nl-2].length){
                        
                //         //there is new added label
                //         //merge param
                //         for (var i = parameters[pl-2].length; i<newpar[nl-2].length;i++){
                //             parameters[pl-2].push(newpar[nl-2][i]);   
                //         }
                        
                //         //merge bias
                //         for (var i = parameters[pl-1].length; i<newpar[nl-1].length;i++){
                //             parameters[pl-1].push(newpar[nl-1][i]);   
                //         }
                        
                //     }
                // }

            // } 

            vol_input = that.Net.conf[0];

        }

        learn = function() {

            

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
            // let's use step=0, is that correct ?

            if (step == 0){
                param = [that.Net.getParams(), that.Net.getGrads()];
                console.log('length of sent grad '+that.Net.getGrads()[0].length);
                console.log('length of sent grad '+that.Net.getGrads()[1].length);
                param_type = 'params_and_grads';

            } else if (that.new_labels.length){
                //meaning that we just added some labels in the middle of trainig (not in step 0)
                //we need to tell param server and send the initial value for newly added params
                param = [that.Net.getParams(), that.Net.getGrads()];
                param_type ='new_labels';
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
                nn_id: that.nn_id,
                parameters: parameters,
                new_labels: that.new_labels
            }); 

            that.new_labels = [];

        }

        initialise();
        learn();
        reduction();

        this.status('waiting for master');

    },

    download_configuration: function() {
        console.log('slave/download_configuration')
        var that = this;

        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'http://localhost:8000/download-nn/' + this.nn_id, true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

        xhr.onload = function () {

            var response = JSON.parse(this.response);
            // console.log(JSON.stringify(response.configs));
            // console.log(JSON.stringify(response.params.length));
            // console.log(JSON.stringify(response.label2index));
            // apply configuration
            // i.e. layer conf, params, labels, etc. etc.
            // is only once.
            that.Net.setConfigsAndParams(response);
            // console.log('just after set nn'+that.Net.layers[that.Net.layers.length-2].layer_type+' '+that.Net.layers[that.Net.layers.length-2].filters.data.length);


            //set initial this.labels
            that.labels = Object.keys(that.Net.label2index);
            // is_train = response.is_train; // only for headless configurations
            // is_ever_train_false = response.is_ever_train_false;
            // drop_last_layer = response.drop_last_layer;

            // console.log('extra params');
            // console.log('is train:');
            // console.log(is_train);
            // console.log('is ever train false:');
            // console.log(is_ever_train_false);
            // console.log('drop last layer:');
            // console.log(drop_last_layer);
            

            that.logger('Downloading NN configuration done.');
            that.status('waiting for task');

            console.log(that.Net);

        }

        this.logger('Downloading NN configuration');
        this.status('downloading configuration');
        xhr.send();

        

    },

    set_slave_id: function(id) {
        
        this.id = id;
        this.send_message_to_boss('slave_id', id);

        // start empty Net
        this.Net = new mlitb.Net();

        this.download_configuration();

    },

    start: function(data) {

        id = data.boss_id;
        this.nn_id = data.nn_id;

        this.boss_id = id;
        this.start_socket(id);

        this.send_message_to_master('new_slave', { 
            boss_id: this.boss_id ,
            nn: this.nn_id
        });

    },

    message_from_master: function(data) {

        if(data.type == 'slave_id') {
            this.set_slave_id(data.data);
        } else if(data.type == 'work') {
            this.work(data.data);
        }

    },

    message_from_boss: function(e) {
        
        data = e.data;

        if(data.type == 'start') {
            this.start(data.data);
        } else if(data.type == 'download_data') {
            this.download_data(data.data);
        } else if(data.type == 'remove') {
            this.remove();
        }
        
    }

}

if(typeof(module) !== 'undefined') {
    module.exports = Slave;
}