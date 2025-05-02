

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * List all carriers
 */
exports.listCarriers = async (req, res) => {
  try {
    const carriers = await prisma.carrier.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(carriers);
  } catch (err) {
    console.error('Error listing carriers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single carrier by ID
 */
exports.getCarrier = async (req, res) => {
  const { id } = req.params;
  try {
    const carrier = await prisma.carrier.findUnique({ where: { id } });
    if (!carrier) {
      return res.status(404).json({ error: 'Carrier not found' });
    }
    res.json(carrier);
  } catch (err) {
    console.error('Error getting carrier:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new carrier
 */
exports.createCarrier = async (req, res) => {
  const { name, code, apiKey } = req.body;
  try {
    const carrier = await prisma.carrier.create({
      data: { name, code, apiKey }
    });
    res.status(201).json(carrier);
  } catch (err) {
    console.error('Error creating carrier:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an existing carrier
 */
exports.updateCarrier = async (req, res) => {
  const { id } = req.params;
  const { name, code, apiKey } = req.body;
  try {
    const carrier = await prisma.carrier.update({
      where: { id },
      data: { name, code, apiKey }
    });
    res.json(carrier);
  } catch (err) {
    console.error('Error updating carrier:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a carrier
 */
exports.deleteCarrier = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.carrier.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting carrier:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};