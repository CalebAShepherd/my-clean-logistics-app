require('dotenv').config();
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> Set of socket IDs
    this.typingUsers = new Map(); // conversationId -> Set of user IDs
  }

  init(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      console.log('Socket auth: received token:', token ? 'present' : 'missing');
      
      if (!token) {
        console.log('Socket auth: no token provided');
        return next(new Error('Authentication error'));
      }

      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
        console.log('Socket auth: using JWT_SECRET length:', JWT_SECRET.length);
        
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Socket auth: decoded payload:', decoded);
        
        socket.userId = decoded.userId || decoded.id;
        socket.userRole = decoded.role;
        console.log('Socket auth: success for user:', socket.userId, 'role:', socket.userRole);
        next();
      } catch (err) {
        console.error('Socket auth: token verification failed:', err);
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected`);
      
      // Store user socket connection
      if (!this.userSockets.has(socket.userId)) {
        this.userSockets.set(socket.userId, new Set());
      }
      this.userSockets.get(socket.userId).add(socket.id);

      // Join user to their conversations
      this.joinUserConversations(socket);

      // Handle typing events
      socket.on('typing_start', (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing_stop', (data) => {
        this.handleTypingStop(socket, data);
      });

      // Handle message read events
      socket.on('mark_read', (data) => {
        this.handleMarkRead(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        this.handleDisconnect(socket);
      });
    });
  }

  async joinUserConversations(socket) {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: { userId: socket.userId }
          }
        },
        select: { id: true }
      });

      conversations.forEach(conv => {
        socket.join(`conversation_${conv.id}`);
      });
    } catch (error) {
      console.error('Error joining user conversations:', error);
    }
  }

  handleTypingStart(socket, { conversationId }) {
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }
    
    this.typingUsers.get(conversationId).add(socket.userId);
    
    // Emit typing event to other participants
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      conversationId,
      userId: socket.userId,
      isTyping: true
    });
  }

  handleTypingStop(socket, { conversationId }) {
    if (this.typingUsers.has(conversationId)) {
      this.typingUsers.get(conversationId).delete(socket.userId);
      
      if (this.typingUsers.get(conversationId).size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }
    
    // Emit typing stop event to other participants
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      conversationId,
      userId: socket.userId,
      isTyping: false
    });
  }

  async handleMarkRead(socket, { conversationId, messageId }) {
    try {
      // Update message status to read
      await prisma.message.update({
        where: { id: messageId },
        data: { 
          status: 'READ',
          readAt: new Date()
        }
      });

      // Emit read receipt to other participants
      socket.to(`conversation_${conversationId}`).emit('message_read', {
        conversationId,
        messageId,
        readBy: socket.userId,
        readAt: new Date()
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  handleDisconnect(socket) {
    // Remove socket from user's socket set
    if (this.userSockets.has(socket.userId)) {
      this.userSockets.get(socket.userId).delete(socket.id);
      
      if (this.userSockets.get(socket.userId).size === 0) {
        this.userSockets.delete(socket.userId);
      }
    }

    // Remove user from all typing indicators
    this.typingUsers.forEach((typingSet, conversationId) => {
      if (typingSet.has(socket.userId)) {
        typingSet.delete(socket.userId);
        
        // Emit typing stop event
        this.io.to(`conversation_${conversationId}`).emit('user_typing', {
          conversationId,
          userId: socket.userId,
          isTyping: false
        });
        
        if (typingSet.size === 0) {
          this.typingUsers.delete(conversationId);
        }
      }
    });
  }

  // Broadcast new message to conversation participants
  async broadcastMessage(conversationId, message) {
    try {
      // Get conversation participants
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId },
        include: { user: { select: { id: true, username: true } } }
      });

      // Mark message as delivered for online users
      const onlineUserIds = [];
      participants.forEach(participant => {
        if (this.userSockets.has(participant.userId)) {
          onlineUserIds.push(participant.userId);
        }
      });

      if (onlineUserIds.length > 0) {
        // Update message status to delivered for online users
        await prisma.message.update({
          where: { id: message.id },
          data: { 
            status: 'DELIVERED',
            deliveredAt: new Date()
          }
        });
      }

      // Broadcast to conversation room
      this.io.to(`conversation_${conversationId}`).emit('new_message', {
        ...message,
        status: onlineUserIds.length > 0 ? 'DELIVERED' : 'SENT',
        deliveredAt: onlineUserIds.length > 0 ? new Date() : null
      });

    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  }

  // Join user to a specific conversation (for new conversations)
  joinConversation(userId, conversationId) {
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.join(`conversation_${conversationId}`);
        }
      });
    }
  }
}

module.exports = new SocketService(); 