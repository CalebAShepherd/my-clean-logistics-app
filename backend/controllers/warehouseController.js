

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * List all warehouses
 */
exports.getWarehouses = async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany();
    return res.json(warehouses);
  } catch (err) {
    console.error('Error fetching warehouses:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new warehouse
 */
exports.createWarehouse = async (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }
    const warehouse = await prisma.warehouse.create({
      data: { name, address }
    });
    return res.status(201).json(warehouse);
  } catch (err) {
    console.error('Error creating warehouse:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a warehouse by ID
 */
exports.deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.warehouse.delete({
      where: { id }
    });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting warehouse:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};