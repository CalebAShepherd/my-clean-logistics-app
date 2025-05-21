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

// GET /analytics/in-transit - total shipments currently in transit
exports.inTransitCount = async (req, res) => {
  try {
    const count = await analyticsService.getInTransitCount();
    return res.json(count);
  } catch (err) {
    console.error('Error fetching in-transit count:', err);
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

// GET /analytics/warehouse/turnover?warehouseId=&start=&end=&period=
exports.stockTurnover = async (req, res) => {
  const { warehouseId, start, end, period } = req.query;
  try {
    const data = await analyticsService.getStockTurnover({ warehouseId, start, end, period });
    return res.json(data);
  } catch (err) {
    console.error('Error fetching stock turnover:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /analytics/warehouse/usage?warehouseId=&zone=
exports.spaceUsage = async (req, res) => {
  const { warehouseId, zone } = req.query;
  try {
    const data = await analyticsService.getSpaceUsage({ warehouseId, zone });
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

// GET /analytics/warehouse/aging?warehouseId=
exports.inventoryAging = async (req, res) => {
  const { warehouseId } = req.query;
  try {
    const data = await analyticsService.getInventoryAging({ warehouseId });
    return res.json(data);
  } catch (err) {
    console.error('Error fetching inventory aging:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /analytics/warehouse/abc?warehouseId=
exports.abcAnalysis = async (req, res) => {
  const { warehouseId } = req.query;
  try {
    const data = await analyticsService.getABCAnalysis({ warehouseId });
    return res.json(data);
  } catch (err) {
    console.error('Error fetching ABC analysis:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /analytics/warehouse/slow-movers?warehouseId=&days=&threshold=
exports.slowMovers = async (req, res) => {
  const { warehouseId, days, threshold } = req.query;
  try {
    const data = await analyticsService.getSlowMovers({
      warehouseId,
      days: days ? Number(days) : undefined,
      threshold: threshold ? Number(threshold) : undefined
    });
    return res.json(data);
  } catch (err) {
    console.error('Error fetching slow movers:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /analytics/deliveries/forecast?start=&end=&period=&method=&window=
exports.forecast = async (req, res) => {
  const { start, end, period, method, window } = req.query;
  try {
    const startDate = start ? new Date(start) : new Date(0);
    const endDate = end ? new Date(end) : new Date();
    const grp = ['day','week','month'].includes(period) ? period : 'day';
    const m = method && ['sma','exp','linear'].includes(method) ? method : 'sma';
    const w = window ? Number(window) : 3;
    const data = await analyticsService.getForecast(startDate, endDate, grp, m, w);
    return res.json(data);
  } catch (err) {
    console.error('Error fetching delivery forecast:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /analytics/deliveries/anomalies?start=&end=&sigma=
exports.deliveryAnomalies = async (req, res) => {
  const { start, end, sigma } = req.query;
  try {
    const startDate = start ? new Date(start) : new Date(0);
    const endDate = end ? new Date(end) : new Date();
    const s = sigma ? Number(sigma) : 2;
    const anomalies = await analyticsService.getDeliveryAnomalies(startDate, endDate, s);
    return res.json(anomalies);
  } catch (err) {
    console.error('Error fetching delivery anomalies:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /analytics/warehouse/reports?warehouseId=&start=&end=
exports.warehouseReports = async (req, res) => {
  const { warehouseId, start, end } = req.query;
  try {
    const reports = await analyticsService.getWarehouseReports({ warehouseId, start, end });
    return res.json(reports);
  } catch (err) {
    console.error('Error fetching warehouse reports:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /analytics/warehouse/rack-utilization?warehouseId=
exports.rackUtilization = async (req, res) => {
  const { warehouseId } = req.query;
  try {
    const data = await analyticsService.getRackUtilization({ warehouseId });
    return res.json(data);
  } catch (err) {
    console.error('Error fetching rack utilization:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 