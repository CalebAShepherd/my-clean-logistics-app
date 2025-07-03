const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const spaceOptimizationController = require('../controllers/spaceOptimizationController');

// Space Optimization Analysis Routes
router.get(
  '/analysis',
  requireAuth,
  requireRole(['admin', 'dev', 'warehouse_admin', 'facility_manager']),
  spaceOptimizationController.getSpaceOptimizationAnalysis
);

// Slotting Optimization Routes
router.get(
  '/slotting',
  requireAuth,
  requireRole(['admin', 'dev', 'warehouse_admin']),
  spaceOptimizationController.getSlottingOptimization
);

// Space Trend Analysis Routes
router.get(
  '/trends',
  requireAuth,
  requireRole(['admin', 'dev', 'warehouse_admin', 'facility_manager']),
  spaceOptimizationController.getSpaceTrendAnalysis
);

// Layout Optimization Routes
router.get(
  '/layout',
  requireAuth,
  requireRole(['admin', 'dev', 'warehouse_admin']),
  spaceOptimizationController.getLayoutOptimization
);

// Facility Area Utilization Management
router.post(
  '/facility-areas/:id/utilization',
  requireAuth,
  requireRole(['admin', 'dev', 'warehouse_admin', 'facility_manager']),
  spaceOptimizationController.updateFacilityAreaUtilization
);

// Optimization Recommendations
router.get(
  '/recommendations',
  requireAuth,
  requireRole(['admin', 'dev', 'warehouse_admin', 'facility_manager']),
  spaceOptimizationController.getOptimizationRecommendations
);

// Space Optimization Dashboard
router.get(
  '/dashboard',
  requireAuth,
  requireRole(['admin', 'dev', 'warehouse_admin', 'facility_manager']),
  spaceOptimizationController.getSpaceOptimizationDashboard
);

module.exports = router; 