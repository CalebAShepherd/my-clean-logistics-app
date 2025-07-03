const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');
const { 
  triggerIntegrationEvent, 
  triggerBatchReconciliation, 
  integrationHealthCheck 
} = require('../middleware/integrationMiddleware');
const requireAuth = require('../middleware/requireAuth');

/**
 * Integration Routes - API endpoints for integration monitoring and management
 */

// Apply authentication to all routes
router.use(requireAuth);

/**
 * Integration Dashboard
 */
router.get('/dashboard', integrationController.getIntegrationDashboard);

/**
 * Integration Events Log
 */
router.get('/events', integrationController.getIntegrationEvents);

/**
 * Manual Integration Triggers
 */
router.post('/trigger-event', integrationController.triggerIntegrationEvent);
router.post('/batch-reconciliation', integrationController.runBatchReconciliation);

/**
 * Integration Health
 */
router.get('/health', integrationController.getIntegrationHealth);

/**
 * Integration Configuration
 */
router.get('/config', integrationController.getIntegrationConfig);
router.put('/config', integrationController.updateIntegrationConfig);

/**
 * Integration Reports
 */
router.get('/reports', integrationController.getIntegrationReports);

/**
 * Middleware-based endpoints (using integration middleware functions)
 */
router.post('/middleware/trigger-event', triggerIntegrationEvent);
router.post('/middleware/batch-reconciliation', triggerBatchReconciliation);
router.get('/middleware/health-check', integrationHealthCheck);

module.exports = router; 