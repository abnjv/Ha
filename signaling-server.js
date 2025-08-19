const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In a real production app, restrict this to your domain
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    console.log(`User ${userId} (${socket.id}) joined room ${roomId}`);
    // Notify others in the room that a new user has joined
    socket.to(roomId).emit('user-joined', userId, socket.id);
  });

  socket.on('webrtc-offer', (data) => {
    const { targetSocketId, sdp } = data;
    console.log(`Relaying offer from ${socket.id} to ${targetSocketId}`);
    io.to(targetSocketId).emit('webrtc-offer', {
      senderSocketId: socket.id,
      sdp,
    });
  });

  socket.on('webrtc-answer', (data) => {
    const { targetSocketId, sdp } = data;
    console.log(`Relaying answer from ${socket.id} to ${targetSocketId}`);
    io.to(targetSocketId).emit('webrtc-answer', {
      senderSocketId: socket.id,
      sdp,
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    const { targetSocketId, candidate } = data;
    console.log(`Relaying ICE candidate from ${socket.id} to ${targetSocketId}`);
    io.to(targetSocketId).emit('webrtc-ice-candidate', {
      senderSocketId: socket.id,
      candidate,
    });
  });

  socket.on('disconnecting', () => {
    const rooms = Object.keys(socket.rooms);
    rooms.forEach(room => {
      if (room !== socket.id) {
        socket.to(room).emit('user-left', socket.id);
      }
    });
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on *:${PORT}`);
});
