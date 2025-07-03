const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  getInvoices,
  createInvoice,
  generateInvoiceFromActivities,
  sendInvoice,
  voidInvoice,
  getPayments,
  processPayment,
  getBillingAnalytics,
  getAgingReport,
  getBillingDashboard
} = require('../controllers/billingController');

// All routes require authentication
router.use(requireAuth);

// === ENHANCED INVOICING ===
router.get('/invoices', getInvoices);
router.get('/invoices-enhanced', getInvoices); // Alias for enhanced invoices
router.post('/invoices', requireRole(['admin', 'dev']), createInvoice);
router.post('/invoices-enhanced', requireRole(['admin', 'dev']), createInvoice); // Alias for enhanced invoices
router.post('/invoices/generate-from-activities', requireRole(['admin', 'dev']), generateInvoiceFromActivities);
router.put('/invoices/:id/send', requireRole(['admin', 'dev']), sendInvoice);
router.put('/invoices-enhanced/:id/send', requireRole(['admin', 'dev']), sendInvoice); // Alias for enhanced invoices
router.post('/invoices-enhanced/:id/void', requireRole(['admin', 'dev']), voidInvoice);

// === ENHANCED PAYMENTS ===
router.get('/payments', getPayments);
router.post('/payments', requireRole(['admin', 'dev']), processPayment);

// === BILLING ANALYTICS ===
router.get('/analytics', getBillingAnalytics);
router.get('/reports/aging', getAgingReport);

// === BILLING DASHBOARD ===
router.get('/dashboard', getBillingDashboard);

module.exports = router; 