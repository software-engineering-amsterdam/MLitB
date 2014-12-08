
(function () {

$('#download').click(function(e){

	e.preventDefault();

	var id = $('#id').val();
	
	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'http://localhost:8001/download/', true);
	xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	xhr.responseType = 'arraybuffer';


	xhr.onload = function() {

		// to copy arraybuffer:
			
		var dst = new ArrayBuffer(this.response.byteLength);
		new Uint8Array(dst).set(new Uint8Array(this.response));

		// end copy arraybuffer

		var new_zip = new JSZip();
		new_zip.load(dst);

		opop = function(obj) {
		  for (var key in obj) {
		    // Uncomment below to fix prototype problem.
		    // if (!Object.hasOwnProperty.call(obj, key)) continue;
		    var result = obj[key];
		    // If the property can't be deleted fail with an error.
		    if (!delete obj[key]) { throw new Error(); }
		    return result;
		  } 
		}

		process = function(a) {

			var file = opop(a);
			if(!file) {
				console.log('done');
				return;
			}

			var b = file.asUint8Array();

			var j = new JpegImage();
			j.parse(b);

			console.log(j);

			var p = j.getData(j.width, j.height);
			console.log(p);

			var blob = new Blob([b], {'type': 'image/jpeg'});
			var url = URL.createObjectURL(blob);

			var img = new Image();

			img.src = url;

			img.onload = function() {

				var canvas = document.createElement('canvas');
				var context = canvas.getContext('2d');

				context.drawImage(img, 0, 0);

				var data = context.getImageData(0, 0, img.width, img.height).data;

				//$(img).appendTo('#images');

			}

			//process(a);

		}

		process(new_zip.files);

	};

	xhr.send(JSON.stringify({
		ids: Array.apply(null, {length: id}).map(Number.call, Number)
	}));

});

}());
