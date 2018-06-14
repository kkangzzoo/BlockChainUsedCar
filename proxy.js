var net = require('net'),
    JsonSocket = require('json-socket');
var express = require('express');
var app=express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); 
var request = require('request');
var util= require('util');


var port = 9836;
var server = net.createServer();
server.listen(port);
server.on('connection', function(socket) { //This is a standard net.Socket
    socket = new JsonSocket(socket); //Now we've decorated the net.Socket to be a JsonSocket
    socket.on('message', function(message) {
        console.log(message[0]);
        var url = message[1];
        request({ url: url, 
            method: "POST", 
            json: true, 
            body: message[0]}, function (error, response, body){ 

                console.log('***'+error);
                console.log('***'+body);
                console.log(util.inspect(body, false, null))
                console.log(typeof body);
            }
        )
        socket.end();          
    });
})

