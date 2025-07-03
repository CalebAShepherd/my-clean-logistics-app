const express = require('express');
const router = express.Router();
const facilityMaintenanceController = require('../controllers/facilityMaintenanceController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

// Apply authentication to all routes
router.use(requireAuth);

// =============================================
// FACILITY MAINTENANCE ROUTES
// =============================================

// Facility maintenance logs
router.get('/maintenance-logs', facilityMaintenanceController.getFacilityMaintenanceLogs);
router.get('/maintenance-logs/:id', facilityMaintenanceController.getFacilityMaintenanceLogById);
router.post('/maintenance-logs', requireRole(['admin', 'warehouse_admin']), facilityMaintenanceController.createFacilityMaintenanceLog);
router.put('/maintenance-logs/:id', requireRole(['admin', 'warehouse_admin']), facilityMaintenanceController.updateFacilityMaintenanceLog);
router.post('/maintenance-logs/:id/complete', requireRole(['admin', 'warehouse_admin', 'warehouse_worker']), facilityMaintenanceController.completeFacilityMaintenanceLog);
router.delete('/maintenance-logs/:id', requireRole(['admin', 'warehouse_admin']), facilityMaintenanceController.deleteFacilityMaintenanceLog);

// =============================================
// FACILITY COMPLIANCE ROUTES
// =============================================

// Facility compliance
router.get('/compliance', facilityMaintenanceController.getFacilityCompliance);
router.get('/compliance/:id', facilityMaintenanceController.getFacilityComplianceById);
router.post('/compliance', requireRole(['admin', 'warehouse_admin']), facilityMaintenanceController.createFacilityCompliance);
router.put('/compliance/:id', requireRole(['admin', 'warehouse_admin']), facilityMaintenanceController.updateFacilityCompliance);
router.delete('/compliance/:id', requireRole(['admin', 'warehouse_admin']), facilityMaintenanceController.deleteFacilityCompliance);

// Compliance audits
router.get('/audits', facilityMaintenanceController.getComplianceAudits);
router.post('/audits', requireRole(['admin', 'warehouse_admin']), facilityMaintenanceController.createComplianceAudit);

// =============================================
// SAFETY & ENVIRONMENTAL ROUTES
// =============================================

// Safety incidents
router.get('/safety-incidents', facilityMaintenanceController.getSafetyIncidents);
router.post('/safety-incidents', facilityMaintenanceController.createSafetyIncident);

// Environmental monitoring
router.get('/environmental-monitoring', facilityMaintenanceController.getEnvironmentalMonitoring);
router.post('/environmental-monitoring', facilityMaintenanceController.createEnvironmentalMonitoring);

// =============================================
// ANALYTICS ROUTES
// =============================================

// Analytics
router.get('/analytics', facilityMaintenanceController.getFacilityMaintenanceAnalytics);

module.exports = router; 