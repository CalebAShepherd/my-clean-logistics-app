const express = require('express');
const router = express.Router();
const vendorScorecardController = require('../controllers/vendorScorecardController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

// Apply authentication middleware to all routes
router.use(requireAuth);

// Vendor Scorecard CRUD routes
router.get('/', requireRole(['admin','dev','warehouse_admin']), vendorScorecardController.getVendorScorecards);
router.get('/:id', requireRole(['admin','dev','warehouse_admin']), vendorScorecardController.getVendorScorecard);
router.post('/', requireRole(['admin','dev','warehouse_admin']), vendorScorecardController.createVendorScorecard);
router.put('/:id', requireRole(['admin','dev','warehouse_admin']), vendorScorecardController.updateVendorScorecard);
router.delete('/:id', requireRole(['admin','dev','warehouse_admin']), vendorScorecardController.deleteVendorScorecard);

// Analytics and summary routes
router.get('/supplier/:supplierId/summary', requireRole(['admin','dev','warehouse_admin']), vendorScorecardController.getSupplierScorecardSummary);
router.get('/analytics/overview', requireRole(['admin','dev','warehouse_admin']), vendorScorecardController.getScorecardAnalytics);

module.exports = router; 