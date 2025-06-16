const https = require('http');
const exp = require('express');
const mult = require('multer');
const fs = require('fs');
const path = require('path');
const {Server} = require('socket.io');
const cors = require('cors');
const { console } = require('inspector');
// const encod = new TextEncoder();
const rest = exp();
rest.use(cors())
rest.use(exp.json())
const server = https.createServer(rest);
const io = new Server(server, {
    cors: {
        origin: "*",
        allowedHeaders:['Content-Type','auth'],
        methods:['GET', 'POST', 'DELETE']
    },
});
const online = new Set();
const msgs = {};
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
const fls = mult({storage: saveSys})
const onlineCk = (rq,rs,next)=>{
    if(!online.has(rq.headers.auth)) return rs.status(403).send("unknown sender")
    next()
}
const ckFls = async (Path) => {
    const tree = [];
    const rems = `${Path}/`;
    const rec = async (currentPath) => {
        try {
            const items = await fs.promises.readdir(currentPath);
            for (const item of items) {
                const fullPath = path.join(currentPath, item);
                const stats = await fs.promises.stat(fullPath);
                if (stats.isDirectory()) {
                    await rec(fullPath);
                } else if (stats.isFile()) {
                    tree.push(fullPath.replace(rems, ''));
                }
            }
        } catch (error) {
            console.error(error.message);
        }
    };

    try {
        const meta = await fs.promises.stat(Path);
        if (meta.isDirectory()) {
            await rec(Path);
        } else {
            tree.push(Path.replace(rems, ''));
        }
    } catch (e) {
        console.log(e.message);
    }
    return tree;
};
rest.get('/dow/:yar/:uid/:fls',(rq,rs)=>{
    if(online.has(rq.params.yar)){
        rs.download(path.join(__dirname,'/chtFls/',rq.params.yar,rq.params.uid,rq.params.fls))
    }else{
        rs.status(403).send('poda punda')
    }
})
rest.delete('/dow/:yar/:uid/:fls',(rq,rs)=>{
    if(online.has(rq.params.yar)){
        fs.unlink(path.join(__dirname,'chtFls',rq.params.yar,rq.params.uid,rq.params.fls),er=>{
            if (!er?.message.includes('no such file or directory')) {
                console.log(er)
            }
        })
        rs.status(200).send('done')
    }else{
        rs.status(403).send('poda punda')
    }

})
rest.get('/:uid',(rq,rs)=>{
    rs.send(online.has(rq.params.uid))
})
rest.post('/',onlineCk,fls.array('files',10),(rq,rs)=>{
    rs.send(rq.files.length);
})
io.on('connection', (socket) => {
    socket.on('set',async (roomName) => {
        socket.join(roomName);
        online.add(roomName);
        const tree = ckFls(path.join(__dirname,'chtFls',roomName))
        io.to(roomName).emit('wait',tree)
        msgs[roomName]?.forEach(m=>{
            io.to(roomName).emit('msg',m)
        })
        msgs[roomName] && delete msgs[roomName]
    });
    socket.on('chat', (roomName, message) =>{
        if(online.has(roomName)){
            io.to(roomName).emit("msg", message)
        }else {
            msgs[roomName] = [...(msgs[roomName] || []),message]
        }
    } );
    socket.on('offer', (to, yar, offer) => io.to(to).emit('offer',yar, offer));
    socket.on('answer', (to, yar, answer) => io.to(to).emit('answer',yar, answer));
    socket.on('ice', (to, yar, candidate) => io.to(to).emit('ice',yar, candidate));
    socket.on('encall', (to) => io.to(to).emit('encall'));
    socket.on('rqcall', (to, yar, vid) => io.to(to).emit('rqcall',yar,vid));
    socket.on('disconnect', () => {
        const roon = socket.rooms.filter(v=>v!=socket.id)
        roon.forEach(r=> {
            online.delete(r)
        });
            // const data = "unknown user disconnected"
            // const options = {
            //     hostname: 'ntfy.sh',
            //     path: '/eno',
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/x-www-form-urlencoded',
            //         'Content-Length': data.length
            //     }
            // };
            // const req = https.request(options, res => {
            //     let body = '';
            //     res.on('data', chunk => {
            //         body += chunk;
            //     });
            //     res.on('end', () => {
            //         console.log('Response:', body);
            //     });
            // });
            // req.on('error', error => {
            //     console.error('Error:', error);
            // });
            // req.write(data);
            // req.end();
    });
});
server.listen(3030)

