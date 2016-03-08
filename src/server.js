var http = require('http');
var fs = require('fs');
var socketio = require('socket.io');
var bullet = require('./bullet.js'); 

var port = process.env.PORT || process.env.NODE_PORT || 3000;

var index = fs.readFileSync(__dirname + '/../client/client.html');

function onRequest(request, response){
	response.writeHead(200, {"Content-Type": "text/html"});
	response.write(index);
	response.end();
}

var app = http.createServer(onRequest).listen(port);
console.log("Listening on 127.0.0.1:" + port);

//pass in the http server into socketio and grab the websocket server as io
var io = socketio(app);

var players = {};
var arrayBullets = [];
var time = new Date().getTime();

var onJoined = function(socket) {
	socket.on('join', function(){
		socket.join('room1');

		socket.emit('initData', {
			players: players,
			arrayBullets: arrayBullets
		});
	});
};

var onMsg = function(socket) {
	socket.on('createPlayer', function(data){
		players[data.name] = data;
	});
	socket.on('updatePlayer', function(data){
		players[data.name].pos = data.pos;
	});
};


io.sockets.on("connection", function(socket) {
 onJoined(socket);
 onMsg(socket);
});

function update(){
	var keys = Object.keys(players);
	var now = new Date().getTime();

	// in seconds
	var dt = (now - time) / 1000;
	time = now;

	for(var i = 0; i<arrayBullets.length; i++){
		arrayBullets[i].update(dt);
	}

	for(var i = 0; i < keys.length; i++){
		var player = players[ keys[i] ];

		for(var j=0; j<arrayBullets.length; j++){
			// if a player hits a bullet
			var distance = circlesIntersect(player.pos, arrayBullets[j].pos);

			if(distance <= (player.radius + arrayBullets[j].radius)){
				player.hit = 200;
				arrayBullets[j].active = false;
			}
			else if(player.hit > 0){
				player.hit--;
			}
		}
	}

	// remove bullets that are out of bound
	arrayBullets = arrayBullets.filter(function(bullet){
		return bullet.active;
	});

	// add new bullets if there are less the 5
	if (arrayBullets.length < 10){
		var num = 10 - arrayBullets.length;

		for(var i=0; i<num; i++){
			arrayBullets.push(bullet.create(getRandom(20, 480), -50, 10, getRandom(-1, 1) * 100, getRandom(0.5, 1) * 100));
		}
	}

	var keys = Object.keys(players);

	io.sockets.in('room1').emit('updatePlayers', {
		players: players
	});
	io.sockets.in('room1').emit('updateBullets', {
		arrayBullets: arrayBullets
	});
}

setInterval(update, 1000/60);

//Utilties
function getRandom(min, max) {
  	return Math.random() * (max - min) + min;
}

function circlesIntersect(c1,c2){
	var dx = c2.x - c1.x;
	var dy = c2.y - c1.y;
	var distance = Math.sqrt(dx*dx + dy*dy);
	return distance;
}

console.log('websocket server started');