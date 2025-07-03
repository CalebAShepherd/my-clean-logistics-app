const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// List all accounts (optionally scoped to tenant)
exports.listAccounts = async (req, res) => {
  try {
    const { tenantId } = req.user || {}; // expect tenantId on auth middleware
    const accounts = await prisma.account.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json(accounts);
  } catch (err) {
    console.error('Error listing accounts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get account by ID
exports.getAccount = async (req, res) => {
  const { id } = req.params;
  try {
    const account = await prisma.account.findUnique({
      where: { id },
      include: { contacts: true, deals: true },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    console.error('Error getting account:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create account
exports.createAccount = async (req, res) => {
  const { name, description } = req.body;
  try {
    const { tenantId, id: userId } = req.user || {};
    const account = await prisma.account.create({
      data: {
        name,
        description,
        tenantId,
        ownerId: userId,
      },
    });
    res.status(201).json(account);
  } catch (err) {
    console.error('Error creating account:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update account
exports.updateAccount = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const account = await prisma.account.update({
      where: { id },
      data: { name, description },
    });
    res.json(account);
  } catch (err) {
    console.error('Error updating account:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete account
exports.deleteAccount = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.account.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting account:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 