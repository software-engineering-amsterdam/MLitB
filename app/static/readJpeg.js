'use strict';
var pixelr = require('pixelr');
var fs = require('fs');
// Colors.js contains a function to match RGB colors to terminal characters.
// It's from the awesome library Blessed: https://github.com/chjj/blessed

/** pixelr.read(filename, format, callback)
 * Format can be either 'jpeg' or 'png'.
 * This function creates a one-dimensional array of values.
 * PNGs have 4 values per pixel: R, G, B, Alpha
 * JPEGs have 3 values per pixel: R, G, B
 * The callback takes an object with properties 'pixels' (an array), 'width', and 'height'.
 */

var final_size=10;
var sumImages = Array.apply(null, new Array(final_size*final_size*3)).map(Number.prototype.valueOf,0);
var NImages = 0;

function asciizeImage(err, image,ext) {
  if (err) { console.log(err); return; }
  // console.log(ext);
  var x = downsample(image,10);
  for (var i in x){
    sumImages[i]+=x[i];
  }
  NImages+=1;
  // console.log(x);
  // console.log(x.length);
}

function downsample(image, final_size, rgb_orientation){
  var final_size = typeof final_size !== 'undefined' ? final_size : 32;
  var rgb_orientation = typeof rgb_orientation !== 'undefined' ? rgb_orientation : 'rrrgggbbb'
  var ori_width = image.width;
  var ori_height = image.height;
  var shorter_size = ori_width > ori_height ? ori_height : ori_width;
  var step = shorter_size/final_size;
  var start = Math.round(step/2)-1; //for 0-based index array
  var row_idx = []; //already zero-based
  var col_idx = []; //already zero-based
  var new_image = []; //we will use array buffer later
  for (var row = 0; row< ori_height+1;row=row+step){ //ori_width+1 to give a chance row 5.1 but eventually will get floored
    row_idx.push(start+Math.floor(row));
  }
  if (row_idx.length>final_size){
    var start=Math.floor((row_idx.length-final_size)/2);
    row_idx=row_idx.slice(start,final_size);
  }
  for (var col=0; col< ori_width+1;col=col+step){
    col_idx.push(start+Math.floor(col));
  }
  if (col_idx.length>final_size){
    var start=Math.floor((col_idx.length-final_size)/2);
    col_idx=col_idx.slice(start,final_size);
  }
  //2x2 image RGB = r1, g1, b1, r2, g2, b2, r3, g3, b3, r4, g4, b4
  if (rgb_orientation==='rrrgggbbb'){
    for (var i=0;i<row_idx.length;i++){
      for (var j=0;j<col_idx.length;j++){
        var R_idx = row_idx[i]*ori_width*3+col_idx[j]*3;
        var G_idx = R_idx+1;
        var B_idx = R_idx+2;
        new_image.push(image.pixels[R_idx]);
        new_image.push(image.pixels[G_idx]);
        new_image.push(image.pixels[B_idx]);
      }
    }
  }
  else if (rgb_orientation==='rgbrgbrgb'){
    imgR=[];
    imgG=[];
    imgB=[];
    for (var i=0;i<row_idx.length;i++){
      for (var j=0;j<col_idx.length;j++){
        var R_idx = row_idx[i]*ori_width*3+col_idx[j]*3;
        var G_idx = R_idx+1;
        var B_idx = R_idx+2;
        imgR.push(image.pixels[R_idx]);
        imgG.push(image.pixels[G_idx]);
        imgB.push(image.pixels[B_idx]);
      }
    }
    new_image=imgR.concat(imgG).concat(imgB)
  }
  return new_image; 
}

function getLabelAndImagePath(dir,dataset){
    dataset = dataset || {}; //key = 'label', values = filename
    if (typeof dataset === 'undefined') dataset=[];
    var dirs = fs.readdirSync(dir);
    for(var i in dirs){
        if (!dirs.hasOwnProperty(i)) continue;
        var label = dir+'/'+dirs[i];
        if (fs.statSync(label).isDirectory()){
            var files = fs.readdirSync(label);
            var filepaths = [];
            for (var f in files){
              if (!files.hasOwnProperty(f)) continue;
              var path = label+'/'+files[f];
              filepaths.push(path);
            }
            dataset[label] = filepaths;
        } else {
            continue;
        }
    }
    return dataset;
}

// pixelr.read('twitter.jpg', "jpeg", function(err,image){asciizeImage(err,image,"jpeg")}); 

var dataset = getLabelAndImagePath('../../Data/IMAGENET');
for (var label in dataset){
  var images = dataset[label];
  for (var img in images){
    var exts =images[img].split(".");
    var ext = exts[exts.length-1].toLowerCase();
    // console.log(ext);
    if (ext === "jpeg" || ext === "jpg"){
      pixelr.read(images[img], "jpeg", function(err,image){asciizeImage(err,image,"jpeg")});  
    } else if (ext === "png"){
      pixelr.read(images[img], "png", function(err,image){asciizeImage(err,image,"png")}); 
      //still not correct for png, because asciizeImage only deal with RGB not RGBA
    }
    
  }
}

console.log(sumImages);
console.log(NImages);