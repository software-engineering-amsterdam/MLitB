io = io.connect();

io.emit('test');


var is_initialized = false;
var is_running=false;
var discrete_loss,piece;
var lastParameter;
var testIteration = 0;

var errorchart;

var worker;

var workerMessage = function(e) {

	discrete_loss = e.data.data.discrete_loss;
	delta = e.data.data.delta;
  nData = e.data.data.nData;

	$('span#step.error').html(testIteration.toString());
	$('span#error').html(discrete_loss.toString()+"/"+nData.toString());
	$('span#delta').html(delta.toString());

	if(!errorchart) {
		errorchart = initChart(errorchart, '#errorcontainer', 'error rate', '#0000FF');
	}

	errorchart = drawChart(errorchart, [testIteration, discrete_loss]);

	is_running=false;
	testIteration++;

}

var displayParameter = function(data) {

  worker.postMessage({
    type: 'data',
    data: data
  });

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

  return chart;

}

var processUploadedData = function(file) {

  newData = JSON.parse(file.target.result);
  var msg = "Upload data file not OK.";
  if(newData) {
    msg = "Upload data file OK, length: " + newData.length;
  }

  worker.postMessage({
    type: 'fileupload',
    data: newData
  });

}

var clearFileInput = function() 
{ 
    var oldInput = document.getElementById("files"); 
    var newInput = document.createElement("input"); 
     
    newInput.type = "file"; 
    newInput.id = oldInput.id; 
    newInput.name = oldInput.name; 
    newInput.className = oldInput.className; 
    newInput.style.cssText = oldInput.style.cssText; 
    // copy any other relevant attributes 
     
    oldInput.parentNode.replaceChild(newInput, oldInput);
    newInput.addEventListener('change', handleFileSelect, false);
}

var handleFileSelect = function(evt) {
  var files = evt.target.files; // FileList object

  // Loop through the FileList and render image files as thumbnails.
  for (var i = 0, f; f = files[i]; i++) {

    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
      return function(e) {
        processUploadedData(e);
        clearFileInput();
      };
    })(f);

    // Read in the image file as a data URL.
    reader.readAsText(f);
  }
}

var test = function(e) {
	if(e.type == 'parameter' && !is_running) {
        displayParameter(e.data);
    }
}

io.on('test', test);

if(!worker) {
  worker = new Worker('/js/testworker.js');
  worker.onmessage = workerMessage;
}

document.getElementById('files').addEventListener('change', handleFileSelect, false);
