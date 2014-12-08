var app = angular.module('mlitb', ['ngRoute', 'ui.sortable']);

app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
    when('/join', {
        templateUrl: 'partials/join.html',
        controller: 'join'
    }).
    when('/new', {
        templateUrl: 'partials/new.html',
        controller: 'new'
    }).
    when('/new-file', {
        templateUrl: 'partials/new-file.html',
        controller: 'new-file'
    }).
    when('/stats/:nnId', {
        templateUrl: 'partials/stats.html',
        controller: 'stats'
    }).
    when('/public/:nnId', {
        templateUrl: 'partials/publicclient.html',
        controller: 'publicclient'
    }).
    otherwise({
        redirectTo: '/join'
    });
}]);

app.controller('publicclient', function ($scope, $routeParams, $rootScope, $location) {

    $scope.working = false;

    $scope.nn_id = $routeParams.nnId;

    $scope.nn = $scope.client.nn_exists($scope.nn_id);

    if(!$scope.nn) {
        $location.path('#/join');
    }

    $rootScope.classifier_results = function(arr) {
        
        $scope.classify_results = arr;

        $scope.working = false;

        $scope.$apply();

    }

    $scope.add_label = function() {

        $scope.client.add_label_with_data($scope.nn_id, $scope.new_label);

    }

    convert_image = function(image) {

        // rgbargbargba -> rrrgggbbb (drop a)
        var new_image = [];

        var r = [];
        var g = [];
        var b = [];

        // forward loop for readability
        // could do backwards aswell for speed.
        for(var i = 0; i < image.length; i++) {

            idx = i + 1;
            
            // normalize to -0.5 to 0.5
            // normalize 0-1
            // pixel = image[i] / 255.0; // - 0.5;
            pixel = image[i];
            if(idx % 4 == 0) {
                // skip alpha channel
                continue;
            }

            if(idx % 4 == 1) {
                // red channel
                r.push(pixel);
            } else if(idx % 4 == 2) {
                // green channel
                g.push(pixel);
            } else if(idx % 4 == 3) {
                // blue channel
                b.push(pixel);
            }

        }

        new_image = new_image.concat(r).concat(g).concat(b);

        $scope.client.classify_input($scope.nn_id, new_image);

    }

    getEXIF = function(f, cb) {

        var reader = new FileReader();

        reader.onload = function(file) {

            var exif, transform = "none";
            exif = EXIF.readFromBinaryFile(createBinaryFile(file.target.result));

            cb(exif, f);

        }

        reader.readAsArrayBuffer(f);

    }

    handleFileSelect = function(evt) {

        $scope.working = true;

        $scope.$apply();

        var files = evt.target.files; // FileList object

        // Loop through the FileList and render image files as thumbnails.
        for (var i = 0, f; f = files[i]; i++) {

            // Only process image files.
            if (!f.type.match('image.*')) {
                continue;
            }

            exif = getEXIF(f, function(exif, f) {

                var reader = new FileReader();

                // Closure to capture the file information.
                reader.onload = function(theFile) {

                    var image = new Image();
                    image.src = reader.result;

                    image.onload = function() {

                        width = 224; // change this to relevant size
                        height = 224; // change this to relevant size

                        var canvas = document.getElementById("image"); 
                        canvas.width = width;
                        canvas.height = height;

                        var mpImg = new MegaPixImage(image);
                        mpImg.render(canvas, { width: width, height: height, orientation: exif.Orientation });

                        var imageData = canvas.getContext("2d").getImageData(0, 0, width, height);

                        // image pixel data
                        // array, set up as [r,g,b,a,r,g,b,a, ...]
                        // thus each four numbers are 1 pixel
                        convert_image(imageData.data);

                    };

                };

                reader.readAsDataURL(f);

            });
        
        }
    }

    document.getElementById('picture').addEventListener('change', handleFileSelect, false);

});

app.controller('stats', function ($scope, $routeParams, $rootScope, $location) {

    $scope.nn_id = $routeParams.nnId;

    $scope.nn = $scope.client.nn_exists($scope.nn_id);

    if(!$scope.nn) {
        $location.path('#/join');
    }

    $scope.download_parameters_spinner = false;

    $scope.client.add_stats($scope.nn_id);

    var is_initialized = false;
    var discrete_loss, piece;
    var lastParameter;
    var testIteration = 0;
    var stats_ready = true;

    var errorchart;

    download_parameters = function(c) {

        var blob = new Blob([JSON.stringify(c)], {type: "application/json;charset=utf-8"});
        saveAs(blob, "parameters.json");

        $scope.download_parameters_spinner = false;

        $scope.$apply();

    }

    workerMessage = function(e) {

        if(e.data.type == 'download_parameters') {
            return download_parameters(e.data.data);
        }

        stats_ready = true;

        discrete_loss = e.data.data.discrete_loss;
        delta = e.data.data.delta;
        nData = e.data.data.nData;
        step = e.data.data.step;

        percentage = ((discrete_loss / nData) * 100.0).toFixed(3);

        $('span#step.error').html(step.toString());
        $('span#error').html(discrete_loss.toString()+"/"+nData.toString() + ' - ' + percentage.toString() + '%');
        $('span#delta').html(delta.toString());

        if(!errorchart) {
            errorchart = initChart(errorchart, '#chartcontainer', 'error rate', '#0000FF');
        }

        errorchart = drawChart(errorchart, [step, discrete_loss]);


    }

    initChart = function(chart, selector, name, color) {

      $(selector).highcharts({
        title: {
            text: null
        },
        yAxis: {
            title: {
                text: null
            },
            plotLines: [{
                value: 0,
                width: 1,
                color: color
            }]
        },
        xAxis: {
          minTickInterval: 1
      },
      series: [{
          data: [],
          name: name,
          color: color,
          point: {
              events: {
                  'click': function() {
                      if (this.series.data.length > 1) this.remove();
                  }
              }
          }
      }]
      });

      return $(selector).highcharts();

    }

  drawChart = function(chart, point) {

    series = chart.series[0];

    shift = false;
    if(series.data.length >= 2000) {
        shift = true;
    }

    chart.series[0].addPoint(point, true, shift);

    return chart;

    }

    processTestUpload = function(file) {

        newData = JSON.parse(file.target.result);

        var parsedData = [];

        for(var key in newData) {

            var data = newData[key];
            var i = data.length;
            while(i--) {

                parsedData.push({
                    label: key,
                    data: data[i]
                })

            }

        }

        var msg = "Upload Stats data file not OK.";
        if(parsedData.length) {
            msg = "Upload Stats data file OK, length: " + parsedData.length;
        }

        $rootScope.client.logger(msg);

        $scope.worker.postMessage({
            type: 'fileupload',
            data: parsedData
        });

    }

    clearFileInput = function(selector, handler) { 

        var oldInput = document.getElementById(selector); 
        var newInput = document.createElement("input"); 

        newInput.type = "file"; 
        newInput.id = oldInput.id; 
        newInput.name = oldInput.name; 
        newInput.className = oldInput.className; 
        newInput.style.cssText = oldInput.style.cssText; 
        
        // copy any other relevant attributes 

        oldInput.parentNode.replaceChild(newInput, oldInput);
        newInput.addEventListener('change', handler, false);

    }

    handleFileSelect = function(evt) {

        var files = evt.target.files; // FileList object

        // Loop through the FileList and render image files as thumbnails.
        for (var i = 0, f; f = files[i]; i++) {

            var reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = (function(theFile) {
                return function(e) {
                    processTestUpload(e);
                    clearFileInput('files_stats', handleFileSelect);
                };
            })(f);

            // Read in the image file as a data URL.
            reader.readAsText(f);
        }
    }

    $rootScope.update_stats = function(data) {

        if(stats_ready) {
            $scope.worker.postMessage({
                type: 'data',
                data: data.data.data
            });

            // stats_ready = false;

        }

    }

    $scope.download_parameters = function() {

        $scope.download_parameters_spinner = true;
        
        $scope.worker.postMessage({
            type: 'download_parameters'
        });

    }

    $scope.$on("$destroy", function() {
        $rootScope.client.remove_stats($scope.nn_id);
        $scope.worker.terminate();
    });

    $scope.worker = new Worker('stats.js');
    $scope.worker.onmessage = workerMessage;

    document.getElementById('files_stats').addEventListener('change', handleFileSelect, false);

});

app.controller('new-file', function ($scope, $rootScope, $location) {

    $scope.new_nn_added = false;

    $scope.nn = {
        iteration_time: 10000
    };

    var nn_file;

    $scope.add_nn_from_file = function(nn) {
        
        if(!nn.name) {
            $scope.errors.push('Please insert a name');
            return  
        }

        if(!nn.iteration_time) {
            $scope.errors.push('Please select an iteration tims');
            return  
        }

        var new_nn = new mlitb.Net();

        var labels = [];

        var layers_length = $scope.layers.length;

        new_nn.setConfigsAndParams(nn_file);

        var configuration = new_nn.conf;

        if($scope.nn.drop_last_layer == true) {

            // cut off last layer (it removes from conf AND parameters)
            new_nn.removeLayer( ( new_nn.conf.length - 1) );

            // add new last layer.

            // restructure the layer into {type: , is_train: , filter, activation,...}

            var newl = angular.copy($scope.layers[$scope.layers.length - 1].conf);

            newl.is_train = angular.copy($scope.layers[$scope.layers.length - 1].is_train);
            newl.type = angular.copy($scope.layers[$scope.layers.length - 1].type);

            new_nn.addLayer([
                newl
            ]);

            layers_length -= 1; // do not do updateLayerTrain on last layer, is useless anyway.

            // I think we do this if we drop the last layer, if we don't then we still have
            // neurons in the last layer
            configuration[configuration.length-1].num_neurons = 0;
        }

        var train;
        var is_ever_train_false;

        for(var i = 0; i < layers_length; i++) {

            if($scope.layers[i].is_train == undefined) {
                train = false;
            } else {
                train = $scope.layers[i].is_train;
            }
            if (train==false){
                is_ever_train_false=true;
            }

            new_nn.updateLayerTrain(i, train);

        }

        if($scope.nn.drop_last_layer == false) {

            // do not send labels when headless !
            
            for (var key in nn_file.index2label) {
                labels.push(nn_file.index2label[key]);
            }

        }

        // use new configuration after update is_train
        configuration = new_nn.conf;
        // set num_neurons to 0. Neurons get added later through addLabel
        // do not change parameters.
        
        // move the following code inside drop true
        // configuration[configuration.length-1].num_neurons = 0;

        nn_to_send = angular.copy(nn);
        nn_to_send.configuration = configuration;
        nn_to_send.parameters = {parameters: nn_file.params};
        nn_to_send.labels = labels;
        
        // I add this to notify if there is at least one train false
        nn_to_send.is_ever_train_false = is_ever_train_false;
        // I think the is_train is to notice if there's is_train = false or not
        // because if there is is_train false in the layer we need to set 
        // that.Net.setParams(parameters.parameters, true); in the slave
        // correct me if i'm wrong
        // I also need a notification for drop last layer to the slave
        
        if($scope.nn.drop_last_layer == true) {
            nn_to_send.drop_last_layer = true; // headless only!
        } else {
            nn_to_send.drop_last_layer = false;
        }

        console.log('added labels:');
        console.log(labels);

        console.log('nn config:');
        console.log(configuration);

        $rootScope.client.add_nn(nn_to_send);

        $location.path('#/join');
        
    }

    process_angular_layer = function(conf) {

        var angular_conf = {};

        var allowed_confs = ['sx', 'sy', 'stride', 'depth', 'activation', 'drop_prob', 'num_neurons', 'filters'];

        for(var key in conf) {

            if(allowed_confs.indexOf(key) > -1) {

                angular_conf[key] = conf[key];

            }

        }

        return angular_conf;

    }

    processNewUpload = function(file) {

        nn_file = JSON.parse(file.target.result);

        $scope.new_nn_added = true;

        var layers = [];

        // set up layers according to angular spec
        for(var i = 0; i < nn_file.configs.length; i++) {

            layers.push({
                type: nn_file.configs[i].type,
                conf: process_angular_layer(nn_file.configs[i]),
                is_train: true
            });

        }

        $scope.layers = layers;

        $scope.nn.drop_last_layer = false;

        $scope.$apply();

    }

    clearFileInput = function(selector, handler) { 

        var oldInput = document.getElementById(selector); 
        var newInput = document.createElement("input"); 

        newInput.type = "file"; 
        newInput.id = oldInput.id; 
        newInput.name = oldInput.name; 
        newInput.className = oldInput.className; 
        newInput.style.cssText = oldInput.style.cssText; 
        
        // copy any other relevant attributes 

        oldInput.parentNode.replaceChild(newInput, oldInput);
        newInput.addEventListener('change', handler, false);

    }

    handleFileSelect = function(evt) {

        var files = evt.target.files; // FileList object

        // Loop through the FileList and render image files as thumbnails.
        for (var i = 0, f; f = files[i]; i++) {

            var reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = (function(theFile) {
                return function(e) {
                    processNewUpload(e);
                    clearFileInput('upload_network_file', handleFileSelect);
                };
            })(f);

            // Read in the image file as a data URL.
            reader.readAsText(f);
        }
    }

    document.getElementById('upload_network_file').addEventListener('change', handleFileSelect, false);

});

app.controller('new', function ($scope, $rootScope, $location) {


    $scope.dragControlListeners = {

        accept: function (sourceItemHandleScope, destSortableScope) { return true; },
        itemMoved: function (event) {  },
        orderChanged: function(event) { $scope.validate_layers(); }

    };

    $scope.layers = [];

    $scope.conf_type = 'input';

    $scope.layer_errors = [];

    $scope.nn = {
        iteration_time: 10000
    };

    $scope.errors = [];

    $scope.in_layers = function(type) {

        i = $scope.layers.length;
        while(i--) {
            if($scope.layers[i].type == type) {
                return true;
            }
        }
        return false;

    }

    $scope.load_template = function(type)  {

        if(type == 'simple_mnist') {

            $scope.layers = [
            {type: 'input', conf: {"sx":28,"sy":28,"depth":1}},
            {type: 'conv', conf: {"sx":5,"stride":1,"filters":16,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":3}},
            {type: 'fc', conf: {"activation":"softmax"}}
            ]
        } else if(type == 'elaborate_mnist') {

            $scope.layers = [
            {type: 'input', conf: {"sx":28,"sy":28,"depth":1}},
            {type: 'conv', conf: {"sx":5,"stride":1,"filters":8,"activation":"relu"}},
            {type: 'pool', conf: {"sx":2,"stride":2}},
            {type: 'conv', conf: {"sx":5,"stride":1,"filters":16,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":3}},
            {type: 'fc', conf: {"activation":"softmax"}}
            ]
        } else if(type == 'cifar10') {

            $scope.layers = [
            {type: 'input', conf: {"sx":32,"sy":32,"depth":3}},
            {type: 'conv', conf: {"sx":5,"stride":1,"filters":12,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":2,"drop_prob":0.5}},
            {type: 'conv', conf: {"sx":5,"stride":1,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":4,"stride":4,"drop_prob":0.5}},
            {type: 'fc', conf: {"activation":"softmax"}}
            ]
        } else if(type == 'cifar10nodrop') {

            $scope.layers = [
            {type: 'input', conf: {"sx":32,"sy":32,"depth":3}},
            {type: 'conv', conf: {"sx":5,"stride":1,"filters":12,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":2}},
            {type: 'conv', conf: {"sx":5,"stride":1,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":4,"stride":4}},
            {type: 'fc', conf: {"activation":"softmax"}}
            ]
        } else if(type == 'cifar100') {
            $scope.layers = [
            {type: 'input', conf: {"sx":32,"sy":32,"depth":3}},
            {type: 'conv', conf: {"sx":6,"stride":3,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":1,"drop_prob":0.5}},
            {type: 'conv', conf: {"sx":4,"stride":2,"filters":48,"activation":"relu"}},
            {type: 'pool', conf: {"sx":2,"stride":1,"drop_prob":0.5}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if(type == 'cifar100A') {
            $scope.layers = [
            {type: 'input', conf: {"sx":32,"sy":32,"depth":3}},
            {type: 'conv', conf: {"sx":6,"stride":3,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":1}},
            {type: 'conv', conf: {"sx":4,"stride":2,"filters":48,"activation":"relu"}},
            {type: 'pool', conf: {"sx":2,"stride":1,"drop_prob":0.1}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if(type == 'cifar100B') {
            $scope.layers = [
            {type: 'input', conf: {"sx":32,"sy":32,"depth":3}},
            {type: 'conv', conf: {"sx":5,"stride":2,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":1}},
            {type: 'conv', conf: {"sx":3,"stride":2,"filters":64,"activation":"relu"}},
            {type: 'pool', conf: {"sx":2,"stride":1,"drop_prob":0.1}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if(type == 'cifar100C') {
          $scope.layers = [
          {type: 'input', conf: {"sx":32,"sy":32,"depth":3}},
          {type: 'conv', conf: {"sx":5,"stride":2,"filters":24,"activation":"relu"}},
          {type: 'pool', conf: {"sx":3,"stride":1}},
          {type: 'conv', conf: {"sx":3,"stride":2,"filters":64,"activation":"relu"}},
          {type: 'pool', conf: {"sx":2,"stride":1}},
          {type: 'conv', conf: {"sx":2,"stride":1,"filters":128,"activation":"relu"}},
          {type: 'pool', conf: {"sx":2,"stride":1,"drop_prob":0.1}},
          {type: 'fc', conf: {"activation":"softmax"}}
        ]
        }
        else if( type == 'nin_cifar100_small'){
          $scope.layers = [
            {type : 'input', conf: {"sx":32,"sy":32,"depth":3}},
            {type : 'conv', conf: {"sx" : 11, "stride" : 4, "filters" : 16, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 16, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 16, "activation" : 'relu', "is_train":'yes'}},
            {type : 'pool', conf: {"sx" : 3, "stride" : 2}},
            //{type : 'pool', conf: {"sx" : 54, "stride" : 1, "pool_type":'avg'}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if( type == 'nin_cifar100_smallxxx'){
          $scope.layers = [
            {type : 'input', conf: {"sx":32,"sy":32,"depth":3}},
            {type : 'conv', conf: {"sx" : 11, "stride" : 4, "filters" : 16, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 16, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 16, "activation" : 'relu', "is_train":'yes'}},
            {type : 'pool', conf: {"sx" : 3, "stride" : 2}},
            {type : 'conv', conf: {"pad":2, "sx" : 5, "stride" : 1, "filters" : 32, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 32, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 32, "activation" : 'relu', "is_train":'yes'}},
            {type : 'pool', conf: {"sx" : 3, "stride" : 2}},
            {type : 'conv', conf: {"pad":1, "sx" : 3, "stride" : 1, "filters" : 48, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 48, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 48, "activation" : 'relu', "is_train":'yes'}},
            {type : 'pool', conf: {"sx" : 3, "stride" : 2, "drop_prob" : 0.5}},
            {type : 'conv', conf: {"pad":1, "sx" : 3, "stride" : 1, "filters" : 64, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 64, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 100, "activation" : 'relu', "is_train":'yes'}},
            {type : 'pool', conf: {"sx" : 6, "stride" : 1, "pool_type":'avg'}},
            {type: 'softmax', conf: {}}
          ]
        }
        else if( type == 'nin_cifar100'){
          $scope.layers = [
            {type : 'input', conf: {"sx":32,"sy":32,"depth":3}},
            {type : 'conv', conf: {"sx" : 11, "stride" : 4, "filters" : 96, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 96, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 96, "activation" : 'relu', "is_train":'yes'}},
            {type : 'pool', conf: {"sx" : 3, "stride" : 2}},
            {type : 'conv', conf: {"pad":2, "sx" : 5, "stride" : 1, "filters" : 256, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 256, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 256, "activation" : 'relu', "is_train":'yes'}},
            {type : 'pool', conf: {"sx" : 3, "stride" : 2}},
            {type : 'conv', conf: {"pad":1, "sx" : 3, "stride" : 1, "filters" : 384, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 384, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 384, "activation" : 'relu', "is_train":'yes'}},
            {type : 'pool', conf: {"sx" : 3, "stride" : 2, "drop_prob" : 0.5}},
            {type : 'conv', conf: {"pad":1, "sx" : 3, "stride" : 1, "filters" : 1024, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 1024, "activation" : 'relu', "is_train":'yes'}},
            {type : 'conv', conf: {"sx" : 1, "stride" : 1, "filters" : 100, "activation" : 'relu', "is_train":'yes'}},
            {type : 'pool', conf: {"sx" : 6, "stride" : 1, "pool_type":'avg'}},
            {type: 'softmax', conf: {}}
          ]
        }

        $scope.layer_errors = [];
        $scope.errors = [];

    }

    $scope.add_layer = function (layer, conf_type) {

        $scope.layer_errors = [];
        $scope.errors = [];

        // check for multiple input layers
        if(conf_type == 'input'){
            if($scope.in_layers('input') == true) {
                $scope.layer_errors.push('Can not add a 2nd input layer');
                return
            }
        }

        if($scope.layers.length == 10) {
            $scope.layer_errors.push('Maximum of 10 layers');
            return
        }

        new_layer = {type: angular.copy(conf_type), conf: angular.copy(layer)}

        $scope.layers.push(new_layer);

        $scope.validate_layers();

    }

    $scope.remove_layer = function(layer) { 

        var index = $scope.layers.indexOf(layer)
        $scope.layers.splice(index, 1);

        $scope.validate_layers();

    }

    $scope.validate_layers = function() {

        $scope.layer_errors = [];
        $scope.errors = [];

        if($scope.layers[0].type != 'input') {
            $scope.layer_errors.push('Configuration must start with an input layer');
        }

        if($scope.layers[$scope.layers.length-1].type != 'fc') {
            $scope.layer_errors.push('Configuration must end with a FC layer');
        }       


    }

    $scope.add_nn = function(nn) {

        $scope.errors = [];

        if(!nn.name) {
            $scope.errors.push('Please insert a name')
            return  
        }

        if(!nn.iteration_time) {
            $scope.errors.push('Please select an iteration tims')
            return  
        }

        if($scope.layer_errors.length) {
            $scope.errors.push('Please fix layer configuration before adding')
            return
        }

        if(!$scope.layers.length) {
            $scope.errors.push('Please make a layer configuration before adding')
            return
        }

        var configuration = [];

        for(var i = 0; i < $scope.layers.length; i++) {
            layer = $scope.layers[i].conf;
            layer.type = $scope.layers[i].type;
            configuration.push(layer);
        }

        nn_to_send = angular.copy(nn);
        nn_to_send.configuration = configuration;
        nn_to_send.parameters = null;
        nn_to_send.labels = [];
        nn_to_send.is_train = false;

        $rootScope.client.add_nn(nn_to_send);

        $location.path('#/join');

    }

});

app.controller('join', function ($scope, $rootScope) {

    $rootScope.update_log = function() {

        $scope.log = $scope.client.log_text;

        $scope.$apply();

    }

    $rootScope.update_nns = function() {

        $scope.total = {name: "All networks", runtime_elapsed: 0, iteration_time: 0, realtime_elapsed: 0, data_seen: 0, clients: 0, power: 0};

        i = $scope.client.nns.length;
        while(i--) {

            $scope.total.runtime_elapsed += $scope.client.nns[i].runtime_elapsed;
            $scope.total.realtime_elapsed += $scope.client.nns[i].realtime_elapsed;
            $scope.total.iteration_time += $scope.client.nns[i].iteration_time;
            $scope.total.data_seen += $scope.client.nns[i].data_seen;
            $scope.total.clients += $scope.client.nns[i].clients;
            $scope.total.power += $scope.client.nns[i].power;
        }

        $scope.$apply();

    }

    if(!$rootScope.client) {

        $rootScope.client = new Client($rootScope);
        $rootScope.client.start_boss();

    } 
    
    $scope.client = $rootScope.client;
    $rootScope.update_log();

    $scope.sort = "name";
    $scope.reverse = false;

    $scope.changeSort = function(value){
        if ($scope.sort == value){
          $scope.reverse = !$scope.reverse;
          return;
      }

      $scope.sort = value;
      $scope.reverse = false;
    
    }

    $scope.join = function(nn) {
        $scope.client.start_slave(nn);
    }

    $scope.join_any = function() {
        // a
    }

    $scope.add_data = function(nn, files) {
        $scope.client.handle_file_upload(nn, files);
    }
    
});