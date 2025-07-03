const periodCloseService = require('../services/periodCloseService');

/**
 * Middleware to check if transaction date falls in a closed period
 */
const checkClosedPeriod = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    
    // Extract transaction date from request body
    let transactionDate = req.body.transactionDate;
    
    // If no transaction date provided, use current date
    if (!transactionDate) {
      transactionDate = new Date();
    } else {
      transactionDate = new Date(transactionDate);
    }
    
    // Check if date falls in closed period
    const isInClosedPeriod = await periodCloseService.isDateInClosedPeriod(tenantId, transactionDate);
    
    if (isInClosedPeriod) {
      return res.status(400).json({
        error: 'Cannot post transactions to closed periods',
        message: 'The transaction date falls within a closed accounting period. Please contact your administrator to reopen the period if necessary.'
      });
    }
    
    next();
  } catch (err) {
    console.error('Error checking closed period:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  checkClosedPeriod
}; 