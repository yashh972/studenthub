/**
 * Standalone Socket.IO Server for StudyHub Study Chat
 * Runs on Port 3001. Handles persistent one-to-one low-latency student messaging.
 * Integrates directly with Prisma Client to log and persist message exchanges.
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

// Enable robust CORS for Port 3000 (Next.js dev frontend)
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'StudyHub Socket Server' });
});

io.on('connection', (socket) => {
  console.log(`A socket client connected: ${socket.id}`);

  // 1. Register Client to their exclusive User ID room
  socket.on('register', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`User ${userId} joined their dedicated private socket room.`);
      
      // Auto join global community chat room
      socket.join('community-global');
      console.log(`User ${userId} automatically joined the community global chat room.`);
    }
  });

  // 2. Intercept and broadcast direct messages
  socket.on('send_message', async (messageData) => {
    const { senderId, receiverId, content, noteLinkId } = messageData;
    
    if (!senderId || !receiverId || !content?.trim()) {
      console.warn('Blocked invalid socket message packet:', messageData);
      return;
    }

    try {
      // Write message to PostgreSQL via Prisma
      const message = await prisma.message.create({
        data: {
          senderId,
          receiverId,
          content: content.trim(),
          noteLinkId: noteLinkId || null
        }
      });

      console.log(`Message saved to DB (#${message.id}). Broadcasting to rooms: ${senderId} and ${receiverId}`);

      // Emit real-time packet to both sender and receiver rooms
      io.to(senderId).emit('receive_message', message);
      io.to(receiverId).emit('receive_message', message);
    } catch (error) {
      console.error('Failed to log socket message inside PostgreSQL:', error.message);
      
      // Emit fallback local loop packet in case database logging fails so chat doesn't freeze
      const fallbackMsg = {
        id: `temp-${Date.now()}`,
        senderId,
        receiverId,
        content: content.trim(),
        noteLinkId: noteLinkId || null,
        createdAt: new Date().toISOString()
      };
      io.to(senderId).emit('receive_message', fallbackMsg);
      io.to(receiverId).emit('receive_message', fallbackMsg);
    }
  });

  // 3. Intercept and broadcast community-wide messages
  socket.on('send_community_message', async (messageData) => {
    const { senderId, content } = messageData;
    
    if (!senderId || !content?.trim()) {
      console.warn('Blocked invalid community socket message packet:', messageData);
      return;
    }

    try {
      // Save community message in PostgreSQL
      const communityMessage = await prisma.communityMessage.create({
        data: {
          senderId,
          content: content.trim(),
          roomName: 'global'
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      console.log(`Community message saved to DB (#${communityMessage.id}). Broadcasting to community-global room.`);

      // Broadcast to all sockets inside 'community-global'
      io.to('community-global').emit('receive_community_message', communityMessage);
    } catch (error) {
      console.error('Failed to log community socket message inside PostgreSQL:', error.message);
      
      // Fallback in case of database errors
      let senderName = 'Student';
      try {
        const user = await prisma.user.findUnique({ where: { id: senderId } });
        if (user) {
          senderName = user.name || user.email.split('@')[0];
        }
      } catch (err) {}

      const fallbackMsg = {
        id: `temp-comm-${Date.now()}`,
        senderId,
        content: content.trim(),
        roomName: 'global',
        createdAt: new Date().toISOString(),
        sender: {
          id: senderId,
          name: senderName,
          email: ''
        }
      };
      io.to('community-global').emit('receive_community_message', fallbackMsg);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 StudyHub Socket.IO server running on Port ${PORT}`);
  console.log(`==================================================`);
});
