const io = require('socket.io')(3030, {
  cors: {
    origin: "*", // The URL of your frontend
  },
}); 
const online = {}
io.on('connection', (socket) => {
  socket.on('set', (roomName) => {
    console.log(`${socket.id} is joining room: ${roomName}`);
    socket.join(roomName);
    online[`${roomName}`] = true;
  });

  socket.on('chat', (roomName, message) => {
    console.log(`Message in room ${roomName}: ${message}`);
    io.to(roomName).emit("msg", message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected: ' + socket);
  });
});

