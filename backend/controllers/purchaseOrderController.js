const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all purchase orders with filtering and pagination
exports.getPurchaseOrders = async (req, res) => {
  try {
    const { 
      status, 
      supplierId,
      warehouseId,
      createdBy,
      search,
      dateFrom,
      dateTo,
      sortBy = 'orderDate', 
      sortOrder = 'desc',
      page = 1,
      limit = 50 
    } = req.query;

    // Build filter conditions
    const where = {};
    
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (createdBy) where.createdBy = createdBy;
    
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.orderDate = {};
      if (dateFrom) where.orderDate.gte = new Date(dateFrom);
      if (dateTo) where.orderDate.lte = new Date(dateTo);
    }

    // Build sort conditions
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      orderBy,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        supplier: {
          select: { name: true, email: true, phone: true, status: true }
        },
        warehouse: {
          select: { name: true, address: true }
        },
        creator: {
          select: { username: true, email: true }
        },
        approver: {
          select: { username: true, email: true }
        },
        requisition: {
          select: { requisitionNumber: true }
        },
        _count: {
          select: {
            lineItems: true,
            receipts: true,
            invoices: true
          }
        }
      }
    });

    const total = await prisma.purchaseOrder.count({ where });

    // Calculate summary statistics
    const summaryStats = await prisma.purchaseOrder.groupBy({
      by: ['status'],
      where,
      _sum: { totalAmount: true },
      _count: { id: true }
    });

    return res.json({
      purchaseOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: summaryStats
    });
  } catch (err) {
    console.error('Error fetching purchase orders:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single purchase order
exports.getPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: {
          select: { name: true, address: true }
        },
        creator: {
          select: { username: true, email: true, phone: true }
        },
        approver: {
          select: { username: true, email: true }
        },
        requisition: {
          select: { 
            requisitionNumber: true, 
            requester: { select: { username: true } }
          }
        },
        lineItems: {
          include: {
            inventoryItem: {
              select: { sku: true, name: true, unit: true }
            }
          }
        },
        receipts: {
          include: {
            receiver: {
              select: { username: true }
            }
          },
          orderBy: { receivedDate: 'desc' }
        },
        invoices: {
          orderBy: { invoiceDate: 'desc' }
        }
      }
    });

    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    return res.json(purchaseOrder);
  } catch (err) {
    console.error('Error fetching purchase order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create purchase order
exports.createPurchaseOrder = async (req, res) => {
  try {
    const { 
      supplierId,
      warehouseId,
      createdBy,
      expectedDate,
      paymentTerms,
      deliveryTerms,
      notes,
      lineItems = []
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({ error: 'Supplier ID is required' });
    }

    if (!createdBy) {
      return res.status(400).json({ error: 'Creator ID is required' });
    }

    if (!lineItems || lineItems.length === 0) {
      return res.status(400).json({ error: 'At least one line item is required' });
    }

    // Generate order number
    const count = await prisma.purchaseOrder.count();
    const orderNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (parseFloat(item.unitPrice || 0) * parseInt(item.quantity || 0));
    }, 0);

    const taxAmount = subtotal * 0.08; // Default 8% tax - should be configurable
    const totalAmount = subtotal + taxAmount;

    const newPurchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        warehouseId: warehouseId || null,
        createdBy,
        orderDate: new Date(),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        paymentTerms: paymentTerms?.trim() || null,
        deliveryTerms: deliveryTerms?.trim() || null,
        notes: notes?.trim() || null,
        subtotal,
        taxAmount,
        totalAmount,
        totalItems: lineItems.length,
        lineItems: {
          create: lineItems.map(item => ({
            itemDescription: item.itemDescription,
            quantity: parseInt(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            totalPrice: parseFloat(item.unitPrice) * parseInt(item.quantity),
            inventoryItemId: item.inventoryItemId || null
          }))
        }
      },
      include: {
        supplier: {
          select: { name: true, email: true }
        },
        creator: {
          select: { username: true, email: true }
        },
        lineItems: true
      }
    });

    return res.status(201).json(newPurchaseOrder);
  } catch (err) {
    console.error('Error creating purchase order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update purchase order
exports.updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Check if purchase order exists and is editable
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (!['DRAFT', 'PENDING_APPROVAL'].includes(existing.status)) {
      return res.status(400).json({ error: 'Cannot update purchase order in current status' });
    }

    // Clean up data
    Object.keys(updateData).forEach(key => {
      if (typeof updateData[key] === 'string') {
        updateData[key] = updateData[key].trim() || null;
      }
    });

    // Handle dates
    if (updateData.expectedDate) {
      updateData.expectedDate = new Date(updateData.expectedDate);
    }

    // Recalculate totals if line items updated
    if (updateData.lineItems) {
      const subtotal = updateData.lineItems.reduce((sum, item) => {
        return sum + (parseFloat(item.unitPrice || 0) * parseInt(item.quantity || 0));
      }, 0);
      
      updateData.subtotal = subtotal;
      updateData.taxAmount = subtotal * 0.08;
      updateData.totalAmount = updateData.subtotal + updateData.taxAmount;
      updateData.totalItems = updateData.lineItems.length;
    }

    const updatedPurchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: {
          select: { name: true, email: true }
        },
        lineItems: true
      }
    });

    return res.json(updatedPurchaseOrder);
  } catch (err) {
    console.error('Error updating purchase order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve purchase order
exports.approvePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, comments } = req.body;

    if (!approvedBy) {
      return res.status(400).json({ error: 'Approver ID is required' });
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { status: true, totalAmount: true }
    });

    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (purchaseOrder.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Can only approve pending purchase orders' });
    }

    const updatedPurchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date()
      },
      include: {
        supplier: {
          select: { name: true, email: true }
        },
        lineItems: true
      }
    });

    // TODO: Send notification to supplier
    // TODO: Update supplier performance metrics

    return res.json(updatedPurchaseOrder);
  } catch (err) {
    console.error('Error approving purchase order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Send purchase order to supplier
exports.sendPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { sentBy, emailMessage } = req.body;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { name: true, email: true } }
      }
    });

    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (purchaseOrder.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Can only send approved purchase orders' });
    }

    const updatedPurchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT' }
    });

    // TODO: Send email to supplier with PO details
    // TODO: Log communication activity

    return res.json(updatedPurchaseOrder);
  } catch (err) {
    console.error('Error sending purchase order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete purchase order
exports.deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (!['DRAFT', 'CANCELLED'].includes(purchaseOrder.status)) {
      return res.status(400).json({ error: 'Can only delete draft or cancelled purchase orders' });
    }

    await prisma.purchaseOrder.delete({
      where: { id }
    });

    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting purchase order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 