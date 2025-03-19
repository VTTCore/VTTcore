# VTTcore - Modern Virtual Tabletop

A sleek, modern, and system-agnostic virtual tabletop application built with React, TypeScript, and Node.js.

## Features

- 🎮 Room creation and joining
- 💬 Real-time chat
- 🗺️ Map and token upload
- 🎯 Token placement and movement
- 🎨 Modern, responsive UI
- 🔒 Secure authentication
- 🌐 Real-time synchronization

## Tech Stack

- Frontend:
  - React 18
  - TypeScript
  - TailwindCSS
  - Socket.io-client
  - React DnD (for drag and drop)

- Backend:
  - Node.js
  - Express
  - TypeScript
  - Socket.io
  - MongoDB
  - JWT Authentication

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both frontend and backend directories
   - Update the variables as needed

4. Start the development servers:
   ```bash
   # Start backend server
   cd backend
   npm run dev

   # Start frontend server
   cd ../frontend
   npm run dev
   ```

## Project Structure

```
vttcore/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API and WebSocket services
│   │   └── types/        # TypeScript type definitions
│   └── public/           # Static assets
└── backend/            # Node.js backend application
    ├── src/
    │   ├── controllers/  # Route controllers
    │   ├── models/       # Database models
    │   ├── routes/       # API routes
    │   ├── services/     # Business logic
    │   └── types/        # TypeScript type definitions
    └── config/          # Configuration files
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.