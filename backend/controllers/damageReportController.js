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
    const reports = await prisma.damageReport.findMany({ where, include: { InventoryItem: true } });
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
    const report = await prisma.damageReport.findUnique({ where: { id }, include: { InventoryItem: true } });
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
    const { warehouseId, itemId, quantity, description, type, reasonCode } = req.body;
    if (!warehouseId || !itemId || quantity == null) {
      return res.status(400).json({ error: 'warehouseId, itemId, and quantity are required' });
    }
    // Parse quantity to integer
    const qty = parseInt(quantity, 10);
    if (isNaN(qty)) {
      return res.status(400).json({ error: 'quantity must be a valid integer' });
    }
    // Handle uploaded photos
    const photoUrls = (req.files || []).map(file => {
      const url = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
      return url;
    });
    const newReport = await prisma.damageReport.create({
      data: { warehouseId, itemId, quantity: qty, description, type, reasonCode, photoUrls }
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
    const updates = { ...req.body };
    // Parse quantity if provided
    if (updates.quantity != null) {
      const qty2 = parseInt(updates.quantity, 10);
      if (isNaN(qty2)) {
        return res.status(400).json({ error: 'quantity must be a valid integer' });
      }
      updates.quantity = qty2;
    }
    // Append any new photo URLs
    if (req.files && req.files.length > 0) {
      const existing = await prisma.damageReport.findUnique({ where: { id } });
      const newUrls = req.files.map(file => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`);
      updates.photoUrls = [ ...(existing.photoUrls || []), ...newUrls ];
    }
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

/**
 * Export damage reports as CSV
 */
exports.exportDamageReports = async (req, res) => {
  try {
    const { warehouseId, itemId } = req.query;
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (itemId) where.itemId = itemId;
    const reports = await prisma.damageReport.findMany({ where, include: { InventoryItem: true } });
    // CSV header
    const header = ['SKU', 'Name', 'Type', 'Quantity', 'ReasonCode', 'Description', 'ReportedAt'];
    const rows = [header.join(',')];
    reports.forEach(r => {
      const sku = r.InventoryItem.sku.replace(/"/g, '""');
      const name = r.InventoryItem.name.replace(/"/g, '""');
      const type = r.type;
      const quantity = r.quantity;
      const reason = r.reasonCode ? r.reasonCode.replace(/"/g, '""') : '';
      const desc = r.description ? r.description.replace(/"/g, '""') : '';
      const date = r.reportedAt.toISOString();
      rows.push(`"${sku}","${name}","${type}",${quantity},"${reason}","${desc}","${date}"`);
    });
    const csv = rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="damage_reports.csv"');
    return res.send(csv);
  } catch (err) {
    console.error('Error exporting damage reports:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 