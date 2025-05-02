const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Change a user's role (admin only)
exports.changeRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  // Validate role
  const validRoles = ['admin', 'client', 'dispatcher', 'carrier', 'warehouse-admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
    });

    return res.json({
      id: updated.id,
      email: updated.email,
      username: updated.username,
      role: updated.role
    });
  } catch (err) {
    console.error('Error changing role:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// List all users (admin only)
exports.listUsers = async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, username: true, role: true }
      });
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
