const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * List all dock schedules, optionally filtered by warehouseId, transporterId, or shipmentId
 */
exports.getDockSchedules = async (req, res) => {
  try {
    const { warehouseId, transporterId, shipmentId, status } = req.query;
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (transporterId) where.transporterId = transporterId;
    if (shipmentId) where.shipmentId = shipmentId;
    if (status) where.status = status;
    const schedules = await prisma.dockSchedule.findMany({ where });
    return res.json(schedules);
  } catch (err) {
    console.error('Error fetching dock schedules:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single dock schedule by ID
 */
exports.getDockSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await prisma.dockSchedule.findUnique({ where: { id } });
    if (!schedule) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(schedule);
  } catch (err) {
    console.error('Error fetching dock schedule:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new dock schedule entry
 */
exports.createDockSchedule = async (req, res) => {
  try {
    const { warehouseId, transporterId, shipmentId, scheduledArrival, scheduledDeparture, status, notes } = req.body;
    if (!warehouseId || !scheduledArrival) {
      return res.status(400).json({ error: 'warehouseId and scheduledArrival are required' });
    }
    const newSchedule = await prisma.dockSchedule.create({
      data: { warehouseId, transporterId, shipmentId, scheduledArrival, scheduledDeparture, status, notes }
    });
    return res.status(201).json(newSchedule);
  } catch (err) {
    console.error('Error creating dock schedule:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an existing dock schedule
 */
exports.updateDockSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await prisma.dockSchedule.update({
      where: { id },
      data: updates
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error updating dock schedule:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a dock schedule entry
 */
exports.deleteDockSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.dockSchedule.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting dock schedule:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 