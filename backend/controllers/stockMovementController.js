const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendNotification } = require('../services/notificationService');

/**
 * List all stock movements, optionally filtered by warehouseId, itemId, or type
 */
exports.getStockMovements = async (req, res) => {
  try {
    const { warehouseId, itemId, type } = req.query;
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (itemId) where.itemId = itemId;
    if (type) where.type = type;
    const movements = await prisma.stockMovement.findMany({ where });
    return res.json(movements);
  } catch (err) {
    console.error('Error fetching stock movements:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single stock movement by ID
 */
exports.getStockMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const movement = await prisma.stockMovement.findUnique({ where: { id } });
    if (!movement) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(movement);
  } catch (err) {
    console.error('Error fetching stock movement:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new stock movement record
 */
exports.createStockMovement = async (req, res) => {
  try {
    const { warehouseId, itemId, type, quantity, relatedId, notes } = req.body;
    if (!warehouseId || !itemId || !type || quantity == null) {
      return res.status(400).json({ error: 'warehouseId, itemId, type, and quantity are required' });
    }
    const newMovement = await prisma.stockMovement.create({
      data: { warehouseId, itemId, type, quantity, relatedId, notes }
    });
    // Check inventory levels and notify if below threshold
    try {
      const warehouseItem = await prisma.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId: newMovement.warehouseId, itemId: newMovement.itemId } },
        include: { InventoryItem: true }
      });
      if (warehouseItem && warehouseItem.quantity < warehouseItem.minThreshold) {
        const admins = await prisma.user.findMany({
          where: { warehouseId: newMovement.warehouseId, role: 'warehouse_admin' }
        });
        for (const admin of admins) {
          await sendNotification({
            userId: admin.id,
            type: 'inventory_low',
            title: `Low inventory for SKU ${warehouseItem.InventoryItem.sku}`,
            message: `Current quantity is ${warehouseItem.quantity}`,
            metadata: { warehouseId: newMovement.warehouseId, itemId: newMovement.itemId }
          });
        }
      }
    } catch (notifErr) {
      console.error('Error sending inventory low notification:', notifErr);
    }
    return res.status(201).json(newMovement);
  } catch (err) {
    console.error('Error creating stock movement:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an existing stock movement
 */
exports.updateStockMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await prisma.stockMovement.update({
      where: { id },
      data: updates
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error updating stock movement:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a stock movement record
 */
exports.deleteStockMovement = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.stockMovement.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting stock movement:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 