var x, y;

var num_workers;
var timer;

now = function() {
    // determine if the better window.performance.now() is available
    if(window.performance) {
        return window.performance.now();
    }
    return new Date().getTime();
}

workerDone = function(e) {

    var theta = $M(JSON.parse(e.data.d));
    var msg = "<p>Worker " + e.data.id + ":<br />";
    msg += theta.inspect();
    msg += "</p>";

    $('#done').append(msg);

    if(e.data.id == (num_workers - 1)) {

        $('#working').hide();
        $('#time').html(now() - timer);
        $('#timer').show();

    }
}

end = function(x,y) {

    var a  = $('#a').val();
    var iters = $('#iters').val();
    num_workers = $('#workers').val();

    var size = x.elements.length;

    var worker;

    timer = now();

    for (i = 0; i < num_workers; i++) {
        worker = new Worker('sgd.js');

        var fro = (size/num_workers * i);
        var to = (size/num_workers * (i + 1));

        var job = {
            'x': x.elements.slice(fro, to),
            'y': y.elements.slice(fro, to),
            'a': a,
            'iter': iters
        }

        var JSONjob = JSON.stringify(job);

        worker.onmessage = workerDone;
        worker.postMessage({id: i, d: JSONjob});
    }

}

step = function(x) {

    $.getJSON('y.json',function(data){
        y = $M(data);
        end(x,y);
    }).error(function(){
        console.log('error');
    });

}

start = function() {

    $('#working').show();
    $('#timer').hide();
    $('#done').html('');

    $.getJSON('x.json',function(data){
        x = $M(data);

        window.profiler = x;
        return;
        step(x);
    }).error(function(){
        console.log('error');
    });

}

$('#working').hide();
$('#timer').hide();