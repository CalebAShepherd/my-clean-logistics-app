const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const dockScheduleController = require('../controllers/dockScheduleController');

// List dock schedules
router.get('/', requireAuth, requireRole(['admin','dispatcher']), dockScheduleController.getDockSchedules);

// Get a single dock schedule by ID
router.get('/:id', requireAuth, requireRole(['admin','dispatcher']), dockScheduleController.getDockSchedule);

// Create a new dock schedule
router.post('/', requireAuth, requireRole(['admin','dispatcher']), dockScheduleController.createDockSchedule);

// Update an existing dock schedule
router.put('/:id', requireAuth, requireRole(['admin','dispatcher']), dockScheduleController.updateDockSchedule);

// Delete a dock schedule
router.delete('/:id', requireAuth, requireRole(['admin','dispatcher']), dockScheduleController.deleteDockSchedule);

module.exports = router; 