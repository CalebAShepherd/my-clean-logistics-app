const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

// Apply authentication to all routes
router.use(requireAuth);

// Analytics routes (must come before parameterized routes)
router.get('/analytics', assetController.getAssetAnalytics);
router.get('/metrics', assetController.getAssetMetrics);
router.get('/trends', assetController.getAssetTrends);

// Asset CRUD operations
router.get('/', assetController.getAssets);
router.post('/', requireRole(['admin', 'warehouse_admin']), assetController.createAsset);

// Parameterized routes (must come after specific routes)
router.get('/:assetId/utilization', assetController.getAssetUtilization);
router.get('/:assetId/performance', assetController.getAssetPerformance);
router.post('/:id/readings', assetController.recordAssetReading);
router.get('/:id', assetController.getAssetById);
router.put('/:id', requireRole(['admin', 'warehouse_admin']), assetController.updateAsset);
router.delete('/:id', requireRole(['admin', 'warehouse_admin']), assetController.deleteAsset);

module.exports = router; 