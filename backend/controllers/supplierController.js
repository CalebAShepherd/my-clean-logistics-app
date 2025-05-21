const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany();
    return res.json(suppliers);
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(supplier);
  } catch (err) {
    console.error('Error fetching supplier:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const { name, contactInfo } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const newSupplier = await prisma.supplier.create({
      data: { name, contactInfo },
    });
    return res.status(201).json(newSupplier);
  } catch (err) {
    console.error('Error creating supplier:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contactInfo } = req.body;
    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: { name, contactInfo },
    });
    return res.json(updatedSupplier);
  } catch (err) {
    console.error('Error updating supplier:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.supplier.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting supplier:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 