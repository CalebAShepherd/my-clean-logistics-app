const express = require('express');
const router = express.Router();
const soxComplianceController = require('../controllers/soxComplianceController');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

// SOX Controls
router.get('/controls', soxComplianceController.getSoxControls);
router.post('/controls', soxComplianceController.createSoxControl);

// SOX Tests
router.get('/tests', soxComplianceController.getSoxTests);
router.post('/tests', soxComplianceController.createSoxTest);

module.exports = router; 