const express = require('express');
const router = express.Router();
const riskAssessmentController = require('../controllers/riskAssessmentController');
const requireAuth = require('../middleware/requireAuth');

// Apply authentication middleware to all routes
router.use(requireAuth);

// Risk assessment routes
router.get('/assessments', riskAssessmentController.getRiskAssessments);
router.post('/assessments', riskAssessmentController.createRiskAssessment);
router.put('/assessments/:id', riskAssessmentController.updateRiskAssessment);
router.delete('/assessments/:id', riskAssessmentController.deleteRiskAssessment);

// Credit limit routes
router.get('/credit-limits', riskAssessmentController.getCreditLimits);
router.post('/credit-limits', riskAssessmentController.createCreditLimit);
router.put('/credit-limits/:id', riskAssessmentController.updateCreditLimit);

// Dashboard and reporting routes
router.get('/dashboard', riskAssessmentController.getRiskDashboard);
router.get('/reports', riskAssessmentController.generateRiskReport);

module.exports = router; 