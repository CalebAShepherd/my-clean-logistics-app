const express = require('express');
const router = express.Router();
const auditTrailController = require('../controllers/auditTrailController');
const requireAuth = require('../middleware/requireAuth');

// All audit trail routes require authentication
router.use(requireAuth);

router.get('/', auditTrailController.getAuditLogs);
router.post('/', auditTrailController.createAuditLog);

module.exports = router; 