const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const activityBasedCostingController = require('../controllers/activityBasedCostingController');

// Apply authentication middleware to all routes
router.use(requireAuth);

// === ACTIVITY CENTERS ===
router.get('/activity-centers', activityBasedCostingController.getActivityCenters);
router.post('/activity-centers', requireRole(['admin', 'warehouse_admin']), activityBasedCostingController.createActivityCenter);
router.put('/activity-centers/:id', requireRole(['admin', 'warehouse_admin']), activityBasedCostingController.updateActivityCenter);

// === ACTIVITY COSTS ===
router.get('/activity-costs', activityBasedCostingController.getActivityCosts);
router.post('/activity-costs', requireRole(['admin', 'warehouse_admin']), activityBasedCostingController.createActivityCost);

// === COST ALLOCATIONS ===
router.get('/cost-allocations', activityBasedCostingController.getCostAllocations);
router.post('/cost-allocations', requireRole(['admin', 'warehouse_admin']), activityBasedCostingController.createCostAllocation);

// === CUSTOMER PROFITABILITY ===
router.get('/customer-profitability', activityBasedCostingController.getCustomerProfitability);
router.post('/customer-profitability/generate', requireRole(['admin']), activityBasedCostingController.generateCustomerProfitability);

// === SERVICE PROFITABILITY ===
router.get('/service-profitability', activityBasedCostingController.getServiceProfitability);
router.post('/service-profitability/generate', requireRole(['admin']), activityBasedCostingController.generateServiceProfitability);

// === DASHBOARD ===
router.get('/dashboard', activityBasedCostingController.getActivityBasedCostingDashboard);

module.exports = router; 