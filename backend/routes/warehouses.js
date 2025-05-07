

const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  getWarehouses,
  createWarehouse,
  deleteWarehouse
} = require('../controllers/warehouseController');

// List warehouses (admin and dispatcher)
router.get(
  '/',
  requireAuth,
  requireRole(['admin','dispatcher', 'warehouse_admin']),
  getWarehouses
);

// Create a new warehouse (dev only)
router.post(
  '/',
  requireAuth,
  requireRole('dev', 'admin', 'warehouse_admin'),
  createWarehouse
);

// Delete a warehouse by ID (dev only)
router.delete(
  '/:id',
  requireAuth,
  requireRole('dev', 'admin', 'warehouse_admin'),
  deleteWarehouse
);

module.exports = router;