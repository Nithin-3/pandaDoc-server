const exp = require('express');
const mult = require('multer');
const fs = require('fs');
const path = require('path');
const {Server} = require('socket.io');
const cors = require('cors');
// const encod = new TextEncoder();
const comp = require('compression')
const rest = exp();
rest.use(comp({
    filter:(rq,rs)=>{
        if( rq.path.startsWith('/dow/')) return false;
        return comp.filter(rq,rs);
    }
}))
rest.use(cors())
rest.use(exp.json())
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
fs.mkdirSync(path.join(__dirname, 'chtFls'), { recursive: true });
const fls = mult({storage: saveSys})
const onlineCk = (rq,rs,next)=>{
    if(!online.has(rq.headers.auth)) return rs.status(403).send("unknown sender")
    next()
}
const ckFls = (Path) => {
    const tree = [];
    const rems = `${Path}/`
    const rec = (currentPath) => {
        try {
            const items = fs.readdirSync(currentPath);
            for (const item of items) {
                const fullPath = path.join(currentPath, item);
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    rec(fullPath);
                } else if (stats.isFile()) {
                    tree.push(fullPath.replace(rems,''));
                }
            }
        } catch (e) {
            if (!e.message.includes('no such file or directory')) console.log(e.message);
        }
    };
    try{
        const meta = fs.statSync(Path);
        meta.isDirectory() && rec(Path);
        meta.isFile() && tree.push(Path.replace(rems,''));
    }catch(e){
        if (!e.message.includes('no such file or directory')) console.log(e.message);
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
            if (!er?.message.includes('no such file or directory')) console.log(er.message);
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
const serv = rest.listen(process.env.PORT || 3030);

const io = new Server(serv, {
    cors: {
        origin: "*",
        allowedHeaders:['Content-Type','auth'],
        methods:['GET', 'POST', 'DELETE']
    },
});

io.on('connection', (socket) => {
    socket.on('set',(roomName) => {
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
    socket.on("block",(to,yar)=>{
        fs.rm(path.join(__dirname,'chtFls',yar,to),{recursive:true,force:true},err=>{
            err && console.log(err);
            socket.emit('block',yar)
        });

    })
    socket.on('blocked',(to,yar)=>{
        io.to(to).emit('blocked',yar);
    })
    socket.on('exit',()=>{
        socket.rooms.forEach(r=>{
            if(r!==socket.id) online.delete(r);
        })
    })
    socket.on('disconnect', () => {
        socket.rooms.forEach(r=>{
            if(r!==socket.id) online.delete(r);
        })
    });
});
