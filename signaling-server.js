const { Server } = require("socket.io");

// The port for the signaling server.
// This should be different from the Vite dev server port.
const PORT = 3001;

const io = new Server(PORT, {
  cors: {
    origin: "*", // In production, restrict this to your app's domain
    methods: ["GET", "POST"]
  }
});

console.log(`Signaling server started on port ${PORT}`);

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // A user joins a room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    // Notify others in the room that a new user has joined
    socket.to(roomId).emit("user-joined", socket.id);
  });

  // Relay the WebRTC offer to a specific user
  socket.on("offer", (payload) => {
    console.log(`Relaying offer from ${socket.id} to ${payload.target}`);
    io.to(payload.target).emit("offer", {
      sdp: payload.sdp,
      sender: socket.id,
    });
  });

  // Relay the WebRTC answer back to the original sender
  socket.on("answer", (payload) => {
    console.log(`Relaying answer from ${socket.id} to ${payload.target}`);
    io.to(payload.target).emit("answer", {
      sdp: payload.sdp,
      sender: socket.id,
    });
  });

  // Relay ICE candidates
  socket.on("ice-candidate", (payload) => {
    console.log(`Relaying ICE candidate from ${socket.id} to room ${payload.roomId}`);
    socket.to(payload.roomId).emit("ice-candidate", {
      candidate: payload.candidate,
      sender: socket.id,
    });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    // In a real app, you would also notify rooms that the user has left.
  });
});
