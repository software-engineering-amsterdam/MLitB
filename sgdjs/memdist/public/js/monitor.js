io = io.connect();

io.emit('monitor');

var log_list = [];

var errorchart, powerchart;

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

  if(!errorchart) {
    errorchart = initChart(errorchart, '#errorcontainer', 'error rate', '#0000FF');
  }

  errorchart = drawChart(errorchart, [data.step, data.error]);

}

var displayPower = function(data) {

  $('span#step.power').html(data.step.toString());
  $('span#power').html(data.power.toString());
  $('span#clients').html(data.clients.toString());

  if(!powerchart) {
    powerchart = initChart(powerchart, '#powercontainer', 'network power', '#FF0000');
  }

  powerchart = drawChart(powerchart, [data.step, data.power]);

}

var initChart = function(chart, selector, name, color) {

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

var drawChart = function(chart, point) {

  series = chart.series[0];

  shift = false;
  if(series.data.length >= 20) {
    shift = true;
  }

  chart.series[0].addPoint(point, true, shift);

  console.log(chart.series[0].data);

  return chart;

}

var monitor = function(e) {

    if(e.type == 'parameter') {
        displayParameter(e.data);
    } else if(e.type == 'power') {
        displayPower(e.data);
    }
}

io.on('monitor', monitor);