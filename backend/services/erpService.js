const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generate next journal entry number atomically
 */
async function getNextJournalEntryNumber(tenantId) {
  try {
    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO "JournalEntrySequence" ("tenantId", "lastNumber")
       VALUES ($1, 1)
       ON CONFLICT ("tenantId") DO UPDATE SET "lastNumber" = "JournalEntrySequence"."lastNumber" + 1
       RETURNING "lastNumber";`,
      tenantId
    );

    if (result && result.length > 0) {
      return `JE-${String(result[0].lastNumber).padStart(6, '0')}`;
    }
  } catch (err) {
    // Sequence table might not exist yet – fallback gracefully
    console.warn('Sequence table missing, falling back to count-based numbering');
  }

  const count = await prisma.journalEntry.count({ where: { tenantId } });
  return `JE-${String(count + 1).padStart(6, '0')}`;
}

/**
 * Validate journal entry balances
 */
function validateJournalEntryBalance(ledgerEntries) {
  let totalDebits = 0;
  let totalCredits = 0;
  
  for (const entry of ledgerEntries) {
    if (entry.debitAmount) {
      totalDebits += parseFloat(entry.debitAmount);
    }
    if (entry.creditAmount) {
      totalCredits += parseFloat(entry.creditAmount);
    }
    
    // Validate that each line has either debit OR credit, not both or neither
    if ((entry.debitAmount && entry.creditAmount) || (!entry.debitAmount && !entry.creditAmount)) {
      throw new Error('Each ledger entry must have either debit OR credit amount, not both or neither');
    }
  }
  
  if (Math.abs(totalDebits - totalCredits) > 0.01) { // Allow for small rounding differences
    throw new Error(`Journal entry is not balanced: Debits ${totalDebits} != Credits ${totalCredits}`);
  }
  
  return { totalDebits, totalCredits };
}

/**
 * Create journal entry for shipment revenue
 */
async function createShipmentRevenueEntry(shipment, amount, tenantId) {
  return await prisma.$transaction(async (tx) => {
    try {
      // Get revenue and receivables accounts
      const revenueAccount = await tx.chartOfAccounts.findFirst({
        where: { tenantId, accountCode: '4000' } // Transportation Revenue
      });
      
      const receivablesAccount = await tx.chartOfAccounts.findFirst({
        where: { tenantId, accountCode: '1200' } // Accounts Receivable
      });

      if (!revenueAccount || !receivablesAccount) {
        throw new Error('Revenue or receivables account not found for automatic journal entry');
      }

      // Generate entry number atomically
      const entryNumber = await getNextJournalEntryNumber(tenantId);

      const ledgerEntries = [
        {
          accountId: receivablesAccount.id,
          debitAmount: amount,
          creditAmount: null,
          description: `A/R for shipment ${shipment.id}`,
          transactionDate: new Date(),
          referenceType: 'SHIPMENT',
          referenceId: shipment.id,
          tenantId
        },
        {
          accountId: revenueAccount.id,
          debitAmount: null,
          creditAmount: amount,
          description: `Transportation revenue for shipment ${shipment.id}`,
          transactionDate: new Date(),
          referenceType: 'SHIPMENT',
          referenceId: shipment.id,
          tenantId
        }
      ];

      // Validate balancing
      validateJournalEntryBalance(ledgerEntries);

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          description: `Transportation revenue for shipment ${shipment.id}`,
          transactionDate: new Date(),
          totalAmount: amount,
          referenceType: 'SHIPMENT',
          referenceId: shipment.id,
          status: 'APPROVED',
          tenantId,
          ledgerEntries: {
            create: ledgerEntries
          }
        }
      });

      return journalEntry;
    } catch (err) {
      console.error('Error creating shipment revenue journal entry:', err);
      throw err; // Re-throw to trigger transaction rollback
    }
  });
}

/**
 * Create journal entry for expense
 */
async function createExpenseEntry(expense, tenantId) {
  return await prisma.$transaction(async (tx) => {
    try {
      // Get expense and payables accounts
      const expenseAccount = await tx.chartOfAccounts.findFirst({
        where: { 
          tenantId, 
          accountType: 'EXPENSE',
          // Map expense categories to account codes
          accountCode: getExpenseAccountCode(expense.category)
        }
      });
      
      const payablesAccount = await tx.chartOfAccounts.findFirst({
        where: { tenantId, accountCode: '2000' } // Accounts Payable
      });

      if (!expenseAccount || !payablesAccount) {
        throw new Error('Expense or payables account not found for automatic journal entry');
      }

      // Generate entry number atomically
      const entryNumber = await getNextJournalEntryNumber(tenantId);

      const ledgerEntries = [
        {
          accountId: expenseAccount.id,
          debitAmount: expense.amount,
          creditAmount: null,
          description: expense.description,
          transactionDate: expense.expenseDate,
          referenceType: 'EXPENSE',
          referenceId: expense.id,
          tenantId
        },
        {
          accountId: payablesAccount.id,
          debitAmount: null,
          creditAmount: expense.amount,
          description: `A/P for expense: ${expense.description}`,
          transactionDate: expense.expenseDate,
          referenceType: 'EXPENSE',
          referenceId: expense.id,
          tenantId
        }
      ];

      // Validate balancing
      validateJournalEntryBalance(ledgerEntries);

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          description: `Expense: ${expense.description}`,
          transactionDate: expense.expenseDate,
          totalAmount: expense.amount,
          referenceType: 'EXPENSE',
          referenceId: expense.id,
          status: 'APPROVED',
          tenantId,
          ledgerEntries: {
            create: ledgerEntries
          }
        }
      });

      return journalEntry;
    } catch (err) {
      console.error('Error creating expense journal entry:', err);
      throw err;
    }
  });
}

/**
 * Create journal entry for payment received
 */
async function createPaymentReceivedEntry(payment, tenantId) {
  return await prisma.$transaction(async (tx) => {
    try {
      // Get cash and receivables accounts
      const cashAccount = await tx.chartOfAccounts.findFirst({
        where: { tenantId, accountCode: '1000' } // Cash
      });
      
      const receivablesAccount = await tx.chartOfAccounts.findFirst({
        where: { tenantId, accountCode: '1200' } // Accounts Receivable
      });

      if (!cashAccount || !receivablesAccount) {
        throw new Error('Cash or receivables account not found for automatic journal entry');
      }

      // Generate entry number atomically
      const entryNumber = await getNextJournalEntryNumber(tenantId);

      const ledgerEntries = [
        {
          accountId: cashAccount.id,
          debitAmount: payment.amount,
          creditAmount: null,
          description: `Cash received: ${payment.paymentNumber}`,
          transactionDate: payment.paymentDate,
          referenceType: 'PAYMENT',
          referenceId: payment.id,
          tenantId
        },
        {
          accountId: receivablesAccount.id,
          debitAmount: null,
          creditAmount: payment.amount,
          description: `A/R reduction: ${payment.paymentNumber}`,
          transactionDate: payment.paymentDate,
          referenceType: 'PAYMENT',
          referenceId: payment.id,
          tenantId
        }
      ];

      // Validate balancing
      validateJournalEntryBalance(ledgerEntries);

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          description: `Payment received: ${payment.paymentNumber}`,
          transactionDate: payment.paymentDate,
          totalAmount: payment.amount,
          referenceType: 'PAYMENT',
          referenceId: payment.id,
          status: 'APPROVED',
          tenantId,
          ledgerEntries: {
            create: ledgerEntries
          }
        }
      });

      return journalEntry;
    } catch (err) {
      console.error('Error creating payment received journal entry:', err);
      throw err;
    }
  });
}

/**
 * Create journal entry for inventory adjustment
 */
async function createInventoryAdjustmentEntry(adjustment, tenantId) {
  return await prisma.$transaction(async (tx) => {
    try {
      // Get inventory and adjustment accounts
      const inventoryAccount = await tx.chartOfAccounts.findFirst({
        where: { tenantId, accountCode: '1300' } // Inventory
      });
      
      const adjustmentAccount = await tx.chartOfAccounts.findFirst({
        where: { tenantId, accountCode: '5100' } // Inventory Adjustments
      });

      if (!inventoryAccount || !adjustmentAccount) {
        throw new Error('Inventory or adjustment account not found for automatic journal entry');
      }

      const adjustmentValue = adjustment.quantity * (adjustment.unitCost || 0);
      const isIncrease = adjustment.quantity > 0;

      // Generate entry number atomically
      const entryNumber = await getNextJournalEntryNumber(tenantId);

      const ledgerEntries = [
        {
          accountId: inventoryAccount.id,
          debitAmount: isIncrease ? adjustmentValue : null,
          creditAmount: isIncrease ? null : Math.abs(adjustmentValue),
          description: `Inventory ${isIncrease ? 'increase' : 'decrease'}`,
          transactionDate: new Date(),
          referenceType: 'STOCK_MOVEMENT',
          referenceId: adjustment.id,
          tenantId
        },
        {
          accountId: adjustmentAccount.id,
          debitAmount: isIncrease ? null : Math.abs(adjustmentValue),
          creditAmount: isIncrease ? adjustmentValue : null,
          description: `Inventory adjustment expense/income`,
          transactionDate: new Date(),
          referenceType: 'STOCK_MOVEMENT',
          referenceId: adjustment.id,
          tenantId
        }
      ];

      // Validate balancing
      validateJournalEntryBalance(ledgerEntries);

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          description: `Inventory adjustment: ${adjustment.notes || 'Stock movement'}`,
          transactionDate: new Date(),
          totalAmount: Math.abs(adjustmentValue),
          referenceType: 'STOCK_MOVEMENT',
          referenceId: adjustment.id,
          status: 'APPROVED',
          tenantId,
          ledgerEntries: {
            create: ledgerEntries
          }
        }
      });

      return journalEntry;
    } catch (err) {
      console.error('Error creating inventory adjustment journal entry:', err);
      throw err;
    }
  });
}

/**
 * Initialize default chart of accounts for a tenant
 */
async function initializeDefaultChartOfAccounts(tenantId) {
  try {
    const defaultAccounts = [
      // Assets
      { code: '1000', name: 'Cash', type: 'ASSET', balance: 'DEBIT' },
      { code: '1100', name: 'Petty Cash', type: 'ASSET', balance: 'DEBIT' },
      { code: '1200', name: 'Accounts Receivable', type: 'ASSET', balance: 'DEBIT' },
      { code: '1300', name: 'Inventory', type: 'ASSET', balance: 'DEBIT' },
      { code: '1400', name: 'Prepaid Expenses', type: 'ASSET', balance: 'DEBIT' },
      { code: '1500', name: 'Equipment', type: 'ASSET', balance: 'DEBIT' },
      { code: '1600', name: 'Vehicles', type: 'ASSET', balance: 'DEBIT' },
      
      // Liabilities
      { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', balance: 'CREDIT' },
      { code: '2100', name: 'Accrued Expenses', type: 'LIABILITY', balance: 'CREDIT' },
      { code: '2200', name: 'Payroll Liabilities', type: 'LIABILITY', balance: 'CREDIT' },
      { code: '2300', name: 'Sales Tax Payable', type: 'LIABILITY', balance: 'CREDIT' },
      
      // Equity
      { code: '3000', name: 'Owner\'s Equity', type: 'EQUITY', balance: 'CREDIT' },
      { code: '3100', name: 'Retained Earnings', type: 'EQUITY', balance: 'CREDIT' },
      
      // Revenue
      { code: '4000', name: 'Transportation Revenue', type: 'REVENUE', balance: 'CREDIT' },
      { code: '4100', name: 'Storage Revenue', type: 'REVENUE', balance: 'CREDIT' },
      { code: '4200', name: 'Handling Revenue', type: 'REVENUE', balance: 'CREDIT' },
      { code: '4300', name: 'Value Added Services Revenue', type: 'REVENUE', balance: 'CREDIT' },
      
      // Expenses
      { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', balance: 'DEBIT' },
      { code: '5100', name: 'Inventory Adjustments', type: 'EXPENSE', balance: 'DEBIT' },
      { code: '6000', name: 'Salaries and Wages', type: 'EXPENSE', balance: 'DEBIT' },
      { code: '6100', name: 'Fuel Expense', type: 'EXPENSE', balance: 'DEBIT' },
      { code: '6200', name: 'Vehicle Maintenance', type: 'EXPENSE', balance: 'DEBIT' },
      { code: '6300', name: 'Equipment Maintenance', type: 'EXPENSE', balance: 'DEBIT' },
      { code: '6400', name: 'Utilities', type: 'EXPENSE', balance: 'DEBIT' },
      { code: '6500', name: 'Rent Expense', type: 'EXPENSE', balance: 'DEBIT' },
      { code: '6600', name: 'Insurance Expense', type: 'EXPENSE', balance: 'DEBIT' },
      { code: '6700', name: 'Office Supplies', type: 'EXPENSE', balance: 'DEBIT' },
      { code: '6800', name: 'Professional Services', type: 'EXPENSE', balance: 'DEBIT' },
      { code: '6900', name: 'Travel and Entertainment', type: 'EXPENSE', balance: 'DEBIT' }
    ];

    const accounts = await Promise.all(
      defaultAccounts.map(account =>
        prisma.chartOfAccounts.create({
          data: {
            accountCode: account.code,
            accountName: account.name,
            accountType: account.type,
            normalBalance: account.balance,
            tenantId
          }
        })
      )
    );

    return accounts;
  } catch (err) {
    console.error('Error initializing default chart of accounts:', err);
    throw err;
  }
}

/**
 * Initialize default currency for a tenant
 */
async function initializeDefaultCurrency(tenantId) {
  try {
    const currency = await prisma.currency.create({
      data: {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        isBase: true,
        tenantId
      }
    });

    return currency;
  } catch (err) {
    console.error('Error initializing default currency:', err);
    return null;
  }
}

/**
 * Map expense categories to account codes
 */
function getExpenseAccountCode(category) {
  const mapping = {
    'OFFICE_SUPPLIES': '6700',
    'UTILITIES': '6400',
    'RENT': '6500',
    'EQUIPMENT': '6300',
    'MAINTENANCE': '6200',
    'FUEL': '6100',
    'INSURANCE': '6600',
    'PROFESSIONAL_SERVICES': '6800',
    'MARKETING': '6800',
    'TRAVEL': '6900',
    'MEALS': '6900',
    'OTHER': '6800'
  };
  
  return mapping[category] || '6800'; // Default to Professional Services
}

/**
 * Calculate warehouse activity costs for billing
 */
async function calculateWarehouseActivityCosts(warehouseId, startDate, endDate, tenantId) {
  try {
    const activities = {
      storage: 0,
      inboundHandling: 0,
      outboundHandling: 0,
      pickPack: 0,
      crossDock: 0
    };

    // Storage costs (based on average inventory)
    const inventoryItems = await prisma.warehouseItem.findMany({
      where: { warehouseId },
      include: { InventoryItem: true }
    });
    
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    activities.storage = inventoryItems.reduce((sum, item) => {
      const avgCost = item.InventoryItem.unitCost || 0;
      return sum + (item.quantity * avgCost * 0.001 * days); // 0.1% per day storage cost
    }, 0);

    // Inbound handling costs
    const receipts = await prisma.receipt.findMany({
      where: {
        warehouseId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: { receiptItems: true }
    });
    
    activities.inboundHandling = receipts.reduce((sum, receipt) => {
      const itemCount = receipt.receiptItems.reduce((itemSum, item) => itemSum + item.receivedQty, 0);
      return sum + (itemCount * 0.5); // $0.50 per item received
    }, 0);

    // Outbound handling costs
    const shipments = await prisma.shipment.findMany({
      where: {
        warehouseId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    });
    
    activities.outboundHandling = shipments.length * 5.0; // $5.00 per shipment

    // Pick & Pack costs
    const pickLists = await prisma.pickList.findMany({
      where: {
        warehouseId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: { pickTasks: true }
    });
    
    activities.pickPack = pickLists.reduce((sum, pickList) => {
      return sum + (pickList.pickTasks.length * 0.25); // $0.25 per pick task
    }, 0);

    // Cross-dock costs
    const crossDockTasks = await prisma.crossDockTask.findMany({
      where: {
        warehouseId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    });
    
    activities.crossDock = crossDockTasks.length * 2.0; // $2.00 per cross-dock task

    return activities;
  } catch (err) {
    console.error('Error calculating warehouse activity costs:', err);
    return null;
  }
}

module.exports = {
  createShipmentRevenueEntry,
  createExpenseEntry,
  createPaymentReceivedEntry,
  createInventoryAdjustmentEntry,
  initializeDefaultChartOfAccounts,
  initializeDefaultCurrency,
  calculateWarehouseActivityCosts
}; 