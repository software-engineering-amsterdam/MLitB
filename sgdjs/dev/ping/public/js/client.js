ws = new WebSocket('ws://192.168.2.20:8080');

//ws.onopen = function(e) {
	
//}

ws.onmessage = function (e) {

  d = LZString.decompressFromBase64(e.data);

  f = LZString.compressToBase64(d);

  ws.send(f);
};