const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// === EXPENSE MANAGEMENT ===

/**
 * Get expenses with pagination and filters
 */
exports.getExpenses = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { page = 1, limit = 20, status, category, costCenterId, startDate, endDate, supplierId } = req.query;
    
    const where = { tenantId };
    if (status) where.status = status;
    if (category) where.category = category;
    if (costCenterId) where.costCenterId = costCenterId;
    if (supplierId) where.supplierId = supplierId;
    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          costCenter: true,
          supplier: true,
          warehouse: true,
          approver: {
            select: { id: true, username: true, email: true }
          }
        },
        orderBy: { expenseDate: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.expense.count({ where })
    ]);

    // If no expenses exist, return mock data for demo
    if (expenses.length === 0) {
      const mockExpenses = [
        {
          id: 'exp_001',
          expenseNumber: 'EXP-2024-001',
          description: 'Office Supplies - Paper & Ink Cartridges',
          amount: 340,
          expenseDate: '2024-02-10T00:00:00.000Z',
          category: 'OFFICE_SUPPLIES',
          status: 'PENDING',
          receiptUrl: null,
          costCenter: { id: 'cc_1', code: 'ADM', name: 'Administration' },
          supplier: { id: 'sup_1', name: 'Office Depot' },
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          approver: null
        },
        {
          id: 'exp_002',
          expenseNumber: 'EXP-2024-002',
          description: 'Vehicle Fuel - Delivery Trucks Fleet',
          amount: 850,
          expenseDate: '2024-02-09T00:00:00.000Z',
          category: 'FUEL',
          status: 'APPROVED',
          receiptUrl: 'https://example.com/receipt-002.pdf',
          costCenter: { id: 'cc_2', code: 'OPS', name: 'Operations' },
          supplier: { id: 'sup_2', name: 'Shell Gas Station' },
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          approver: { id: 'user_1', username: 'admin', email: 'admin@company.com' }
        },
        {
          id: 'exp_003',
          expenseNumber: 'EXP-2024-003',
          description: 'Equipment Maintenance - Forklift Annual Service',
          amount: 1200,
          expenseDate: '2024-02-08T00:00:00.000Z',
          category: 'MAINTENANCE',
          status: 'PAID',
          receiptUrl: 'https://example.com/receipt-003.pdf',
          costCenter: { id: 'cc_2', code: 'OPS', name: 'Operations' },
          supplier: { id: 'sup_3', name: 'Industrial Equipment Services' },
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          approver: { id: 'user_1', username: 'admin', email: 'admin@company.com' }
        },
        {
          id: 'exp_004',
          expenseNumber: 'EXP-2024-004',
          description: 'Utilities - Monthly Electricity Bill',
          amount: 2100,
          expenseDate: '2024-02-01T00:00:00.000Z',
          category: 'UTILITIES',
          status: 'APPROVED',
          receiptUrl: null,
          costCenter: { id: 'cc_3', code: 'FAC', name: 'Facilities' },
          supplier: { id: 'sup_4', name: 'City Electric Company' },
          warehouse: { id: 'wh_1', name: 'Main Warehouse' },
          approver: { id: 'user_1', username: 'admin', email: 'admin@company.com' }
        },
        {
          id: 'exp_005',
          expenseNumber: 'EXP-2024-005',
          description: 'Professional Services - Legal Consultation',
          amount: 750,
          expenseDate: '2024-02-07T00:00:00.000Z',
          category: 'PROFESSIONAL_SERVICES',
          status: 'PENDING',
          receiptUrl: null,
          costCenter: { id: 'cc_1', code: 'ADM', name: 'Administration' },
          supplier: { id: 'sup_5', name: 'Smith & Associates Law Firm' },
          warehouse: null,
          approver: null
        }
      ];
      
      return res.json(mockExpenses);
    }

    return res.json(expenses);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single expense by ID
 */
exports.getExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const expense = await prisma.expense.findUnique({
      where: { id, tenantId },
      include: {
        costCenter: true,
        supplier: true,
        warehouse: true,
        approver: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    return res.json(expense);
  } catch (err) {
    console.error('Error fetching expense:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new expense
 */
exports.createExpense = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      description,
      amount,
      expenseDate,
      category,
      costCenterId,
      supplierId,
      warehouseId,
      receiptUrl
    } = req.body;

    if (!description || !amount || !expenseDate || !category) {
      return res.status(400).json({ error: 'Description, amount, expense date, and category are required' });
    }

    // Generate expense number
    const count = await prisma.expense.count({ where: { tenantId } });
    const expenseNumber = `EXP-${String(count + 1).padStart(6, '0')}`;

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        description,
        amount,
        expenseDate: new Date(expenseDate),
        category,
        costCenterId,
        supplierId,
        warehouseId,
        receiptUrl,
        tenantId
      },
      include: {
        costCenter: true,
        supplier: true,
        warehouse: true
      }
    });

    return res.status(201).json(expense);
  } catch (err) {
    console.error('Error creating expense:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an expense
 */
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;
    const {
      description,
      amount,
      expenseDate,
      category,
      costCenterId,
      supplierId,
      warehouseId,
      receiptUrl
    } = req.body;

    const expense = await prisma.expense.update({
      where: { id, tenantId },
      data: {
        description,
        amount,
        expenseDate: expenseDate ? new Date(expenseDate) : undefined,
        category,
        costCenterId,
        supplierId,
        warehouseId,
        receiptUrl
      },
      include: {
        costCenter: true,
        supplier: true,
        warehouse: true,
        approver: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    return res.json(expense);
  } catch (err) {
    console.error('Error updating expense:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Approve an expense
 */
exports.approveExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId, id: userId } = req.user;

    const expense = await prisma.expense.update({
      where: { id, tenantId },
      data: {
        status: 'APPROVED',
        approvedBy: userId
      },
      include: {
        costCenter: true,
        supplier: true,
        warehouse: true,
        approver: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    return res.json(expense);
  } catch (err) {
    console.error('Error approving expense:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Reject an expense
 */
exports.rejectExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId, id: userId } = req.user;

    const expense = await prisma.expense.update({
      where: { id, tenantId },
      data: {
        status: 'REJECTED',
        approvedBy: userId
      },
      include: {
        costCenter: true,
        supplier: true,
        warehouse: true,
        approver: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    return res.json(expense);
  } catch (err) {
    console.error('Error rejecting expense:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mark expense as paid
 */
exports.markExpensePaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const expense = await prisma.expense.update({
      where: { id, tenantId },
      data: { status: 'PAID' },
      include: {
        costCenter: true,
        supplier: true,
        warehouse: true,
        approver: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    return res.json(expense);
  } catch (err) {
    console.error('Error marking expense as paid:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete an expense
 */
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    // Only allow deletion of pending expenses
    const expense = await prisma.expense.findUnique({
      where: { id, tenantId }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (expense.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending expenses can be deleted' });
    }

    await prisma.expense.delete({
      where: { id, tenantId }
    });

    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting expense:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === EXPENSE ANALYTICS ===

/**
 * Get expense analytics
 */
exports.getExpenseAnalytics = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { startDate, endDate, costCenterId } = req.query;

    const dateFilter = startDate && endDate ? {
      gte: new Date(startDate),
      lte: new Date(endDate)
    } : undefined;

    const where = { tenantId };
    if (dateFilter) where.expenseDate = dateFilter;
    if (costCenterId) where.costCenterId = costCenterId;

    // Get expense statistics by status
    const expensesByStatus = await prisma.expense.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
      _sum: { amount: true }
    });

    // Get expenses by category
    const expensesByCategory = await prisma.expense.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } }
    });

    // Get expenses by cost center
    const expensesByCostCenter = await prisma.expense.groupBy({
      by: ['costCenterId'],
      where,
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } }
    });

    // Get expenses by supplier
    const expensesBySupplier = await prisma.expense.groupBy({
      by: ['supplierId'],
      where,
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10
    });

    // Get monthly expense trends
    const monthlyTrends = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "expenseDate") as month,
        COUNT(*)::int as count,
        SUM("amount")::float as total
      FROM "Expense"
      WHERE "tenantId" = ${tenantId}
        ${dateFilter ? `AND "expenseDate" >= ${dateFilter.gte} AND "expenseDate" <= ${dateFilter.lte}` : ''}
      GROUP BY DATE_TRUNC('month', "expenseDate")
      ORDER BY month DESC
      LIMIT 12
    `;

    return res.json({
      expensesByStatus,
      expensesByCategory,
      expensesByCostCenter,
      expensesBySupplier,
      monthlyTrends
    });
  } catch (err) {
    console.error('Error fetching expense analytics:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get expense summary for dashboard
 */
exports.getExpenseSummary = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month
    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Current month expenses
    const currentMonthExpenses = await prisma.expense.aggregate({
      where: {
        tenantId,
        expenseDate: { gte: currentMonth }
      },
      _count: { id: true },
      _sum: { amount: true }
    });

    // Last month expenses for comparison
    const lastMonthExpenses = await prisma.expense.aggregate({
      where: {
        tenantId,
        expenseDate: {
          gte: lastMonth,
          lt: currentMonth
        }
      },
      _count: { id: true },
      _sum: { amount: true }
    });

    // Pending approvals
    const pendingApprovals = await prisma.expense.count({
      where: {
        tenantId,
        status: 'PENDING'
      }
    });

    // Approved but unpaid
    const approvedUnpaid = await prisma.expense.aggregate({
      where: {
        tenantId,
        status: 'APPROVED'
      },
      _count: { id: true },
      _sum: { amount: true }
    });

    // Calculate month-over-month change
    const currentTotal = currentMonthExpenses._sum.amount || 0;
    const lastTotal = lastMonthExpenses._sum.amount || 0;
    const monthOverMonthChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

    return res.json({
      currentMonth: {
        count: currentMonthExpenses._count.id,
        total: currentTotal
      },
      lastMonth: {
        count: lastMonthExpenses._count.id,
        total: lastTotal
      },
      monthOverMonthChange,
      pendingApprovals,
      approvedUnpaid: {
        count: approvedUnpaid._count.id,
        total: approvedUnpaid._sum.amount || 0
      }
    });
  } catch (err) {
    console.error('Error fetching expense summary:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get expense categories with totals
 */
exports.getExpenseCategories = async (req, res) => {
  try {
    const categories = [
      'OFFICE_SUPPLIES',
      'UTILITIES',
      'RENT',
      'EQUIPMENT',
      'MAINTENANCE',
      'FUEL',
      'INSURANCE',
      'PROFESSIONAL_SERVICES',
      'MARKETING',
      'TRAVEL',
      'MEALS',
      'OTHER'
    ];

    return res.json(categories.map(category => ({
      value: category,
      label: category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    })));
  } catch (err) {
    console.error('Error fetching expense categories:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get expenses requiring approval
 */
exports.getExpensesForApproval = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: {
          tenantId,
          status: 'PENDING'
        },
        include: {
          costCenter: true,
          supplier: true,
          warehouse: true
        },
        orderBy: { expenseDate: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.expense.count({
        where: {
          tenantId,
          status: 'PENDING'
        }
      })
    ]);

    return res.json(expenses);
  } catch (err) {
    console.error('Error fetching expenses for approval:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Bulk approve expenses
 */
exports.bulkApproveExpenses = async (req, res) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { expenseIds } = req.body;

    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.status(400).json({ error: 'Expense IDs array is required' });
    }

    const result = await prisma.expense.updateMany({
      where: {
        id: { in: expenseIds },
        tenantId,
        status: 'PENDING'
      },
      data: {
        status: 'APPROVED',
        approvedBy: userId
      }
    });

    return res.json({
      message: `${result.count} expenses approved successfully`
    });
  } catch (err) {
    console.error('Error bulk approving expenses:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === EXPENSE DASHBOARD ===

/**
 * Get expense dashboard data with mock data for demo
 */
exports.getExpenseDashboard = async (req, res) => {
  try {
    // Return mock data in the format expected by frontend
    const dashboardData = {
      monthlyTotal: 156200,
      expenseGrowth: 3.1,
      pendingApprovals: 23,
      categoryBreakdown: [
        { category: 'Office Supplies', amount: 12450 },
        { category: 'Fuel', amount: 23800 },
        { category: 'Maintenance', amount: 18900 },
        { category: 'Utilities', amount: 8500 },
        { category: 'Rent', amount: 35000 },
        { category: 'Other', amount: 57550 }
      ],
      recentExpenses: [
        {
          id: 'EXP-2024-001',
          description: 'Office Supplies - Paper & Ink',
          amount: 340,
          category: 'OFFICE_SUPPLIES',
          status: 'PENDING',
          expenseDate: '2024-02-10'
        },
        {
          id: 'EXP-2024-002',
          description: 'Vehicle Fuel - Delivery Trucks',
          amount: 850,
          category: 'FUEL',
          status: 'APPROVED',
          expenseDate: '2024-02-09'
        },
        {
          id: 'EXP-2024-003',
          description: 'Equipment Maintenance - Forklift Service',
          amount: 1200,
          category: 'MAINTENANCE',
          status: 'PAID',
          expenseDate: '2024-02-08'
        }
      ]
    };

    return res.json(dashboardData);
  } catch (err) {
    console.error('Error fetching expense dashboard:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Bulk reject expenses
 */
exports.bulkRejectExpenses = async (req, res) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { expenseIds, rejectionReason } = req.body;

    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.status(400).json({ error: 'Expense IDs array is required' });
    }

    const result = await prisma.expense.updateMany({
      where: {
        id: { in: expenseIds },
        tenantId,
        status: 'PENDING'
      },
      data: {
        status: 'REJECTED',
        rejectedBy: userId,
        rejectionReason: rejectionReason || 'Bulk rejection'
      }
    });

    return res.json({
      message: `${result.count} expenses rejected successfully`
    });
  } catch (err) {
    console.error('Error bulk rejecting expenses:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Bulk delete expenses
 */
exports.bulkDeleteExpenses = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { expenseIds } = req.body;

    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.status(400).json({ error: 'Expense IDs array is required' });
    }

    const result = await prisma.expense.deleteMany({
      where: {
        id: { in: expenseIds },
        tenantId,
        status: { in: ['DRAFT', 'REJECTED'] } // Only allow deletion of draft or rejected expenses
      }
    });

    return res.json({
      message: `${result.count} expenses deleted successfully`
    });
  } catch (err) {
    console.error('Error bulk deleting expenses:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Bulk update expenses
 */
exports.bulkUpdateExpenses = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { expenseIds, updateData } = req.body;

    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.status(400).json({ error: 'Expense IDs array is required' });
    }

    // Only allow certain fields to be bulk updated
    const allowedFields = ['category', 'costCenterId', 'supplierId', 'warehouseId'];
    const filteredUpdateData = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdateData[key] = updateData[key];
      }
    });

    const result = await prisma.expense.updateMany({
      where: {
        id: { in: expenseIds },
        tenantId,
        status: { in: ['DRAFT', 'PENDING'] } // Only allow update of draft or pending expenses
      },
      data: filteredUpdateData
    });

    return res.json({
      message: `${result.count} expenses updated successfully`
    });
  } catch (err) {
    console.error('Error bulk updating expenses:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 