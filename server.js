#!/usr/bin/env node
'use strict';

require('dotenv').config();

const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const performance = require('perf_hooks').performance;
const port = process.env.PORT || 3000;

let users = [];
let connections = 0;
let userrooms = {};
let regexUsername = /^[\w-]{5,30}$/;
let regexRoom = /^[\w-]{1,30}$/;

process.title = 'WakanimWithFriends';

server.listen(port, _ => {
    console.log("Server listening at port %d", port);
});

io.on('connection', socket => {
    connections++;
    console.log("Connected: %s sockets connected", connections);

    socket.on('disconnect', data => {
        connections--;
        console.log(socket.id + "Disconnected: %s sockets connected", connections);

        const index = users.indexOf(socket.username);
        if (index > -1) {
            users.splice(index, 1);
        }

        let roomnum = userrooms[socket.id];
        let room = io.sockets.adapter.rooms['room-' + roomnum];

        if (room != null) {
            if (socket.id === room.host) {
                room.host = undefined;
            }
            const index = room.users.indexOf(socket.username);
            if (index > -1) {
                room.users.splice(index, 1);
                updateRoomUsers(roomnum);
            }
        }
        delete userrooms[socket.id];
    });

    socket.on('joinRoom', (data, callback) => {
        console.log("Join room");

        if (typeof data.roomnum !== 'string' || !regexRoom.test(data.roomnum))
            return callback();

        if (socket.username == null) {
            if (typeof data.username !== 'string' || !regexUsername.test(data.username))
                return callback();
            socket.username = data.username;
            if (!users.includes(socket.username))
                users.push(socket.username);
        }

        socket.roomnum = data.roomnum;
        userrooms[socket.id] = socket.roomnum;

        let init = io.sockets.adapter.rooms['room-' + socket.roomnum] == null;

        socket.join("room-" + socket.roomnum, err => {
            if (err)
                return console.error("join fail");
            console.log(socket.username + " connected to room-" + socket.roomnum);

            let room = io.sockets.adapter.rooms['room-' + socket.roomnum];
            if (room.host == null) {
                room.host = socket.id;
                room.hostName = socket.username;

                io.sockets.to("room-" + socket.roomnum).emit('changeHostLabel', {
                    username: room.hostName
                });
            }
            if (init) {
                room.currVideo = null;
                room.users = [socket.username];
                room.state = false;
                room.currTime = 0;
                room.lastChange = performance.now();
            }

            if (socket.id === room.host) {
                console.log("I am the host");
            } else {
                console.log("call the damn host " + room.hostName);

                setTimeout(_ => {
                    socket.emit('getData');
                }, 1000);

                if (!room.users.includes(socket.username))
                    room.users.push(socket.username);
            }

            updateRoomUsers(socket.roomnum);
            callback({
                roomnum: socket.roomnum,
                host: socket.id === room.host,
                username: socket.username
            });
        });
    });

    socket.on('changeStateServer', data => {
        if (typeof data.state !== "boolean")
            return;
        if (!Number.isFinite(data.time))
            return;
        if (socket.roomnum == null)
            return;
        let room = io.sockets.adapter.rooms['room-' + socket.roomnum];
        if (room == null)
            return;
        if (socket.id !== room.host)
            return;

        room.currTime = data.time;
        room.state = data.state;
        room.lastChange = performance.now();
        socket.broadcast.to("room-" + socket.roomnum).emit('changeStateClient', {
            time: room.currTime,
            state: room.state
        });
    });

    socket.on('changeVideoServer', data => {
        if (!Number.isSafeInteger(data.videoId))
            return;
        if (socket.roomnum == null)
            return;
        let room = io.sockets.adapter.rooms['room-' + socket.roomnum];
        if (room == null)
            return;
        if (socket.id !== room.host)
            return;

        room.currVideo = data.videoId;
        if (room.currVideo == null)
            return;
        socket.broadcast.to("room-" + socket.roomnum).emit('changeVideoClient', {
            videoId: room.currVideo
        });
    });

    socket.on('syncClient', _ => {
        if (socket.roomnum == null)
            return;
        let room = io.sockets.adapter.rooms['room-' + socket.roomnum];
        if (room == null)
            return;
        if (socket.id === room.host)
            return;

        let currTime = room.currTime;
        if (room.state)
            currTime += (performance.now() - room.lastChange) / 1000;
        socket.emit('changeStateClient', {
            time: currTime,
            state: room.state
        });
        if (room.currVideo == null)
            return;
        socket.emit('changeVideoClient', {
            videoId: room.currVideo
        });
    });

    /*socket.on('change host', data=> {
        if (socket.roomnum == null)
            return;
        let room = io.sockets.adapter.rooms['room-' + socket.roomnum];
        if (room == null)
           return;
        if (socket.id !== room.host)
            return;
    
        console.log(io.sockets.adapter.rooms['room-' + socket.roomnum]);
        let newHost = socket.id;
        let currHost = io.sockets.adapter.rooms['room-' + socket.roomnum].host;
    
        if (newHost !== currHost) {
            console.log("I want to be the host and my socket id is: " + newHost);
    
            socket.broadcast.to(currHost).emit('unSetHost');
            io.sockets.adapter.rooms['room-' + socket.roomnum].host = newHost;
            socket.emit('setHost');
    
            io.sockets.adapter.rooms['room-' + socket.roomnum].hostName = socket.username;
            io.sockets.to("room-" + roomnum).emit('changeHostLabel', {
                username: socket.username
            });
        }
    });
    */

    function updateRoomUsers() {
        if (socket.roomnum == null)
            return;
        let room = io.sockets.adapter.rooms['room-' + socket.roomnum];
        if (room == null)
            return;

        io.sockets.to("room-" + socket.roomnum).emit('get users', room.users);
    }
});
