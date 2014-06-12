var io, device, dataworkerId, dataworker, processworker, processworkers, channel, canAddNewWorker;

var ENABLE_AUTOSCALE = true;

var MEASURE_COUNTER = 5;
var MEASURE_THRESHOLD = 5;

var processWorkerCounter = 1;

var measurementsCounter = MEASURE_COUNTER;

var measurementsFlag = false;
var measurements = [0,0,0];

var stable = false;

var performance = {};

var logger = function(text) {

  var val = $('pre.log').html();
  $('pre.log').html(text + '\n' + val);

}

var dataworkerMessage = function(e) {

  if(e.data.type == 'log') {

    logger('DW >> ' + e.data.data); 

  } else if(e.data.type == 'dataworkerid') {

    dataworkerId = e.data.data;

    canAddNewWorker = false;
    addworker();

  } else if(e.data.type == 'data') {

    dataworker.postMessage({
      type: 'data',
      data: e.data
    });

  }
  
}

var metaPerformance = function() {

  // number of workers
  $('#nrworkers').html(processWorkerCounter - 1);

  var vsecAverage = 0.0;
  var isecAverage = 0.0;
  for(k in performance) {
    vsecAverage += performance[k].vsec;
    isecAverage += performance[k].isec;
  }

  vsecAverage /= processWorkerCounter -1;
  isecAverage /= processWorkerCounter -1

  $('.vsecaverage').html(vsecAverage.toFixed(3));
  $('.isecaverage').html(isecAverage.toFixed(3));

  if(!stable && canAddNewWorker && ENABLE_AUTOSCALE) {

    measurementsCounter--;
    if(!measurementsCounter) {

      measurementsCounter = MEASURE_COUNTER;
      measurements.push( vsecAverage.toFixed(3) * (processWorkerCounter - 1) );
      measurements.shift();

      if(measurementsFlag) {

        if((measurements[2] - MEASURE_THRESHOLD * 2) < measurements[0]) {
          // stop.
          // remove 2.
          stable = true;
          console.log('flag @', measurements[1], 'not ok.');
          console.log('current worker @', measurements[2], 'not ok.');
          console.log('stable @', measurements[0]);
          removeworker();
          removeworker();
          return

        } else {
          // continue.
          measurementsFlag = false;  

        }

      } else {
      
        if((measurements[2] - MEASURE_THRESHOLD) < measurements[1]) {
          
          measurementsFlag = true;

        }

      }

      // continue
      console.log('add worker @', measurements[2]);
      canAddNewWorker = false;
      addworker();

    }

  }

}

var getWorkerById = function(id) {

  var i = processworkers.length;
  while(i--) {
    p = processworkers[i];
    if(p.id == id) {
      return p;
    }
  }
  return false;

}

var measurePerformance = function(data) {
  id = data.id;
  vsec = data.vsec;
  isec = data.isec;
  lag = data.lag;

  if(!(getWorkerById(id))) {
    return;
  }

  // update visuals
  if(! $('#' + id).length ) {
    // insert table
    $('#performance').append(' \
      <tr id="' + id + '"> \
        <td>' + id + '</td> \
        <td class="vsec"></td> \
        <td class="isec"></td> \
        <td class="lag"></td> \
      </tr> \
      ');

    processWorkerCounter++;

    performance[id] = {
      vsec: vsec,
      vsecHistory: [],
      isec: isec,
      isecHistory: []
    }

    // new node arrived, add.
    canAddNewWorker = true;

  }

  prevVsec = performance[id].vsec;
  prevIsec = performance[id].isec;

  $('#' + id + ' .vsec').html(vsec.toFixed(3));
  $('#' + id + ' .isec').html(isec.toFixed(3));
  $('#' + id + ' .lag').html(lag.toFixed(3));

  performance[id].vsec = vsec;
  performance[id].isec = isec;

  if(processworkers[0].id == id) {
    metaPerformance();
  }

}

var registerprocessworker = function(e) {

  processworkers[processworkers.length-1].id = e.data;

}

var processworkerMessage = function(e) {

  if(e.data.type == 'log') {

    logger('PW >> ' + e.data.data); 

  } else if(e.data.type == 'performance') {
    measurePerformance(e.data);
  } else if(e.data.type == 'registerprocessworker') {
    registerprocessworker(e.data);
  }
  
}

var start = function() {

  $('#start').attr('disabled', 'true')

  device = "desktop";
  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    device = "mobile";
  }

  processworkers = [];

  dataworker = new Worker('/js/dataworker.js');

  dataworker.onmessage = dataworkerMessage;
  dataworker.postMessage({
    type: 'start',
    data: device
  });

}

var addworker = function() {
  
  //if(!dataworker) {
  //  logger('No dataworker connected, do this first.');
  // return;
  //}

  processworker = new Worker('/js/processworker.js');

  processworker.onmessage = processworkerMessage;

  channel = new MessageChannel();

  message = {
    device: device,
    dataworker: dataworkerId
  }

  processworker.postMessage({
    type: 'start',
    data: message
  },[
    channel.port2
  ]);

  processworkers.push(processworker);

  dataworker.postMessage({
    type: 'addprocessworker'
  }, [
    channel.port1
  ]);

}

var removeworker = function() {

  lastWorker = processworkers.pop();

  console.log('removing', lastWorker.id);

  $('#' + lastWorker.id).remove();

  lastWorker.postMessage({
    type: 'terminate'
  })
  processWorkerCounter--;

}

var processUploadedData = function(file) {

  newData = JSON.parse(file.target.result);
  var msg = "Upload data file not OK.";
  if(newData) {
    msg = "Upload data file OK, length: " + newData.length * 1000;
  }

  logger(msg);

  dataworker.postMessage({
    type: 'fileupload',
    data: newData
  });

}

var terminatenow = function(e) {
  // called when window closes. immediate shutdown
  console.log('terminate all');
  var i = processworkers.length;
  while(i--) {
    processworkers[i].postMessage({
      type: 'terminate'
    });
  }
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

$('#start').click(start);
document.getElementById('files').addEventListener('change', handleFileSelect, false);

window.onbeforeunload = terminatenow;


/*

// FOR FUNSIES
// To draw a chart displaying data.
// Not used now.

});

updateProgressBar = function() {
  $('#download').html('Downloading data...');

  if(dataToGo == 0) {
    setTimeout(function(){ $('#download').fadeOut(); } , 1000);
  }
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

*/