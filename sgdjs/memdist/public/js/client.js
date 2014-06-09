var io, device, dataworkerId, dataworker, processworker, processworkers, channel;

var processWorkerCounter = 1;

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

  } else if(e.data.type == 'data') {

    dataworker.postMessage({
      type: 'data',
      data: e.data
    });

  }
  
}

var measurePerformance = function(data) {
  id = data.id;
  vsec = data.vsec;
  isec = data.isec;

  // update visuals
  if(! $('#' + id).length ) {
    // insert table
    $('#performance').append(' \
      <tr id="' + id + '"> \
        <td>' + processWorkerCounter + '</td> \
        <td class="vsec"></td> \
        <td class="vsecdelta"></td> \
        <td class="isec"></td> \
        <td class="isecdelta"></td> \
      </tr> \
      ');

    processWorkerCounter++;

    performance[id] = {
      vsec: vsec,
      vsecHistory: [],
      isec: isec,
      isecHistory: []
    }

  }

  prevVsec = performance[id].vsec;
  prevIsec = performance[id].isec;

  vsecDelta = vsec - prevVsec;
  isecDelta = isec - prevIsec;

  $('#' + id + ' .vsec').html(vsec.toFixed(3));
  $('#' + id + ' .isec').html(isec.toFixed(3));
  $('#' + id + ' .vsecdelta').html(vsecDelta.toFixed(3));
  $('#' + id + ' .isecdelta').html(isecDelta.toFixed(3));

  // number of workers
  $('#nrworkers').html(processWorkerCounter - 1);

  performance[id].vsec = vsec;
  performance[id].isec = isec;

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


}

var processworkerMessage = function(e) {

  if(e.data.type == 'log') {

    logger('PW >> ' + e.data.data); 

  } else if(e.data.type == 'performance') {
    measurePerformance(e.data);
  }
  
}

var start = function() {

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
  
  if(!dataworker) {
    logger('No dataworker connected, do this first.');
    return;
  }

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

var run = function() {
  // clients like this should not be able to run.
  // this needs to move to /master
  dataworker.postMessage({
    type: 'run'
  });
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
$('#addworker').click(addworker);
$('#runjob').click(run);
document.getElementById('files').addEventListener('change', handleFileSelect, false);


/*

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