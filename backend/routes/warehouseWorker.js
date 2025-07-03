const express = require('express');
const router = express.Router();
const warehouseWorkerController = require('../controllers/warehouseWorkerController');
const requireAuth = require('../middleware/requireAuth');

// Apply auth middleware to all routes
router.use(requireAuth);

// Dashboard data routes
router.get('/my-tasks', warehouseWorkerController.getMyTasks);
router.get('/stats', warehouseWorkerController.getWorkerStats);
router.get('/performance', warehouseWorkerController.getPerformanceData);

// Barcode scanning routes
router.post('/process-scan', warehouseWorkerController.processScan);
router.post('/quick-action', warehouseWorkerController.handleQuickAction);

// Task management
router.get('/tasks/:taskId', warehouseWorkerController.getTaskDetail);
router.post('/tasks/:taskId/start', warehouseWorkerController.startTask);
router.post('/tasks/:taskId/complete', warehouseWorkerController.completeTask);
router.post('/tasks/:taskId/pause', warehouseWorkerController.pauseTask);
router.post('/unassign-task', warehouseWorkerController.unassignTask);

// Work queues
router.get('/pick-queue', warehouseWorkerController.getPickQueue);
router.get('/putaway-queue', warehouseWorkerController.getPutAwayQueue);
router.get('/receive-queue', warehouseWorkerController.getReceiveQueue);
router.get('/count-queue', warehouseWorkerController.getCountQueue);

// Quick actions
router.post('/quick-pick', warehouseWorkerController.quickPick);
router.post('/quick-putaway', warehouseWorkerController.quickPutAway);
router.post('/quick-receive', warehouseWorkerController.quickReceive);
router.post('/quick-count', warehouseWorkerController.quickCount);

module.exports = router; 