const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { captureAssetMaintenance } = require('../middleware/integrationMiddleware');

// Apply authentication to all routes
router.use(requireAuth);

// Maintenance schedules
router.get('/schedules', maintenanceController.getMaintenanceSchedules);
router.get('/schedules/:id', maintenanceController.getMaintenanceScheduleById);
router.post('/schedules', requireRole(['admin', 'warehouse_admin']), maintenanceController.createMaintenanceSchedule);
router.put('/schedules/:id', requireRole(['admin', 'warehouse_admin']), maintenanceController.updateMaintenanceSchedule);
router.delete('/schedules/:id', requireRole(['admin', 'warehouse_admin']), maintenanceController.deleteMaintenanceSchedule);

// Work orders
router.get('/work-orders', maintenanceController.getWorkOrders);
router.get('/work-orders/:id', maintenanceController.getWorkOrderById);
router.post('/work-orders', requireRole(['admin', 'warehouse_admin', 'warehouse_worker']), maintenanceController.createWorkOrder);
router.put('/work-orders/:id', requireRole(['admin', 'warehouse_admin', 'warehouse_worker']), maintenanceController.updateWorkOrder);
router.post('/work-orders/:id/complete', requireRole(['admin', 'warehouse_admin', 'warehouse_worker']), captureAssetMaintenance, maintenanceController.completeWorkOrder);

// Analytics
router.get('/analytics', maintenanceController.getMaintenanceAnalytics);

module.exports = router; 