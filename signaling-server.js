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

function getOtherPlayer(room, currentPlayerSocketId) {
    return room.players.find(p => p.socketId !== currentPlayerSocketId);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('register', (userId) => {
    users[userId] = socket.id;
  });

  // --- Game Room Logic ---
  socket.on('game:get-rooms', () => {
    // Filter for rooms that are not full
    const availableRooms = Object.values(gameRooms).filter(r => r.players.length < 2);
    socket.emit('game:rooms-list', availableRooms);
  });

  socket.on('game:create-room', ({ playerName, gameType }) => {
    const roomId = uuidv4();
    gameRooms[roomId] = {
      id: roomId,
      gameType,
      players: [{ socketId: socket.id, name: playerName, symbol: 'X' }],
      board: null, // Board state will be managed by clients, but can be stored here too
    };
    socket.join(roomId);
    socket.emit('game:room-created', gameRooms[roomId]);
    // Broadcast updated room list to all clients
    io.emit('game:rooms-list', Object.values(gameRooms).filter(r => r.players.length < 2));
  });

  socket.on('game:join-room', ({ roomId, playerName }) => {
    const room = gameRooms[roomId];
    if (room && room.players.length < 2) {
      room.players.push({ socketId: socket.id, name: playerName, symbol: 'O' });
      socket.join(roomId);

      // Notify both players to start the game
      const [player1, player2] = room.players;
      io.to(player1.socketId).emit('game:start', { opponent: player2, symbol: 'X', room });
      io.to(player2.socketId).emit('game:start', { opponent: player1, symbol: 'O', room });

      // Remove room from available list
      io.emit('game:rooms-list', Object.values(gameRooms).filter(r => r.players.length < 2));
    } else {
      socket.emit('game:error', 'Room is full or does not exist.');
    }
  });

  socket.on('game:move', ({ roomId, board }) => {
    const room = gameRooms[roomId];
    if (room) {
      const otherPlayer = getOtherPlayer(room, socket.id);
      if (otherPlayer) {
        io.to(otherPlayer.socketId).emit('game:move', { board });
      }
    }
  });

  socket.on('game:reset', ({ roomId }) => {
    const room = gameRooms[roomId];
    if (room) {
      const otherPlayer = getOtherPlayer(room, socket.id);
      if (otherPlayer) {
        io.to(otherPlayer.socketId).emit('game:reset');
      }
    }
  });

  socket.on('game:leave', ({ roomId }) => {
     const room = gameRooms[roomId];
     if (room) {
       const otherPlayer = getOtherPlayer(room, socket.id);
       if (otherPlayer) {
         io.to(otherPlayer.socketId).emit('game:opponent-left');
       }
       // Clean up the room
       delete gameRooms[roomId];
       io.emit('game:rooms-list', Object.values(gameRooms).filter(r => r.players.length < 2));
     }
  });


  // --- Disconnect Logic ---
  socket.on('disconnecting', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Handle game room disconnection
    for (const roomId in gameRooms) {
      const room = gameRooms[roomId];
      const playerInRoom = room.players.find(p => p.socketId === socket.id);
      if (playerInRoom) {
        const otherPlayer = getOtherPlayer(room, socket.id);
        if (otherPlayer) {
          io.to(otherPlayer.socketId).emit('game:opponent-left');
        }
        delete gameRooms[roomId];
        io.emit('game:rooms-list', Object.values(gameRooms).filter(r => r.players.length < 2));
        break;
      }
    }

    // Other disconnect logic (video rooms, etc.) would go here
  });

  // ... [Other logic like video call and live stream remains unchanged]
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on *:${PORT}`);
});
