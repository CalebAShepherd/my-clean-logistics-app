const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { getSettings, updateSettings } = require('../controllers/companySettingsController');

// Retrieve company settings
router.get(
  '/',
  requireAuth,
  getSettings
);

// Update company settings (admin and dev only)
router.put(
  '/',
  requireAuth,
  requireRole(['admin','dev']),
  updateSettings
);

module.exports = router;
