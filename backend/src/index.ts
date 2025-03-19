import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for map uploads

// Types
interface Token {
  id: string;
  position: { x: number; y: number };
}

interface Room {
  id: string;
  tokens: Token[];
  map: string | null;
  createdAt: Date;
}

// In-memory storage
const rooms = new Map<string, Room>();

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to VTTcore API' });
});

// Room management routes
app.post('/api/rooms', (req, res) => {
  const roomId = Math.random().toString(36).substring(2, 8);
  rooms.set(roomId, {
    id: roomId,
    tokens: [],
    map: null,
    createdAt: new Date()
  });
  res.json({ roomId });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a room
  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    
    // Send current room state to the new user
    const room = rooms.get(roomId);
    if (room) {
      socket.emit('roomUpdated', room);
    }
  });

  // Leave a room
  socket.on('leaveRoom', (roomId: string) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  // Handle chat messages
  socket.on('chatMessage', (data: { roomId: string; message: string; userId: string }) => {
    io.to(data.roomId).emit('chatMessage', {
      id: Math.random().toString(36).substring(2, 8),
      message: data.message,
      userId: data.userId,
      timestamp: new Date()
    });
  });

  // Handle token updates
  socket.on('updateToken', (data: { roomId: string; tokenId: string; position: { x: number; y: number } }) => {
    const room = rooms.get(data.roomId);
    if (room) {
      let token = room.tokens.find((t: Token) => t.id === data.tokenId);
      if (!token) {
        // Create new token if it doesn't exist
        token = {
          id: data.tokenId,
          position: data.position
        };
        room.tokens.push(token);
      } else {
        // Update existing token
        token.position = data.position;
      }
      // Broadcast to all users in the room
      io.to(data.roomId).emit('tokenUpdated', {
        tokenId: data.tokenId,
        position: data.position
      });
      // Also send updated room state
      io.to(data.roomId).emit('roomUpdated', room);
    }
  });

  // Handle map upload
  socket.on('mapUpload', (data: { roomId: string; mapUrl: string }) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.map = data.mapUrl;
      // Broadcast to all users in the room
      io.to(data.roomId).emit('mapUpdated', { mapUrl: data.mapUrl });
      // Also send updated room state
      io.to(data.roomId).emit('roomUpdated', room);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 