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

    this.host;

    this.data = {};

    this.Net; // the NN
    this.is_initialised;

    this.step = 0;

    this.is_train = true;

    this.labels = [];

    this.new_labels = [];

    this.is_track = false;
    this.is_stats = false;
    this.stats_running = false;
    this.point_list = {};
    this.prev_data = {};
    this.iteration_time;

    this.working_time = 0;
    this.total_working_time = 0;
    this.working_power = 0;
    this.total_working_power = 0;
    this.working_data = [];

    this.point_list = {};

    this.send_param_time = 0;
    this.receive_param_time = 0;

}

Slave.prototype = {

    logger: function(text) {
        t = this.id + ' > ' + text;
        this.send_message_to_boss('logger', t);
    },

    status: function(text) {
        this.send_message_to_boss('status', text);
    },

    obj_to_list: function(files) {

        var list = [];

        var r = Object.keys(files);

        var i = r.length;
        while(i--) {
            list.push(files[r[i]]);
        }

        return list;

    },

    download_data: function(data) {
        // from boss to this slave
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

    download: function() {

        var net = this.Net.getConfigsAndParams();

        this.send_message_to_boss('download_parameters', { 
            data: net
        });

    },

    new_parameters: function(d) {

        console.log(' $$ slave got new parameters');

        this.receive_param_time = new Date().getTime();

        var data = JSON.parse(d);

        var parameters = data.parameters;
        var new_labels = data.new_labels;
        var job = data.job;

        console.log(this.id+' '+JSON.stringify(job));
        // this.step = Math.max(this.step,data.step);

        this.send_message_to_boss('worker_stats', {
            worker_power: job.power,
        });
        

        var newL = new_labels.length;
        var oldL = Object.keys(this.Net.label2index).length;
        if (newL> oldL){
            //if there's any difference in label length, than add new
            //this should be enough, no need to do any further checking
            //since we can only addLabel and not remove label,
            //the order should be consistent from the neuralnetwork.js
            var addedLabel = new_labels.slice(oldL,newL);
            if(addedLabel.length) {
                console.log(this.id+' adding labels '+JSON.stringify(addedLabel));

                this.Net.addLabel(addedLabel);
            }

        } else if (newL<oldL){
            console.log(' Something is wrong, new labels size is smaller');
        }

        // this.logger('parameters[0][0] '+parameters.length+' '+parameters[parameters.length-1].length);
        if (this.step > 0) {

            this.Net.setParams(parameters);

        }

        console.log(' $$ parameters set.');

        if(this.is_track) {
            this.status('tracking: ' + step);
        }

        if(this.is_stats == true && this.stats_running == false) {
            return this.stats(step);
        }

        if (job){
            this.work(job);    
        } else {
            //no job because there's no data in here
            this.status('waiting for data to arrive');
            return;
        }
        

        // if(this.waiting_for_parameters == true) {

        //     this.waiting_for_parameters = false;

        //     console.log(' $$ release to work');

        //     this.work(this.wait_parameters);

        // }
        
    },


    classify: function(data) {

        var vol_input = this.Net.conf[0];

        var Input = new mlitb.Vol(vol_input.sx, vol_input.sy, vol_input.depth, 0.0);
        Input.data = data.data;
        this.Net.forward(Input);
        var results = this.Net.getPrediction().data;

        var labeledResults = [];

        var j = results.length;
        while(j--) {
            labeledResults.push([j, this.Net.index2label[j], results[j].toFixed(6)]);
        }

        labeledResults = labeledResults.sort(function(a,b) {
            return b[2] - a[2];
        });

        this.send_message_to_boss('classify_results', labeledResults);

    },

    stats: function(step) {

        var that = this;

        this.stats_running = true;

        var data = this.obj_to_list(this.data);

        var i = data.length;

        var error = 0.0;
        var nVector = 0;
        var vol_input = this.Net.conf[0];
        var pred;
        var max=0;

        while(i--) {

            point = data[i];

            Input = new this.mlitb.Vol(vol_input.sx, vol_input.sy, vol_input.depth, 0.0);
            Input.data = point.data;
            this.Net.forward(Input,true);
            // newerr = this.Net.backward(point.label);
            pred = this.Net.getPrediction().data;
            
            max = 0;
            for (var j = 1; j < pred.length; j++) {
                if (pred[j]>pred[max]){max = j}
            };
            
            if (point.label !== this.Net.index2label[max]){
                error += 1;    
            }
    
        }

        var error_pretty = (error / data.length) * 100.0;
        
        this.send_message_to_boss('stats_results', {
            step: step,
            error: error_pretty.toFixed(3)
        });
        
        // we need to clear the event queue.
        // i.e. to pass lagging updates.
        setTimeout(function() {
            that.stats_running = false;
        }, 100);

        
    },

    start_stats: function() {

        this.is_stats = true;

    },

    start_track: function() {

        this.is_track = true;

    },    

    // job: function(d) {

    //     this.send_message_to_boss('worker_stats', {
    //         worker_power: d.power,
    //     });

    //     // start time immediately
    //     // this.start_time = (new Date).getTime();

    //     var step = d.step;

    //     // IMPORTANT: it CANNOT work when the parameters are not downloaded yet by XHR!
    //     if(this.step < step) {
    //         this.waiting_for_parameters = true;
    //         this.wait_parameters = d;
    //         this.status('waiting for parameters');

    //         console.log(' $$ parameters NOT on time for work');

    //         return;
    //     }

    //     console.log(' $$ parameters on time for work');
    //     if (step==0)
    //         this.work(d);

    // },

    work: function(d) {

        var that = this;

        that.start_time = (new Date).getTime();
        if (d.working_data){ //if working_data is not undefined
            that.working_data = d.working_data;
        }

        that.working_power = d.working_power||100;
        var delay = d.delay||0;
        that.total_working_power += that.working_power;

        // var data = d.data;
        var data = [];
        if (that.working_data.length>Object.keys(that.data).length){
            var wl = that.working_data.length;
            for (var w=0;w<wl;w++){
                if (that.data[that.working_data[w]]){
                    data.push(that.working_data[w]);
                }
            }
        } else {
            data = that.working_data;
        }
        
        // console.log('data : '+JSON.stringify(data));

        // var idx;
        // if (that.step>100&& this.step%10==0)
        //     console.log(that.id+' point '+JSON.stringify(data));
        // var s = {};
        // var diff=0;
        // for (var dd=0;dd<data.length;dd++){
        //     idx = data[dd];
        //     s[idx]=1;
        //     // that.point_list[idx]=(that.point_list[idx]||0)+1;    
        //     if (!that.prev_data[idx]){
        //         diff +=1;
        //     }
        // }
        // console.log('point diff '+diff+' / '+data.length+' / '+Object.keys(that.data).length);
        // that.prev_data = s;
        
        // var new_labels = d.new_labels;
        // console.log('point d.new_labels '+JSON.stringify(new_labels));
        if (!this.iteration_time && d.iteration_time){
            this.iteration_time = parseInt(d.iteration_time);
        }
        // var iteration_time = d.iteration_time - 10; // subtract 10MS for spare time, to do reduction step.
        var iteration_time = this.iteration_time;// + Math.floor(Math.random() * 2000) + 1000;
        // console.log('iteration time '+parseInt(iteration_time));
        // var time = (new Date).getTime();

        // console.log(' $$ time loss due to parameter download delay:'+ (time - this.start_time)+ 'MS');

        this.send_message_to_boss('workingset', data.length);
        that.status('working');
        
        var workingset = [];

        var vol_input = that.Net.conf[0];
        var error = 0.0;
        var nVector = 0;
        // var proceeded_data = [];

        shuffle = function(o){
            for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
            return o;
        };

        shuffle_data = function() {
            
            workingset = shuffle(data.slice());

        }

        sleepFor = function( sleepDuration ){
            var now = new Date().getTime();
            while(new Date().getTime() < now + sleepDuration){ /* do nothing */ } 
        }



        learn = function() {
            var time = (new Date).getTime();
            while(that.working_power--) {

                if(!workingset.length) {
                    shuffle_data();
                }

                while(workingset.length){
                    point_id = workingset.pop()
                    point = that.data[point_id];
                    if (point){
                        break;
                    }    
                }

                if (!point){
                    that.working_power++;
                    continue;
                }
                

                Input = new that.mlitb.Vol(vol_input.sx, vol_input.sy, vol_input.depth, 0.0);
                Input.data = point.data;
                that.Net.forward(Input,true);
                newerr = that.Net.backward(point.label);

                error += newerr;
                
                nVector++;

                sleepFor(delay);

                that.point_list[point_id] = 1;



                // current_time = (new Date).getTime();

                // console.log('time ' + current_time > (that.start_time + iteration_time));

                // if(current_time > (that.start_time + iteration_time)) {
                //     // var pp=Object.keys(that.point_list);
                //     // console.log(that.id+' point list total '+JSON.stringify(pp)+' -- '+pp.length+'/'+data.length);
                //     // console.log('return');
                //     return;
                // }

            }

            that.working_time = (new Date).getTime() - time;
            that.total_working_time+=that.working_time;


            // var pp=Object.keys(that.point_list);
            // console.log(that.id+' point list total '+JSON.stringify(pp)+' -- '+pp.length+'/'+data.length);

        }

        partial_param = function(param, indexing, method, how_many){
            //method  : sort/random
            //indexing : local/global
            local_indexing = function(param){
                var indexed_param = [];
                for (var i=0, len=param.length;i<len;i++){
                    var row = param[i];
                    var new_row = [];
                    for (var j=0;j<row.length;j++){
                        new_row.push([j,row[j]]);
                    }
                    indexed_param.push(new_row);
                }
                
                return indexed_param;
            }

            global_indexing = function(param){
                var indexed_param = [];
                var idx = 0;
                for (var i=0, len=param.length;i<len;i++){
                    var row = param[i];
                    for (var j=0, rlen=row.length;j<rlen;j++){
                        indexed_param.push([idx,row[j]]);
                        idx++;
                    }
                }
                
                return indexed_param;   
            }

            param_sort = function(a,b){
                return Math.abs(b[1])-Math.abs(a[1]);
            }

            sort_param = function(param){
                for (var i=0;i<param.length;i++){
                    param[i].sort(param_sort);    
                }
                return param;
            }

            shuffle_param = function(param){
                shuffled = [];
                for (var i=0;i<param.length;i++){
                    shuffled.push(shuffle(param[i]));    
                }
                return shuffled;
            }

            cut_param = function(param, how_many, indexing){
                //if how_many is integer, than it's top n
                //if it's float, then it's top n%

                var cut_param = [];

                if (indexing == 'global'){
                    var th = how_many;
                    if (how_many %1 != 0){
                        th = Math.round(how_many*param.length);
                    } 
                    cut_param = param.slice(0,th);
                } else {
                    for (var i=0, len=param.length;i<len;i++){
                        var th = how_many;
                        if (how_many %1 != 0){
                            th = Math.round(how_many*param[i].length);
                        } 
                        cut_param.push(param[i].slice(0,th));
                    } 
                }
                
                return cut_param;
            }

            if (indexing=='global'){
                param = global_indexing(param);
                that.logger('param length '+param.length);
                // that.logger('global indexing length '+param.length+' value '+JSON.stringify(param.slice(param.length-10,param.length)));
            } else {
                //default
                param = local_indexing(param);
                // that.logger('local indexing length '+param[param.length-1].length+' value '+JSON.stringify(param[param.length-1].slice(param[param.length-1].length-10,param[param.length-1].length)));
            }

            if (method=='sort'){
                if (indexing=='local')
                    param = sort_param(param);
                else
                    param.sort(param_sort);
            } else {
                //default
                if (indexing=='local')
                    param = shuffle_param(param);
                else
                    param = shuffle(param);
            }
            // if (indexing=='global'){
            //     that.logger('sort/shuffle length '+param.length+' value '+JSON.stringify(param.slice(0,10)));
            // } else {
            //     that.logger('sort/shuffle length '+param[param.length-1].length+' value '+JSON.stringify(param[param.length-1]));    
            // }
            
            
            param = cut_param(param, how_many,indexing);
            // if (indexing=='global'){
            //     that.logger('cut length '+param.length+' value '+JSON.stringify(param.slice(0,6)));
            // } else {
            //     that.logger('cut length '+param[param.length-1].length+' value '+JSON.stringify(param[param.length-1].slice(0,6)));    
            // }
            return param;
            
        }

        clone_parameter= function(param){
            var newParam = [];
            for (var i=0;i<param.length;i++){
                newParam.push(param[i].slice(0));
            }
            return newParam;
        }

        reduction = function() {

            var param = that.SGD.reduce(nVector);
            // var param = that.Net.getParams();
            var grads = that.Net.getGrads();

            var indexing = 'local';
            var method = 'sort';
            var threshold = 0.30;
            grads = partial_param(grads,indexing,method,threshold);


            var cut_param = [];
            var idx;
            if (indexing=='local'){
                
                for (var i=0,len=grads.length;i<len;i++){
                    
                    var row_grad = grads[i];
                    var row_par = param[i];
                    var temp_row = [];
                    for (var j=0,jlen=row_grad.length;j<jlen;j++){
                        idx = row_grad[j][0];
                        temp_row.push([idx,row_par[idx]])
                    }
                    cut_param.push(temp_row);
                }
            }
            else if (indexing=='global'){
                var new_param=[];
                for (var i=0;i<param.length;i++){
                    new_param = new_param.concat(param[i].slice());
                }
                param = new_param;

                for (var i=0,len=grads.length;i<len;i++){
                    idx = grads[i][0];
                    cut_param.push([idx,param[idx]]);
                }
            }
            
            console.log('cut param '+JSON.stringify(cut_param));
            // console.log('cut '+JSON.stringify(cut_param));
            // param = that.Net.getGrads();
            that.step++;
            var wait_time = that.receive_param_time - that.send_param_time;
            parameters = {
                parameters : cut_param,
                error : error,
                nVector : nVector,
                step : that.step,
                slave_id : that.id,
                working_time : that.working_time,
                timestamp : new Date().getTime(),
                wait_time : wait_time
            };

            that.send_param_time = new Date().getTime();

            console.log(that.id+' $ error: ' + error+' vector '+nVector);

            that.logger(nVector.toString() + ' points processed, '+that.working_data.length.toString()+' working data, '+Object.keys(that.point_list).length.toString()+' unique data');

            that.send_message_to_master('reduction', {
                slave: that.id,
                nn_id: that.nn_id,
                parameters: parameters //,
                //new_labels: that.new_labels
            }); 
            // this.step++;
            // that.download_new_parameters();

            

        }

        console.log('step '+ this.step);

        learn();
        reduction();

        this.status('waiting for master');

    },

    download_configuration: function() {
        console.log('slave/download_configuration')
        var that = this;

        var xhr = new XMLHttpRequest();
        xhr.open('GET', this.host + '/download-nn/' + this.nn_id, true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

        xhr.onload = function () {

            var response = JSON.parse(this.response);

            // apply configuration
            // i.e. layer conf, params, labels, etc. etc.
            // is only once.
            that.Net.setConfigsAndParams(response.net);
            var par=that.Net.getParams();
            // that.logger('param [0][0] '+par.length+' '+par[par.length-1].length);
            console.log(JSON.stringify(response.net.configs));
            // console.log('just after set nn'+that.Net.layers[that.Net.layers.length-2].layer_type+' '+that.Net.layers[that.Net.layers.length-2].filters.data.length);


            // set initial this.labels
            that.labels = Object.keys(that.Net.index2label);
            // console.log('labels after set '+JSON.stringify(that.labels));

            that.step = response.step;

            that.logger('Downloading NN configuration done.');
            that.status('waiting for task');

            // that.new_parameters(JSON.stringify({step: 0, parameters : [], new_labels :[]}));

            //console.log(that.Net);

        }

        this.logger('Downloading NN configuration');
        this.status('downloading configuration');
        xhr.send();

        

    },

    download_new_parameters: function(d) {
        // download NN parameters by XHR
        // this.chunk = d.chunk;
        // this.step = d.step;
        var that = this;

        var xhr = new XMLHttpRequest();
        xhr.open('GET', this.host + '/nn-parameters/' + this.nn_id + '/'+this.id, true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        // xhr.setRequestHeader("Connection", "keep-alive");

        console.log( ' $$ slave downloading new parameters');

        xhr.onload = function () {

            console.log( ' $$ parameter download done');

            var response = this.response;
            that.new_parameters(response);
            // send to all associated workers for this nns

            

        }
            
        xhr.send();

    },

    disconnect: function() {

        this.logger('Worker terminated');
        this.status('terminated');

    },

    set_slave_id: function(id) {
        
        this.id = id;
        this.send_message_to_boss('slave_id', id);

        // start empty Net
        this.Net = new mlitb.Net();
        this.SGD = new mlitb.SGDTrainer(this.Net, {});

        this.download_configuration();

    },

    start: function(data) {

        id = data.boss_id;
        this.nn_id = data.nn_id;
        this.host = data.host;

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
        } else if(data.type == 'job') {
            this.job(data.data);
        } else if(data.type == 'ping') {
            this.send_message_to_master('pong');
        } else if (data.type =='parameters'){
            this.download_new_parameters();
        }

    },

    message_from_boss: function(e) {
        
        data = e.data;

        if(data.type == 'start') {
            this.start(data.data);
        } else if(data.type == 'download_data') {
            this.download_data(data.data);
        } else if(data.type == 'parameters') {
            this.new_parameters(data.data);
        } else if(data.type == 'remove') {
            this.remove();
        } else if(data.type == 'download') {
            this.download();
        } else if(data.type == 'classify') {
            this.classify(data);
        } else if(data.type == 'start_stats') {
            this.start_stats();
        } else if(data.type == 'start_track') {
            this.start_track();
        }
        
    }

}

if(typeof(module) !== 'undefined') {
    module.exports = Slave;
}