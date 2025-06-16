const express = require('express');
const router = express.Router();
const {
  getCycleCounts,
  getCycleCountById,
  createCycleCount,
  generateTasks,
  assignTasks,
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

// Warehouse-level routes
router.get('/warehouse/:warehouseId', getCycleCounts);
router.get('/warehouse/:warehouseId/analytics', getCycleCountAnalytics);
router.post('/warehouse/:warehouseId', createCycleCount);

// Cycle count management routes
router.get('/:id', getCycleCountById);
router.post('/:id/generate-tasks', generateTasks);
router.post('/:cycleCountId/assign-tasks', assignTasks);
router.post('/:id/complete', completeCycleCount);

// Mobile/worker routes
router.get('/tasks/my-tasks', getMyTasks);
router.post('/tasks/:taskId/start', startTask);
router.post('/items/:itemId/count', countItem);

// Variance review routes (admin only)
router.post('/items/:itemId/review', reviewVariance);

module.exports = router; 