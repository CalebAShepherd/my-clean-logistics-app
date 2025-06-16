const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const {
  getPutAwayTasks,
  getPutAwayTaskById,
  assignPutAwayTask,
  startPutAwayTask,
  completePutAwayTask,
  suggestPutAwayLocations,
  getPutAwayStats,
  cancelPutAwayTask,
  batchAssignPutAwayTasks
} = require('../controllers/putAwayController');

// Apply authentication middleware to all routes
router.use(requireAuth);

// Put-Away Task Management Operations
router.get('/', getPutAwayTasks);                     // GET /putaway - Get all put-away tasks with filtering
router.get('/stats/:warehouseId', getPutAwayStats);   // GET /putaway/stats/:warehouseId - Get put-away statistics
router.get('/suggest-locations', suggestPutAwayLocations); // GET /putaway/suggest-locations - Suggest optimal locations
router.get('/:id', getPutAwayTaskById);               // GET /putaway/:id - Get single put-away task
router.put('/:id/assign', assignPutAwayTask);         // PUT /putaway/:id/assign - Assign task to user
router.put('/:id/start', startPutAwayTask);           // PUT /putaway/:id/start - Start put-away task
router.put('/:id/complete', completePutAwayTask);     // PUT /putaway/:id/complete - Complete put-away task
router.put('/:id/cancel', cancelPutAwayTask);         // PUT /putaway/:id/cancel - Cancel put-away task

// Batch Operations
router.put('/batch/assign', batchAssignPutAwayTasks); // PUT /putaway/batch/assign - Batch assign tasks

module.exports = router; 