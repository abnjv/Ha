console.log("Signaling server script started.");
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const redis = require('redis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Redis Client Setup
const redisClient = redis.createClient({
  // url: 'redis://localhost:6379' // Default URL, uncomment if your Redis is elsewhere
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect().then(() => console.log('Connected to Redis successfully!'));


// Helper functions for Redis keys
const roomKey = (roomId) => `room:${roomId}`;
const streamKey = (streamId) => `stream:${streamId}`;
const userKey = (userId) => `user:${userId}`;
const socketUserKey = (socketId) => `socket:${socketId}`;


io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('register', async (userId) => {
    try {
      await redisClient.set(userKey(userId), socket.id);
      await redisClient.set(socketUserKey(socket.id), userId);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    } catch (err) {
      console.error(`Failed to register user ${userId}:`, err);
    }
  });

  // --- Group Video Call Logic ---
  socket.on('join-room', async (roomId, userId) => {
    try {
      socket.join(roomId);
      await redisClient.hSet(roomKey(roomId), userId, socket.id);
      console.log(`User ${userId} (${socket.id}) joined room ${roomId}`);

      socket.to(roomId).emit('user-joined', userId, socket.id);
      const roomState = await redisClient.hGetAll(roomKey(roomId));
      io.in(roomId).emit('room-state', roomState);
    } catch (err) {
      console.error(`User ${userId} failed to join room ${roomId}:`, err);
    }
  });

  socket.on('webrtc-offer', (data) => { io.to(data.targetSocketId).emit('webrtc-offer', { senderSocketId: socket.id, sdp: data.sdp }); });
  socket.on('webrtc-answer', (data) => { io.to(data.targetSocketId).emit('webrtc-answer', { senderSocketId: socket.id, sdp: data.sdp }); });
  socket.on('webrtc-ice-candidate', (data) => { io.to(data.targetSocketId).emit('webrtc-ice-candidate', { senderSocketId: socket.id, candidate: data.candidate }); });

  // --- Live Streaming Logic ---
  socket.on('start-stream', async (streamId) => {
    try {
      console.log(`User ${socket.id} is starting stream ${streamId}`);
      await redisClient.set(streamKey(streamId), socket.id);
      socket.broadcast.emit('new-stream-available', streamId);
    } catch (err) {
      console.error(`Failed to start stream ${streamId}:`, err);
    }
  });

  socket.on('watch-stream', async (streamId) => {
    try {
      const broadcasterSocketId = await redisClient.get(streamKey(streamId));
      if (broadcasterSocketId) {
        console.log(`User ${socket.id} is watching stream ${streamId}`);
        io.to(broadcasterSocketId).emit('new-watcher', { watcherId: socket.id });
      }
    } catch (err) {
      console.error(`Failed to watch stream ${streamId}:`, err);
    }
  });

  socket.on('stream-signal-to-watcher', (data) => { io.to(data.watcherId).emit('stream-signal-from-broadcaster', { broadcasterId: socket.id, signal: data.signal }); });
  socket.on('watcher-signal-to-streamer', (data) => { io.to(data.broadcasterId).emit('watcher-signal', { watcherId: socket.id, signal: data.signal }); });

  socket.on('stop-stream', async (streamId) => {
    try {
      const broadcasterSocketId = await redisClient.get(streamKey(streamId));
      if (broadcasterSocketId === socket.id) {
        await redisClient.del(streamKey(streamId));
        console.log(`Stream ${streamId} ended.`);
        io.emit('stream-ended', streamId);
      }
    } catch (err) {
      console.error(`Failed to stop stream ${streamId}:`, err);
    }
  });

  // --- Tic-Tac-Toe Game Logic ---
  const getSocketIdFromUserId = async (userId) => redisClient.get(userKey(userId));

  socket.on('game:invite', async (data) => {
    try {
      const targetSocketId = await getSocketIdFromUserId(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('game:invite', { from: socket.id, fromUserId: data.fromUserId, fromName: data.fromName });
      }
    } catch (err) {
      console.error(`Failed to send game invite to ${data.targetUserId}:`, err);
    }
  });

  socket.on('game:accept', (data) => {
    io.to(data.targetSocketId).emit('game:start', { opponentName: data.myName });
  });

  // --- Room Invitation Logic ---
  socket.on('room:invite', async (data) => {
    try {
      const targetSocketId = await getSocketIdFromUserId(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('room:invite', {
          fromUserId: data.fromUserId,
          fromName: data.fromName,
          roomId: data.roomId,
          roomType: data.roomType
        });
      }
    } catch (err) {
      console.error(`Failed to send room invite to ${data.targetUserId}:`, err);
    }
  });

  socket.on('game:move', (data) => {
    io.to(data.targetSocketId).emit('game:move', { board: data.board });
  });

  socket.on('game:reset', (data) => { io.to(data.targetSocketId).emit('game:reset'); });
  socket.on('game:leave', (data) => { io.to(data.targetSocketId).emit('game:leave'); });

  // --- Live Stream Chat Logic ---
  socket.on('live-chat-message', (data) => {
    // The client sends the streamId, so we can broadcast to the correct room.
    // The room name for a stream is the streamId.
    io.to(data.streamId).emit('live-chat-message', data);
  });

  // --- Disconnect Logic ---
  socket.on('disconnecting', async () => {
    console.log(`User disconnected: ${socket.id}`);
    try {
      const userId = await redisClient.get(socketUserKey(socket.id));
      if (userId) {
        await redisClient.del(userKey(userId));
        await redisClient.del(socketUserKey(socket.id));
        console.log(`User ${userId} unregistered.`);

        // Find and leave any rooms the user was in
        const roomKeys = await redisClient.keys('room:*');
        for (const key of roomKeys) {
          const wasInRoom = await redisClient.hDel(key, userId);
          if (wasInRoom) {
            const roomId = key.split(':')[1];
            console.log(`User ${userId} left room ${roomId} on disconnect.`);
            socket.to(roomId).emit('user-left', socket.id);
            const roomState = await redisClient.hGetAll(key);
            io.in(roomId).emit('room-state', roomState);
          }
        }
      }

      // Handle live stream disconnection if the user was a broadcaster
      const streamKeys = await redisClient.keys('stream:*');
      for (const key of streamKeys) {
        const broadcasterSocketId = await redisClient.get(key);
        if (broadcasterSocketId === socket.id) {
          const streamId = key.split(':')[1];
          await redisClient.del(key);
          console.log(`Stream ${streamId} ended due to broadcaster disconnect.`);
          io.emit('stream-ended', streamId);
          // No need to break, a user can only broadcast one stream
        }
      }
    } catch (err) {
      console.error(`Error during disconnect for socket ${socket.id}:`, err);
    }
  });
});

console.log("Attempting to start server on port", PORT);
server.listen(PORT, () => {
  console.log(`Signaling server listening on *:${PORT}`);
});
