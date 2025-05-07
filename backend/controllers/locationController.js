const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * List all locations, optionally filtered by warehouseId
 */
exports.getLocations = async (req, res) => {
  try {
    const { warehouseId } = req.query;
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    const locations = await prisma.location.findMany({ where });
    return res.json(locations);
  } catch (err) {
    console.error('Error fetching locations:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single location by ID
 */
exports.getLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const location = await prisma.location.findUnique({ where: { id } });
    if (!location) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(location);
  } catch (err) {
    console.error('Error fetching location:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new location
 */
exports.createLocation = async (req, res) => {
  try {
    const { warehouseId, zone, shelf, bin } = req.body;
    if (!warehouseId || !zone || !shelf || !bin) {
      return res.status(400).json({ error: 'warehouseId, zone, shelf, and bin are required' });
    }
    const newLocation = await prisma.location.create({
      data: { warehouseId, zone, shelf, bin }
    });
    return res.status(201).json(newLocation);
  } catch (err) {
    console.error('Error creating location:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an existing location
 */
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await prisma.location.update({
      where: { id },
      data: updates
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error updating location:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a location
 */
exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.location.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting location:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 