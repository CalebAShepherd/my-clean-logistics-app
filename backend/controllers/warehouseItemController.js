const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * List warehouse items, optionally filtered by warehouseId or itemId
 */
exports.getWarehouseItems = async (req, res) => {
  try {
    const { warehouseId, itemId } = req.query;
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (itemId) where.itemId = itemId;
    const items = await prisma.warehouseItem.findMany({ where, include: { item: true } });
    return res.json(items);
  } catch (err) {
    console.error('Error fetching warehouse items:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single warehouse item by composite key
 */
exports.getWarehouseItem = async (req, res) => {
  try {
    const { warehouseId, itemId } = req.params;
    const item = await prisma.warehouseItem.findUnique({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      include: { item: true }
    });
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(item);
  } catch (err) {
    console.error('Error fetching warehouse item:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new warehouse item record
 */
exports.createWarehouseItem = async (req, res) => {
  try {
    const { warehouseId, itemId, locationId, quantity, minThreshold, maxThreshold, expiresAt } = req.body;
    if (!warehouseId || !itemId) {
      return res.status(400).json({ error: 'warehouseId and itemId are required' });
    }
    const newEntry = await prisma.warehouseItem.create({
      data: { warehouseId, itemId, locationId, quantity, minThreshold, maxThreshold, expiresAt }
    });
    // Record initial stock movement if quantity > 0
    if (newEntry.quantity > 0) {
      await prisma.stockMovement.create({
        data: {
          warehouseId: newEntry.warehouseId,
          itemId: newEntry.itemId,
          type: 'INBOUND',
          quantity: newEntry.quantity,
        }
      });
    }
    return res.status(201).json(newEntry);
  } catch (err) {
    console.error('Error creating warehouse item:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an existing warehouse item
 */
exports.updateWarehouseItem = async (req, res) => {
  try {
    const { warehouseId, itemId } = req.params;
    // Fetch previous quantity for stock movement
    const prev = await prisma.warehouseItem.findUnique({
      where: { warehouseId_itemId: { warehouseId, itemId } },
    });
    const updates = req.body;
    const updated = await prisma.warehouseItem.update({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      data: updates
    });
    // Create stock movement for quantity delta
    const delta = updated.quantity - (prev?.quantity || 0);
    if (delta !== 0) {
      await prisma.stockMovement.create({
        data: {
          warehouseId,
          itemId,
          type: delta > 0 ? 'INBOUND' : 'OUTBOUND',
          quantity: Math.abs(delta),
        }
      });
    }
    return res.json(updated);
  } catch (err) {
    console.error('Error updating warehouse item:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a warehouse item record
 */
exports.deleteWarehouseItem = async (req, res) => {
  try {
    const { warehouseId, itemId } = req.params;
    await prisma.warehouseItem.delete({
      where: { warehouseId_itemId: { warehouseId, itemId } }
    });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting warehouse item:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 