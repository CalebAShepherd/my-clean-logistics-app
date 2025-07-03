const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generate Balance Sheet
 */
async function generateBalanceSheet(tenantId, asOfDate = new Date()) {
  try {
    const accounts = await prisma.chartOfAccounts.findMany({
      where: { tenantId, isActive: true },
      include: {
        generalLedgerEntries: {
          where: {
            transactionDate: { lte: asOfDate }
          }
        }
      }
    });

    const balanceSheet = {
      asOfDate,
      assets: { current: [], nonCurrent: [], total: 0 },
      liabilities: { current: [], nonCurrent: [], total: 0 },
      equity: { accounts: [], total: 0 },
      totalAssetsLiabilitiesEquity: 0
    };

    for (const account of accounts) {
      const balance = calculateAccountBalance(account);
      
      if (balance === 0) continue; // Skip zero balances

      const accountInfo = {
        accountCode: account.accountCode,
        accountName: account.accountName,
        balance: balance
      };

      switch (account.accountType) {
        case 'ASSET':
          // Classify as current or non-current based on account code
          if (isCurrentAsset(account.accountCode)) {
            balanceSheet.assets.current.push(accountInfo);
          } else {
            balanceSheet.assets.nonCurrent.push(accountInfo);
          }
          balanceSheet.assets.total += balance;
          break;

        case 'LIABILITY':
          // Classify as current or non-current based on account code
          if (isCurrentLiability(account.accountCode)) {
            balanceSheet.liabilities.current.push(accountInfo);
          } else {
            balanceSheet.liabilities.nonCurrent.push(accountInfo);
          }
          balanceSheet.liabilities.total += balance;
          break;

        case 'EQUITY':
          balanceSheet.equity.accounts.push(accountInfo);
          balanceSheet.equity.total += balance;
          break;
      }
    }

    balanceSheet.totalAssetsLiabilitiesEquity = 
      balanceSheet.assets.total + balanceSheet.liabilities.total + balanceSheet.equity.total;

    return balanceSheet;
  } catch (err) {
    console.error('Error generating balance sheet:', err);
    throw err;
  }
}

/**
 * Generate Profit & Loss Statement
 */
async function generateProfitLoss(tenantId, startDate, endDate) {
  try {
    const accounts = await prisma.chartOfAccounts.findMany({
      where: { 
        tenantId, 
        isActive: true,
        accountType: { in: ['REVENUE', 'EXPENSE'] }
      },
      include: {
        generalLedgerEntries: {
          where: {
            transactionDate: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      }
    });

    const profitLoss = {
      period: { startDate, endDate },
      revenue: { accounts: [], total: 0 },
      expenses: { accounts: [], total: 0 },
      grossProfit: 0,
      netIncome: 0
    };

    for (const account of accounts) {
      const balance = calculateAccountBalance(account);
      
      if (balance === 0) continue; // Skip zero balances

      const accountInfo = {
        accountCode: account.accountCode,
        accountName: account.accountName,
        balance: Math.abs(balance) // Show as positive amounts
      };

      if (account.accountType === 'REVENUE') {
        profitLoss.revenue.accounts.push(accountInfo);
        profitLoss.revenue.total += Math.abs(balance);
      } else if (account.accountType === 'EXPENSE') {
        profitLoss.expenses.accounts.push(accountInfo);
        profitLoss.expenses.total += Math.abs(balance);
      }
    }

    profitLoss.grossProfit = profitLoss.revenue.total;
    profitLoss.netIncome = profitLoss.revenue.total - profitLoss.expenses.total;

    return profitLoss;
  } catch (err) {
    console.error('Error generating profit & loss statement:', err);
    throw err;
  }
}

/**
 * Generate Cash Flow Statement
 */
async function generateCashFlowStatement(tenantId, startDate, endDate) {
  try {
    // Get cash accounts
    const cashAccounts = await prisma.chartOfAccounts.findMany({
      where: { 
        tenantId, 
        isActive: true,
        accountCode: { in: ['1000', '1100'] } // Cash and Petty Cash
      },
      include: {
        generalLedgerEntries: {
          where: {
            transactionDate: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            journalEntry: true
          }
        }
      }
    });

    const cashFlow = {
      period: { startDate, endDate },
      operating: { activities: [], total: 0 },
      investing: { activities: [], total: 0 },
      financing: { activities: [], total: 0 },
      netCashFlow: 0,
      beginningCash: 0,
      endingCash: 0
    };

    // Calculate beginning cash balance
    const beginningCashEntries = await prisma.generalLedger.findMany({
      where: {
        tenantId,
        account: { accountCode: { in: ['1000', '1100'] } },
        transactionDate: { lt: startDate }
      },
      include: { account: true }
    });

    cashFlow.beginningCash = beginningCashEntries.reduce((sum, entry) => {
      return sum + (entry.debitAmount || 0) - (entry.creditAmount || 0);
    }, 0);

    // Categorize cash flows
    for (const account of cashAccounts) {
      for (const entry of account.generalLedgerEntries) {
        const amount = (entry.debitAmount || 0) - (entry.creditAmount || 0);
        const activity = {
          description: entry.description,
          amount: amount,
          date: entry.transactionDate
        };

        // Categorize based on reference type or description
        const category = categorizeCashFlow(entry.referenceType, entry.description);
        cashFlow[category].activities.push(activity);
        cashFlow[category].total += amount;
      }
    }

    cashFlow.netCashFlow = cashFlow.operating.total + cashFlow.investing.total + cashFlow.financing.total;
    cashFlow.endingCash = cashFlow.beginningCash + cashFlow.netCashFlow;

    return cashFlow;
  } catch (err) {
    console.error('Error generating cash flow statement:', err);
    throw err;
  }
}

/**
 * Generate Trial Balance
 */
async function generateTrialBalance(tenantId, asOfDate = new Date()) {
  try {
    const accounts = await prisma.chartOfAccounts.findMany({
      where: { tenantId, isActive: true },
      include: {
        generalLedgerEntries: {
          where: {
            transactionDate: { lte: asOfDate }
          }
        }
      },
      orderBy: { accountCode: 'asc' }
    });

    const trialBalance = {
      asOfDate,
      accounts: [],
      totalDebits: 0,
      totalCredits: 0,
      isBalanced: false
    };

    for (const account of accounts) {
      const balance = calculateAccountBalance(account);
      
      if (balance === 0) continue; // Skip zero balances

      const isDebitBalance = account.normalBalance === 'DEBIT' ? balance >= 0 : balance < 0;
      const debitAmount = isDebitBalance ? Math.abs(balance) : 0;
      const creditAmount = !isDebitBalance ? Math.abs(balance) : 0;

      trialBalance.accounts.push({
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        debitAmount,
        creditAmount
      });

      trialBalance.totalDebits += debitAmount;
      trialBalance.totalCredits += creditAmount;
    }

    trialBalance.isBalanced = Math.abs(trialBalance.totalDebits - trialBalance.totalCredits) < 0.01;

    return trialBalance;
  } catch (err) {
    console.error('Error generating trial balance:', err);
    throw err;
  }
}

/**
 * Calculate account balance from ledger entries
 */
function calculateAccountBalance(account) {
  let balance = 0;
  
  for (const entry of account.generalLedgerEntries) {
    balance += (entry.debitAmount || 0) - (entry.creditAmount || 0);
  }

  // Adjust for normal balance type
  if (account.normalBalance === 'CREDIT') {
    balance = -balance;
  }

  return balance;
}

/**
 * Determine if account is current asset
 */
function isCurrentAsset(accountCode) {
  const currentAssetCodes = ['1000', '1100', '1200', '1300', '1400']; // Cash, Petty Cash, A/R, Inventory, Prepaid
  return currentAssetCodes.includes(accountCode);
}

/**
 * Determine if account is current liability
 */
function isCurrentLiability(accountCode) {
  const currentLiabilityCodes = ['2000', '2100', '2200', '2300']; // A/P, Accrued, Payroll, Sales Tax
  return currentLiabilityCodes.includes(accountCode);
}

/**
 * Categorize cash flow activities
 */
function categorizeCashFlow(referenceType, description) {
  if (referenceType === 'SHIPMENT' || referenceType === 'PAYMENT') {
    return 'operating';
  }
  
  if (description && description.toLowerCase().includes('equipment')) {
    return 'investing';
  }
  
  if (description && (description.toLowerCase().includes('loan') || description.toLowerCase().includes('equity'))) {
    return 'financing';
  }
  
  return 'operating'; // Default to operating
}

/**
 * Get financial ratios and KPIs
 */
async function getFinancialRatios(tenantId, asOfDate = new Date()) {
  try {
    const balanceSheet = await generateBalanceSheet(tenantId, asOfDate);
    
    // Calculate key ratios
    const currentRatio = balanceSheet.liabilities.current.length > 0 ? 
      balanceSheet.assets.current.reduce((sum, acc) => sum + acc.balance, 0) /
      balanceSheet.liabilities.current.reduce((sum, acc) => sum + acc.balance, 0) : 0;

    const debtToEquityRatio = balanceSheet.equity.total !== 0 ? 
      balanceSheet.liabilities.total / balanceSheet.equity.total : 0;

    return {
      currentRatio,
      debtToEquityRatio,
      totalAssets: balanceSheet.assets.total,
      totalLiabilities: balanceSheet.liabilities.total,
      totalEquity: balanceSheet.equity.total,
      workingCapital: balanceSheet.assets.current.reduce((sum, acc) => sum + acc.balance, 0) -
                     balanceSheet.liabilities.current.reduce((sum, acc) => sum + acc.balance, 0)
    };
  } catch (err) {
    console.error('Error calculating financial ratios:', err);
    throw err;
  }
}

module.exports = {
  generateBalanceSheet,
  generateProfitLoss,
  generateCashFlowStatement,
  generateTrialBalance,
  getFinancialRatios
}; 