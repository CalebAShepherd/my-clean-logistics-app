const { logInboundShipment } = require('../services/warehouseService');

/**
 * Log an inbound shipment: update or create warehouse items and record stock movements
 */
exports.logInboundShipment = async (req, res) => {
  try {
    const { warehouseId, items, notes } = req.body;
    if (!warehouseId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'warehouseId and items array are required' });
    }
    const result = await logInboundShipment(warehouseId, items, notes);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error logging inbound shipment:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 