const express = require('express');
const router = express.Router();
const budgetingForecastingController = require('../controllers/budgetingForecastingController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

// Apply authentication middleware to all routes
router.use(requireAuth);

// Budget Scenario routes
router.get('/budget-scenarios', budgetingForecastingController.getBudgetScenarios);
router.get('/budget-scenarios/:id', budgetingForecastingController.getBudgetScenario);
router.post('/budget-scenarios', requireRole(['admin', 'dev']), budgetingForecastingController.createBudgetScenario);
router.put('/budget-scenarios/:id', requireRole(['admin', 'dev']), budgetingForecastingController.updateBudgetScenario);
router.delete('/budget-scenarios/:id', requireRole(['admin', 'dev']), budgetingForecastingController.deleteBudgetScenario);

// Budget Forecast routes
router.get('/budget-forecasts', budgetingForecastingController.getBudgetForecasts);
router.get('/budget-forecasts/:id', budgetingForecastingController.getBudgetForecast);
router.post('/budget-forecasts', requireRole(['admin', 'dev']), budgetingForecastingController.createBudgetForecast);
router.put('/budget-forecasts/:id', requireRole(['admin', 'dev']), budgetingForecastingController.updateBudgetForecast);
router.delete('/budget-forecasts/:id', requireRole(['admin', 'dev']), budgetingForecastingController.deleteBudgetForecast);

// Cash Flow Forecast routes
router.get('/cash-flow-forecasts', budgetingForecastingController.getCashFlowForecasts);
router.get('/cash-flow-forecasts/:id', budgetingForecastingController.getCashFlowForecast);
router.post('/cash-flow-forecasts', requireRole(['admin', 'dev']), budgetingForecastingController.createCashFlowForecast);
router.put('/cash-flow-forecasts/:id', requireRole(['admin', 'dev']), budgetingForecastingController.updateCashFlowForecast);
router.delete('/cash-flow-forecasts/:id', requireRole(['admin', 'dev']), budgetingForecastingController.deleteCashFlowForecast);

// Variance Analysis routes
router.get('/variance-analysis', budgetingForecastingController.getVarianceAnalysis);
router.get('/variance-analysis/:id', budgetingForecastingController.getVarianceAnalysisById);
router.post('/variance-analysis', requireRole(['admin', 'dev']), budgetingForecastingController.createVarianceAnalysis);
router.put('/variance-analysis/:id', requireRole(['admin', 'dev']), budgetingForecastingController.updateVarianceAnalysis);
router.delete('/variance-analysis/:id', requireRole(['admin', 'dev']), budgetingForecastingController.deleteVarianceAnalysis);

// Analysis and reporting routes
router.get('/budget-performance/:scenarioId', budgetingForecastingController.getBudgetPerformance);
router.get('/cash-flow-analysis/:forecastId', budgetingForecastingController.getCashFlowAnalysis);
router.get('/variance-summary', budgetingForecastingController.getVarianceSummary);

// Dashboard route
router.get('/dashboard', budgetingForecastingController.getBudgetingForecastingDashboard);

module.exports = router; 