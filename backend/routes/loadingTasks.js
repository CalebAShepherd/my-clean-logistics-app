const express = require('express');
const router = express.Router();
const loadingTaskController = require('../controllers/loadingTaskController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

// Create a new loading task (admin, warehouse_admin, dispatcher)
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'warehouse_admin', 'dispatcher']),
  loadingTaskController.createLoadingTask
);

// Auto-assign workers to a loading task (admin, warehouse_admin)
router.post(
  '/:id/assign-workers',
  requireAuth,
  requireRole(['admin', 'warehouse_admin']),
  loadingTaskController.autoAssignWorkers
);

// Get loading tasks for a warehouse (admin, warehouse_admin, dispatcher, warehouse_worker)
router.get(
  '/warehouse/:warehouseId',
  requireAuth,
  requireRole(['admin', 'warehouse_admin', 'dispatcher', 'warehouse_worker']),
  loadingTaskController.getLoadingTasks
);

// Get loading task by ID (admin, warehouse_admin, dispatcher, warehouse_worker)
router.get(
  '/:id',
  requireAuth,
  requireRole(['admin', 'warehouse_admin', 'dispatcher', 'warehouse_worker']),
  loadingTaskController.getLoadingTaskById
);

// Start a loading task (warehouse_worker)
router.post(
  '/:id/start',
  requireAuth,
  requireRole(['warehouse_worker']),
  loadingTaskController.startLoadingTask
);

// Complete a loading task (warehouse_worker)
router.post(
  '/:id/complete',
  requireAuth,
  requireRole(['warehouse_worker']),
  loadingTaskController.completeLoadingTask
);

// Get worker workload for a warehouse (admin, warehouse_admin)
router.get(
  '/warehouse/:warehouseId/worker-workload',
  requireAuth,
  requireRole(['admin', 'warehouse_admin']),
  loadingTaskController.getWorkerWorkload
);

module.exports = router; 