var app = angular.module('mlitb', ['ngRoute', 'ui.sortable', 'routeStyles']);

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

    $rootScope.boss.start(host, imagehost);

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
    when('/project-index/:nn_id/public', {
        templateUrl: 'static/views/public.html',
        controller: 'public',
        css: 'static/css/public.css'
    }).    
    when('/project-index/:nn_id/slave/:slave_id/camera', {
        templateUrl: 'static/views/camera.html',
        controller: 'camera'
    }).
    when('/project-index/:nn_id/slave/:slave_id/stats', {
        templateUrl: 'static/views/stats.html',
        controller: 'stats'
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

app.controller('public', function ($scope, $rootScope, $routeParams, $location) {

    $rootScope.public_ready = false;
    $scope.working = false;
    $scope.label_added = false;

    $scope.slave_working = false;

    $scope.start = function() {

        $scope.nn = $scope.boss.nn_by_id($routeParams.nn_id);

        if(!$scope.nn) {
            $location.path('/project-index/');
        }

        if($rootScope.camera_slave || $rootScope.worker_slave) {
            $rootScope.public_ready = true;
            return;
        }

        $scope.boss.start_public($routeParams.nn_id);

        $scope.$watch('boss.nns', function() {
            $scope.nn = $scope.boss.nn_by_id($routeParams.nn_id);

            if(!$scope.nn) {
                $location.path('/project-index/');
            }

        });

    }

    $scope.start_work = function() {

        $scope.boss.slave_work($routeParams.nn_id, $rootScope.worker_slave.id);
        $scope.message_be_gone = true;
        $scope.slave_working = true;

    }

    $scope.add_label = function() {

        var canvas = document.getElementById('image');

        var base64 = canvas.toDataURL();
        var blobBin = atob(base64.split(',')[1]);

        var array = [];
        for(var i = 0; i < blobBin.length; i++) {
            array.push(blobBin.charCodeAt(i));
        }

        var file = new Uint8Array(array);

        var zip = new JSZip();
        zip.folder($scope.new_label).file("genfile.jpg", file);

        var gen_zip = zip.generate({type: "blob"});
        var formData = new FormData();

        formData.append("upload", gen_zip);

        var request = new XMLHttpRequest();

        request.onload = function() {
            
            $scope.boss.add_data($routeParams.nn_id, this.response);
            $scope.label_added = true;
            $scope.$apply();

        }

        request.open("POST", imagehost + "/upload");
        request.send(formData);

    }

    $scope.assign_label = function(label) {

        $scope.new_label = label;
        $scope.add_label();

    }

    $rootScope.camera_done = function(results) {

        $scope.classify_results = results;
        $scope.working = false;
        $scope.$apply();

    }

    handleFileSelect = function(evt) {

        $scope.working = true;
        $scope.label_added = false;
        $scope.new_label = '';
        $scope.$apply();

        $scope.boss.handle_camera(evt, $rootScope.camera_slave.id);

    }

    document.getElementById('picture').addEventListener('change', handleFileSelect, false);


});

app.controller('project_index', function ($scope, $rootScope, $location) {

    $scope.nn_detail = function(id) {
        $location.path('/project-index/' + id);
    }

    $scope.number_of_nn_my_slaves_by_id = function(nn_id) {
        return $scope.boss.number_of_nn_my_slaves_by_id(nn_id);
    }

});

app.controller('stats', function ($scope, $rootScope, $routeParams, $location) {

    $scope.adddataspinner = false;

    $scope.nn = $scope.boss.nn_by_id($routeParams.nn_id);
    $scope.slave = $scope.boss.slave_by_id($routeParams.slave_id);

    if(!$scope.nn || !$scope.slave ) {
        $location.path('/project-index/');
    }

    add_data_done = function() {

        $scope.adddataspinner = false;
        $('#adddata').modal('hide');
        $scope.$apply();

        $scope.boss.message_to_slave($scope.slave, 'start_stats');

    }

    $scope.adddata = function(nn_id, e) {
        e.preventDefault();

        $scope.adddataspinner = true;

        var fileField = document.getElementById('filefield');
        
        $scope.boss.add_stats_file($routeParams.slave_id, fileField.files[0], add_data_done);

    }  

});

app.controller('camera', function ($scope, $rootScope, $routeParams, $location) {

    $scope.nn = $scope.boss.nn_by_id($routeParams.nn_id);
    $scope.slave = $scope.boss.slave_by_id($routeParams.slave_id);

    if(!$scope.nn || !$scope.slave ) {
        $location.path('/project-index/');
    }

    $scope.working = false;
    $scope.label_added = false;

    $rootScope.camera_done = function(results) {

        $scope.classify_results = results;
        $scope.working = false;
        $scope.$apply();

    }

    $scope.add_label = function() {

        var canvas = document.getElementById('image');

        var base64 = canvas.toDataURL();
        var blobBin = atob(base64.split(',')[1]);

        var array = [];
        for(var i = 0; i < blobBin.length; i++) {
            array.push(blobBin.charCodeAt(i));
        }

        var file = new Uint8Array(array);

        var zip = new JSZip();
        zip.folder($scope.new_label).file("genfile.jpg", file);

        var gen_zip = zip.generate({type: "blob"});
        var formData = new FormData();

        formData.append("upload", gen_zip);

        var request = new XMLHttpRequest();

        request.onload = function() {
            
            $scope.boss.add_data($routeParams.nn_id, this.response);
            $scope.label_added = true;
            $scope.$apply();

        }

        request.open("POST", imagehost + "/upload");
        request.send(formData);

    }

    $scope.assign_label = function(label) {

        $scope.new_label = label;
        $scope.add_label();

    }

    handleFileSelect = function(evt) {

        $scope.working = true;
        $scope.label_added = false;
        $scope.new_label = '';
        $scope.$apply();
        $scope.boss.handle_camera(evt, $routeParams.slave_id);

    }

    document.getElementById('picture').addEventListener('change', handleFileSelect, false);

});

app.controller('detail', function ($scope, $rootScope, $routeParams, $location) {

    $scope.adddataspinner = false;

    $scope.$watch('boss.nns', function() {
        $scope.nn = $scope.boss.nn_by_id($routeParams.nn_id);

        if(!$scope.nn) {
            $location.path('/project-index/');
        }

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

        var formData = new FormData(formElement);

        request.open("POST", imagehost + "/upload");
        request.send(formData);
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

    $scope.remove_nn = function(nn_id) {
        var r = confirm('Are you sure you wish to remove the network?\nYou will lose all data.');
        if(r == true) {
            $scope.boss.remove_nn(nn_id);
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
        else if(type == 'cifar100A') {
            $scope.layers = [
            {type: 'input', conf: {"sx":32,"sy":32,"depth":3}},
            {type: 'conv', conf: {"sx":6,"stride":3,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":1}},
            {type: 'conv', conf: {"sx":4,"stride":2,"filters":48,"activation":"relu"}},
            {type: 'pool', conf: {"sx":2,"stride":1}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if(type == 'cifar100A_drop') {
            $scope.layers = [
            {type: 'input', conf: {"sx":32,"sy":32,"depth":3}},
            {type: 'conv', conf: {"sx":6,"stride":3,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":1,"drop_prob":0.1}},
            {type: 'conv', conf: {"sx":4,"stride":2,"filters":48,"activation":"relu"}},
            {type: 'pool', conf: {"sx":2,"stride":1}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if(type == 'cifar100A_drop2') {
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
            {type: 'pool', conf: {"sx":2,"stride":1}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if(type == 'cifar100B_drop') {
            $scope.layers = [
            {type: 'input', conf: {"sx":32,"sy":32,"depth":3}},
            {type: 'conv', conf: {"sx":5,"stride":2,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":1,"drop_prob":0.1}},
            {type: 'conv', conf: {"sx":3,"stride":2,"filters":64,"activation":"relu"}},
            {type: 'pool', conf: {"sx":2,"stride":1}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if(type == 'cifar100B_drop2') {
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
          {type: 'pool', conf: {"sx":2,"stride":1}},
          {type: 'fc', conf: {"activation":"softmax"}}
        ]
        }
        else if(type == 'cifar100C_drop') {
          $scope.layers = [
          {type: 'input', conf: {"sx":32,"sy":32,"depth":3}},
          {type: 'conv', conf: {"sx":5,"stride":2,"filters":24,"activation":"relu"}},
          {type: 'pool', conf: {"sx":3,"stride":1,"drop_prob":0.3}},
          {type: 'conv', conf: {"sx":3,"stride":2,"filters":64,"activation":"relu"}},
          {type: 'pool', conf: {"sx":2,"stride":1}},
          {type: 'conv', conf: {"sx":2,"stride":1,"filters":128,"activation":"relu"}},
          {type: 'pool', conf: {"sx":2,"stride":1}},
          {type: 'fc', conf: {"activation":"softmax"}}
        ]
        }
        else if(type == 'cifar100C_drop2') {
          $scope.layers = [
          {type: 'input', conf: {"sx":32,"sy":32,"depth":3}},
          {type: 'conv', conf: {"sx":5,"stride":2,"filters":24,"activation":"relu"}},
          {type: 'pool', conf: {"sx":3,"stride":1}},
          {type: 'conv', conf: {"sx":3,"stride":2,"filters":64,"activation":"relu"}},
          {type: 'pool', conf: {"sx":2,"stride":1,"drop_prob":0.3}},
          {type: 'conv', conf: {"sx":2,"stride":1,"filters":128,"activation":"relu"}},
          {type: 'pool', conf: {"sx":2,"stride":1}},
          {type: 'fc', conf: {"activation":"softmax"}}
        ]
        }
        else if(type == 'imagenetA') {
            $scope.layers = [
            {type: 'input', conf: {"sx":224,"sy":224,"depth":3}},
            {type: 'conv', conf: {"sx":11,"stride":4,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":2}},
            {type: 'conv', conf: {"sx":4,"stride":2,"filters":48,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":2}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if(type == 'imagenetA_drop') {
            $scope.layers = [
            {type: 'input', conf: {"sx":224,"sy":224,"depth":3}},
            {type: 'conv', conf: {"sx":11,"stride":4,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":1,"drop_prob":0.1}},
            {type: 'conv', conf: {"sx":4,"stride":2,"filters":48,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":2}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if(type == 'imagenetA_drop2') {
            $scope.layers = [
            {type: 'input', conf: {"sx":224,"sy":224,"depth":3}},
            {type: 'conv', conf: {"sx":11,"stride":4,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":2}},
            {type: 'conv', conf: {"sx":4,"stride":2,"filters":48,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":2,"drop_prob":0.1}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if(type == 'imagenetB') {
            $scope.layers = [
            {type: 'input', conf: {"sx":224,"sy":224,"depth":3}},
            {type: 'conv', conf: {"sx":5,"stride":2,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":1}},
            {type: 'conv', conf: {"sx":3,"stride":2,"filters":64,"activation":"relu"}},
            {type: 'pool', conf: {"sx":2,"stride":1}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if(type == 'imagenetB_drop') {
            $scope.layers = [
            {type: 'input', conf: {"sx":224,"sy":224,"depth":3}},
            {type: 'conv', conf: {"sx":5,"stride":2,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":1,"drop_prob":0.1}},
            {type: 'conv', conf: {"sx":3,"stride":2,"filters":64,"activation":"relu"}},
            {type: 'pool', conf: {"sx":2,"stride":1}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if(type == 'imagenetB_drop2') {
            $scope.layers = [
            {type: 'input', conf: {"sx":224,"sy":224,"depth":3}},
            {type: 'conv', conf: {"sx":5,"stride":2,"filters":24,"activation":"relu"}},
            {type: 'pool', conf: {"sx":3,"stride":1}},
            {type: 'conv', conf: {"sx":3,"stride":2,"filters":64,"activation":"relu"}},
            {type: 'pool', conf: {"sx":2,"stride":1,"drop_prob":0.1}},
            {type: 'fc', conf: {"activation":"softmax"}}
          ]
        }
        else if(type == 'imagenetC') {
          $scope.layers = [
          {type: 'input', conf: {"sx":224,"sy":224,"depth":3}},
          {type: 'conv', conf: {"sx":5,"stride":2,"filters":24,"activation":"relu"}},
          {type: 'pool', conf: {"sx":3,"stride":1}},
          {type: 'conv', conf: {"sx":3,"stride":2,"filters":64,"activation":"relu"}},
          {type: 'pool', conf: {"sx":2,"stride":1}},
          {type: 'conv', conf: {"sx":2,"stride":1,"filters":128,"activation":"relu"}},
          {type: 'pool', conf: {"sx":2,"stride":1}},
          {type: 'fc', conf: {"activation":"softmax"}}
        ]
        }
        else if(type == 'imagenetC_drop') {
          $scope.layers = [
          {type: 'input', conf: {"sx":224,"sy":224,"depth":3}},
          {type: 'conv', conf: {"sx":5,"stride":2,"filters":24,"activation":"relu"}},
          {type: 'pool', conf: {"sx":3,"stride":1,"drop_prob":0.3}},
          {type: 'conv', conf: {"sx":3,"stride":2,"filters":64,"activation":"relu"}},
          {type: 'pool', conf: {"sx":2,"stride":1}},
          {type: 'conv', conf: {"sx":2,"stride":1,"filters":128,"activation":"relu"}},
          {type: 'pool', conf: {"sx":2,"stride":1}},
          {type: 'fc', conf: {"activation":"softmax"}}
        ]
        }
        else if(type == 'imagenetC_drop2') {
          $scope.layers = [
          {type: 'input', conf: {"sx":224,"sy":224,"depth":3}},
          {type: 'conv', conf: {"sx":5,"stride":2,"filters":24,"activation":"relu"}},
          {type: 'pool', conf: {"sx":3,"stride":1}},
          {type: 'conv', conf: {"sx":3,"stride":2,"filters":64,"activation":"relu"}},
          {type: 'pool', conf: {"sx":2,"stride":1,"drop_prob":0.3}},
          {type: 'conv', conf: {"sx":2,"stride":1,"filters":128,"activation":"relu"}},
          {type: 'pool', conf: {"sx":2,"stride":1}},
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

            nn_file = JSON.parse(file.target.result);

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
            return process_file_upload;
        })(formElement);

        reader.readAsText(formElement);

    }

});