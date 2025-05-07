const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const damageReportController = require('../controllers/damageReportController');

// List damage reports
router.get('/', requireAuth, requireRole('admin'), damageReportController.getDamageReports);

// Get a single damage report
router.get('/:id', requireAuth, requireRole('admin'), damageReportController.getDamageReport);

// Create a new damage report
router.post('/', requireAuth, requireRole('admin'), damageReportController.createDamageReport);

// Update an existing damage report
router.put('/:id', requireAuth, requireRole('admin'), damageReportController.updateDamageReport);

// Delete a damage report
router.delete('/:id', requireAuth, requireRole('admin'), damageReportController.deleteDamageReport);

module.exports = router; 