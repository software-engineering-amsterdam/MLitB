var io;

$('#start').click(function() {

	io = io.connect()

  var device = "desktop";
  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    device = "mobile";
  }

	// Emit ready event.
	io.emit('ready', device) 

	// Listen for the talk event.
	io.on('talk', function(data) {
	    logger(data.message);
	})  

  io.on('assignedData', function(data) {
      downloadData(data);
  });

  io.on('dataFirstIndex', function(data) {
      updateNewDataIndices(data);
  });

  io.on('proxyDataClient', function(obj) {
      proxyData(obj);
  });

  io.on('uploadData', function(obj) {
      uploadData(obj);
  });

  io.on('map', function(obj) {
      map(obj);
  });

  io.on('log', function(text) {
      logger(text);
  });

});

$('#runjob').click(function() {
  io.emit('run');
});

// the DATA (with indexes)
var data = [];

// new uploaded data
var newData = [];

var dataStart = 0;
var dataToGo = 0;

logger = function(text) {
  // can be used for any display logging facility
  //var val = $('pre.log').html();
  //$('pre.log').html(val + text + '\n');
}

getDataByid = function(id) {

  var r = jQuery.grep(data, function( a ) {
    return a.id == id;
  });

  return r[0];

}

updateProgressBar = function() {
  var value = 100 - parseInt((dataToGo/dataStart) * 100);
  $('#download').html('Downloading data: ' + value + '%');

  if(value == 100) {
    setTimeout(function(){ $('#download').fadeOut(); } , 1000);
  }
}

proxyData = function(obj) {
  // other client requests data from YOU.
  // send to server, it will proxy the data to the recipient.

  io.emit('proxyData', {
    data: getDataByid(obj.id),
    recipient: obj.recipient
  });

}

uploadData = function(obj) {
  // this is the ACTUAL DATA. save it.
  data.push(obj);

  dataToGo--;

  if(!dataToGo) {
    io.emit('downloadDone');
  }
  updateProgressBar();

}

downloadData = function(data) {
  // this client needs to download the data according to the indices.
  // data contains ID and list of clients.

  // this can be implemented in two ways:
  // 1. request server to proxy the data.
  // 2. peer-to-peer request the data (peerJS could do that.)

  // we do option 1 for now.
  // this means we just send the data package back.
  // dull, but good for performance.
  // why? because we want to send separate JS events initiated by the client
  // instead of letting the server block on the sends (at allocation time).

  // some visual awesomeness
  dataToGo = data.length;
  dataStart = dataToGo;

  $('#download').show();
  io.emit('downloadData', data);

}

updateNewDataIndices = function(index) {
  // add indices to newData starting from index.
  var i;

  for(i = 0; i < newData.length; i++) {
    newData[i].id = index;
    index++;
  }

  data = data.concat(newData);
  newData = [];

}

processUploadedData = function(file) {

  newData = JSON.parse(file.target.result);
  var msg = "NOT OK";
  if(newData) {
    msg = "OK, length: " + newData.length * 1000;
  }

  // tell the server this client offers data of length newData.length
  io.emit('offerData', newData.length);

  logger(msg);

}

map = function(obj) {

  var list = obj.list;
  var parameters = obj.parameters;
  var settings = obj.settings;

  $('#total').html(data.length);
  $('#working').html(list.length);
  $('#spare').html(data.length - list.length);
  $('#wtime').html(settings.runtime);

  // chart variables
  var percentile = 100 / data.length;
  var processingPart = list.length * percentile;
  var restPart = 100 - processingPart;

  var processLabel = processingPart.toFixed(3) + '%';
  var restLabel = restPart.toFixed(3) + '%';

  // make nice chart
  chartData = [{"label":processLabel, "value":processingPart}, 
          {"label":restLabel, "value":restPart}];

  datachart(chartData);

  // get working set from local data set
  var workingset = data.filter(function(e) {
    return (list.indexOf(e.id) > -1);
  });

  // do computation
  var running = true;
  var start = Date.now();
  var end = Date.now() + settings.runtime;
  var piece, i, j, vector, now;
  var total = 0;
  var iterations = 0;

  while(running) {

    i = workingset.length;
    while(i--) {

      piece = workingset[i];

      // SAMPLE COMPUTATION.
      // ADD ALL NUMBERS AND DIVIDE
      j = piece.data.length;
      while(j--) {
        vector = piece.data[j];
        parameters += vector;
        total++;
      }

    }

    parameters /= total;

    now = Date.now()
    if(now >= end) {
      running = false;
    }

    iterations++;
 
  }

  // calculate speed v / 1000i

  var vsec = ((iterations / 1000) * list.length) / (settings.runtime / 1000);
  var isec = iterations / (settings.runtime / 1000);

  $('#vsec').html(vsec.toFixed(3));
  $('#isec').html(isec.toFixed(3));

  // reduce
  io.emit('reduce', {
    'parameters': parameters,
    'speed': vsec
  });

}

function datachart(data) {

    $('#datachart').empty();

    var w = 200,                        //width
    h = 200,                            //height
    r = 75,                            //radius
    color = d3.scale.category20c();     //builtin range of colors

    var vis = d3.select("#datachart")
        .append("svg:svg")              //create the SVG element inside the <body>
        .data([data])                   //associate our data with the document
            .attr("width", w)           //set the width and height of our visualization (these will be attributes of the <svg> tag
            .attr("height", h)
        .append("svg:g")                //make a group to hold our pie chart
            .attr("transform", "translate(" + r + "," + r + ")")    //move the center of the pie chart from 0, 0 to radius, radius

    var arc = d3.svg.arc()              //this will create <path> elements for us using arc data
        .outerRadius(r);

    var pie = d3.layout.pie()           //this will create arc data for us given a list of values
        .value(function(d) { return d.value; });    //we must tell it out to access the value of each element in our data array

    var arcs = vis.selectAll("g.slice")     //this selects all <g> elements with class slice (there aren't any yet)
        .data(pie)                          //associate the generated pie data (an array of arcs, each having startAngle, endAngle and value properties) 
        .enter()                            //this will create <g> elements for every "extra" data element that should be associated with a selection. The result is creating a <g> for every object in the data array
            .append("svg:g")                //create a group to hold each slice (we will have a <path> and a <text> element associated with each slice)
                .attr("class", "slice");    //allow us to style things in the slices (like text)

        arcs.append("svg:path")
                .attr("fill", function(d, i) { return color(i); } ) //set the color for each slice to be chosen from the color function defined above
                .attr("d", arc);                                    //this creates the actual SVG path using the associated data (pie) with the arc drawing function

        arcs.append("svg:text")                                     //add a label to each slice
                .attr("transform", function(d) {                    //set the label's origin to the center of the arc
                //we have to make sure to set these before calling arc.centroid
                d.innerRadius = 0;
                d.outerRadius = r;
                return "translate(" + arc.centroid(d) + ")";        //this gives us a pair of coordinates like [50, 50]
            })
            .attr("text-anchor", "middle")                          //center the text on it's origin
            .text(function(d, i) { return data[i].label; });        //get the label from our original data array
        

}

function handleFileSelect(evt) {
  var files = evt.target.files; // FileList object

  // Loop through the FileList and render image files as thumbnails.
  for (var i = 0, f; f = files[i]; i++) {

    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
      return function(e) {
        processUploadedData(e);
      };
    })(f);

    // Read in the image file as a data URL.
    reader.readAsText(f);
  }
}

document.getElementById('files').addEventListener('change', handleFileSelect, false);