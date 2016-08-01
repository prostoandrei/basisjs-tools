if (typeof io == 'undefined')
{
  console.warn('basisjs-tools[Client Inspector]: socket.io is not defined');
  return;
}

var Client = require('./type.js').Client;
var socket = io.connect(location.host, { transports: ['websocket', 'polling'] });

function syncClientList(data){
  Client.all.setAndDestroyRemoved(basis.array(data).map(Client.reader));
}

// TODO: remove
global.socket = socket;

// connection events
socket.on('connect', function(){
  console.log('basisjs-tools[Client Inspector]: connected');
  socket.emit('devtool:getClientList', syncClientList);
});

socket.on('disconnect', function(){
  console.log('basisjs-tools[Client Inspector]: disconnected');
});

socket.on('devtool:clientList', syncClientList);

// common events
socket.on('error', function(err){
  console.error('basisjs-tools[Client Inspector]: Socket error:', (err && err.operation ? 'operation ' + err.operation + ': ' + err.message : err));
});

module.exports = {
  getClientUI: function(clientId, callback){
    socket.emit('devtool:getClientUI', clientId, function(err, code){
      Client(clientId).set('ui', code);
      callback(code);
    });
  }
};