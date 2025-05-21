const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendNotification } = require('../services/notificationService');

// List all announcements (admin only)
exports.listAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, username: true } } }
    });
    res.json(announcements);
  } catch (err) {
    console.error('Error listing announcements:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new announcement and send notifications
exports.createAnnouncement = async (req, res) => {
  const { roles, userId, title, message, metadata } = req.body;
  const authorId = req.user.id;
  try {
    // Create announcement record
    const announcement = await prisma.announcement.create({
      data: { roles: roles || [], userId: userId || null, title, message, metadata: metadata || {}, authorId }
    });
    // Determine recipients
    let recipients = [];
    if (userId) {
      recipients = [userId];
    } else if (roles && roles.length) {
      const users = await prisma.user.findMany({ where: { role: { in: roles } } });
      recipients = users.map(u => u.id);
    }
    // Send notifications
    for (const uid of recipients) {
      try {
        await sendNotification({ userId: uid, type: 'broadcast', title, message, metadata: { ...metadata, announcementId: announcement.id } });
      } catch (notifErr) {
        console.error('Error sending announcement notification to', uid, notifErr);
      }
    }
    res.status(201).json(announcement);
  } catch (err) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 