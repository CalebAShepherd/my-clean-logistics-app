const express = require('express');
const router = express.Router();
const pickListController = require('../controllers/pickListController');
const authMiddleware = require('../middleware/requireAuth');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Pick list management routes
router.get('/', pickListController.getPickLists);
router.get('/stats', pickListController.getPickListStats);
router.get('/:id', pickListController.getPickList);
router.put('/:id/assign-picker', pickListController.assignPicker);
router.post('/:id/start', pickListController.startPicking);
router.post('/:id/qc', pickListController.performQC);
router.post('/:id/optimize-route', pickListController.optimizePickRoute);

// Pick task routes
router.get('/:pickListId/next-task', pickListController.getNextPickTask);
router.put('/tasks/:taskId/complete', pickListController.completePickTask);

module.exports = router; 