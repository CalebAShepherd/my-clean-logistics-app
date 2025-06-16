const express = require('express');
const multer = require('multer');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');
const messageController = require('../controllers/messageController');
const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const safeName = `${Date.now()}-${base}${ext}`;
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// POST /api/conversations - create a new conversation
router.post(
  '/conversations',
  requireAuth,
  messageController.createConversation
);

// POST /api/conversations/check - check if conversation exists with participants
router.post(
  '/conversations/check',
  requireAuth,
  messageController.checkConversationExists
);

// GET /api/conversations - list user's conversations
router.get(
  '/conversations',
  requireAuth,
  messageController.listConversations
);

// GET /api/conversations/:conversationId - get conversation details
router.get(
  '/conversations/:conversationId',
  requireAuth,
  messageController.getConversation
);

// PUT /api/conversations/:conversationId/name - update conversation name
router.put(
  '/conversations/:conversationId/name',
  requireAuth,
  messageController.updateConversationName
);

// DELETE /api/conversations/:conversationId - delete a conversation
router.delete(
  '/conversations/:conversationId',
  requireAuth,
  messageController.deleteConversation
);

// GET /api/conversations/:conversationId/messages - list messages in a conversation
router.get(
  '/conversations/:conversationId/messages',
  requireAuth,
  messageController.listMessages
);

// POST /api/conversations/:conversationId/messages - send a message (text or file)
router.post(
  '/conversations/:conversationId/messages',
  requireAuth,
  upload.single('file'),
  messageController.sendMessage
);

// GET /api/users - search users for new conversation
router.get(
  '/users',
  requireAuth,
  messageController.searchUsers
);

module.exports = router; 