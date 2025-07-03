const express = require('express');
const router = express.Router();
const insuranceClaimController = require('../controllers/insuranceClaimController');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/', insuranceClaimController.getInsuranceClaims);
router.post('/', insuranceClaimController.createInsuranceClaim);
router.patch('/:id/status', insuranceClaimController.updateInsuranceClaimStatus);

module.exports = router; 