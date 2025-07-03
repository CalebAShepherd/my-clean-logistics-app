const express = require('express');
const router = express.Router();
const purchaseRequisitionController = require('../controllers/purchaseRequisitionController');
const requireAuth = require('../middleware/requireAuth');

// Apply authentication middleware to all routes
router.use(requireAuth);

// Purchase Requisition CRUD routes
router.get('/', purchaseRequisitionController.getPurchaseRequisitions);
router.get('/:id', purchaseRequisitionController.getPurchaseRequisition);
router.post('/', purchaseRequisitionController.createPurchaseRequisition);
router.put('/:id', purchaseRequisitionController.updatePurchaseRequisition);
router.delete('/:id', purchaseRequisitionController.deletePurchaseRequisition);

// Approval workflow routes
router.post('/:id/approve', purchaseRequisitionController.approvePurchaseRequisition);
router.post('/:id/reject', purchaseRequisitionController.rejectPurchaseRequisition);
router.post('/:id/convert-to-po', purchaseRequisitionController.convertToPurchaseOrder);

// Approval management
router.get('/approvals/pending/:userId', purchaseRequisitionController.getPendingApprovals);

module.exports = router; 