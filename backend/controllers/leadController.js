const { PrismaClient, LeadStatus, DealStage } = require('@prisma/client');
const prisma = new PrismaClient();

// List leads
exports.listLeads = async (req, res) => {
  try {
    const { tenantId } = req.user || {};
    const leads = await prisma.lead.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json(leads);
  } catch (err) {
    console.error('Error listing leads:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get lead by ID
exports.getLead = async (req, res) => {
  const { id } = req.params;
  try {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    console.error('Error getting lead:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create lead
exports.createLead = async (req, res) => {
  const { firstName, lastName, email, phone, companyName, source } = req.body;
  try {
    const { tenantId, id: userId } = req.user || {};
    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        companyName,
        source,
        ownerId: userId,
        tenantId,
      },
    });
    res.status(201).json(lead);
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update lead
exports.updateLead = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, phone, companyName, status, source } = req.body;
  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: { firstName, lastName, email, phone, companyName, status, source },
    });
    res.json(lead);
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete lead
exports.deleteLead = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.lead.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Convert lead to account & deal
exports.convertLead = async (req, res) => {
  const { id } = req.params;
  try {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Create / find account
    const account = await prisma.account.create({
      data: {
        name: lead.companyName || `${lead.firstName} ${lead.lastName}`,
        tenantId: lead.tenantId,
        ownerId: lead.ownerId,
      },
    });

    // Create initial deal
    const deal = await prisma.deal.create({
      data: {
        title: `New deal for ${account.name}`,
        amount: 0,
        stage: DealStage.PROSPECTING,
        accountId: account.id,
        tenantId: lead.tenantId,
      },
    });

    // Update lead status
    await prisma.lead.update({
      where: { id },
      data: { status: LeadStatus.CONVERTED, accountId: account.id },
    });

    res.json({ account, deal });
  } catch (err) {
    console.error('Error converting lead:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 