const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendNotification } = require('../services/notificationService');

// Schedule document expiry reminders daily at 7am
cron.schedule('0 7 * * *', async () => {
  console.log('Running document expiry reminder job...');
  try {
    // TODO: Implement logic to scan for documents nearing expiration.
    // Example: if Document model includes expiresAt field, find documents where expiresAt is within the next 3 days
    // const now = new Date();
    // const soon = new Date(now);
    // soon.setDate(soon.getDate() + 3);
    // const docs = await prisma.document.findMany({ where: { expiresAt: { gte: now, lte: soon } } });
    // for (const doc of docs) {
    //   await sendNotification({ userId: doc.ownerId, type: 'document_expiry', title: 'Document Expiry Reminder', message: `Your document ${doc.id} expires on ${doc.expiresAt.toISOString().split('T')[0]}.`, metadata: { documentId: doc.id } });
    // }
  } catch (err) {
    console.error('Document expiry reminder job failed:', err);
  }
}); 