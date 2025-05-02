

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Retrieve the single CompanySettings row, creating it if missing.
 */
exports.getSettings = async (req, res) => {
  try {
    let settings = await prisma.companySettings.findFirst();
    if (!settings) {
      settings = await prisma.companySettings.create({ data: {} });
    }
    return res.json(settings);
  } catch (err) {
    console.error('Error fetching company settings:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update or create the CompanySettings row.
 */
exports.updateSettings = async (req, res) => {
  try {
    const data = { ...req.body };
    const settings = await prisma.companySettings.upsert({
      where: { id: req.body.id || '' },
      create: data,
      update: data,
    });
    return res.json(settings);
  } catch (err) {
    console.error('Error updating company settings:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};