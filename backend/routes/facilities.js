const express = require('express');
const router = express.Router();
const facilityController = require('../controllers/facilityController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

// Apply authentication to all routes
router.use(requireAuth);

// Facility CRUD operations
router.get('/', facilityController.getFacilities);
router.get('/analytics', facilityController.getFacilityAnalytics);
router.get('/:id', facilityController.getFacilityById);
router.post('/', requireRole(['admin']), facilityController.createFacility);
router.put('/:id', requireRole(['admin']), facilityController.updateFacility);
router.delete('/:id', requireRole(['admin']), facilityController.deleteFacility);

// Facility areas
router.get('/:facilityId/areas', facilityController.getFacilityAreas);
router.post('/:facilityId/areas', requireRole(['admin', 'warehouse_admin']), facilityController.createFacilityArea);
router.put('/areas/:id', requireRole(['admin', 'warehouse_admin']), facilityController.updateFacilityArea);

// Utility bills
router.get('/:facilityId/utility-bills', facilityController.getUtilityBills);
router.post('/:facilityId/utility-bills', requireRole(['admin', 'warehouse_admin']), facilityController.createUtilityBill);

// Utility Cost Allocation Routes
// Allocation Rules
router.get('/:facilityId/allocation-rules', facilityController.getAllocationRules);
router.post('/:facilityId/allocation-rules', requireRole(['admin', 'warehouse_admin']), facilityController.createAllocationRule);
router.put('/allocation-rules/:ruleId', requireRole(['admin', 'warehouse_admin']), facilityController.updateAllocationRule);
router.delete('/allocation-rules/:ruleId', requireRole(['admin', 'warehouse_admin']), facilityController.deleteAllocationRule);

// Cost Allocation Operations
router.post('/utility-bills/:billId/allocate', requireRole(['admin', 'warehouse_admin']), facilityController.allocateUtilityCosts);
router.get('/:facilityId/allocation-summary', facilityController.getAllocationSummary);

// Utility Budgets
router.get('/:facilityId/budgets', facilityController.getUtilityBudgets);
router.post('/:facilityId/budgets', requireRole(['admin', 'warehouse_admin']), facilityController.createUtilityBudget);

// Variance Analysis
router.get('/:facilityId/variance-analysis', facilityController.getVarianceAnalysis);
router.post('/:facilityId/variance-analysis', requireRole(['admin', 'warehouse_admin']), facilityController.generateVarianceAnalysis);

module.exports = router; 