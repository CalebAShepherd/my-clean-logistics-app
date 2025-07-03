const express = require('express');
const router = express.Router();
const blueprintController = require('../controllers/blueprintController');
const requireAuth = require('../middleware/requireAuth');

// All blueprint routes require authentication
router.use(requireAuth);

// POST /api/blueprints - Create a new blueprint
router.post('/', blueprintController.createBlueprint);

// GET /api/blueprints/my - Get blueprints created by current user
router.get('/my', blueprintController.getMyBlueprints);

// GET /api/blueprints/warehouse/:warehouseId - Get all blueprints for a warehouse
router.get('/warehouse/:warehouseId', blueprintController.getBlueprintsByWarehouse);

// GET /api/blueprints/:id - Get a specific blueprint by ID
router.get('/:id', blueprintController.getBlueprintById);

// PUT /api/blueprints/:id - Update a blueprint
router.put('/:id', blueprintController.updateBlueprint);

// DELETE /api/blueprints/:id - Delete a blueprint
router.delete('/:id', blueprintController.deleteBlueprint);

module.exports = router; 