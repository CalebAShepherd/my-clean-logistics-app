const express = require('express');
const router = express.Router();
const financialReportingController = require('../controllers/financialReportingController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

// Apply authentication middleware to all routes
router.use(requireAuth);

// Financial Statements
router.get('/balance-sheet', requireRole(['ADMIN', 'FINANCE', 'MANAGER']), financialReportingController.getBalanceSheet);
router.get('/profit-loss', requireRole(['ADMIN', 'FINANCE', 'MANAGER']), financialReportingController.getProfitLoss);
router.get('/cash-flow', requireRole(['ADMIN', 'FINANCE', 'MANAGER']), financialReportingController.getCashFlowStatement);
router.get('/trial-balance', requireRole(['ADMIN', 'FINANCE', 'MANAGER']), financialReportingController.getTrialBalance);
router.get('/ratios', requireRole(['ADMIN', 'FINANCE', 'MANAGER']), financialReportingController.getFinancialRatios);

module.exports = router; 