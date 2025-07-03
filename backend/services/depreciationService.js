const { PrismaClient } = require('@prisma/client');
const erpService = require('./erpService');
const prisma = new PrismaClient();

/**
 * Calculate monthly depreciation for all assets
 */
async function calculateMonthlyDepreciation(tenantId, asOfDate = new Date()) {
  try {
    // Get all depreciable assets
    const assets = await prisma.asset.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        depreciationMethod: { not: null },
        OR: [
          { fullyDepreciatedDate: null },
          { fullyDepreciatedDate: { gt: asOfDate } }
        ]
      }
    });

    const depreciationEntries = [];

    for (const asset of assets) {
      const monthlyDepreciation = calculateAssetDepreciation(asset, asOfDate);
      
      if (monthlyDepreciation > 0) {
        depreciationEntries.push({
          assetId: asset.id,
          depreciationAmount: monthlyDepreciation,
          depreciationDate: asOfDate,
          accumulatedDepreciation: await getAccumulatedDepreciation(asset.id, asOfDate),
          remainingValue: asset.purchasePrice - await getAccumulatedDepreciation(asset.id, asOfDate) - monthlyDepreciation,
          method: asset.depreciationMethod
        });
      }
    }

    return depreciationEntries;
  } catch (err) {
    console.error('Error calculating monthly depreciation:', err);
    throw err;
  }
}

/**
 * Calculate depreciation for a single asset
 */
function calculateAssetDepreciation(asset, asOfDate) {
  const purchaseDate = new Date(asset.purchaseDate);
  const monthsElapsed = getMonthsBetween(purchaseDate, asOfDate);
  
  if (monthsElapsed <= 0) return 0;

  switch (asset.depreciationMethod) {
    case 'STRAIGHT_LINE':
      return calculateStraightLineDepreciation(asset);
    
    case 'DECLINING_BALANCE':
      return calculateDecliningBalanceDepreciation(asset, asOfDate);
    
    case 'UNITS_OF_PRODUCTION':
      return calculateUnitsOfProductionDepreciation(asset, asOfDate);
    
    default:
      return 0;
  }
}

/**
 * Straight-line depreciation calculation
 */
function calculateStraightLineDepreciation(asset) {
  const depreciableAmount = asset.purchasePrice - (asset.salvageValue || 0);
  const usefulLifeMonths = (asset.usefulLifeYears || 5) * 12;
  
  return depreciableAmount / usefulLifeMonths;
}

/**
 * Declining balance depreciation calculation
 */
async function calculateDecliningBalanceDepreciation(asset, asOfDate) {
  const rate = 2 / (asset.usefulLifeYears || 5); // Double declining balance
  const bookValue = asset.purchasePrice - await getAccumulatedDepreciation(asset.id, asOfDate);
  
  return bookValue * (rate / 12); // Monthly rate
}

/**
 * Units of production depreciation calculation
 */
async function calculateUnitsOfProductionDepreciation(asset, asOfDate) {
  // This would require usage data - simplified for now
  const depreciableAmount = asset.purchasePrice - (asset.salvageValue || 0);
  const totalUnits = asset.totalUnitsOfProduction || 100000;
  const monthlyUnits = asset.monthlyUnitsUsed || (totalUnits / ((asset.usefulLifeYears || 5) * 12));
  
  return (depreciableAmount / totalUnits) * monthlyUnits;
}

/**
 * Get accumulated depreciation for an asset
 */
async function getAccumulatedDepreciation(assetId, asOfDate) {
  const records = await prisma.depreciationRecord.findMany({
    where: {
      assetId,
      depreciationDate: { lte: asOfDate }
    }
  });

  return records.reduce((sum, record) => sum + parseFloat(record.depreciationAmount), 0);
}

/**
 * Post monthly depreciation journal entries
 */
async function postMonthlyDepreciation(tenantId, asOfDate = new Date()) {
  return await prisma.$transaction(async (tx) => {
    try {
      const depreciationEntries = await calculateMonthlyDepreciation(tenantId, asOfDate);
      
      if (depreciationEntries.length === 0) {
        return { message: 'No depreciation entries to post', entries: [] };
      }

      // Get depreciation expense and accumulated depreciation accounts
      const depreciationExpenseAccount = await tx.chartOfAccounts.findFirst({
        where: { tenantId, accountCode: '6300' } // Equipment Maintenance/Depreciation
      });
      
      const accumulatedDepreciationAccount = await tx.chartOfAccounts.findFirst({
        where: { tenantId, accountCode: '1510' } // Accumulated Depreciation
      });

      if (!depreciationExpenseAccount || !accumulatedDepreciationAccount) {
        // Create accounts if they don't exist
        if (!depreciationExpenseAccount) {
          await tx.chartOfAccounts.create({
            data: {
              accountCode: '6350',
              accountName: 'Depreciation Expense',
              accountType: 'EXPENSE',
              normalBalance: 'DEBIT',
              tenantId
            }
          });
        }
        
        if (!accumulatedDepreciationAccount) {
          await tx.chartOfAccounts.create({
            data: {
              accountCode: '1510',
              accountName: 'Accumulated Depreciation',
              accountType: 'ASSET',
              normalBalance: 'CREDIT',
              tenantId
            }
          });
        }
      }

      // Calculate total depreciation
      const totalDepreciation = depreciationEntries.reduce((sum, entry) => sum + entry.depreciationAmount, 0);

      // Create journal entry for depreciation
      const count = await tx.journalEntry.count({ where: { tenantId } });
      const entryNumber = `JE-${String(count + 1).padStart(6, '0')}`;

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          description: `Monthly depreciation - ${asOfDate.toISOString().slice(0, 7)}`,
          transactionDate: asOfDate,
          totalAmount: totalDepreciation,
          referenceType: 'DEPRECIATION',
          referenceId: null,
          status: 'APPROVED',
          tenantId,
          ledgerEntries: {
            create: [
              {
                accountId: depreciationExpenseAccount.id,
                debitAmount: totalDepreciation,
                creditAmount: null,
                description: 'Monthly depreciation expense',
                transactionDate: asOfDate,
                referenceType: 'DEPRECIATION',
                referenceId: null,
                tenantId
              },
              {
                accountId: accumulatedDepreciationAccount.id,
                debitAmount: null,
                creditAmount: totalDepreciation,
                description: 'Accumulated depreciation',
                transactionDate: asOfDate,
                referenceType: 'DEPRECIATION',
                referenceId: null,
                tenantId
              }
            ]
          }
        }
      });

      // Create depreciation records
      const depreciationRecords = await Promise.all(
        depreciationEntries.map(entry =>
          tx.depreciationRecord.create({
            data: {
              assetId: entry.assetId,
              depreciationAmount: entry.depreciationAmount,
              accumulatedDepreciation: entry.accumulatedDepreciation + entry.depreciationAmount,
              bookValue: entry.remainingValue,
              depreciationDate: asOfDate,
              method: entry.method,
              journalEntryId: journalEntry.id
            }
          })
        )
      );

      return {
        journalEntry,
        depreciationRecords,
        totalAmount: totalDepreciation
      };
    } catch (err) {
      console.error('Error posting monthly depreciation:', err);
      throw err;
    }
  });
}

/**
 * Get months between two dates
 */
function getMonthsBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

/**
 * Check if asset is fully depreciated
 */
async function checkFullyDepreciated(assetId) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId }
  });

  if (!asset) return false;

  const accumulatedDepreciation = await getAccumulatedDepreciation(assetId, new Date());
  const depreciableAmount = asset.purchasePrice - (asset.salvageValue || 0);

  return accumulatedDepreciation >= depreciableAmount;
}

module.exports = {
  calculateMonthlyDepreciation,
  postMonthlyDepreciation,
  calculateAssetDepreciation,
  getAccumulatedDepreciation,
  checkFullyDepreciated
}; 