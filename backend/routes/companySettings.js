const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { 
  getSettings, 
  updateSettings, 
  getBranding, 
  getProfiles, 
  getProfile, 
  applyProfile, 
  getFeatureSummary 
} = require('../controllers/companySettingsController');

// Public company branding endpoint (no auth required)
router.get('/branding', getBranding);

// Company profile endpoints
router.get('/profiles', requireAuth, requireRole(['admin', 'dev']), getProfiles);
router.get('/profiles/:profileId', requireAuth, requireRole(['admin', 'dev']), getProfile);
router.post('/profiles/apply', requireAuth, requireRole(['admin', 'dev']), applyProfile);

// Feature summary endpoint
router.get('/features', requireAuth, getFeatureSummary);

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
