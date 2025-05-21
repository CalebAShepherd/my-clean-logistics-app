const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * List all inventory items
 */
exports.getInventoryItems = async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({ include: { supplier: true } });
    return res.json(items);
  } catch (err) {
    console.error('Error fetching inventory items:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single inventory item by ID
 */
exports.getInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { supplier: true } });
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(item);
  } catch (err) {
    console.error('Error fetching inventory item:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new inventory item
 */
exports.createInventoryItem = async (req, res) => {
  try {
    const { sku, name, description, unit, supplierId } = req.body;
    if (!sku || !name || !unit) {
      return res.status(400).json({ error: 'SKU, name, and unit are required' });
    }
    const newItem = await prisma.inventoryItem.create({
      data: { sku, name, description, unit, supplierId },
    });
    return res.status(201).json(newItem);
  } catch (err) {
    console.error('Error creating inventory item:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an existing inventory item
 */
exports.updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, name, description, unit, supplierId } = req.body;
    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: { sku, name, description, unit, supplierId },
    });
    return res.json(updatedItem);
  } catch (err) {
    console.error('Error updating inventory item:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete an inventory item
 */
exports.deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.inventoryItem.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting inventory item:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 