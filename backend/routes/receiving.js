const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { captureInventoryReceived } = require('../middleware/integrationMiddleware');
const {
  getReceipts,
  getReceiptById,
  createReceipt,
  updateReceiptItem,
  completeReceipt,
  performQC,
  getReceivingStats,
  cancelReceipt
} = require('../controllers/receivingController');

// Apply authentication middleware to all routes
router.use(requireAuth);

// Receipt Management Operations
router.get('/', getReceipts);                        // GET /receiving - Get all receipts with filtering
router.get('/stats/:warehouseId', getReceivingStats); // GET /receiving/stats/:warehouseId - Get receiving statistics
router.get('/:id', getReceiptById);                  // GET /receiving/:id - Get single receipt
router.post('/', createReceipt);                     // POST /receiving - Create new receipt
router.put('/:id/complete', captureInventoryReceived, completeReceipt);        // PUT /receiving/:id/complete - Complete receipt
router.put('/:id/qc', performQC);                    // PUT /receiving/:id/qc - Perform QC check
router.put('/:id/cancel', cancelReceipt);            // PUT /receiving/:id/cancel - Cancel receipt

// Receipt Item Operations
router.put('/items/:id', updateReceiptItem);         // PUT /receiving/items/:id - Update receipt item

module.exports = router; 