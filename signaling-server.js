const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// This will store the state of our rooms
const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {};
    }
    // Store a mapping of userId to socketId
    rooms[roomId][userId] = socket.id;

    console.log(`User ${userId} (${socket.id}) joined room ${roomId}`);

    // Notify others that a new user is ready to connect
    socket.to(roomId).emit('user-joined', userId, socket.id);

    // Send the current room state to everyone in the room
    io.in(roomId).emit('room-state', rooms[roomId]);
  });

  socket.on('webrtc-offer', (data) => {
    const { targetSocketId, sdp } = data;
    io.to(targetSocketId).emit('webrtc-offer', { senderSocketId: socket.id, sdp });
  });

  socket.on('webrtc-answer', (data) => {
    const { targetSocketId, sdp } = data;
    io.to(targetSocketId).emit('webrtc-answer', { senderSocketId: socket.id, sdp });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    const { targetSocketId, candidate } = data;
    io.to(targetSocketId).emit('webrtc-ice-candidate', { senderSocketId: socket.id, candidate });
  });

  socket.on('disconnecting', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const roomId of Object.keys(rooms)) {
      let userIdToRemove = null;
      for (const [userId, socketId] of Object.entries(rooms[roomId])) {
        if (socketId === socket.id) {
          userIdToRemove = userId;
          break;
        }
      }

      if (userIdToRemove) {
        delete rooms[roomId][userIdToRemove];
        // Notify remaining users that this user has left
        socket.to(roomId).emit('user-left', socket.id);
        // Send the updated room state
        io.in(roomId).emit('room-state', rooms[roomId]);
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on *:${PORT}`);
});
