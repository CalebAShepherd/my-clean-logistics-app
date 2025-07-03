const express = require('express');
const router = express.Router();
const documentManagementController = require('../controllers/documentManagementController');
const requireAuth = require('../middleware/requireAuth');

// Apply authentication middleware to all routes
router.use(requireAuth);

// Document routes
router.get('/documents', documentManagementController.getComplianceDocuments);
router.post('/documents/upload', documentManagementController.uploadDocument);
router.get('/documents/:id/download', documentManagementController.downloadDocument);
router.put('/documents/:id', documentManagementController.updateDocument);
router.delete('/documents/:id', documentManagementController.deleteDocument);

// Document retention routes
router.get('/retention-policies', documentManagementController.getRetentionPolicies);
router.post('/retention-policies', documentManagementController.createRetentionPolicy);

// Document expiry routes
router.get('/documents/expiring', documentManagementController.getExpiringDocuments);

module.exports = router; 