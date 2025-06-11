const https = require('http');
const exp = require('express');
const mult = require('multer');
const fs = require('fs');
const path = require('path');
const {Server} = require('socket.io');
const cors = require('cors');
const encod = new TextEncoder();
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
    destination:(rq,_file,cb)=>{
        const { uid, yar } = rq.body
        if (!uid || !yar) return cb(new Error("Missing ids"))
        const dir = path.join(__dirname, 'chtFls', uid, yar)
        fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir))
    },
    filename:(_rq,file,cb)=>{
        cb(null,`${Date.now()}°${Math.round(Math.random() * 1E9)}°${file.originalname}`)
    }
})
const fls = mult({saveSys})
const onlineCk = (rq,rs,next)=>{
    if(!online.has(rq.headers.auth)) return rs.status(403).send("unknown sender")
    next()
}
const ckFls = (Path) => {
    const tree = [];
    const rec = (currentPath) => {
        try {
            const items = fs.readdirSync(currentPath);
            for (const item of items) {
                const fullPath = path.join(currentPath, item);
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    rec(fullPath);
                } else if (stats.isFile()) {
                    tree.push(fullPath.replace(`${__dirname}`,''));
                }
            }
        } catch (error) {
            console.error('Error reading directory:', error);
        }
    };
    try{
        const meta = fs.statSync(Path);
        meta.isDirectory() && rec(Path);
        meta.isFile() && tree.push(Path.replace(`${__dirname}`,''));
    }catch(e){
        console.log(e.message)
    }
    return tree;
};
rest.get('/:uid',(rq,rs)=>{
    rs.send(online.has(rq.params.uid))
})
rest.post('/',onlineCk,fls.array('files',10),(rq,rs)=>{
    console.log(rq.files);
    rs.send(rq.files.length);
})
io.on('connection', (socket) => {
    socket.on('set',async (roomName) => {
        console.log(`${socket.id} is joining room: ${roomName}`);
        socket.join(roomName);
        onSock.set(socket.id,roomName);
        online.set(roomName,socket.id);
        const tree = ckFls(path.join(__dirname,'chtFls',roomName))
        io.to(roomName).emit('wait',tree)
        // let size = encod.encode(tree.join('')).length
        // const len = Math.ceil(size / 1048576);
        // const iterate = tree.length / len
        // for(let i =0;i<iterate;i++){
        //     // io.to(roomName).emit('wait',tree.)
        // }
        
    });
    socket.on('chat', (roomName, message) => io.to(roomName).emit("msg", message));
    socket.on('offer', (to, yar,offer) => {
        console.log(`offer=> ${yar} => ${to}`);
        io.to(to).emit('offer',yar, offer)});
    socket.on('answer', (to, yar, answer) => {
        console.log(`answer => ${yar} => ${to} `);
    io.to(to).emit('answer',yar, answer)});
    socket.on('ice', (to, yar, candidate) => {
        console.log(`ice => ${yar} => ${to} `);
        io.to(to).emit('ice',yar, candidate)});
    socket.on('encall', (to) => io.to(to).emit('encall'));
    socket.on('rqcall', (to, yar, vid) => io.to(to).emit('rqcall',yar,vid));
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
