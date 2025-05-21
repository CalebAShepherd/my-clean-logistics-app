const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendNotification } = require('../services/notificationService');

// Schedule pickup reminders daily at 8am
cron.schedule('0 8 * * *', async () => {
  console.log('Running pickup reminder job...');
  try {
    const today = new Date();
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    // Find shipments scheduled for pickup tomorrow and not yet in transit
    const shipments = await prisma.shipment.findMany({
      where: {
        shipmentDate: { gte: tomorrowStart, lt: tomorrowEnd },
        status: 'CREATED',
        transporterId: { not: null }
      }
    });
    for (const shipment of shipments) {
      try {
        await sendNotification({
          userId: shipment.transporterId,
          type: 'pickup_reminder',
          title: 'Pickup Reminder',
          message: `You have a pickup scheduled for shipment ${shipment.id} on ${shipment.shipmentDate.toISOString().split('T')[0]}.`,
          metadata: { shipmentId: shipment.id }
        });
      } catch (err) {
        console.error('Error sending pickup reminder for', shipment.id, err);
      }
    }
  } catch (err) {
    console.error('Pickup reminder job failed:', err);
  }
}); 