const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const wait = []
const room = []
const PORT = process.env.PORT || 3000;
io.on('connection', (socket) => {
    socket.on('set',ui=>{
        console.log("===>"+ui);
            socket.join(ui);
        // room[ui] = room[ui] || []
        // if(room[ui].length < 2){
        //     room[ui].push(socket);
        //     socket.uu = ui;
        // }
        // if(room[ui].length == 2){
        //     room[ui].map(v=>{
        //         io.to(ui).emit('chat',ui,v);
        //     })
        //     room[ui] = [];
        // }
    });
    socket.on('chat', (rm,msg) => {
        console.log(rm,msg)
        io.to(rm).emit('cht',msg);
        // if(room[socket.uu].length != 2){

        //     wait[socket.uu] = wait[socket.uu] || []
        //     wait[socket.uu] =  [ ...wait[socket.uu],msg ];}
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id,room[socket.uu]);
    });
});

server.listen(PORT,'0.0.0.0', () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
});

