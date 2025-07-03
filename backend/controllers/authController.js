require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logAudit = require('../services/auditLogger');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Signup - create a new user
exports.signup = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username and password are required' });
    }

    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // For now, let's assign a default tenant
    const tenantId = 'default-tenant';

    // Create user
    const user = await prisma.user.create({
      data: { email, username, password: hashed, role: 'client', tenantId }
    });

    // Audit
    await logAudit(req, 'User', user.id, 'CREATE', { email, username }, 'SYSTEM');

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    res.status(201).json({ token, userId: user.id, role: user.role });
  } catch (err) {
    console.error('Signup error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Login - authenticate and return a JWT
exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginField = email || username;
    
    if (!loginField || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }
    
    // Find user by email or username
    const user = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { email: loginField },
          { username: loginField }
        ]
      } 
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Audit login
    await logAudit(req, 'User', user.id, 'LOGIN', null, 'SYSTEM');

    const token = jwt.sign({ userId: user.id, role: user.role, tenantId: user.tenantId }, process.env.JWT_SECRET);

    return res.json({ token, userId: user.id, role: user.role, tenantId: user.tenantId });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};