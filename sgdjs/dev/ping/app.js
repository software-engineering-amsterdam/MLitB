express = require('express.io'),
app = require('express.io')()
  , stylus = require('stylus')
  , nib = require('nib')
  , http = require('http')
  , lzstring = require('lz-string')
app.http().io()

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .set('compress', true)
    .use(nib())
}

app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))
app.use(stylus.middleware(
  { src: __dirname + '/public'
  , compile: compile
  }
))
app.use(express.static(__dirname + '/public'))

ping = function(d) {

  c = lzstring.decompress(d);
  
  time = hrtime();
  diff = time - req.io.socket.time;

  id = req.io.socket.id;

  console.log('id/round trip:', id, diff);

  setTimeout(function(){ start(req); }, 1000);

}

start = function(req) {
  
  req.io.socket.time = hrtime();

  c = lzstring.compress(data);

  req.io.socket.emit('ping', c);

}


// Send the client html.
app.get('/', function(req, res) {
    res.render('index')
});

app.listen(8071);