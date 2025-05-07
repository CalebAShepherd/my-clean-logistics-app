const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * List all damage reports, optionally filtered by warehouseId or itemId
 */
exports.getDamageReports = async (req, res) => {
  try {
    const { warehouseId, itemId } = req.query;
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (itemId) where.itemId = itemId;
    const reports = await prisma.damageReport.findMany({ where });
    return res.json(reports);
  } catch (err) {
    console.error('Error fetching damage reports:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single damage report by ID
 */
exports.getDamageReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await prisma.damageReport.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(report);
  } catch (err) {
    console.error('Error fetching damage report:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new damage report
 */
exports.createDamageReport = async (req, res) => {
  try {
    const { warehouseId, itemId, quantity, description } = req.body;
    if (!warehouseId || !itemId || quantity == null) {
      return res.status(400).json({ error: 'warehouseId, itemId, and quantity are required' });
    }
    const newReport = await prisma.damageReport.create({
      data: { warehouseId, itemId, quantity, description }
    });
    return res.status(201).json(newReport);
  } catch (err) {
    console.error('Error creating damage report:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an existing damage report
 */
exports.updateDamageReport = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await prisma.damageReport.update({
      where: { id },
      data: updates
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error updating damage report:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a damage report
 */
exports.deleteDamageReport = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.damageReport.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting damage report:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 