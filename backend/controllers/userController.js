const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Change a user's role (admin and crm_admin)
exports.changeRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  // Validate role
  const validRoles = ['admin', 'client', 'dispatcher', 'transporter', 'warehouse_admin', 'crm_admin', 'sales_rep', 'account_manager'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // CRM roles that can be managed by crm_admin
  const crmRoles = ['crm_admin', 'sales_rep', 'account_manager'];
  const currentUserRole = req.user.role;

  // If the current user is crm_admin, restrict what they can do
  if (currentUserRole === 'crm_admin') {
    // CRM admins can only change roles to other CRM roles
    if (!crmRoles.includes(role)) {
      return res.status(403).json({ error: 'CRM admins can only assign CRM roles' });
    }
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If current user is crm_admin, they can only modify users with CRM roles
    if (currentUserRole === 'crm_admin' && !crmRoles.includes(user.role)) {
      return res.status(403).json({ error: 'CRM admins can only modify CRM users' });
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
      const { role, warehouseId } = req.query;
      
      // Build where clause based on query parameters
      const where = {};
      if (role) {
        where.role = role;
      }
      if (warehouseId) {
        where.warehouseId = warehouseId;
      }
      
      const users = await prisma.user.findMany({
        where,
        select: { id: true, email: true, username: true, role: true, warehouseId: true, phone: true }
      });
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

// POST /api/location/update
exports.updateTransporterLocation = async (req, res) => {
  const { userId, latitude, longitude } = req.body;
  if (!userId || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'userId, latitude, and longitude are required' });
  }
  try {
    const location = await prisma.transporterLocation.upsert({
      where: { userId },
      update: { latitude, longitude },
      create: { userId, latitude, longitude },
      include: { User: true }
    });
    return res.json(location);
  } catch (err) {
    console.error('Error updating transporter location:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/locations/fleet
exports.getFleetLocations = async (req, res) => {
  try {
    const locations = await prisma.transporterLocation.findMany({
      include: { User: true }
    });
    return res.json(locations);
  } catch (err) {
    console.error('Error fetching fleet locations:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /users/me - get current user's profile
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        warehouseId: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('Error fetching current user:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /users/me - update current user's profile info
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, phone } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { username, phone },
    });
    return res.json({ id: updated.id, email: updated.email, username: updated.username, phone: updated.phone });
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /users/me/password - change current user's password
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'New password must differ from current password' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    // hash new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Assign a warehouse to a warehouse_admin user (admin only)
exports.assignWarehouse = async (req, res) => {
  const { id } = req.params;
  const { warehouseId } = req.body;
  if (!warehouseId) {
    return res.status(400).json({ error: 'warehouseId is required' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'warehouse_admin') {
      return res.status(400).json({ error: 'User is not a warehouse admin' });
    }
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) return res.status(400).json({ error: 'Invalid warehouseId' });
    const updated = await prisma.user.update({ where: { id }, data: { warehouseId } });
    res.json({ id: updated.id, warehouseId: updated.warehouseId });
  } catch (err) {
    console.error('Error assigning warehouse to user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a user by id (admin & dispatcher)
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, username: true, role: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new user (admin & dispatcher)
exports.createUser = async (req, res) => {
  const { email, username, password, role } = req.body;
  if (!email || !username || !password || !role) {
    return res.status(400).json({ error: 'email, username, password, and role are required' });
  }
  const validRoles = ['admin','client','dispatcher','carrier','warehouse_admin','transporter'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, username, password: hashed, role } });
    res.status(201).json({ id: user.id, email: user.email, username: user.username, role: user.role });
  } catch (err) {
    console.error('Error creating user:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Email or username already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a user by id (admin & dispatcher)
exports.updateUserById = async (req, res) => {
  const { id } = req.params;
  const { email, username, password } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'User not found' });
    const data = {};
    if (email) data.email = email;
    if (username) data.username = username;
    if (password) data.password = await bcrypt.hash(password, 10);
    const updated = await prisma.user.update({ where: { id }, data });
    res.json({ id: updated.id, email: updated.email, username: updated.username, role: updated.role });
  } catch (err) {
    console.error('Error updating user:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Email or username already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a user by id (admin & dispatcher)
exports.deleteUserById = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
