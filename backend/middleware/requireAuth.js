require('dotenv').config();
const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  console.log('requireAuth: received token:', token);
  console.log('requireAuth: using secret:', JWT_SECRET);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    prisma.setTenant(user.tenantId);
    req.user = { id: user.id, role: user.role, tenantId: user.tenantId };
    next();
  } catch (err) {
    console.error('requireAuth: token verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
