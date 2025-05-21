const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const damageReportController = require('../controllers/damageReportController');
const multer = require('multer');

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// List damage reports
router.get('/', requireAuth, requireRole(['admin','warehouse_admin']), damageReportController.getDamageReports);

// Export damage reports as CSV
router.get('/export', requireAuth, requireRole(['admin','warehouse_admin']), damageReportController.exportDamageReports);

// Get a single damage report
router.get('/:id', requireAuth, requireRole(['admin','warehouse_admin']), damageReportController.getDamageReport);

// Create a new damage report
router.post('/', requireAuth, requireRole(['admin','warehouse_admin']), upload.array('photos', 5), damageReportController.createDamageReport);

// Update an existing damage report
router.put('/:id', requireAuth, requireRole(['admin','warehouse_admin']), upload.array('photos', 5), damageReportController.updateDamageReport);

// Delete a damage report
router.delete('/:id', requireAuth, requireRole(['admin','warehouse_admin']), damageReportController.deleteDamageReport);

module.exports = router; 