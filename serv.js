const https = require('http');
const exp = require('express');
const mult = require('multer');
const fs = require('fs');
const path = require('path');
const {Server} = require('socket.io');
const cors = require('cors')
const rest = exp();
rest.use(cors())
rest.use(exp.json())
const server = https.createServer(rest);
const io = new Server (server, {
    cors: {
        origin: "*",
    },
}); 
const online = new Map();
const onSock = new Map();
const saveSys = mult.diskStorage({
    destination:(rq,file,cd)=>{
        const { receiverId, senderId } = rq.body
        if (!receiverId || !senderId) return cb(new Error("Missing ids"))
        const dir = path.join(__dirname, 'chtFls', receiverId, senderId)
        fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir))
    },
    filename:(rq,file,cb)=>{
        cb(null,`${Date.now()}°${Math.round(Math.random() * 1E9)}°${file.originalname}`)
    }
})
const fls = mult({saveSys})
const onlineCk = (rq,rs,next)=>{
    if(!online.has(rq.headers.auth)) return rs.status(403).send("unknown sender")
    next()
}
rest.get('/:uid',(rq,rs)=>{
    rs.send(online.has(rq.params.uid))
})
rest.post('/',onlineCk,fls.array('files',10),(rq,rs)=>{
    console.log(rq.files);
    rs.send(rq.files.length);
})
io.on('connection', (socket) => {
    socket.on('set', (roomName) => {
        console.log(`${socket.id} is joining room: ${roomName}`);
        socket.join(roomName);
        onSock.set(socket.id,roomName);
        online.set(roomName,socket.id);
    });
    socket.on('chat', (roomName, message) => {
        console.log(message,`#${roomName}#`);
        io.to(roomName).emit("msg", message);
    });
    socket.on('offer', (to, offer) => io.to(to).emit('offer', offer));
    socket.on('answer', (to, answer) => io.to(to).emit('answer', answer));
    socket.on('candidate', (to, candidate) => io.to(to).emit('candidate', candidate));
    socket.on('end-call', (to) => io.to(to).emit('end-call'));
    socket.on('disconnect', () => {
        const room = onSock.get(socket.id)
        if(room){
            online.delete(room)
            onSock.delete(socket.id)
        }else{
            const data = "unknown user disconnected"
            const options = {
                hostname: 'ntfy.sh',
                path: '/eno',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': data.length
                }
            };
            const req = https.request(options, res => {
                let body = '';
                res.on('data', chunk => {
                    body += chunk;
                });
                res.on('end', () => {
                    console.log('Response:', body);
                });
            });
            req.on('error', error => {
                console.error('Error:', error);
            });
            req.write(data);
            req.end();
        }
    });
});
server.listen(3030)
