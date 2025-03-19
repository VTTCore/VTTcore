import { Socket, Manager } from 'socket.io-client';
import axios from 'axios';

interface Room {
  id: string;
  map: string | null;
  tokens: any[];
}

interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  timestamp: Date;
}

interface CreateRoomResponse {
  roomId: string;
}

class VTTTester {
  private roomId: string;
  private sockets: typeof Socket[] = [];
  private userIds: string[] = [];

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  async createRoom() {
    try {
      const response = await axios.post<CreateRoomResponse>('http://localhost:5000/api/rooms');
      this.roomId = response.data.roomId;
      console.log('Created room:', this.roomId);
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }

  async createTestUsers(numUsers: number) {
    for (let i = 0; i < numUsers; i++) {
      const userId = `TestUser${i + 1}`;
      this.userIds.push(userId);
      
      const manager = new Manager('http://localhost:5000');
      const socket = manager.socket('/');
      this.sockets.push(socket);

      // Set up event listeners
      socket.on('connect', () => {
        console.log(`${userId} connected`);
        socket.emit('joinRoom', this.roomId);
      });

      socket.on('roomUpdated', (room: Room) => {
        console.log(`\n${userId} received room update:`);
        console.log('- Map:', room.map ? 'Present' : 'Not set');
        console.log('- Tokens:', room.tokens.length ? room.tokens : 'No tokens');
      });

      socket.on('chatMessage', (message: ChatMessage) => {
        console.log(`${userId} received chat message:`, message);
      });

      socket.on('tokenUpdated', (data: any) => {
        console.log(`${userId} received token update:`, data);
      });

      socket.on('mapUpdated', (data: any) => {
        console.log(`${userId} received map update:`, data);
      });

      // Wait for connection to establish
      await new Promise<void>(resolve => {
        global.setTimeout(resolve, 1000);
      });
    }
  }

  async testChat() {
    console.log('\nTesting chat functionality...');
    
    // Test sending messages between users
    for (let i = 0; i < this.sockets.length; i++) {
      const message = `Hello from ${this.userIds[i]}!`;
      this.sockets[i].emit('chatMessage', {
        roomId: this.roomId,
        message,
        userId: this.userIds[i]
      });
      await new Promise<void>(resolve => {
        global.setTimeout(resolve, 1000);
      });
    }
  }

  async testMapUpload() {
    console.log('\nTesting map upload...');
    
    // Simulate map upload from first user
    const mockMapUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    this.sockets[0].emit('mapUpload', {
      roomId: this.roomId,
      mapUrl: mockMapUrl
    });
    
    await new Promise<void>(resolve => {
      global.setTimeout(resolve, 1000);
    });
  }

  async testTokenMovement() {
    console.log('\nTesting token movement...');
    
    // Simulate token movement from different users
    for (let i = 0; i < this.sockets.length; i++) {
      this.sockets[i].emit('updateToken', {
        roomId: this.roomId,
        tokenId: 'test-token-1',
        position: {
          x: Math.random() * 500,
          y: Math.random() * 500
        }
      });
      await new Promise<void>(resolve => {
        global.setTimeout(resolve, 1000);
      });
    }
  }

  async cleanup() {
    console.log('\nCleaning up...');
    for (const socket of this.sockets) {
      socket.disconnect();
    }
  }
}

async function runTests() {
  const tester = new VTTTester('dummy-id');
  
  try {
    console.log('Starting VTT tests...');
    
    // Create room
    await tester.createRoom();
    
    // Create test users
    await tester.createTestUsers(3);
    
    // Run tests
    await tester.testChat();
    await tester.testMapUpload();
    await tester.testTokenMovement();
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await tester.cleanup();
  }
}

// Run the tests
runTests(); 