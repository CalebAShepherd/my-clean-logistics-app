const prisma = require('../services/prisma');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/compliance/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = /pdf|doc|docx|xls|xlsx|txt|png|jpg|jpeg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only documents and images allowed.'));
    }
  }
});

// Get compliance documents with filtering and pagination
exports.getComplianceDocuments = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      documentType,
      category,
      accessLevel,
      soxControlId,
      insuranceClaimId,
      isExpired,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };
    if (documentType && documentType !== 'all') where.documentType = documentType;
    if (category && category !== 'all') where.category = category;
    if (accessLevel && accessLevel !== 'all') where.accessLevel = accessLevel;
    if (soxControlId) where.soxControlId = soxControlId;
    if (insuranceClaimId) where.insuranceClaimId = insuranceClaimId;
    if (isExpired !== undefined) where.isExpired = isExpired === 'true';

    const [documents, totalCount] = await Promise.all([
      prisma.complianceDocument.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          uploader: { select: { id: true, username: true, email: true } },
          soxControl: { select: { id: true, controlNumber: true, name: true } },
          soxTest: { select: { id: true, testDate: true, result: true } },
          insuranceClaim: { select: { id: true, claimNumber: true, insurer: true } },
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              uploader: { select: { id: true, username: true } }
            }
          },
          reminders: {
            where: { isCompleted: false },
            orderBy: { reminderDate: 'asc' },
            take: 3
          }
        }
      }),
      prisma.complianceDocument.count({ where })
    ]);

    res.json({
      documents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNext: skip + take < totalCount,
        hasPrev: skip > 0
      }
    });
  } catch (error) {
    console.error('Error fetching compliance documents:', error);
    res.status(500).json({ error: 'Failed to fetch compliance documents' });
  }
};

// Upload a new compliance document
exports.uploadDocument = [
  upload.single('document'),
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.user;
      const {
        title,
        description,
        documentType,
        category,
        retentionPeriod,
        isConfidential,
        accessLevel,
        soxControlId,
        soxTestId,
        insuranceClaimId
      } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!title || !documentType || !category) {
        return res.status(400).json({ error: 'title, documentType, and category are required' });
      }

      // Calculate expiry date if retention period is specified
      let expiryDate = null;
      if (retentionPeriod) {
        expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + parseInt(retentionPeriod));
      }

      const document = await prisma.complianceDocument.create({
        data: {
          title,
          description,
          fileName: req.file.originalname,
          filePath: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          documentType,
          category,
          retentionPeriod: retentionPeriod ? parseInt(retentionPeriod) : null,
          expiryDate,
          isConfidential: isConfidential === 'true',
          accessLevel: accessLevel || 'INTERNAL',
          soxControlId: soxControlId || null,
          soxTestId: soxTestId || null,
          insuranceClaimId: insuranceClaimId || null,
          uploadedBy: userId,
          tenantId
        },
        include: {
          uploader: { select: { id: true, username: true, email: true } },
          soxControl: { select: { id: true, controlNumber: true, name: true } },
          insuranceClaim: { select: { id: true, claimNumber: true, insurer: true } }
        }
      });

      // Create reminder if expiry date is set
      if (expiryDate) {
        const warningDate = new Date(expiryDate);
        warningDate.setDate(warningDate.getDate() - 30); // 30 days before expiry

        await prisma.documentReminder.create({
          data: {
            documentId: document.id,
            reminderDate: warningDate,
            reminderType: 'EXPIRY_WARNING',
            assignedTo: userId,
            tenantId
          }
        });
      }

      res.status(201).json(document);
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
];

// Download a document
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const document = await prisma.complianceDocument.findFirst({
      where: { id, tenantId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access level permissions here if needed
    // For now, allow all authenticated tenant users

    res.download(document.filePath, document.fileName);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
};

// Update document metadata
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;
    const updates = req.body;

    // Remove file-related fields that shouldn't be updated this way
    delete updates.fileName;
    delete updates.filePath;
    delete updates.fileSize;
    delete updates.mimeType;
    delete updates.uploadedBy;
    delete updates.tenantId;

    const document = await prisma.complianceDocument.update({
      where: { id, tenantId },
      data: updates,
      include: {
        uploader: { select: { id: true, username: true, email: true } },
        soxControl: { select: { id: true, controlNumber: true, name: true } },
        insuranceClaim: { select: { id: true, claimNumber: true, insurer: true } }
      }
    });

    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

// Delete a document
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const document = await prisma.complianceDocument.findFirst({
      where: { id, tenantId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.filePath);
    } catch (fileError) {
      console.warn('Could not delete file:', fileError);
    }

    // Delete from database
    await prisma.complianceDocument.delete({
      where: { id }
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

// Get document retention policies
exports.getRetentionPolicies = async (req, res) => {
  try {
    const { tenantId } = req.user;

    const policies = await prisma.documentRetentionPolicy.findMany({
      where: { tenantId },
      include: {
        creator: { select: { id: true, username: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ policies });
  } catch (error) {
    console.error('Error fetching retention policies:', error);
    res.status(500).json({ error: 'Failed to fetch retention policies' });
  }
};

// Create document retention policy
exports.createRetentionPolicy = async (req, res) => {
  try {
    const { tenantId, id: userId } = req.user;
    const {
      name,
      description,
      documentType,
      category,
      retentionPeriod,
      autoDelete,
      warningPeriod
    } = req.body;

    if (!name || !documentType || !category || !retentionPeriod) {
      return res.status(400).json({ error: 'name, documentType, category, and retentionPeriod are required' });
    }

    const policy = await prisma.documentRetentionPolicy.create({
      data: {
        name,
        description,
        documentType,
        category,
        retentionPeriod: parseInt(retentionPeriod),
        autoDelete: autoDelete === true,
        warningPeriod: warningPeriod ? parseInt(warningPeriod) : 30,
        tenantId,
        createdBy: userId
      },
      include: {
        creator: { select: { id: true, username: true, email: true } }
      }
    });

    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating retention policy:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A policy for this document type and category already exists' });
    }
    res.status(500).json({ error: 'Failed to create retention policy' });
  }
};

// Get documents expiring soon
exports.getExpiringDocuments = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { days = 30 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + parseInt(days));

    const documents = await prisma.complianceDocument.findMany({
      where: {
        tenantId,
        expiryDate: {
          lte: cutoffDate,
          gte: new Date()
        },
        isExpired: false
      },
      include: {
        uploader: { select: { id: true, username: true, email: true } },
        soxControl: { select: { id: true, controlNumber: true, name: true } },
        insuranceClaim: { select: { id: true, claimNumber: true, insurer: true } }
      },
      orderBy: { expiryDate: 'asc' }
    });

    res.json({ documents });
  } catch (error) {
    console.error('Error fetching expiring documents:', error);
    res.status(500).json({ error: 'Failed to fetch expiring documents' });
  }
}; 