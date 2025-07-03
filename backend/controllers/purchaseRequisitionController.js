const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all purchase requisitions with filtering and pagination
exports.getPurchaseRequisitions = async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      requesterId,
      warehouseId,
      search,
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      page = 1,
      limit = 50 
    } = req.query;

    // Build filter conditions
    const where = {};
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (requesterId) where.requesterId = requesterId;
    if (warehouseId) where.warehouseId = warehouseId;
    
    if (search) {
      where.OR = [
        { requisitionNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { justification: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build sort conditions
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const requisitions = await prisma.purchaseRequisition.findMany({
      where,
      orderBy,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        requester: {
          select: { username: true, email: true }
        },
        warehouse: {
          select: { name: true, address: true }
        },
        supplier: {
          select: { name: true, email: true }
        },
        lineItems: {
          select: {
            id: true,
            itemDescription: true,
            quantity: true,
            estimatedPrice: true,
            totalEstimated: true,
            category: true
          }
        },
        _count: {
          select: {
            lineItems: true,
            purchaseOrders: true
          }
        }
      }
    });

    const total = await prisma.purchaseRequisition.count({ where });

    return res.json({
      requisitions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching purchase requisitions:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single purchase requisition
exports.getPurchaseRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    
    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: {
        requester: {
          select: { username: true, email: true, phone: true }
        },
        warehouse: {
          select: { name: true, address: true }
        },
        supplier: {
          select: { name: true, email: true, phone: true, address: true }
        },
        lineItems: {
          include: {
            inventoryItem: {
              select: { sku: true, name: true, unit: true }
            }
          }
        },
        purchaseOrders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            orderDate: true
          }
        }
      }
    });

    if (!requisition) {
      return res.status(404).json({ error: 'Purchase requisition not found' });
    }

    return res.json(requisition);
  } catch (err) {
    console.error('Error fetching purchase requisition:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create purchase requisition
exports.createPurchaseRequisition = async (req, res) => {
  try {
    const { 
      requesterId,
      warehouseId,
      supplierId,
      description,
      justification,
      budgetCode,
      priority = 'MEDIUM',
      requiredDate,
      lineItems = []
    } = req.body;

    if (!requesterId) {
      return res.status(400).json({ error: 'Requester ID is required' });
    }

    if (!requiredDate) {
      return res.status(400).json({ error: 'Required date is required' });
    }

    if (!lineItems || lineItems.length === 0) {
      return res.status(400).json({ error: 'At least one line item is required' });
    }

    // Generate requisition number
    const count = await prisma.purchaseRequisition.count();
    const requisitionNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    // Calculate total estimated amount
    const totalEstimated = lineItems.reduce((sum, item) => {
      return sum + (parseFloat(item.estimatedPrice || 0) * parseInt(item.quantity || 0));
    }, 0);

    const newRequisition = await prisma.purchaseRequisition.create({
      data: {
        requisitionNumber,
        requesterId,
        warehouseId: warehouseId || null,
        supplierId: supplierId || null,
        description: description?.trim() || null,
        justification: justification?.trim() || null,
        budgetCode: budgetCode?.trim() || null,
        priority,
        totalEstimated,
        requestedDate: new Date(),
        requiredDate: new Date(requiredDate),
        lineItems: {
          create: lineItems.map(item => ({
            itemDescription: item.itemDescription,
            specification: item.specification?.trim() || null,
            quantity: parseInt(item.quantity),
            estimatedPrice: parseFloat(item.estimatedPrice || 0),
            totalEstimated: parseFloat(item.estimatedPrice || 0) * parseInt(item.quantity),
            category: item.category?.trim() || null,
            inventoryItemId: item.inventoryItemId || null
          }))
        }
      },
      include: {
        requester: {
          select: { username: true, email: true }
        },
        lineItems: true
      }
    });

    return res.status(201).json(newRequisition);
  } catch (err) {
    console.error('Error creating purchase requisition:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update purchase requisition
exports.updatePurchaseRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Check if requisition exists and is editable
    const existing = await prisma.purchaseRequisition.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Purchase requisition not found' });
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cannot update non-pending requisition' });
    }

    // Clean up data
    Object.keys(updateData).forEach(key => {
      if (typeof updateData[key] === 'string') {
        updateData[key] = updateData[key].trim() || null;
      }
    });

    // Handle dates
    if (updateData.requiredDate) {
      updateData.requiredDate = new Date(updateData.requiredDate);
    }

    // Calculate new total if needed
    if (updateData.lineItems) {
      updateData.totalEstimated = updateData.lineItems.reduce((sum, item) => {
        return sum + (parseFloat(item.estimatedPrice || 0) * parseInt(item.quantity || 0));
      }, 0);
    }

    const updatedRequisition = await prisma.purchaseRequisition.update({
      where: { id },
      data: updateData,
      include: {
        requester: {
          select: { username: true, email: true }
        },
        lineItems: true
      }
    });

    return res.json(updatedRequisition);
  } catch (err) {
    console.error('Error updating purchase requisition:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve purchase requisition
exports.approvePurchaseRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, comments } = req.body;

    if (!approvedBy) {
      return res.status(400).json({ error: 'Approver ID is required' });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!requisition) {
      return res.status(404).json({ error: 'Purchase requisition not found' });
    }

    if (requisition.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only approve pending requisitions' });
    }

    const updatedRequisition = await prisma.purchaseRequisition.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date()
      },
      include: {
        requester: {
          select: { username: true, email: true }
        },
        lineItems: true
      }
    });

    // TODO: Send notification to requester
    // TODO: Trigger purchase order creation workflow if configured

    return res.json(updatedRequisition);
  } catch (err) {
    console.error('Error approving purchase requisition:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject purchase requisition
exports.rejectPurchaseRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectedBy, rejectionReason } = req.body;

    if (!rejectedBy) {
      return res.status(400).json({ error: 'Rejector ID is required' });
    }

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!requisition) {
      return res.status(404).json({ error: 'Purchase requisition not found' });
    }

    if (requisition.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only reject pending requisitions' });
    }

    const updatedRequisition = await prisma.purchaseRequisition.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason.trim()
      },
      include: {
        requester: {
          select: { username: true, email: true }
        },
        lineItems: true
      }
    });

    // TODO: Send notification to requester

    return res.json(updatedRequisition);
  } catch (err) {
    console.error('Error rejecting purchase requisition:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Convert to purchase order
exports.convertToPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { createdBy, supplierId, notes } = req.body;

    if (!createdBy) {
      return res.status(400).json({ error: 'Creator ID is required' });
    }

    if (!supplierId) {
      return res.status(400).json({ error: 'Supplier ID is required' });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: {
        lineItems: true
      }
    });

    if (!requisition) {
      return res.status(404).json({ error: 'Purchase requisition not found' });
    }

    if (requisition.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Can only convert approved requisitions' });
    }

    // Generate PO number
    const poCount = await prisma.purchaseOrder.count();
    const orderNumber = `PO-${new Date().getFullYear()}-${String(poCount + 1).padStart(6, '0')}`;

    // Create purchase order
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        warehouseId: requisition.warehouseId,
        orderDate: new Date(),
        expectedDate: requisition.requiredDate,
        notes: notes?.trim() || null,
        createdBy,
        requisitionId: id,
        subtotal: requisition.totalEstimated,
        totalAmount: requisition.totalEstimated,
        totalItems: requisition.lineItems.length,
        lineItems: {
          create: requisition.lineItems.map(item => ({
            itemDescription: item.itemDescription,
            quantity: item.quantity,
            unitPrice: item.estimatedPrice,
            totalPrice: item.totalEstimated,
            inventoryItemId: item.inventoryItemId
          }))
        }
      },
      include: {
        supplier: {
          select: { name: true, email: true }
        },
        lineItems: true
      }
    });

    // Update requisition status
    await prisma.purchaseRequisition.update({
      where: { id },
      data: { status: 'CONVERTED_TO_PO' }
    });

    return res.status(201).json(purchaseOrder);
  } catch (err) {
    console.error('Error converting to purchase order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete purchase requisition
exports.deletePurchaseRequisition = async (req, res) => {
  try {
    const { id } = req.params;

    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!requisition) {
      return res.status(404).json({ error: 'Purchase requisition not found' });
    }

    if (!['PENDING', 'REJECTED'].includes(requisition.status)) {
      return res.status(400).json({ error: 'Cannot delete approved or converted requisitions' });
    }

    await prisma.purchaseRequisition.delete({
      where: { id }
    });

    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting purchase requisition:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get pending approvals for a user
exports.getPendingApprovals = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // TODO: Implement proper approval workflow logic
    // For now, return all pending requisitions
    const pendingRequisitions = await prisma.purchaseRequisition.findMany({
      where: { status: 'PENDING' },
      include: {
        requester: {
          select: { username: true, email: true }
        },
        warehouse: {
          select: { name: true }
        },
        lineItems: {
          select: {
            itemDescription: true,
            quantity: true,
            estimatedPrice: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(pendingRequisitions);
  } catch (err) {
    console.error('Error fetching pending approvals:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 