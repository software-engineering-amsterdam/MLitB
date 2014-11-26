var app = angular.module('mlitb', ['ngRoute', 'ui.sortable']);

app.run(function($rootScope, $location) {
    
    $rootScope.go = function ( path ) {
        $location.path( path );
    };

    $rootScope.log = [];

    $rootScope.apply = function() {

        var boss = $rootScope.boss;

        $rootScope.nns = boss.nns;
        $rootScope.slaves = boss.slaves;
        $rootScope.log = boss.log;        
        $rootScope.$apply();
    }

    $rootScope.boss = new Boss($rootScope);

    $rootScope.boss.start();

});

app.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});

app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
    when('/home', {
        templateUrl: 'static/views/home.html',
        controller: 'home'
    }).
    when('/project-index', {
        templateUrl: 'static/views/project-index.html',
        controller: 'project_index'
    }).
    when('/project-index/:nn_id', {
        templateUrl: 'static/views/detail.html',
        controller: 'detail'
    }).
    when('/project-index/:nn_id/slaves', {
        templateUrl: 'static/views/slave.html',
        controller: 'slave'
    }).
    when('/new-project', {
        templateUrl: 'static/views/new-project.html',
        controller: 'new_project'
    }).
    when('/new-project-from-file', {
        templateUrl: 'static/views/new-project-from-file.html',
        controller: 'new_project_from_file'
    }).
    /*
    when('/stats/:nnId', {
        templateUrl: 'partials/stats.html',
        controller: 'stats'
    }).
    when('/public/:nnId', {
        templateUrl: 'partials/publicclient.html',
        controller: 'publicclient'
    }).
    */
    otherwise({
        redirectTo: '/home'
    });
}]);

app.controller('navbar', function ($scope, $rootScope) {

    $scope.page_active = 'home';

});

app.controller('home', function ($scope, $rootScope, $location) {

    $scope.nn_name_by_id = function(id) {
        return $scope.boss.nn_name_by_id(id);
    }

    $scope.nn_detail = function(nn_id) {
        $location.path('/project-index/' + nn_id);
    };

});

app.controller('project_index', function ($scope, $rootScope, $location) {

    $scope.nn_detail = function(id) {
        $location.path('/project-index/' + id);
    }

    $scope.number_of_nn_my_slaves_by_id = function(nn_id) {
        return $scope.boss.number_of_nn_my_slaves_by_id(nn_id);
    }

});

app.controller('slave', function ($scope, $rootScope, $routeParams, $location) {

    $scope.nn = $scope.boss.nn_by_id($routeParams.nn_id);

    if(!$scope.nn) {
        $location.path('/project-index/');
    }

    console.log('nn:', $scope.nn);

    $scope.nn_slaves = $scope.boss.slaves_by_nn_id($routeParams.nn_id);

});

app.controller('detail', function ($scope, $rootScope, $routeParams, $location) {

    $scope.adddataspinner = false;

    $scope.$watch('boss.nns', function() {
        $scope.nn = $scope.boss.nn_by_id($routeParams.nn_id);
    });

    $scope.nn = $scope.boss.nn_by_id($routeParams.nn_id);

    if(!$scope.nn) {
        $location.path('/project-index/');
    }

    $scope.nn_slaves = $scope.boss.slaves_by_nn_id($routeParams.nn_id);

    $scope.join = function(nn_id) {

        $scope.boss.start_slave(nn_id);
        $scope.nn_slaves = $scope.boss.slaves_by_nn_id(parseInt($routeParams.nn_id));

    }

    $scope.work = function(nn_id, slave_id) {

        $scope.boss.slave_work(nn_id, slave_id);

    }

    $scope.track = function(nn_id, slave_id) {

        $scope.boss.slave_track(nn_id, slave_id);

    }

    $scope.download = function(slave_id) {

        $scope.boss.slave_download(slave_id);

    }

    $scope.remove = function(slave_id) {

        $scope.boss.remove_slave(slave_id);
        $scope.nn_slaves = $scope.boss.slaves_by_nn_id($routeParams.nn_id);

    }

    $scope.adddata = function(nn_id, e) {
        e.preventDefault();

        $scope.adddataspinner = true;

        var formElement = document.getElementById('datauploadform');
        var request = new XMLHttpRequest();

        request.onload = function() {
            
            $scope.boss.add_data(nn_id, this.response);

            $scope.adddataspinner = false;
            $('#adddata').modal('hide');
        }

        request.open("POST", "http://localhost:8001/upload");
        request.send(new FormData(formElement));
    }

    $scope.open_hyperparameters = function(nn) {
        $scope.hyperparameters = angular.copy(nn.hyperparameters);

        $('#hyperparameters').modal('show');
    }

    $scope.save_hyperparameters = function(nn_id) {
        $scope.boss.save_hyperparameters(nn_id, $scope.hyperparameters);
    }

    $scope.start = function(nn_id) {
        $scope.boss.start_nn(nn_id);
    }

    $scope.pause = function(nn_id) {
        $scope.boss.pause_nn(nn_id);
    }

    $scope.reboot = function(nn_id) {
        var r = confirm('Are you sure to reboot the network?\nThe current iteration will be stopped and restarted.\nYou will lose only data of the current iteration.');
        if(r == true) {
            $scope.boss.reboot_nn(nn_id);
        }
    }

});

app.controller('new_project', function ($scope, $rootScope, $location) {

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
            {type: 'pool', conf: {"sx":3,"stride":2}},
            {type: 'conv', conf: {"sx":5,"stride":1,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":4,"stride":4}},
            {type: 'fc', conf: {"activation":"softmax"}}
            ]
        }
        else if(type == 'cifar100') {
            $scope.layers = [
            {type: 'input', conf: {"sx":32,"sy":32,"depth":3}},
            {type: 'conv', conf: {"sx":6,"stride":3,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":1}},
            {type: 'conv', conf: {"sx":4,"stride":2,"filters":48,"activation":"relu"}},
            {type: 'pool', conf: {"sx":2,"stride":1}},
            {type: 'fc', conf: {"activation":"softmax"}}
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

        $rootScope.boss.logger('Adding new neural network: ' + nn.name);

        $rootScope.boss.add_nn(nn_to_send);

        $location.path('/project-index');

    }

});

app.controller('new_project_from_file', function ($scope, $rootScope, $location) {

    $scope.loadfilespinner = false;
    $scope.new_nn_added = false;

    $scope.nn = {
        iteration_time: 10000
    };

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
            new_nn.conf[new_nn.conf.length-1].num_neurons = 0;
        }

        var train;
        var is_ever_train_false = false;

        for(var i = 0; i < layers_length-1; i++) {

            if($scope.layers[i].is_train == undefined) {
                train = false;
            } else {
                train = $scope.layers[i].is_train;
            }

            if (train == false){
                is_ever_train_false = true;
            }

            new_nn.updateLayerTrain(i, train);

        }
        //here I make the last one always true just to test
        new_nn.updateLayerTrain(layers_length-1, true);

        if($scope.nn.drop_last_layer == true) {

            // remove labels
            new_nn.label2index = {};
            new_nn.index2label = {};

        }

        //I think we won't need these anymore
        // new_nn.is_ever_train_false = is_ever_train_false;
        
        // if($scope.nn.drop_last_layer == true) {
        //     new_nn.drop_last_layer = true; // headless only!
        // } else {
        //     new_nn.drop_last_layer = false;
        // }

        var nn_to_send = angular.copy(nn);

        $rootScope.boss.add_nn(nn_to_send, new_nn);

        $location.path('/project-index');
        
    }

    $scope.uploadfile = function(e) {

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
        
        process_file_upload = function(file) {

            nn_file = JSON.parse(file.target.result).data;

            var layers = [];

            console.log('ZE FILE:');
            console.log(nn_file);

            // set up layers according to angular spec
            for(var i = 0; i < nn_file.configs.length; i++) {

                layers.push({
                    type: nn_file.configs[i].type,
                    conf: process_angular_layer(nn_file.configs[i]),
                    is_train: false
                });

            }

            $scope.layers = layers;
            $scope.nn.drop_last_layer = false;
            $scope.loadfilespinner = false;
            $scope.new_nn_added = true;

            $('#uploadfile').modal('hide');

            $scope.$apply();

        }

        e.preventDefault();

        $scope.loadfilespinner = true;

        var formElement = document.getElementById('uploadfilefield').files[0];
        var reader = new FileReader();

        reader.onload = (function(theFile) {
            return process_file_upload; //function(e) {
            //};
        })(formElement);

        reader.readAsText(formElement);

    }

});