const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  approveExpense,
  rejectExpense,
  markExpensePaid,
  deleteExpense,
  getExpenseAnalytics,
  getExpenseSummary,
  getExpenseCategories,
  getExpensesForApproval,
  bulkApproveExpenses,
  bulkRejectExpenses,
  bulkDeleteExpenses,
  bulkUpdateExpenses,
  getExpenseDashboard
} = require('../controllers/expenseController');

// All routes require authentication
router.use(requireAuth);

// === EXPENSE DASHBOARD ===
router.get('/dashboard', getExpenseDashboard);

// === EXPENSE MANAGEMENT ===
router.get('/', getExpenses);
router.get('/categories', getExpenseCategories);
router.get('/summary', getExpenseSummary);
router.get('/analytics', getExpenseAnalytics);
router.get('/for-approval', getExpensesForApproval);
router.get('/:id', getExpense);

router.post('/', createExpense);
router.post('/bulk-approve', requireRole(['admin', 'dev']), bulkApproveExpenses);
router.post('/bulk/approve', requireRole(['admin', 'dev']), bulkApproveExpenses);
router.post('/bulk/reject', requireRole(['admin', 'dev']), bulkRejectExpenses);
router.post('/bulk/delete', requireRole(['admin', 'dev']), bulkDeleteExpenses);
router.put('/bulk/update', requireRole(['admin', 'dev']), bulkUpdateExpenses);

router.put('/:id', updateExpense);
router.put('/:id/approve', requireRole(['admin', 'dev']), approveExpense);
router.put('/:id/reject', requireRole(['admin', 'dev']), rejectExpense);
router.put('/:id/mark-paid', requireRole(['admin', 'dev']), markExpensePaid);

router.delete('/:id', deleteExpense);

module.exports = router; 