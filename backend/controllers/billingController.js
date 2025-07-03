const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// === ENHANCED INVOICING ===

/**
 * Get enhanced invoices with pagination and filters
 */
exports.getInvoices = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { page = 1, limit = 20, status, customerId, startDate, endDate } = req.query;
    
    const where = { tenantId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (startDate && endDate) {
      where.invoiceDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoiceEnhanced.findMany({
        where,
        include: {
          account: true,
          customer: {
            select: { id: true, username: true, email: true }
          },
          currency: true,
          lineItems: {
            include: {
              warehouse: true,
              shipment: true,
              inventoryItem: true
            }
          },
          paymentsEnhanced: true
        },
        orderBy: { invoiceDate: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.invoiceEnhanced.count({ where })
    ]);

    // If no invoices exist, return mock data for demo
    if (invoices.length === 0) {
      const mockInvoices = [
        {
          id: 'inv_001',
          invoiceNumber: 'INV-2024-001',
          invoiceDate: '2024-02-10T00:00:00.000Z',
          dueDate: '2024-02-25T00:00:00.000Z',
          status: 'SENT',
          subtotal: 15000,
          taxAmount: 750,
          discountAmount: 0,
          totalAmount: 15750,
          balanceDue: 15750,
          amountPaid: 0,
          currency: { code: 'USD', symbol: '$' },
          customer: { id: 'cust_1', username: 'acme_corp', email: 'billing@acme.com' },
          account: { accountCode: '1200', accountName: 'Accounts Receivable' },
          lineItems: [
            {
              id: 'li_001',
              description: 'Warehouse Storage - January 2024',
              quantity: 1000,
              unitPrice: 15,
              lineTotal: 15000,
              serviceType: 'STORAGE'
            }
          ],
          paymentsEnhanced: []
        },
        {
          id: 'inv_002',
          invoiceNumber: 'INV-2024-002',
          invoiceDate: '2024-02-08T00:00:00.000Z',
          dueDate: '2024-02-18T00:00:00.000Z',
          status: 'PAID',
          subtotal: 8000,
          taxAmount: 400,
          discountAmount: 100,
          totalAmount: 8300,
          balanceDue: 0,
          amountPaid: 8300,
          currency: { code: 'USD', symbol: '$' },
          customer: { id: 'cust_2', username: 'tech_solutions', email: 'ap@techsolutions.com' },
          account: { accountCode: '1200', accountName: 'Accounts Receivable' },
          lineItems: [
            {
              id: 'li_002',
              description: 'Fulfillment Services - Order Processing',
              quantity: 100,
              unitPrice: 80,
              lineTotal: 8000,
              serviceType: 'FULFILLMENT'
            }
          ],
          paymentsEnhanced: [
            {
              id: 'pay_001',
              amount: 8300,
              paymentDate: '2024-02-15T00:00:00.000Z',
              method: 'BANK_TRANSFER',
              status: 'COMPLETED'
            }
          ]
        },
        {
          id: 'inv_003',
          invoiceNumber: 'INV-2024-003',
          invoiceDate: '2024-01-25T00:00:00.000Z',
          dueDate: '2024-02-05T00:00:00.000Z',
          status: 'OVERDUE',
          subtotal: 12000,
          taxAmount: 600,
          discountAmount: 300,
          totalAmount: 12300,
          balanceDue: 12300,
          amountPaid: 0,
          currency: { code: 'USD', symbol: '$' },
          customer: { id: 'cust_3', username: 'global_logistics', email: 'finance@globallogistics.com' },
          account: { accountCode: '1200', accountName: 'Accounts Receivable' },
          lineItems: [
            {
              id: 'li_003',
              description: 'Cross-dock Services - Expedited Handling',
              quantity: 50,
              unitPrice: 240,
              lineTotal: 12000,
              serviceType: 'CROSSDOCK'
            }
          ],
          paymentsEnhanced: []
        }
      ];
      
      return res.json(mockInvoices);
    }

    return res.json(invoices);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create an enhanced invoice
 */
exports.createInvoice = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const {
      accountId,
      customerId,
      currencyId,
      dueDate,
      paymentTerms,
      notes,
      internalNotes,
      poNumber,
      billingType,
      serviceStartDate,
      serviceEndDate,
      lineItems
    } = req.body;

    if (!accountId || !currencyId || !dueDate || !lineItems || !Array.isArray(lineItems)) {
      return res.status(400).json({ error: 'Account, currency, due date, and line items are required' });
    }

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = lineItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const tax = lineTotal * (item.taxRate || 0);
      return sum + tax;
    }, 0);
    const discountAmount = lineItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const discount = lineTotal * (item.discountRate || 0);
      return sum + discount;
    }, 0);
    const totalAmount = subtotal + taxAmount - discountAmount;
    const balanceDue = totalAmount;

    // Generate invoice number
    const count = await prisma.invoiceEnhanced.count({ where: { tenantId } });
    const invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;

    const invoice = await prisma.invoiceEnhanced.create({
      data: {
        invoiceNumber,
        accountId,
        customerId,
        currencyId,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        balanceDue,
        dueDate: new Date(dueDate),
        paymentTerms,
        notes,
        internalNotes,
        poNumber,
        billingType: billingType || 'SERVICE',
        serviceStartDate: serviceStartDate ? new Date(serviceStartDate) : null,
        serviceEndDate: serviceEndDate ? new Date(serviceEndDate) : null,
        tenantId,
        lineItems: {
          create: lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * item.unitPrice,
            taxRate: item.taxRate || 0,
            discountRate: item.discountRate || 0,
            serviceType: item.serviceType,
            warehouseId: item.warehouseId,
            shipmentId: item.shipmentId,
            inventoryItemId: item.inventoryItemId,
            startDate: item.startDate ? new Date(item.startDate) : null,
            endDate: item.endDate ? new Date(item.endDate) : null
          }))
        }
      },
      include: {
        account: true,
        customer: {
          select: { id: true, username: true, email: true }
        },
        currency: true,
        lineItems: {
          include: {
            warehouse: true,
            shipment: true,
            inventoryItem: true
          }
        }
      }
    });

    return res.status(201).json(invoice);
  } catch (err) {
    console.error('Error creating invoice:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generate invoice from warehouse activities
 */
exports.generateInvoiceFromActivities = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { customerId, warehouseId, startDate, endDate, billingRates } = req.body;

    if (!customerId || !warehouseId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Customer, warehouse, start date, and end date are required' });
    }

    const lineItems = [];

    // Get storage charges (inventory held during period)
    if (billingRates.storage) {
      const inventoryItems = await prisma.warehouseItem.findMany({
        where: {
          warehouseId,
          InventoryItem: {
            // Assuming customer ownership through some relation
          }
        },
        include: {
          InventoryItem: true
        }
      });

      const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
      const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
      
      if (totalQuantity > 0) {
        lineItems.push({
          description: `Storage charges for ${days} days`,
          quantity: totalQuantity,
          unitPrice: billingRates.storage.rate,
          serviceType: 'STORAGE',
          warehouseId,
          startDate,
          endDate
        });
      }
    }

    // Get inbound handling charges
    if (billingRates.inboundHandling) {
      const receipts = await prisma.receipt.findMany({
        where: {
          warehouseId,
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        include: {
          receiptItems: true
        }
      });

      const totalReceived = receipts.reduce((sum, receipt) => 
        sum + receipt.receiptItems.reduce((itemSum, item) => itemSum + item.receivedQty, 0), 0
      );

      if (totalReceived > 0) {
        lineItems.push({
          description: `Inbound handling charges`,
          quantity: totalReceived,
          unitPrice: billingRates.inboundHandling.rate,
          serviceType: 'INBOUND_HANDLING',
          warehouseId,
          startDate,
          endDate
        });
      }
    }

    // Get outbound handling charges (picks/shipments)
    if (billingRates.outboundHandling) {
      const shipments = await prisma.shipment.findMany({
        where: {
          warehouseId,
          clientId: customerId,
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      });

      if (shipments.length > 0) {
        lineItems.push({
          description: `Outbound handling charges`,
          quantity: shipments.length,
          unitPrice: billingRates.outboundHandling.rate,
          serviceType: 'OUTBOUND_HANDLING',
          warehouseId,
          startDate,
          endDate
        });
      }
    }

    if (lineItems.length === 0) {
      return res.status(400).json({ error: 'No billable activities found for the specified period' });
    }

    // Get default currency and account
    const currency = await prisma.currency.findFirst({
      where: { tenantId, isBase: true }
    });
    
    const account = await prisma.account.findFirst({
      where: { tenantId }
    });

    if (!currency || !account) {
      return res.status(400).json({ error: 'Default currency and account must be configured' });
    }

    // Create the invoice
    const invoiceData = {
      accountId: account.id,
      customerId,
      currencyId: currency.id,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      paymentTerms: 'Net 30',
      billingType: 'SERVICE',
      serviceStartDate: startDate,
      serviceEndDate: endDate,
      lineItems
    };

    return await exports.createInvoice({ ...req, body: invoiceData }, res);
  } catch (err) {
    console.error('Error generating invoice from activities:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Send invoice to customer
 */
exports.sendInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const invoice = await prisma.invoiceEnhanced.update({
      where: { id, tenantId },
      data: { status: 'SENT' },
      include: {
        customer: {
          select: { id: true, username: true, email: true }
        },
        lineItems: true
      }
    });

    // TODO: Integrate with email service to send invoice
    // await emailService.sendInvoice(invoice);

    return res.json(invoice);
  } catch (err) {
    console.error('Error sending invoice:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === ENHANCED PAYMENTS ===

/**
 * Get payments with pagination and filters
 */
exports.getPayments = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { page = 1, limit = 20, status, invoiceId, startDate, endDate } = req.query;
    
    const where = { tenantId };
    if (status) where.status = status;
    if (invoiceId) where.invoiceId = invoiceId;
    if (startDate && endDate) {
      where.paymentDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [payments, total] = await Promise.all([
      prisma.paymentEnhanced.findMany({
        where,
        include: {
          invoice: {
            include: {
              customer: {
                select: { id: true, username: true, email: true }
              }
            }
          },
          processor: {
            select: { id: true, username: true, email: true }
          }
        },
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.paymentEnhanced.count({ where })
    ]);

    return res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching payments:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Process a payment
 */
exports.processPayment = async (req, res) => {
  try {
    const { tenantId, id: userId } = req.user;
    const {
      invoiceId,
      amount,
      paymentDate,
      method,
      referenceNumber,
      bankAccount,
      notes
    } = req.body;

    if (!invoiceId || !amount || !paymentDate || !method) {
      return res.status(400).json({ error: 'Invoice, amount, payment date, and method are required' });
    }

    // Get the invoice
    const invoice = await prisma.invoiceEnhanced.findUnique({
      where: { id: invoiceId, tenantId }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.balanceDue < amount) {
      return res.status(400).json({ error: 'Payment amount exceeds balance due' });
    }

    // Generate payment number
    const count = await prisma.paymentEnhanced.count({ where: { tenantId } });
    const paymentNumber = `PAY-${String(count + 1).padStart(6, '0')}`;

    // Create payment
    const payment = await prisma.paymentEnhanced.create({
      data: {
        paymentNumber,
        invoiceId,
        amount,
        paymentDate: new Date(paymentDate),
        method,
        referenceNumber,
        bankAccount,
        notes,
        processedBy: userId,
        status: 'COMPLETED',
        tenantId
      },
      include: {
        invoice: true,
        processor: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    // Update invoice balance and status
    const newAmountPaid = invoice.amountPaid + amount;
    const newBalanceDue = invoice.totalAmount - newAmountPaid;
    let newStatus = invoice.status;

    if (newBalanceDue <= 0) {
      newStatus = 'PAID';
    } else if (newAmountPaid > 0) {
      newStatus = 'PARTIAL_PAYMENT';
    }

    await prisma.invoiceEnhanced.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus
      }
    });

    return res.status(201).json(payment);
  } catch (err) {
    console.error('Error processing payment:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === BILLING ANALYTICS ===

/**
 * Get billing analytics
 */
exports.getBillingAnalytics = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { startDate, endDate } = req.query;

    const dateFilter = startDate && endDate ? {
      gte: new Date(startDate),
      lte: new Date(endDate)
    } : undefined;

    // Get invoice statistics
    const invoiceStats = await prisma.invoiceEnhanced.groupBy({
      by: ['status'],
      where: {
        tenantId,
        ...(dateFilter && { invoiceDate: dateFilter })
      },
      _count: { id: true },
      _sum: { totalAmount: true }
    });

    // Get payment statistics
    const paymentStats = await prisma.paymentEnhanced.groupBy({
      by: ['status'],
      where: {
        tenantId,
        ...(dateFilter && { paymentDate: dateFilter })
      },
      _count: { id: true },
      _sum: { amount: true }
    });

    // Get top customers by revenue
    const topCustomers = await prisma.invoiceEnhanced.groupBy({
      by: ['customerId'],
      where: {
        tenantId,
        status: { in: ['PAID', 'PARTIAL_PAYMENT'] },
        ...(dateFilter && { invoiceDate: dateFilter })
      },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 10
    });

    // Get service type revenue breakdown
    const serviceRevenue = await prisma.invoiceLineItem.groupBy({
      by: ['serviceType'],
      where: {
        invoice: {
          tenantId,
          status: { in: ['PAID', 'PARTIAL_PAYMENT'] },
          ...(dateFilter && { invoiceDate: dateFilter })
        }
      },
      _sum: { lineTotal: true }
    });

    return res.json({
      invoiceStats,
      paymentStats,
      topCustomers,
      serviceRevenue
    });
  } catch (err) {
    console.error('Error fetching billing analytics:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get aging report
 */
exports.getAgingReport = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const today = new Date();

    const invoices = await prisma.invoiceEnhanced.findMany({
      where: {
        tenantId,
        status: { in: ['SENT', 'VIEWED', 'PARTIAL_PAYMENT', 'OVERDUE'] },
        balanceDue: { gt: 0 }
      },
      include: {
        customer: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    const agingBuckets = {
      current: [],
      days30: [],
      days60: [],
      days90: [],
      over90: []
    };

    invoices.forEach(invoice => {
      const daysPastDue = Math.floor((today - invoice.dueDate) / (1000 * 60 * 60 * 24));
      
      if (daysPastDue <= 0) {
        agingBuckets.current.push(invoice);
      } else if (daysPastDue <= 30) {
        agingBuckets.days30.push(invoice);
      } else if (daysPastDue <= 60) {
        agingBuckets.days60.push(invoice);
      } else if (daysPastDue <= 90) {
        agingBuckets.days90.push(invoice);
      } else {
        agingBuckets.over90.push(invoice);
      }
    });

    const summary = {
      current: {
        count: agingBuckets.current.length,
        total: agingBuckets.current.reduce((sum, inv) => sum + inv.balanceDue, 0)
      },
      days30: {
        count: agingBuckets.days30.length,
        total: agingBuckets.days30.reduce((sum, inv) => sum + inv.balanceDue, 0)
      },
      days60: {
        count: agingBuckets.days60.length,
        total: agingBuckets.days60.reduce((sum, inv) => sum + inv.balanceDue, 0)
      },
      days90: {
        count: agingBuckets.days90.length,
        total: agingBuckets.days90.reduce((sum, inv) => sum + inv.balanceDue, 0)
      },
      over90: {
        count: agingBuckets.over90.length,
        total: agingBuckets.over90.reduce((sum, inv) => sum + inv.balanceDue, 0)
      }
    };

    return res.json({
      agingBuckets,
      summary
    });
  } catch (err) {
    console.error('Error generating aging report:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// === BILLING DASHBOARD ===

/**
 * Get billing dashboard data with mock data for demo
 */
exports.getBillingDashboard = async (req, res) => {
  try {
    // Return mock data in the format expected by frontend
    const dashboardData = {
      totalRevenue: 2847500,
      revenueGrowth: 12.5,
      outstandingAR: 184300,
      overdueInvoices: 23,
      recentInvoices: [
        {
          id: 'INV-2024-001',
          customer: 'Acme Corporation',
          amount: 15750,
          status: 'SENT',
          dueDate: '2024-02-15'
        },
        {
          id: 'INV-2024-002',
          customer: 'Tech Solutions Inc',
          amount: 8500,
          status: 'PAID',
          dueDate: '2024-02-10'
        },
        {
          id: 'INV-2024-003',
          customer: 'Global Logistics LLC',
          amount: 12300,
          status: 'OVERDUE',
          dueDate: '2024-01-30'
        }
      ]
    };

    return res.json(dashboardData);
  } catch (err) {
    console.error('Error fetching billing dashboard:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Void an invoice
 */
exports.voidInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId, id: userId } = req.user;
    const { reason } = req.body;

    const invoice = await prisma.invoiceEnhanced.findUnique({
      where: { id, tenantId }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'PAID' || invoice.status === 'VOID') {
      return res.status(400).json({ error: 'Cannot void a paid or already voided invoice' });
    }

    const updatedInvoice = await prisma.invoiceEnhanced.update({
      where: { id },
      data: {
        status: 'VOID',
        voidedBy: userId,
        voidReason: reason,
        voidedAt: new Date()
      },
      include: {
        customer: {
          select: { id: true, username: true, email: true }
        },
        lineItems: true
      }
    });

    return res.json(updatedInvoice);
  } catch (err) {
    console.error('Error voiding invoice:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 