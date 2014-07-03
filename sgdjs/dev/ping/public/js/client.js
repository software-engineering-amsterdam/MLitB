ws = new WebSocket('ws://192.168.2.20:8080');

//ws.onopen = function(e) {
	
//}

ws.onmessage = function (e) {
  ws.send(e.data);
};