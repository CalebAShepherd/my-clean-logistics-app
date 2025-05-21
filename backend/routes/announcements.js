const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const announcementController = require('../controllers/announcementController');

// GET /api/announcements - list all announcements (admin only)
router.get('/', requireAuth, requireRole(['admin']), announcementController.listAnnouncements);

// POST /api/announcements - create a new announcement (admin only)
router.post('/', requireAuth, requireRole(['admin']), announcementController.createAnnouncement);

module.exports = router; 