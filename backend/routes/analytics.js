const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const analyticsController = require('../controllers/analyticsController');

// On-time vs late deliveries
router.get(
  '/deliveries',
  requireAuth,
  requireRole(['admin','dispatcher']),
  analyticsController.onTimeLate
);

// Total completed deliveries
router.get(
  '/completed',
  requireAuth,
  requireRole(['admin','dispatcher']),
  analyticsController.completedCount
);

// Total shipments currently in transit
router.get(
  '/in-transit',
  requireAuth,
  requireRole(['admin','dispatcher']),
  analyticsController.inTransitCount
);

// Delivery volume trends
router.get(
  '/trends',
  requireAuth,
  requireRole(['admin','dispatcher']),
  analyticsController.trends
);

// Demand forecasting for deliveries (returns trends + next period forecast)
router.get(
  '/deliveries/forecast',
  requireAuth,
  requireRole(['admin','dispatcher']),
  analyticsController.forecast
);

// Delivery anomalies: shipments whose transit time is more than σ standard deviations above the mean
router.get(
  '/deliveries/anomalies',
  requireAuth,
  requireRole(['admin','dispatcher']),
  analyticsController.deliveryAnomalies
);

// Warehouse analytics endpoints
router.get(
  '/warehouse/turnover',
  requireAuth,
  requireRole(['admin','dev','warehouse_admin']),
  analyticsController.stockTurnover
);
router.get(
  '/warehouse/usage',
  requireAuth,
  requireRole(['admin','dev','warehouse_admin']),
  analyticsController.spaceUsage
);
router.get(
  '/warehouse/receiving-speed',
  requireAuth,
  requireRole(['admin','dev','warehouse_admin']),
  analyticsController.receivingSpeed
);

// Warehouse daily reports
router.get(
  '/warehouse/reports',
  requireAuth,
  requireRole(['admin','dev','warehouse_admin']),
  analyticsController.warehouseReports
);

// Rack utilization for heatmap
router.get(
  '/warehouse/rack-utilization',
  requireAuth,
  requireRole(['admin','dev','warehouse_admin']),
  analyticsController.rackUtilization
);

// ABC analysis (value-based) of SKUs
router.get(
  '/warehouse/abc',
  requireAuth,
  requireRole(['admin','dev','warehouse_admin']),
  analyticsController.abcAnalysis
);

// Slow-moving & dead stock (low movement count)
router.get(
  '/warehouse/slow-movers',
  requireAuth,
  requireRole(['admin','dev','warehouse_admin']),
  analyticsController.slowMovers
);

// Inventory aging buckets (0–30, 31–60, 61+ days)
router.get(
  '/warehouse/aging',
  requireAuth,
  requireRole(['admin','dev','warehouse_admin']),
  analyticsController.inventoryAging
);

module.exports = router; 