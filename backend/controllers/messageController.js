const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const { sendNotification } = require('../services/notificationService');
const socketService = require('../services/socketService');

// Helper function to find existing conversation with participants
const findExistingConversation = async (allParticipantIds) => {
  const participantCount = allParticipantIds.length;
  
  // Check if a conversation already exists with the exact same participants
  const existingConversations = await prisma.conversation.findMany({
    where: {
      participants: {
        every: {
          userId: { in: allParticipantIds }
        }
      }
    },
    include: {
      participants: true,
      _count: {
        select: { participants: true }
      }
    }
  });
  
  // Find conversation with exact same participant count and members
  return existingConversations.find(conv => {
    if (conv._count.participants !== participantCount) return false;
    
    const convParticipantIds = conv.participants.map(p => p.userId).sort();
    const targetParticipantIds = allParticipantIds.sort();
    
    return convParticipantIds.length === targetParticipantIds.length &&
           convParticipantIds.every((id, index) => id === targetParticipantIds[index]);
  });
};

// Check if conversation exists with specified participants
exports.checkConversationExists = async (req, res) => {
  const { participantIds } = req.body;
  if (!participantIds || !participantIds.length) {
    return res.status(400).json({ error: 'participantIds are required' });
  }
  
  try {
    // Ensure the current user is included in the participant list
    const allParticipantIds = [...new Set([...participantIds, req.user.id])];
    
    const existingConversation = await findExistingConversation(allParticipantIds);
    
    if (existingConversation) {
      return res.status(200).json({ exists: true, conversation: existingConversation });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (err) {
    console.error('Error checking conversation:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new conversation with specified participant IDs or return existing one
exports.createConversation = async (req, res) => {
  const { participantIds, name } = req.body;
  if (!participantIds || !participantIds.length) {
    return res.status(400).json({ error: 'participantIds are required' });
  }
  
  try {
    // Ensure the current user is included in the participant list
    const allParticipantIds = [...new Set([...participantIds, req.user.id])];
    
    const exactMatch = await findExistingConversation(allParticipantIds);
    
    if (exactMatch) {
      // Return existing conversation with flag
      return res.status(200).json({ ...exactMatch, isExisting: true });
    }
    
    // Create new conversation if no exact match found
    const conversationData = {};
    
    // Only set name if it's provided and this is a group chat (more than 2 participants)
    if (name && name.trim() && allParticipantIds.length > 2) {
      conversationData.name = name.trim();
    }
    
    const conversation = await prisma.conversation.create({ data: conversationData });
    const participantsData = allParticipantIds.map(userId => ({ 
      conversationId: conversation.id, 
      userId 
    }));
    
    await prisma.conversationParticipant.createMany({ data: participantsData });
    
    return res.status(201).json({ ...conversation, isExisting: false });
  } catch (err) {
    console.error('Error creating/finding conversation:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// List all conversations for the current user, including last message and participants
exports.listConversations = async (req, res) => {
  const userId = req.user.id;
  try {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: { id: true, username: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { updatedAt: 'desc' }
    });
    return res.json(conversations);
  } catch (err) {
    console.error('Error listing conversations:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get conversation details
exports.getConversation = async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;
  try {
    // Verify the user is a participant
    const isParticipant = await prisma.conversationParticipant.findFirst({ where: { conversationId, userId } });
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: { include: { user: { select: { id: true, username: true, email: true } } } }
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    return res.json(conversation);
  } catch (err) {
    console.error('Error getting conversation:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update conversation name
exports.updateConversationName = async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;
  const { name } = req.body;
  
  try {
    // Verify the user is a participant
    const isParticipant = await prisma.conversationParticipant.findFirst({ 
      where: { conversationId, userId } 
    });
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify this is a group conversation (more than 2 participants)
    const participantCount = await prisma.conversationParticipant.count({
      where: { conversationId }
    });
    
    if (participantCount <= 2) {
      return res.status(400).json({ error: 'Cannot set name for individual conversations' });
    }
    
    // Update the conversation name
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { 
        name: name && name.trim() ? name.trim() : null 
      }
    });
    
    return res.status(200).json(updatedConversation);
  } catch (err) {
    console.error('Error updating conversation name:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a conversation
exports.deleteConversation = async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;
  
  try {
    // Verify the user is a participant
    const isParticipant = await prisma.conversationParticipant.findFirst({ 
      where: { conversationId, userId } 
    });
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete all messages in the conversation first
    await prisma.message.deleteMany({
      where: { conversationId }
    });
    
    // Delete all participants
    await prisma.conversationParticipant.deleteMany({
      where: { conversationId }
    });
    
    // Delete the conversation
    await prisma.conversation.delete({
      where: { id: conversationId }
    });
    
    return res.status(200).json({ message: 'Conversation deleted successfully' });
  } catch (err) {
    console.error('Error deleting conversation:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// List messages in a conversation
exports.listMessages = async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;
  try {
    // Verify the user is a participant
    const isParticipant = await prisma.conversationParticipant.findFirst({ where: { conversationId, userId } });
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, username: true } } }
    });
    return res.json(messages);
  } catch (err) {
    console.error('Error listing messages:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Send a message (text or file) in a conversation
exports.sendMessage = async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;
  const { content } = req.body;
  const file = req.file;
  let contentType = 'text';
  let fileUrl = null;
  if (file) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) contentType = 'image';
    else if (ext === '.pdf') contentType = 'pdf';
    else if (ext === '.csv') contentType = 'csv';
    fileUrl = `/uploads/${file.filename}`;
  }
  try {
    // Verify the user is a participant
    const isParticipant = await prisma.conversationParticipant.findFirst({ where: { conversationId, userId } });
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const messageData = { 
      conversationId, 
      senderId: userId, 
      content, 
      contentType, 
      fileUrl,
      status: 'SENT'
    };
    const message = await prisma.message.create({ data: messageData });
    // Update conversation timestamp
    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    
    // Get message with sender info for broadcasting
    const messageWithSender = await prisma.message.findUnique({
      where: { id: message.id },
      include: { sender: { select: { id: true, username: true } } }
    });
    
    // Broadcast message via WebSocket
    socketService.broadcastMessage(conversationId, messageWithSender);
    
    // Notify other participants
    try {
      const participants = await prisma.conversationParticipant.findMany({ where: { conversationId, userId: { not: userId } } });
      for (const p of participants) {
        await sendNotification({
          userId: p.userId,
          type: 'message',
          title: 'New Message',
          message: contentType === 'text' ? content : 'Sent a file',
          metadata: { conversationId, messageId: message.id }
        });
      }
    } catch (notifErr) {
      console.error('Error sending message notifications:', notifErr);
    }
    return res.status(201).json(messageWithSender);
  } catch (err) {
    console.error('Error sending message:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Search users for new conversation based on role and query
exports.searchUsers = async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;
  const q = req.query.q || '';
  let allowedRoles;
  if (['admin','dispatcher'].includes(userRole)) {
    // Admin and dispatcher can message all users
    allowedRoles = ['admin','client','dispatcher','carrier','dev','transporter','warehouse_admin'];
  } else if (userRole === 'warehouse_admin') {
    // Warehouse admin can message other warehouse admins, admin, dispatcher
    allowedRoles = ['warehouse_admin','admin','dispatcher', 'transporter'];
  } else if (userRole === 'client') {
    // Client can message dispatcher
    allowedRoles = ['dispatcher'];
  } else if (userRole === 'transporter') {
    // Transporter can message admin, warehouse admin, dispatcher
    allowedRoles = ['admin','warehouse_admin','dispatcher'];
  } else {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        role: { in: allowedRoles },
        username: { contains: q, mode: 'insensitive' }
      },
      select: { id: true, username: true, email: true, role: true }
    });
    return res.json(users);
  } catch (err) {
    console.error('Error searching users:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 