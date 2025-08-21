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
const streams = {}; // For live streams
const users = {}; // Maps userId to socketId for direct messaging

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('register', (userId) => {
    users[userId] = socket.id;
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // --- Group Video Call Logic ---
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    if (!rooms[roomId]) { rooms[roomId] = {}; }
    rooms[roomId][userId] = socket.id;
    console.log(`User ${userId} (${socket.id}) joined room ${roomId}`);
    socket.to(roomId).emit('user-joined', userId, socket.id);
    io.in(roomId).emit('room-state', rooms[roomId]);
  });

  socket.on('webrtc-offer', (data) => { io.to(data.targetSocketId).emit('webrtc-offer', { senderSocketId: socket.id, sdp: data.sdp }); });
  socket.on('webrtc-answer', (data) => { io.to(data.targetSocketId).emit('webrtc-answer', { senderSocketId: socket.id, sdp: data.sdp }); });
  socket.on('webrtc-ice-candidate', (data) => { io.to(data.targetSocketId).emit('webrtc-ice-candidate', { senderSocketId: socket.id, candidate: data.candidate }); });

  // --- Live Streaming Logic ---
  socket.on('start-stream', (streamId) => {
    console.log(`User ${socket.id} is starting stream ${streamId}`);
    streams[streamId] = socket.id;
    socket.broadcast.emit('new-stream-available', streamId);
  });
  socket.on('watch-stream', (streamId) => { const broadcasterSocketId = streams[streamId]; if (broadcasterSocketId) { console.log(`User ${socket.id} is watching stream ${streamId}`); io.to(broadcasterSocketId).emit('new-watcher', { watcherId: socket.id }); } });
  socket.on('stream-signal-to-watcher', (data) => { io.to(data.watcherId).emit('stream-signal-from-broadcaster', { broadcasterId: socket.id, signal: data.signal }); });
  socket.on('watcher-signal-to-streamer', (data) => { io.to(data.broadcasterId).emit('watcher-signal', { watcherId: socket.id, signal: data.signal }); });
  socket.on('stop-stream', (streamId) => { if (streams[streamId] === socket.id) { delete streams[streamId]; console.log(`Stream ${streamId} ended.`); io.emit('stream-ended', streamId); } });

  // --- Tic-Tac-Toe Game Logic ---
  const getSocketIdFromUserId = (userId) => users[userId];

  socket.on('game:invite', (data) => {
    const targetSocketId = getSocketIdFromUserId(data.targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('game:invite', { from: socket.id, fromUserId: data.fromUserId, fromName: data.fromName });
    }
  });

  socket.on('game:accept', (data) => {
    io.to(data.targetSocketId).emit('game:start', { opponentName: data.myName });
  });

  socket.on('game:move', (data) => {
    io.to(data.targetSocketId).emit('game:move', { board: data.board });
  });

  socket.on('game:reset', (data) => { io.to(data.targetSocketId).emit('game:reset'); });
  socket.on('game:leave', (data) => { io.to(data.targetSocketId).emit('game:leave'); });

  // --- Disconnect Logic ---
  socket.on('disconnecting', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Unregister user
    const userIdToUnregister = Object.keys(users).find(key => users[key] === socket.id);
    if (userIdToUnregister) {
      delete users[userIdToUnregister];
      console.log(`User ${userIdToUnregister} unregistered.`);
    }

    // Handle group call disconnection
    for (const roomId of Object.keys(rooms)) {
      let userIdToRemove = null;
      for (const [userId, socketId] of Object.entries(rooms[roomId])) { if (socketId === socket.id) { userIdToRemove = userId; break; } }
      if (userIdToRemove) { delete rooms[roomId][userIdToRemove]; socket.to(roomId).emit('user-left', socket.id); io.in(roomId).emit('room-state', rooms[roomId]); break; }
    }

    // Handle live stream disconnection
    const streamId = Object.keys(streams).find(key => streams[key] === socket.id);
    if (streamId) { delete streams[streamId]; console.log(`Stream ${streamId} ended due to broadcaster disconnect.`); io.emit('stream-ended', streamId); }
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on *:${PORT}`);
});
