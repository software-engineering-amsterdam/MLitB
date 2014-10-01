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

    $scope.nn_id = $routeParams.nnId;

    $scope.nn = $scope.client.nn_exists($scope.nn_id);

    if(!$scope.nn) {
        $location.path('#/join');
    }

    $rootScope.classifier_results = function(arr) {
        
        $scope.classify_results = arr;

        $scope.$apply();

    }

    $scope.add_label = function() {


        console.log("NG add label");

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
            pixel = image[i] / 255.0; // - 0.5;

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

                        width = 32; // change this to relevant size
                        height = 32; // change this to relevant size

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

    $scope.client.add_stats($scope.nn_id);

    var is_initialized = false;
    var discrete_loss, piece;
    var lastParameter;
    var testIteration = 0;

    var errorchart;

    workerMessage = function(e) {

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

    processParameterUpload = function(file) {

        newData = JSON.parse(file.target.result);
        var msg = "Upload Parameter data file not OK.";
        if(newData) {
            msg = "Upload Parameter data file OK";
        }

        $rootScope.client.logger(msg);

        $rootScope.client.upload_parameters($scope.nn_id, newData);

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

    handleParameterUpload = function(evt) {

        var files = evt.target.files; // FileList object

        // Loop through the FileList and render image files as thumbnails.
        for (var i = 0, f; f = files[i]; i++) {

            var reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = (function(theFile) {
                return function(e) {
                    processParameterUpload(e);
                    clearFileInput('upload_parameters', handleParameterUpload);
                };
            })(f);

            // Read in the image file as a data URL.
            reader.readAsText(f);
        }
    }

    $rootScope.update_stats = function(data) {

        $scope.worker.postMessage({
            type: 'data',
            data: data.data.data
        });

    }

    $scope.download_parameters = function() {

        $rootScope.client.request_download_parameters($scope.nn_id);

    }

    $scope.$on("$destroy", function() {
        $rootScope.client.remove_stats($scope.nn_id);
        $scope.worker.terminate();
    });

    $scope.worker = new Worker('stats.js');
    $scope.worker.onmessage = workerMessage;

    document.getElementById('files_stats').addEventListener('change', handleFileSelect, false);

    document.getElementById('upload_parameters').addEventListener('change', handleParameterUpload, false);

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
            {type: 'fc', conf: {"activation":"softmax","drop_prob":0.5}}
            ]
        }
        else if(type == 'cifar100') {
            $scope.layers = [
            {type: 'input', conf: {"sx":32,"sy":32,"depth":3}},
            {type: 'conv', conf: {"sx":6,"stride":3,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":1,"drop_prob":0.5}},
            {type: 'conv', conf: {"sx":4,"stride":2,"filters":48,"activation":"relu"}},
            {type: 'pool', conf: {"sx":2,"stride":1,"drop_prob":0.5}},
            {type: 'fc', conf: {"activation":"softmax","drop_prob":0.5}}
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

        nn_to_send = angular.copy(nn);
        nn_to_send.conf = $scope.layers;

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