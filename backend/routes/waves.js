const express = require('express');
const router = express.Router();
const waveController = require('../controllers/waveController');
const authMiddleware = require('../middleware/requireAuth');
const { captureWaveCompletion } = require('../middleware/integrationMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Wave management routes
router.post('/', waveController.createWave);
router.get('/', waveController.getWaves);
router.get('/stats', waveController.getWaveStats);
router.get('/:id', waveController.getWave);
router.put('/:id/status', captureWaveCompletion, waveController.updateWaveStatus);
router.put('/:id/assign-picker', waveController.assignPicker);
router.post('/:id/add-orders', waveController.addOrdersToWave);
router.post('/:id/release', waveController.releaseWave);
router.delete('/:id', waveController.deleteWave);

module.exports = router; 