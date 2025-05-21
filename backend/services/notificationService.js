const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create a new notification record
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.type
 * @param {string} params.title
 * @param {string} [params.message]
 * @param {Object} [params.metadata]
 */
async function sendNotification({ userId, type, title, message, metadata }) {
  return prisma.notification.create({
    data: { userId, type, title, message, metadata }
  });
}

module.exports = { sendNotification }; 