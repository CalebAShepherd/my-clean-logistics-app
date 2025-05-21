const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * List all SKU attribute definitions
 */
exports.getDefinitions = async (req, res) => {
  try {
    const defs = await prisma.skuAttributeDefinition.findMany();
    return res.json(defs);
  } catch (err) {
    console.error('Error fetching SKU attribute definitions:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single SKU attribute definition by ID
 */
exports.getDefinition = async (req, res) => {
  try {
    const { id } = req.params;
    const def = await prisma.skuAttributeDefinition.findUnique({ where: { id } });
    if (!def) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(def);
  } catch (err) {
    console.error('Error fetching SKU attribute definition:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new SKU attribute definition
 */
exports.createDefinition = async (req, res) => {
  try {
    const { key, label, type } = req.body;
    if (!key || !label || !type) {
      return res.status(400).json({ error: 'key, label, and type are required' });
    }
    const def = await prisma.skuAttributeDefinition.create({
      data: { key, label, type }
    });
    return res.status(201).json(def);
  } catch (err) {
    console.error('Error creating SKU attribute definition:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an existing SKU attribute definition
 */
exports.updateDefinition = async (req, res) => {
  try {
    const { id } = req.params;
    const { key, label, type } = req.body;
    const updated = await prisma.skuAttributeDefinition.update({
      where: { id },
      data: { key, label, type }
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error updating SKU attribute definition:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a SKU attribute definition
 */
exports.deleteDefinition = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.skuAttributeDefinition.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting SKU attribute definition:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 