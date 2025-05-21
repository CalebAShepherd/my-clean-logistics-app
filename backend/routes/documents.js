const express = require('express');
const multer = require('multer');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const documentController = require('../controllers/documentController');
const router = express.Router();

// Configure storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const safeName = `${Date.now()}-${base}${ext}`;
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// POST /api/shipments/:id/documents - upload a document for a shipment
router.post(
  '/shipments/:id/documents',
  requireAuth,
  requireRole(['admin','dispatcher','client','transporter']),
  upload.single('file'),
  documentController.uploadDocument
);

// GET /api/shipments/:id/documents - list documents for a shipment
router.get(
  '/shipments/:id/documents',
  requireAuth,
  requireRole(['admin','dispatcher','client','warehouse_admin','transporter']),
  documentController.listDocuments
);

// DELETE /api/documents/:id - delete a document
router.delete(
  '/documents/:id',
  requireAuth,
  requireRole(['admin','dispatcher']),
  documentController.deleteDocument
);

module.exports = router; 