const express = require('express');
const router = express.Router();
const packingController = require('../controllers/packingController');
const authMiddleware = require('../middleware/requireAuth');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Packing slip management routes
router.post('/slips', packingController.createPackingSlip);
router.get('/slips', packingController.getPackingSlips);
router.get('/slips/stats', packingController.getPackingStats);
router.get('/slips/:id', packingController.getPackingSlip);
router.put('/slips/:id/assign-packer', packingController.assignPacker);
router.post('/slips/:id/start', packingController.startPacking);
router.post('/slips/:id/complete', packingController.completePackingSlip);
router.post('/slips/:id/qc', packingController.performPackingQC);

// Package management routes
router.post('/slips/:packingSlipId/packages', packingController.createPackage);
router.put('/packages/:packageId/seal', packingController.sealPackage);

// Packing task routes
router.put('/tasks/:taskId/pack', packingController.packItem);

module.exports = router; 