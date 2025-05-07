const { logOutboundShipment } = require('../services/warehouseService');

/**
 * Log an outbound shipment: deduct stock and record stock movements
 */
exports.logOutboundShipment = async (req, res) => {
  try {
    const { warehouseId, items, notes } = req.body;
    if (!warehouseId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'warehouseId and items array are required' });
    }
    const result = await logOutboundShipment(warehouseId, items, notes);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error logging outbound shipment:', err.message);
    // If it's a known business error, return 400 otherwise 500
    if (err.message && err.message.includes('Insufficient stock')) {
      return res.status(400).json({ error: err.message });
    }
    // Propagate other errors
    return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
}; 