import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDrag, useDrop } from 'react-dnd';
import { io, Socket } from 'socket.io-client';

interface Token {
  id: string;
  image: string;
  position: { x: number; y: number };
}

interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  timestamp: Date;
}

interface Room {
  id: string;
  map: string | null;
  tokens: Token[];
}

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId] = useState(() => `User${Math.floor(Math.random() * 1000)}`);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Join room
    newSocket.emit('joinRoom', roomId);

    // Load initial room state
    fetch(`http://localhost:5000/api/rooms/${roomId}`)
      .then(res => res.json())
      .then(data => setRoom(data))
      .catch(err => console.error('Error loading room:', err));

    // Listen for room updates
    newSocket.on('roomUpdated', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    // Listen for chat messages
    newSocket.on('chatMessage', (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    // Listen for token updates
    newSocket.on('tokenUpdated', (data: { tokenId: string; position: { x: number; y: number } }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          tokens: prev.tokens.map((token) =>
            token.id === data.tokenId
              ? { ...token, position: data.position }
              : token
          ),
        };
      });
    });

    // Listen for map updates
    newSocket.on('mapUpdated', (data: { mapUrl: string }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return { ...prev, map: data.mapUrl };
      });
    });

    return () => {
      newSocket.close();
    };
  }, [roomId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && socket && roomId) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;
        
        // Update local state immediately for better UX
        setRoom((prev) => {
          if (!prev) return null;
          return { ...prev, map: imageUrl };
        });

        // Emit the map update to all clients
        socket.emit('mapUpload', {
          roomId,
          mapUrl: imageUrl
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && socket && roomId) {
      const message = {
        roomId,
        message: newMessage.trim(),
        userId,
      };
      
      // Add message to local state immediately
      const newChatMessage: ChatMessage = {
        id: Math.random().toString(36).substring(2, 8),
        userId,
        message: newMessage.trim(),
        timestamp: new Date(),
      };
      
      setChatMessages(prev => [...prev, newChatMessage]);
      setNewMessage('');
      
      // Emit message to server
      socket.emit('chatMessage', message);
    }
  };

  const DraggableToken = ({ token }: { token: Token }) => {
    const [{ isDragging }, drag] = useDrag({
      type: 'TOKEN',
      item: { id: token.id },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    return (
      <div
        ref={drag}
        style={{
          position: 'absolute',
          left: token.position.x,
          top: token.position.y,
          opacity: isDragging ? 0.5 : 1,
          cursor: 'move',
        }}
      >
        <img
          src={token.image}
          alt="Token"
          className="w-12 h-12 rounded-full border-2 border-white shadow-lg"
        />
      </div>
    );
  };

  const GameBoard = () => {
    const [{ isOver }, drop] = useDrop({
      accept: 'TOKEN',
      drop: (item: { id: string }, monitor) => {
        const offset = monitor.getClientOffset();
        if (offset && socket && roomId) {
          socket.emit('updateToken', {
            roomId,
            tokenId: item.id,
            position: { x: offset.x, y: offset.y },
          });
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    });

    return (
      <div
        ref={drop}
        className={`relative w-full h-[600px] bg-gray-100 rounded-lg overflow-hidden ${
          isOver ? 'bg-gray-200' : ''
        }`}
      >
        {room?.map && (
          <img
            src={room.map}
            alt="Game Map"
            className="w-full h-full object-contain"
          />
        )}
        {room?.tokens.map((token) => (
          <DraggableToken key={token.id} token={token} />
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Game Board */}
      <div className="lg:col-span-2">
        <div className="bg-white shadow-lg rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Game Board</h2>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Upload Map
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
            />
          </div>
          <GameBoard />
        </div>
      </div>

      {/* Chat */}
      <div className="lg:col-span-1">
        <div className="bg-white shadow-lg rounded-lg p-4 h-[600px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Chat</h2>
            <span className="text-sm text-gray-500">You are: {userId}</span>
          </div>
          <div className="flex-1 overflow-y-auto mb-4 space-y-2">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`p-2 rounded-lg ${
                  message.userId === userId
                    ? 'bg-indigo-100 ml-4'
                    : 'bg-gray-100 mr-4'
                }`}
              >
                <div className="text-xs font-medium text-gray-500 mb-1">
                  {message.userId}
                </div>
                <div className="text-sm text-gray-900">{message.message}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Type a message..."
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Room; 