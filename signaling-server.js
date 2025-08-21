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

// State management
const rooms = {}; // For group video calls
const streams = {}; // For live streams { streamId: broadcasterSocketId }

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // --- Group Video Call Logic ---
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    if (!rooms[roomId]) { rooms[roomId] = {}; }
    rooms[roomId][userId] = socket.id;
    console.log(`User ${userId} (${socket.id}) joined room ${roomId}`);
    socket.to(roomId).emit('user-joined', userId, socket.id);
    io.in(roomId).emit('room-state', rooms[roomId]);
  });

  socket.on('webrtc-offer', (data) => {
    io.to(data.targetSocketId).emit('webrtc-offer', { senderSocketId: socket.id, sdp: data.sdp });
  });

  socket.on('webrtc-answer', (data) => {
    io.to(data.targetSocketId).emit('webrtc-answer', { senderSocketId: socket.id, sdp: data.sdp });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    io.to(data.targetSocketId).emit('webrtc-ice-candidate', { senderSocketId: socket.id, candidate: data.candidate });
  });

  // --- Live Streaming Logic ---
  socket.on('start-stream', (streamId) => {
    console.log(`User ${socket.id} is starting stream ${streamId}`);
    streams[streamId] = socket.id;
    // Let other clients know a new stream is available
    socket.broadcast.emit('new-stream-available', streamId);
  });

  socket.on('watch-stream', (streamId) => {
    const broadcasterSocketId = streams[streamId];
    if (broadcasterSocketId) {
      console.log(`User ${socket.id} is watching stream ${streamId}`);
      // Notify broadcaster of new watcher
      io.to(broadcasterSocketId).emit('new-watcher', { watcherId: socket.id });
    }
  });

  // Generic signal relay for streamer -> watcher
  socket.on('stream-signal-to-watcher', (data) => {
    io.to(data.watcherId).emit('stream-signal-from-broadcaster', {
      broadcasterId: socket.id,
      signal: data.signal
    });
  });

  // Generic signal relay for watcher -> streamer
  socket.on('watcher-signal-to-streamer', (data) => {
    io.to(data.broadcasterId).emit('watcher-signal', {
      watcherId: socket.id,
      signal: data.signal
    });
  });

  socket.on('stop-stream', (streamId) => {
    if (streams[streamId] === socket.id) {
      delete streams[streamId];
      console.log(`Stream ${streamId} ended.`);
      io.emit('stream-ended', streamId);
    }
  });


  // --- Disconnect Logic ---
  socket.on('disconnecting', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Handle group call disconnection
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
        socket.to(roomId).emit('user-left', socket.id);
        io.in(roomId).emit('room-state', rooms[roomId]);
        break;
      }
    }

    // Handle live stream disconnection
    const streamId = Object.keys(streams).find(key => streams[key] === socket.id);
    if (streamId) {
      delete streams[streamId];
      console.log(`Stream ${streamId} ended due to broadcaster disconnect.`);
      io.emit('stream-ended', streamId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on *:${PORT}`);
});
