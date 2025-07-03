const financialReportingService = require('../services/financialReportingService');

/**
 * Get Balance Sheet
 */
exports.getBalanceSheet = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { asOfDate } = req.query;
    
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    const balanceSheet = await financialReportingService.generateBalanceSheet(tenantId, asOf);
    
    return res.json(balanceSheet);
  } catch (err) {
    console.error('Error getting balance sheet:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get Profit & Loss Statement
 */
exports.getProfitLoss = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const profitLoss = await financialReportingService.generateProfitLoss(tenantId, start, end);
    
    return res.json(profitLoss);
  } catch (err) {
    console.error('Error getting profit & loss statement:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get Cash Flow Statement
 */
exports.getCashFlowStatement = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const cashFlow = await financialReportingService.generateCashFlowStatement(tenantId, start, end);
    
    return res.json(cashFlow);
  } catch (err) {
    console.error('Error getting cash flow statement:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get Trial Balance
 */
exports.getTrialBalance = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { asOfDate } = req.query;
    
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    const trialBalance = await financialReportingService.generateTrialBalance(tenantId, asOf);
    
    return res.json(trialBalance);
  } catch (err) {
    console.error('Error getting trial balance:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get Financial Ratios and KPIs
 */
exports.getFinancialRatios = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { asOfDate } = req.query;
    
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    const ratios = await financialReportingService.getFinancialRatios(tenantId, asOf);
    
    return res.json(ratios);
  } catch (err) {
    console.error('Error getting financial ratios:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 