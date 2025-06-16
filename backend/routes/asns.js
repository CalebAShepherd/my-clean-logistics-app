const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const {
  getASNs,
  getASNById,
  createASN,
  updateASN,
  updateASNStatus,
  cancelASN,
  getASNStats,
  deleteASN
} = require('../controllers/asnController');

// Apply authentication middleware to all routes
router.use(requireAuth);

// ASN CRUD Operations
router.get('/', getASNs);                    // GET /asns - Get all ASNs with filtering
router.get('/stats/:warehouseId', getASNStats); // GET /asns/stats/:warehouseId - Get ASN statistics
router.get('/:id', getASNById);              // GET /asns/:id - Get single ASN
router.post('/', createASN);                 // POST /asns - Create new ASN
router.put('/:id', updateASN);               // PUT /asns/:id - Update ASN
router.put('/:id/status', updateASNStatus);  // PUT /asns/:id/status - Update ASN status
router.put('/:id/cancel', cancelASN);        // PUT /asns/:id/cancel - Cancel ASN
router.delete('/:id', deleteASN);            // DELETE /asns/:id - Delete ASN

module.exports = router; 