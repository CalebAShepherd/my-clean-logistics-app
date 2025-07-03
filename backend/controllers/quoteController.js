const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listQuotes = async (req, res) => {
  try {
    const { tenantId } = req.user || {};
    const quotes = await prisma.quote.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json(quotes);
  } catch (err) {
    console.error('Error listing quotes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getQuote = async (req, res) => {
  const { id } = req.params;
  try {
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    res.json(quote);
  } catch (err) {
    console.error('Error getting quote:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createQuote = async (req, res) => {
  const { title, amount, validUntil, dealId } = req.body;
  try {
    const { tenantId } = req.user || {};
    const quote = await prisma.quote.create({
      data: { title, amount, validUntil, dealId, tenantId },
    });
    res.status(201).json(quote);
  } catch (err) {
    console.error('Error creating quote:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateQuote = async (req, res) => {
  const { id } = req.params;
  const { title, amount, validUntil, version } = req.body;
  try {
    const quote = await prisma.quote.update({
      where: { id },
      data: { title, amount, validUntil, version },
    });
    res.json(quote);
  } catch (err) {
    console.error('Error updating quote:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteQuote = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.quote.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting quote:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 