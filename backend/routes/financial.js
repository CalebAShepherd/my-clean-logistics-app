const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  getChartOfAccounts,
  createAccount,
  updateAccount,
  getJournalEntries,
  createJournalEntry,
  approveJournalEntry,
  getBudgets,
  createBudget,
  getTrialBalance,
  getProfitLoss,
  getBalanceSheet,
  getCashFlowStatement,
  getCostCenters,
  createCostCenter,
  getFinancialDashboard
} = require('../controllers/financialController');

// All routes require authentication
router.use(requireAuth);

// === CHART OF ACCOUNTS ===
router.get('/chart-of-accounts', getChartOfAccounts);
router.post('/chart-of-accounts', requireRole(['admin', 'dev']), createAccount);
router.put('/chart-of-accounts/:id', requireRole(['admin', 'dev']), updateAccount);

// === JOURNAL ENTRIES ===
router.get('/journal-entries', getJournalEntries);
router.post('/journal-entries', requireRole(['admin', 'dev']), createJournalEntry);
router.put('/journal-entries/:id/approve', requireRole(['admin', 'dev']), approveJournalEntry);

// === BUDGETS ===
router.get('/budgets', getBudgets);
router.post('/budgets', requireRole(['admin', 'dev']), createBudget);

// === FINANCIAL REPORTS ===
router.get('/reports/trial-balance', getTrialBalance);
router.get('/reports/profit-loss', getProfitLoss);
router.get('/reports/balance-sheet', getBalanceSheet);
router.get('/reports/cash-flow', getCashFlowStatement);

// === COST CENTERS ===
router.get('/cost-centers', getCostCenters);
router.post('/cost-centers', requireRole(['admin', 'dev']), createCostCenter);

// === DASHBOARD ===
router.get('/dashboard', getFinancialDashboard);

module.exports = router; 