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
const users = {}; // Maps userId to socketId
const worldRooms = {}; // For 3D world state

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('register', (userId) => { users[userId] = socket.id; });

  // --- 3D World Logic ---
  socket.on('world:join', (roomId, initialData) => {
    socket.join(roomId);
    if (!worldRooms[roomId]) {
      worldRooms[roomId] = {};
    }
    worldRooms[roomId][socket.id] = initialData;
    // Notify others about the new player
    socket.to(roomId).emit('world:player-joined', socket.id, initialData);
    // Send the state of the room to the new player
    socket.emit('world:current-players', worldRooms[roomId]);
  });

  socket.on('world:player-moved', (roomId, movementData) => {
    if (worldRooms[roomId] && worldRooms[roomId][socket.id]) {
      worldRooms[roomId][socket.id] = { ...worldRooms[roomId][socket.id], ...movementData };
      // Broadcast movement to others in the room
      socket.to(roomId).emit('world:player-moved', socket.id, movementData);
    }
  });

  // --- Group Video Call Logic ---
  // ... (existing logic)

  // --- Live Streaming Logic ---
  // ... (existing logic)

  // --- Tic-Tac-Toe Game Logic ---
  // ... (existing logic)

  // --- Disconnect Logic ---
  socket.on('disconnecting', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Handle 3D world disconnection
    for (const roomId in worldRooms) {
      if (worldRooms[roomId][socket.id]) {
        delete worldRooms[roomId][socket.id];
        io.to(roomId).emit('world:player-left', socket.id);
        break;
      }
    }

    // Unregister user
    const userIdToUnregister = Object.keys(users).find(key => users[key] === socket.id);
    if (userIdToUnregister) { delete users[userIdToUnregister]; }

    // Handle group call disconnection
    for (const roomId of Object.keys(rooms)) {
        // ... (existing logic)
    }

    // Handle live stream disconnection
    const streamId = Object.keys(streams).find(key => streams[key] === socket.id);
    if (streamId) { delete streams[streamId]; io.emit('stream-ended', streamId); }
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on *:${PORT}`);
});
