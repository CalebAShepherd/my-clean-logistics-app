const express = require('express');
const router = express.Router();
const {
  getCycleCounts,
  getCycleCountById,
  createCycleCount,
  generateTasks,
  assignTasks,
  getWarehouseWorkers,
  getTaskById,
  getMyTasks,
  startTask,
  countItem,
  reviewVariance,
  completeCycleCount,
  getCycleCountAnalytics
} = require('../controllers/cycleCountController');

// Middleware for authentication
const requireAuth = require('../middleware/requireAuth');

// Apply authentication to all routes
router.use(requireAuth);

// Cycle count routes
router.get('/warehouse/:warehouseId', getCycleCounts);
router.get('/warehouse/:warehouseId/analytics', getCycleCountAnalytics);
router.get('/warehouse/:warehouseId/workers', getWarehouseWorkers);
router.get('/:id', getCycleCountById);
router.post('/', createCycleCount);
router.post('/:id/generate-tasks', generateTasks);
router.post('/:cycleCountId/assign-tasks', assignTasks);

// Task routes
router.get('/tasks/:taskId', getTaskById);
router.get('/my-tasks', getMyTasks);
router.post('/tasks/:taskId/start', startTask);
router.post('/items/:itemId/count', countItem);
router.post('/items/:itemId/review-variance', reviewVariance);
router.post('/:id/complete', completeCycleCount);

module.exports = router; 