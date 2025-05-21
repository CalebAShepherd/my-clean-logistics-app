const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const notificationController = require('../controllers/notificationController');

// GET /api/notifications - list notifications for user
router.get('/', requireAuth, notificationController.listNotifications);

// PUT /api/notifications/:id/read - mark a notification as read
router.put('/:id/read', requireAuth, notificationController.markAsRead);

// POST /api/notifications - create new notification (admin only)
router.post('/', requireAuth, requireRole(['admin']), notificationController.createNotification);

// POST /api/notifications/broadcast - mass announcements (admin only)
router.post(
  '/broadcast',
  requireAuth,
  requireRole(['admin']),
  notificationController.createBroadcast
);

module.exports = router; 