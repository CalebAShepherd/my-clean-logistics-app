const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create a new reporting period
 */
async function createReportingPeriod(tenantId, name, startDate, endDate, periodType = 'MONTHLY') {
  try {
    const period = await prisma.reportingPeriod.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        periodType,
        status: 'OPEN',
        tenantId
      }
    });

    return period;
  } catch (err) {
    console.error('Error creating reporting period:', err);
    throw err;
  }
}

/**
 * Close a reporting period
 */
async function closeReportingPeriod(tenantId, periodId, closedBy) {
  return await prisma.$transaction(async (tx) => {
    try {
      // Get the period
      const period = await tx.reportingPeriod.findFirst({
        where: { id: periodId, tenantId }
      });

      if (!period) {
        throw new Error('Reporting period not found');
      }

      if (period.status === 'CLOSED') {
        throw new Error('Period is already closed');
      }

      // Check for unbalanced journal entries in the period
      const unbalancedEntries = await validatePeriodBalance(tx, tenantId, period.startDate, period.endDate);
      if (unbalancedEntries.length > 0) {
        throw new Error(`Cannot close period: ${unbalancedEntries.length} unbalanced journal entries found`);
      }

      // Create retained earnings entry for revenue and expense accounts
      await createRetainedEarningsEntry(tx, tenantId, period.endDate, closedBy);

      // Close the period
      const closedPeriod = await tx.reportingPeriod.update({
        where: { id: periodId },
        data: {
          status: 'CLOSED',
          closedDate: new Date(),
          closedBy
        }
      });

      return closedPeriod;
    } catch (err) {
      console.error('Error closing reporting period:', err);
      throw err;
    }
  });
}

/**
 * Reopen a closed reporting period (with proper authorization)
 */
async function reopenReportingPeriod(tenantId, periodId, reopenedBy) {
  try {
    const period = await prisma.reportingPeriod.findFirst({
      where: { id: periodId, tenantId }
    });

    if (!period) {
      throw new Error('Reporting period not found');
    }

    if (period.status !== 'CLOSED') {
      throw new Error('Period is not closed');
    }

    // Check if there are any subsequent closed periods
    const subsequentClosedPeriods = await prisma.reportingPeriod.findMany({
      where: {
        tenantId,
        startDate: { gt: period.endDate },
        status: 'CLOSED'
      }
    });

    if (subsequentClosedPeriods.length > 0) {
      throw new Error('Cannot reopen period: subsequent periods are already closed');
    }

    const reopenedPeriod = await prisma.reportingPeriod.update({
      where: { id: periodId },
      data: {
        status: 'OPEN',
        closedDate: null,
        closedBy: null
      }
    });

    return reopenedPeriod;
  } catch (err) {
    console.error('Error reopening reporting period:', err);
    throw err;
  }
}

/**
 * Validate that all journal entries in a period are balanced
 */
async function validatePeriodBalance(tx, tenantId, startDate, endDate) {
  const journalEntries = await tx.journalEntry.findMany({
    where: {
      tenantId,
      transactionDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      ledgerEntries: true
    }
  });

  const unbalancedEntries = [];

  for (const entry of journalEntries) {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const ledgerEntry of entry.ledgerEntries) {
      totalDebits += parseFloat(ledgerEntry.debitAmount || 0);
      totalCredits += parseFloat(ledgerEntry.creditAmount || 0);
    }

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      unbalancedEntries.push({
        entryNumber: entry.entryNumber,
        totalDebits,
        totalCredits,
        difference: totalDebits - totalCredits
      });
    }
  }

  return unbalancedEntries;
}

/**
 * Create retained earnings entry to close revenue and expense accounts
 */
async function createRetainedEarningsEntry(tx, tenantId, periodEndDate, userId) {
  try {
    // Get retained earnings account
    const retainedEarningsAccount = await tx.chartOfAccounts.findFirst({
      where: { tenantId, accountCode: '3100' } // Retained Earnings
    });

    if (!retainedEarningsAccount) {
      throw new Error('Retained Earnings account not found');
    }

    // Get all revenue and expense accounts with balances
    const revenueExpenseAccounts = await tx.chartOfAccounts.findMany({
      where: {
        tenantId,
        accountType: { in: ['REVENUE', 'EXPENSE'] },
        isActive: true
      },
      include: {
        ledgerEntries: {
          where: {
            transactionDate: { lte: periodEndDate }
          }
        }
      }
    });

    const ledgerEntries = [];
    let netIncome = 0;

    // Calculate balances and create closing entries
    for (const account of revenueExpenseAccounts) {
      let balance = 0;
      
      for (const entry of account.ledgerEntries) {
        balance += (parseFloat(entry.debitAmount || 0)) - (parseFloat(entry.creditAmount || 0));
      }

      // Adjust for normal balance type
      if (account.normalBalance === 'CREDIT') {
        balance = -balance;
      }

      if (Math.abs(balance) > 0.01) { // Only create entries for non-zero balances
        // Close the account (opposite of normal balance)
        const isRevenue = account.accountType === 'REVENUE';
        const closeAmount = Math.abs(balance);
        
        ledgerEntries.push({
          accountId: account.id,
          debitAmount: isRevenue ? closeAmount : null,
          creditAmount: isRevenue ? null : closeAmount,
          description: `Close ${account.accountName} to Retained Earnings`,
          transactionDate: periodEndDate,
          referenceType: 'PERIOD_CLOSE',
          referenceId: null,
          tenantId
        });

        // Track net income (revenue increases, expenses decrease)
        if (isRevenue) {
          netIncome += balance;
        } else {
          netIncome -= balance;
        }
      }
    }

    // Create the retained earnings entry
    if (ledgerEntries.length > 0) {
      ledgerEntries.push({
        accountId: retainedEarningsAccount.id,
        debitAmount: netIncome < 0 ? Math.abs(netIncome) : null,
        creditAmount: netIncome > 0 ? netIncome : null,
        description: 'Net Income transfer to Retained Earnings',
        transactionDate: periodEndDate,
        referenceType: 'PERIOD_CLOSE',
        referenceId: null,
        tenantId
      });

      // Generate entry number
      const count = await tx.journalEntry.count({ where: { tenantId } });
      const entryNumber = `JE-${String(count + 1).padStart(6, '0')}`;

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          description: `Period close - transfer to Retained Earnings`,
          transactionDate: periodEndDate,
          totalAmount: Math.abs(netIncome),
          referenceType: 'PERIOD_CLOSE',
          referenceId: null,
          status: 'APPROVED',
          approvedBy: userId,
          tenantId,
          ledgerEntries: {
            create: ledgerEntries
          }
        }
      });

      return journalEntry;
    }

    return null;
  } catch (err) {
    console.error('Error creating retained earnings entry:', err);
    throw err;
  }
}

/**
 * Check if a date falls within a closed period
 */
async function isDateInClosedPeriod(tenantId, date) {
  const closedPeriod = await prisma.reportingPeriod.findFirst({
    where: {
      tenantId,
      status: 'CLOSED',
      startDate: { lte: date },
      endDate: { gte: date }
    }
  });

  return !!closedPeriod;
}

/**
 * Get all reporting periods
 */
async function getReportingPeriods(tenantId, filters = {}) {
  const where = { tenantId };
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.year) {
    const yearStart = new Date(filters.year, 0, 1);
    const yearEnd = new Date(filters.year, 11, 31);
    where.startDate = { gte: yearStart };
    where.endDate = { lte: yearEnd };
  }

  const periods = await prisma.reportingPeriod.findMany({
    where,
    orderBy: { startDate: 'desc' }
  });

  return periods;
}

module.exports = {
  createReportingPeriod,
  closeReportingPeriod,
  reopenReportingPeriod,
  isDateInClosedPeriod,
  getReportingPeriods,
  validatePeriodBalance
}; 