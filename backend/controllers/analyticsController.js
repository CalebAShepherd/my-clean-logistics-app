const analyticsService = require('../services/analyticsService');

// GET /analytics/deliveries?start=...&end=...
exports.onTimeLate = async (req, res) => {
  const { start, end } = req.query;
  try {
    const startDate = start ? new Date(start) : new Date(0);
    const endDate = end ? new Date(end) : new Date();
    const stats = await analyticsService.getOnTimeLateStats(startDate, endDate);
    return res.json(stats);
  } catch (err) {
    console.error('Error fetching on-time/late stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /analytics/completed?start=...&end=...
exports.completedCount = async (req, res) => {
  const { start, end } = req.query;
  try {
    const startDate = start ? new Date(start) : new Date(0);
    const endDate = end ? new Date(end) : new Date();
    const count = await analyticsService.getCompletedCount(startDate, endDate);
    return res.json(count);
  } catch (err) {
    console.error('Error fetching completed count:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /analytics/trends?start=...&end=...&period=day|week|month
exports.trends = async (req, res) => {
  const { start, end, period } = req.query;
  try {
    const startDate = start ? new Date(start) : new Date(0);
    const endDate = end ? new Date(end) : new Date();
    const grp = ['day','week','month'].includes(period) ? period : 'day';
    const trends = await analyticsService.getDeliveryTrends(startDate, endDate, grp);
    return res.json(trends);
  } catch (err) {
    console.error('Error fetching delivery trends:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /analytics/warehouse/turnover?period=...
exports.stockTurnover = async (req, res) => {
  const { period } = req.query;
  try {
    const data = await analyticsService.getStockTurnover(period);
    return res.json(data);
  } catch (err) {
    console.error('Error fetching stock turnover:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /analytics/warehouse/usage
exports.spaceUsage = async (req, res) => {
  try {
    const data = await analyticsService.getSpaceUsage();
    return res.json(data);
  } catch (err) {
    console.error('Error fetching space usage:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /analytics/warehouse/receiving-speed
exports.receivingSpeed = async (req, res) => {
  try {
    const data = await analyticsService.getReceivingSpeed();
    return res.json(data);
  } catch (err) {
    console.error('Error fetching receiving speed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 