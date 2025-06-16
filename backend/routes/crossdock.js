const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const {
  getCrossDockTasks,
  getCrossDockTaskById,
  createCrossDockTask,
  updateCrossDockTask,
  assignWorkerToTask,
  startCrossDockTask,
  completeCrossDockTask,
  cancelCrossDockTask,
  getCrossDockStats
} = require('../controllers/crossDockController');

// Apply authentication middleware to all routes
router.use(requireAuth);

// === CROSS-DOCK TASK MANAGEMENT ===

// GET /crossdock - Get all cross-dock tasks with filtering
router.get('/', getCrossDockTasks);

// GET /crossdock/stats/:warehouseId - Get cross-dock statistics
router.get('/stats/:warehouseId', getCrossDockStats);

// GET /crossdock/:id - Get single cross-dock task by ID
router.get('/:id', getCrossDockTaskById);

// POST /crossdock - Create new cross-dock task
router.post('/', createCrossDockTask);

// PUT /crossdock/:id - Update cross-dock task
router.put('/:id', updateCrossDockTask);

// PUT /crossdock/:id/assign - Assign worker to task
router.put('/:id/assign', assignWorkerToTask);

// PUT /crossdock/:id/start - Start cross-dock task
router.put('/:id/start', startCrossDockTask);

// PUT /crossdock/:id/complete - Complete cross-dock task
router.put('/:id/complete', completeCrossDockTask);

// PUT /crossdock/:id/cancel - Cancel cross-dock task
router.put('/:id/cancel', cancelCrossDockTask);

module.exports = router; 