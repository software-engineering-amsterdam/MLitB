var express     = require('express');
    app         = express(),
    server      = require('http').Server(app),
    io          = require('socket.io')(server),
    bodyParser  = require('body-parser'),
    master      = require('./master');


master = new master();

// set CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// express settings

app.set('views', './views')
app.set('view engine', 'ejs')

app.use(bodyParser.json({limit: '500mb'}))
app.use('/static', express.static(__dirname + '/static'));

app.get('/', function (req, res) {
    
    res.render('index');

});

app.post('/add-nn', function(req, res) {

    var boss = master.boss_by_id(req.body.boss);

    if(!boss) {

        res.writeHead(200, {'content-type': 'text/plain'});
        master.logger('Cannot add NN: XHR faulty.')
        res.end();
        return;

    }

    var conf = req.body;

    master.add_nn(boss, conf);

    res.writeHead(200, {'content-type': 'text/plain'});
    res.write('ok');
    res.end();

});

app.get('/download-nn/:nn_id', function(req, res) {

    var nn_id = req.param('nn_id');

    var r = master.download_nn(nn_id);

    if(!r) {
        res.status(404).send('Not found');
        return;
    }

    res.writeHead(200, {'content-type': 'application/json'});
    res.end(JSON.stringify(r));

    res.end();

});

io.on('connection', function (socket) {

    socket.emit('message', {
        type: 'init',
        data: socket.id
    });

    socket.on('message', function(d) {

        var type = d.type;
        var data = d.data;

        if(type == 'register_boss') {
            master.register_boss(socket);
        } else if(type == 'new_slave') {
            master.new_slave(data, socket);
        } else if(type == 'slave_work') {
            master.slave_work(data);
        } else if(type == 'slave_track') {
            master.slave_track(data);
        } else if(type == 'save_hyperparameters') {
            master.save_hyperparameters(data);
        } else if(type == 'add_data') {
            master.add_data(socket, data);
        } else if(type == 'register_data') {
            master.register_data(data);
        } else if(type == 'start_nn') {
            master.start_nn(data);
        } else if(type == 'pause_nn') {
            master.pause_nn(data);
        } else if(type == 'reboot_nn') {
            master.reboot_nn(data);
        } else if(type == "reduction") {
            master.reduction(data);
        }

    });

    socket.on('disconnect', function() {
        master.client_disconnected(socket);    
    })

});

server.listen(8000)