const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Enhanced supplier listing with search, filtering, and sorting
exports.getSuppliers = async (req, res) => {
  try {
    const { 
      search, 
      status, 
      type, 
      sortBy = 'name', 
      sortOrder = 'asc',
      page = 1,
      limit = 50 
    } = req.query;

    // Build filter conditions
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactInfo: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (status) where.status = status;
    if (type) where.supplierType = type;

    // Build sort conditions
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        purchaseOrders: {
          take: 5,
          orderBy: { orderDate: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            orderDate: true
          }
        },
        vendorScorecard: {
          take: 1,
          orderBy: { evaluationDate: 'desc' },
          select: {
            overallScore: true,
            qualityScore: true,
            deliveryScore: true,
            serviceScore: true,
            costScore: true,
            evaluationDate: true
          }
        },
        _count: {
          select: {
            purchaseOrders: true,
            supplierInvoices: true,
            performanceMetrics: true
          }
        }
      }
    });

    const total = await prisma.supplier.count({ where });

    return res.json({
      suppliers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single supplier with full details
exports.getSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({ 
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { orderDate: 'desc' },
          take: 10,
          include: {
            _count: {
              select: { lineItems: true }
            }
          }
        },
        vendorScorecard: {
          orderBy: { evaluationDate: 'desc' },
          take: 5,
          include: {
            evaluator: {
              select: { username: true, email: true }
            }
          }
        },
        purchaseContracts: {
          where: { status: 'ACTIVE' },
          orderBy: { endDate: 'asc' }
        },
        supplierCertifications: {
          orderBy: { expiryDate: 'asc' }
        },
        performanceMetrics: {
          orderBy: { measurementDate: 'desc' },
          take: 20
        },
        procurementSpend: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 12
        },
        _count: {
          select: {
            purchaseOrders: true,
            supplierInvoices: true,
            performanceMetrics: true,
            vendorScorecard: true
          }
        }
      }
    });
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    return res.json(supplier);
  } catch (err) {
    console.error('Error fetching supplier:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create enhanced supplier
exports.createSupplier = async (req, res) => {
  try {
    const { 
      name, 
      contactInfo, 
      email, 
      phone, 
      address, 
      website,
      taxId,
      supplierType = 'VENDOR',
      paymentTerms,
      creditLimit,
      currency = 'USD',
      leadTime,
      minimumOrder
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const newSupplier = await prisma.supplier.create({
      data: { 
        name: name.trim(),
        contactInfo: contactInfo?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        website: website?.trim() || null,
        taxId: taxId?.trim() || null,
        supplierType,
        paymentTerms: paymentTerms?.trim() || null,
        creditLimit: creditLimit ? parseFloat(creditLimit) : null,
        currency,
        leadTime: leadTime ? parseInt(leadTime) : null,
        minimumOrder: minimumOrder ? parseFloat(minimumOrder) : null
      },
    });
    
    return res.status(201).json(newSupplier);
  } catch (err) {
    console.error('Error creating supplier:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update enhanced supplier
exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Clean up numeric fields
    if (updateData.creditLimit) updateData.creditLimit = parseFloat(updateData.creditLimit);
    if (updateData.leadTime) updateData.leadTime = parseInt(updateData.leadTime);
    if (updateData.minimumOrder) updateData.minimumOrder = parseFloat(updateData.minimumOrder);
    
    // Clean up string fields
    Object.keys(updateData).forEach(key => {
      if (typeof updateData[key] === 'string') {
        updateData[key] = updateData[key].trim() || null;
      }
    });

    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            supplierInvoices: true
          }
        }
      }
    });
    
    return res.json(updatedSupplier);
  } catch (err) {
    console.error('Error updating supplier:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update supplier status
exports.updateSupplierStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLACKLISTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      }
    });
    
    // Log status change if needed
    // TODO: Add audit log entry
    
    return res.json(updatedSupplier);
  } catch (err) {
    console.error('Error updating supplier status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get supplier performance summary
exports.getSupplierPerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '12M' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '3M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '12M':
      default:
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
    }

    // Get performance metrics
    const metrics = await prisma.supplierPerformanceMetric.findMany({
      where: {
        supplierId: id,
        measurementDate: { gte: startDate }
      },
      orderBy: { measurementDate: 'desc' }
    });

    // Get recent scorecards
    const scorecards = await prisma.vendorScorecard.findMany({
      where: {
        supplierId: id,
        evaluationDate: { gte: startDate }
      },
      orderBy: { evaluationDate: 'desc' },
      include: {
        evaluator: {
          select: { username: true }
        }
      }
    });

    // Get spend data
    const spendData = await prisma.procurementSpend.findMany({
      where: {
        supplierId: id,
        year: { gte: startDate.getFullYear() }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    // Calculate aggregated performance data
    const performanceSummary = {
      totalSpend: spendData.reduce((sum, spend) => sum + parseFloat(spend.totalSpend), 0),
      totalOrders: spendData.reduce((sum, spend) => sum + spend.orderCount, 0),
      averageOrderValue: 0,
      onTimeDeliveryRate: 0,
      qualityScore: 0,
      costSavings: spendData.reduce((sum, spend) => sum + parseFloat(spend.costSavings), 0)
    };

    if (performanceSummary.totalOrders > 0) {
      performanceSummary.averageOrderValue = performanceSummary.totalSpend / performanceSummary.totalOrders;
    }

    // Calculate average rates
    const onTimeDeliveryMetrics = spendData.filter(s => s.onTimeDelivery !== null);
    if (onTimeDeliveryMetrics.length > 0) {
      performanceSummary.onTimeDeliveryRate = onTimeDeliveryMetrics.reduce((sum, s) => sum + s.onTimeDelivery, 0) / onTimeDeliveryMetrics.length;
    }

    if (scorecards.length > 0) {
      performanceSummary.qualityScore = scorecards.reduce((sum, s) => sum + s.qualityScore, 0) / scorecards.length;
    }

    return res.json({
      summary: performanceSummary,
      metrics,
      scorecards,
      spendData,
      period
    });
  } catch (err) {
    console.error('Error fetching supplier performance:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete supplier (with safety checks)
exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check for active purchase orders
    const activePOs = await prisma.purchaseOrder.count({
      where: {
        supplierId: id,
        status: { in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACKNOWLEDGED'] }
      }
    });

    if (activePOs > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete supplier with active purchase orders',
        activeOrders: activePOs
      });
    }

    // Check for pending invoices
    const pendingInvoices = await prisma.supplierInvoice.count({
      where: {
        supplierId: id,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    if (pendingInvoices > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete supplier with pending invoices',
        pendingInvoices
      });
    }

    // Safe to delete - set status to inactive instead of hard delete
    await prisma.supplier.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });
    
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting supplier:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 