io = io.connect();

io.emit('monitor');

var log_list = [];

var errorchart, powerchart, latencychart;

var started;

var logger = function(text) {

  log_list.push(text);
  log_list = log_list.slice(-100, 200);

  text = "";

  var i = log_list.length;
  while(i--) {
    text += log_list[i];
    text += '\n';
  }

  $('pre#log').html(text);

}

var lastParameter;

var displayParameter = function(data) {

  delta = 0.0;
  if(lastParameter) {
    delta = data.error - lastParameter;
    delta = delta.toFixed(3);
  }

  lastParameter = data.error;

	$('span#step.error').html(data.step.toString());
  $('span#error').html(data.error.toString());
  $('span#delta').html(delta.toString());

  series = [{
      data: [],
      name: 'error rate',
      color: '#0000FF',
      type: 'line',
      point: {
        events: {
            'click': function() {
                if (this.series.data.length > 1) this.remove();
            }
        }
      }
    }];

  if(!errorchart) {
    errorchart = initChart(errorchart, series, '#errorcontainer');
  }

  errorchart = drawChart(errorchart, 0, [data.step, data.error]);

}

var displayPower = function(data) {

  $('span#step.power').html(data.step.toString());
  $('span#power').html(data.power.toString());
  $('span#clients').html(data.clients.toString());

  series = [{
      data: [],
      name: 'network power',
      color: '#FF0000',
      type: 'line',
      point: {
        events: {
            'click': function() {
                if (this.series.data.length > 1) this.remove();
            }
        }
      }
    }];

  if(!powerchart) {
    powerchart = initChart(powerchart, series, '#powercontainer');
  }

  powerchart = drawChart(powerchart, 0, [data.step, data.power]);

}

var displayLatency = function(data) {

  $('span#step.latency').html(data.step.toString());
  $('span#latencymin').html(data.min.toString());
  $('span#latencymax').html(data.max.toString());
  $('span#latencyavg').html(data.avg.toString());

  series = [{
      name: 'average',
      data: [],
      color: '#FF0000',
      type: 'line',
      zIndex: 1
  },{
      data: [],
      name: 'latency',
      color: '#0000FF',
      type: 'arearange',
      linkedTo: ':previous',
      fillOpacity: 0.3,
      zIndex: 0
  }];

  if(!latencychart) {
    latencychart = initChart(latencychart, series, '#latencycontainer');
  }

  latencychart = drawChart(latencychart, 1, [data.step, data.min, data.max]);
  latencychart = drawChart(latencychart, 0, [data.step, data.avg]);

}

var initChart = function(chart, series, selector) {

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
        }]
    },
    xAxis: {
      minTickInterval: 1
    },
    series: series
  });

  return $(selector).highcharts();

}

var drawChart = function(chart, id, point) {

  series = chart.series[0];

  nice = true;

  shift = false;
  if(series.data.length >= 20) {
    shift = true;
  }

  if(chart.options.chart.type == 'arearange') {
    nice = false;
  }

  chart.series[id].addPoint(point, true, shift, nice);

  return chart;

}

var monitor = function(e) {

    if(e.type == 'parameter') {
        displayParameter(e.data);
    } else if(e.type == 'power') {
        displayPower(e.data);
    } else if(e.type == 'latency') {
        displayLatency(e.data);
    }
}

var startprogram = function() {
  io.emit('start');
  started = true;
  controls()
}

var pauseprogram = function() {
  io.emit('stop');
  started = false;
  controls()
}

var resetprogram = function() {
  io.emit('reset');

  errorchart = initChart(errorchart, '#errorcontainer', 'error rate', '#0000FF');
  powerchart = initChart(powerchart, '#powercontainer', 'network power', '#FF0000');
}

var controls = function() {

  if(started) {
    $('#start').attr('disabled', 'true');
    $('#reset').attr('disabled', 'true');

    $('#pause').removeAttr('disabled');
  } else {

    $('#start').removeAttr('disabled');
    $('#reset').removeAttr('disabled');

    $('#pause').attr('disabled', 'true');
  }

}

io.on('monitor', monitor);

started = JSON.parse($('#started').val());

controls();

$('#start').click(startprogram);
$('#pause').click(pauseprogram);
$('#reset').click(resetprogram);