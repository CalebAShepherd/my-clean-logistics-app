const { PrismaClient } = require('@prisma/client');
const erpService = require('./erpService');
const prisma = new PrismaClient();

/**
 * Initialize a new tenant with default ERP setup
 */
async function initializeTenant(tenantId, tenantName, options = {}) {
  return await prisma.$transaction(async (tx) => {
    try {
      console.log(`Initializing ERP setup for tenant: ${tenantName}`);

      // Ensure tenant exists
      let tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        tenant = await tx.tenant.create({
          data: {
            id: tenantId,
            name: tenantName
          }
        });
        console.log('✓ Tenant record created');
      }

      // 1. Initialize default currency inside the same transaction
      const currency = await tx.currency.create({
        data: {
          code: 'USD',
          name: 'US Dollar',
          symbol: '$',
          isBase: true,
          tenantId
        }
      });
      console.log('✓ Default currency initialized');

      // 2. Initialize chart of accounts inside same transaction
      const defaultAccounts = [
        // Assets
        { code: '1000', name: 'Cash', type: 'ASSET', balance: 'DEBIT' },
        { code: '1100', name: 'Petty Cash', type: 'ASSET', balance: 'DEBIT' },
        { code: '1200', name: 'Accounts Receivable', type: 'ASSET', balance: 'DEBIT' },
        { code: '1300', name: 'Inventory', type: 'ASSET', balance: 'DEBIT' },
        { code: '1400', name: 'Prepaid Expenses', type: 'ASSET', balance: 'DEBIT' },
        { code: '1500', name: 'Equipment', type: 'ASSET', balance: 'DEBIT' },
        { code: '1510', name: 'Accumulated Depreciation', type: 'ASSET', balance: 'CREDIT' },
        { code: '1600', name: 'Vehicles', type: 'ASSET', balance: 'DEBIT' },
        
        // Liabilities
        { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', balance: 'CREDIT' },
        { code: '2100', name: 'Accrued Expenses', type: 'LIABILITY', balance: 'CREDIT' },
        { code: '2200', name: 'Payroll Liabilities', type: 'LIABILITY', balance: 'CREDIT' },
        { code: '2300', name: 'Sales Tax Payable', type: 'LIABILITY', balance: 'CREDIT' },
        
        // Equity
        { code: '3000', name: "Owner's Equity", type: 'EQUITY', balance: 'CREDIT' },
        { code: '3100', name: 'Retained Earnings', type: 'EQUITY', balance: 'CREDIT' },
        
        // Revenue
        { code: '4000', name: 'Transportation Revenue', type: 'REVENUE', balance: 'CREDIT' },
        { code: '4100', name: 'Storage Revenue', type: 'REVENUE', balance: 'CREDIT' },
        { code: '4200', name: 'Handling Revenue', type: 'REVENUE', balance: 'CREDIT' },
        
        // Expenses
        { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', balance: 'DEBIT' },
        { code: '5100', name: 'Inventory Adjustments', type: 'EXPENSE', balance: 'DEBIT' },
        { code: '5200', name: 'Maintenance Expense', type: 'EXPENSE', balance: 'DEBIT' },
        { code: '5300', name: 'Labor Expense', type: 'EXPENSE', balance: 'DEBIT' },
        { code: '6000', name: 'Salaries and Wages', type: 'EXPENSE', balance: 'DEBIT' },
        { code: '6100', name: 'Fuel Expense', type: 'EXPENSE', balance: 'DEBIT' },
        { code: '6400', name: 'Utilities', type: 'EXPENSE', balance: 'DEBIT' },
        { code: '6500', name: 'Rent Expense', type: 'EXPENSE', balance: 'DEBIT' },
        { code: '6600', name: 'Insurance Expense', type: 'EXPENSE', balance: 'DEBIT' },
        { code: '6700', name: 'Office Supplies', type: 'EXPENSE', balance: 'DEBIT' }
      ];

      const accounts = await Promise.all(
        defaultAccounts.map(acc =>
          tx.chartOfAccounts.create({
            data: {
              accountCode: acc.code,
              accountName: acc.name,
              accountType: acc.type,
              normalBalance: acc.balance,
              tenantId
            }
          })
        )
      );
      console.log('✓ Chart of accounts initialized');

      // 3. Create default cost centers
      const costCenters = await createDefaultCostCenters(tx, tenantId);
      console.log('✓ Default cost centers created');

      // 4. Create default reporting periods for current year
      const reportingPeriods = await createDefaultReportingPeriods(tx, tenantId);
      console.log('✓ Default reporting periods created');

      // 5. Initialize journal entry sequence
      await tx.journalEntrySequence.create({
        data: {
          tenantId,
          lastNumber: 0
        }
      });
      console.log('✓ Journal entry sequence initialized');

      // 6. Create sample budget if requested
      if (options.createSampleBudget) {
        await createSampleBudget(tx, tenantId, accounts);
        console.log('✓ Sample budget created');
      }

      return {
        currency,
        accounts: accounts.length,
        costCenters: costCenters.length,
        reportingPeriods: reportingPeriods.length,
        message: 'Tenant ERP initialization completed successfully'
      };
    } catch (err) {
      console.error('Error initializing tenant:', err);
      throw err;
    }
  });
}

/**
 * Create default cost centers
 */
async function createDefaultCostCenters(tx, tenantId) {
  const defaultCostCenters = [
    { code: 'OPS', name: 'Operations', description: 'Warehouse and logistics operations' },
    { code: 'ADM', name: 'Administration', description: 'Administrative and overhead costs' },
    { code: 'SAL', name: 'Sales & Marketing', description: 'Sales and marketing activities' },
    { code: 'IT', name: 'Information Technology', description: 'IT infrastructure and systems' },
    { code: 'FIN', name: 'Finance', description: 'Finance and accounting department' }
  ];

  const costCenters = await Promise.all(
    defaultCostCenters.map(center =>
      tx.costCenter.create({
        data: {
          code: center.code,
          name: center.name,
          description: center.description,
          isActive: true,
          tenantId
        }
      })
    )
  );

  return costCenters;
}

/**
 * Create default reporting periods for current year
 */
async function createDefaultReportingPeriods(tx, tenantId) {
  const currentYear = new Date().getFullYear();
  const periods = [];

  // Create monthly periods for the current year
  for (let month = 0; month < 12; month++) {
    const startDate = new Date(currentYear, month, 1);
    const endDate = new Date(currentYear, month + 1, 0); // Last day of month
    
    const period = await tx.reportingPeriod.create({
      data: {
        name: `${startDate.toLocaleString('default', { month: 'long' })} ${currentYear}`,
        startDate,
        endDate,
        status: month < new Date().getMonth() ? 'CLOSED' : 'OPEN',
        tenantId
      }
    });
    
    periods.push(period);
  }

  // Create quarterly periods
  const quarters = [
    { name: 'Q1', start: [0, 1], end: [2, 31] },
    { name: 'Q2', start: [3, 1], end: [5, 30] },
    { name: 'Q3', start: [6, 1], end: [8, 30] },
    { name: 'Q4', start: [9, 1], end: [11, 31] }
  ];

  for (const quarter of quarters) {
    const startDate = new Date(currentYear, quarter.start[0], quarter.start[1]);
    const endDate = new Date(currentYear, quarter.end[0], quarter.end[1]);
    
    const period = await tx.reportingPeriod.create({
      data: {
        name: `${quarter.name} ${currentYear}`,
        startDate,
        endDate,
        status: 'OPEN',
        tenantId
      }
    });
    
    periods.push(period);
  }

  // Create annual period
  const annualPeriod = await tx.reportingPeriod.create({
    data: {
      name: `FY ${currentYear}`,
      startDate: new Date(currentYear, 0, 1),
      endDate: new Date(currentYear, 11, 31),
      status: 'OPEN',
      tenantId
    }
  });
  
  periods.push(annualPeriod);

  return periods;
}

/**
 * Create sample budget
 */
async function createSampleBudget(tx, tenantId, accounts) {
  // Create a sample annual budget
  const budget = await tx.budget.create({
    data: {
      name: `Annual Budget ${new Date().getFullYear()}`,
      budgetYear: new Date().getFullYear(),
      budgetType: 'ANNUAL',
      totalAmount: 1000000, // $1M sample budget
      status: 'DRAFT',
      tenantId
    }
  });

  // Create budget allocations for key accounts
  const budgetAllocations = [
    { accountCode: '4000', amount: 1200000 }, // Transportation Revenue
    { accountCode: '6000', amount: 600000 },  // Salaries and Wages
    { accountCode: '6100', amount: 120000 },  // Fuel Expense
    { accountCode: '6400', amount: 48000 },   // Utilities
    { accountCode: '6500', amount: 180000 },  // Rent Expense
    { accountCode: '6600', amount: 36000 },    // Insurance Expense
    { accountCode: '6700', amount: 24000 }     // Office Supplies
  ];

  for (const allocation of budgetAllocations) {
    const account = accounts.find(acc => acc.accountCode === allocation.accountCode);
    if (account) {
      await tx.budgetAllocation.create({
        data: {
          budgetId: budget.id,
          accountId: account.id,
          allocatedAmount: allocation.amount,
          spentAmount: 0,
          remainingAmount: allocation.amount
        }
      });
    }
  }

  return budget;
}

/**
 * Validate tenant ERP setup
 */
async function validateTenantSetup(tenantId) {
  const checks = [];

  // Check chart of accounts
  const accountCount = await prisma.chartOfAccounts.count({ where: { tenantId } });
  checks.push({
    check: 'Chart of Accounts',
    status: accountCount >= 20 ? 'PASS' : 'FAIL',
    details: `${accountCount} accounts found`
  });

  // Check currency setup
  const currencyCount = await prisma.currency.count({ where: { tenantId } });
  checks.push({
    check: 'Currency Setup',
    status: currencyCount >= 1 ? 'PASS' : 'FAIL',
    details: `${currencyCount} currencies configured`
  });

  // Check cost centers
  const costCenterCount = await prisma.costCenter.count({ where: { tenantId } });
  checks.push({
    check: 'Cost Centers',
    status: costCenterCount >= 3 ? 'PASS' : 'FAIL',
    details: `${costCenterCount} cost centers found`
  });

  // Check journal entry sequence
  const sequenceExists = await prisma.journalEntrySequence.findUnique({ where: { tenantId } });
  checks.push({
    check: 'Journal Entry Sequence',
    status: sequenceExists ? 'PASS' : 'FAIL',
    details: sequenceExists ? 'Sequence initialized' : 'Sequence missing'
  });

  // Check reporting periods
  const periodCount = await prisma.reportingPeriod.count({ where: { tenantId } });
  checks.push({
    check: 'Reporting Periods',
    status: periodCount >= 12 ? 'PASS' : 'FAIL',
    details: `${periodCount} periods configured`
  });

  const overallStatus = checks.every(check => check.status === 'PASS') ? 'HEALTHY' : 'NEEDS_ATTENTION';

  return {
    overallStatus,
    checks,
    summary: {
      passed: checks.filter(c => c.status === 'PASS').length,
      failed: checks.filter(c => c.status === 'FAIL').length,
      total: checks.length
    }
  };
}

module.exports = {
  initializeTenant,
  validateTenantSetup,
  createDefaultCostCenters,
  createDefaultReportingPeriods
}; 