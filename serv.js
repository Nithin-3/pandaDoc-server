const https = require('http');
const exp = require('express');
const mult = require('multer');
const {Server} = require('socket.io')
const rest = exp();
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
        const { receiverId, senderId } = req.body
        if (!receiverId || !senderId) return cb(new Error("Missing ids"))
        const dir = path.join(__dirname, 'uploads', receiverId, senderId)
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
    console.log(req.files);
    rs.send(req.files.length);
})
io.on('connection', (socket) => {
    socket.on('set', (roomName) => {
        console.log(`${socket.id} is joining room: ${roomName}`);
        socket.join(roomName);
        onSock.set(socket.id,roomName);
        online.set(roomName,socket.id);
    });

    socket.on('chat', (roomName, message) => {
        console.log(message);
        io.to(roomName).emit("msg", message);
    });

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
        console.log('User disconnected: ' + socket);
    });
});
server.listen(3030)
