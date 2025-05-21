const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendNotification } = require('../services/notificationService');

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
    // Send notifications for new dock schedule
    try {
      const admins = await prisma.user.findMany({ where: { warehouseId: newSchedule.warehouseId, role: 'warehouse_admin' } });
      const recipients = admins.map(u => u.id);
      if (newSchedule.transporterId) recipients.push(newSchedule.transporterId);
      for (const uid of recipients) {
        await sendNotification({
          userId: uid,
          type: 'dock_schedule',
          title: 'New Dock Schedule Created',
          message: `Shipment ${newSchedule.shipmentId || ''} scheduled arrival on ${newSchedule.scheduledArrival}`,
          metadata: { scheduleId: newSchedule.id, shipmentId: newSchedule.shipmentId }
        });
      }
    } catch (notifErr) {
      console.error('Error sending dock schedule creation notifications:', notifErr);
    }
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
    // Send notifications for dock schedule update
    try {
      const admins = await prisma.user.findMany({ where: { warehouseId: updated.warehouseId, role: 'warehouse_admin' } });
      const recipients = admins.map(u => u.id);
      if (updated.transporterId) recipients.push(updated.transporterId);
      for (const uid of recipients) {
        await sendNotification({
          userId: uid,
          type: 'dock_schedule',
          title: 'Dock Schedule Updated',
          message: `Shipment ${updated.shipmentId || ''} schedule updated (status: ${updated.status})`,
          metadata: { scheduleId: updated.id, shipmentId: updated.shipmentId }
        });
      }
    } catch (notifErr) {
      console.error('Error sending dock schedule update notifications:', notifErr);
    }
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