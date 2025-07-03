const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const leadController = require('../controllers/leadController');

router.get('/', requireAuth, leadController.listLeads);
router.get('/:id', requireAuth, leadController.getLead);
router.post('/', requireAuth, requireRole('sales_rep'), leadController.createLead);
router.put('/:id', requireAuth, requireRole('sales_rep'), leadController.updateLead);
router.delete('/:id', requireAuth, requireRole('crm_admin'), leadController.deleteLead);
router.post('/:id/convert', requireAuth, requireRole('sales_rep'), leadController.convertLead);

module.exports = router; 