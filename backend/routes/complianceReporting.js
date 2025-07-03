const express = require('express');
const router = express.Router();
const complianceReportingController = require('../controllers/complianceReportingController');
const requireAuth = require('../middleware/requireAuth');

// Apply authentication middleware to all routes
router.use(requireAuth);

// Report routes
router.get('/reports', complianceReportingController.getComplianceReports);
router.post('/reports/generate', complianceReportingController.generateReport);
router.put('/reports/:id/status', complianceReportingController.updateReportStatus);

// Metrics routes
router.get('/metrics', complianceReportingController.getComplianceMetrics);

// Dashboard routes
router.get('/dashboard', complianceReportingController.getDashboardData);

module.exports = router; 