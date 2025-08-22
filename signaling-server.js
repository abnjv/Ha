const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { v4: uuidv4 } = require('uuid');

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
const gameRooms = {}; // For game rooms
const users = {}; // Maps userId to socketId for direct messaging
const ASSISTANT_BOT_ID = 'ai-assistant-jules';


function getOtherPlayer(room, currentPlayerSocketId) {
    if (!room || !room.players) return null;
    return room.players.find(p => p.socketId !== currentPlayerSocketId);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('register', (userId) => {
    users[userId] = socket.id;
  });

  // --- Group Video Call Logic ---
  socket.on('join-room', (roomId, userId, userName) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = {
        [ASSISTANT_BOT_ID]: { name: 'Jules Assistant', type: 'bot' }
      };
    }
    rooms[roomId][userId] = { name: userName, type: 'user', socketId: socket.id };

    // Let the new user know about everyone already in the room
    socket.emit('room-state', rooms[roomId]);
    // Let everyone else know about the new user
    socket.to(roomId).emit('user-joined', userId, socket.id, userName);
  });

  socket.on('webrtc-offer', (data) => { io.to(data.targetSocketId).emit('webrtc-offer', { senderSocketId: socket.id, sdp: data.sdp }); });
  socket.on('webrtc-answer', (data) => { io.to(data.targetSocketId).emit('webrtc-answer', { senderSocketId: socket.id, sdp: data.sdp }); });
  socket.on('webrtc-ice-candidate', (data) => { io.to(data.targetSocketId).emit('webrtc-ice-candidate', { senderSocketId: socket.id, candidate: data.candidate }); });


  // --- Game Room Logic ---
  socket.on('game:get-rooms', () => {
    const availableRooms = Object.values(gameRooms).filter(r => r.players.length < 2);
    socket.emit('game:rooms-list', availableRooms);
  });
  // ... other game logic ...


  // --- Disconnect Logic ---
  socket.on('disconnecting', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Handle group call disconnection
    for (const roomId in rooms) {
      const room = rooms[roomId];
      let userIdToRemove = null;
      for (const userId in room) {
        if (room[userId].socketId === socket.id) {
          userIdToRemove = userId;
          break;
        }
      }
      if (userIdToRemove) {
        delete room[userIdToRemove];
        // If only the bot is left, delete the room
        if (Object.keys(room).length <= 1) {
          delete rooms[roomId];
        } else {
          // Otherwise, just notify others the user has left
          socket.to(roomId).emit('user-left', socket.id);
          io.in(roomId).emit('room-state', room);
        }
        break;
      }
    }

    // ... other disconnect logic for games, streams, etc.
  });

});

server.listen(PORT, () => {
  console.log(`Signaling server listening on *:${PORT}`);
});
