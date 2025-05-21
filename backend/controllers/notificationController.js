const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// List notifications for authenticated user
exports.listNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (err) {
    console.error('Error listing notifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json(updated);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new notification (admin only)
exports.createNotification = async (req, res) => {
  const { userId, type, title, message, metadata } = req.body;
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, title, message, metadata }
    });
    res.status(201).json(notification);
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create mass notifications (broadcast) for specified roles or all users
exports.createBroadcast = async (req, res) => {
  const { roles, title, message, metadata } = req.body;
  try {
    let users;
    if (roles && Array.isArray(roles) && roles.length) {
      users = await prisma.user.findMany({
        where: { role: { in: roles } }
      });
    } else {
      users = await prisma.user.findMany();
    }
    const notifications = users.map(u => ({
      userId: u.id,
      type: 'broadcast',
      title,
      message,
      metadata
    }));
    await prisma.notification.createMany({ data: notifications, skipDuplicates: true });
    res.status(201).json({ count: notifications.length });
  } catch (err) {
    console.error('Error creating broadcast notifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 