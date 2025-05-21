const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendNotification } = require('../services/notificationService');

// Upload a document for a shipment
exports.uploadDocument = async (req, res) => {
  console.log('uploadDocument called. req.file =', req.file, 'req.body =', req.body);
  const shipmentId = req.params.id;
  const { type } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: 'File is required' });
  }
  const url = `/uploads/${req.file.filename}`;
  try {
    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
    const doc = await prisma.document.create({
      data: { shipment: { connect: { id: shipmentId } }, type, url }
    });

    // Send notification to opposite parties
    try {
      const recipients = new Set();
      if (shipment.clientId && shipment.clientId !== req.user.id) recipients.add(shipment.clientId);
      if (shipment.dispatcherId && shipment.dispatcherId !== req.user.id) recipients.add(shipment.dispatcherId);
      for (const uid of recipients) {
        await sendNotification({
          userId: uid,
          type: 'document_upload',
          title: 'New Document Uploaded',
          message: `A new ${type} document is available for shipment ${shipmentId}.`,
          metadata: { documentId: doc.id, shipmentId }
        });
      }
    } catch (notifErr) {
      console.error('Error sending document upload notification:', notifErr);
    }

    return res.status(201).json(doc);
  } catch (err) {
    console.error('Error uploading document:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// List documents for a shipment
exports.listDocuments = async (req, res) => {
  const shipmentId = req.params.id;
  try {
    const docs = await prisma.document.findMany({ where: { shipmentId } });
    return res.json(docs);
  } catch (err) {
    console.error('Error listing documents:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a document by ID
exports.deleteDocument = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.document.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting document:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 