const { PrismaClient } = require('@prisma/client');
const erpService = require('../services/erpService');
const financialReportingService = require('../services/financialReportingService');
const tenantInitializationService = require('../services/tenantInitializationService');
const depreciationService = require('../services/depreciationService');
const periodCloseService = require('../services/periodCloseService');

const prisma = new PrismaClient();

/**
 * Simple ERP functionality test
 */
async function runERPTests() {
  console.log('🧪 Starting ERP Tests...\n');
  
  const testTenantId = 'test-tenant-' + Date.now();
  
  try {
    // Test 1: Tenant Initialization
    console.log('📋 Test 1: Tenant Initialization');
    const initResult = await tenantInitializationService.initializeTenant(
      testTenantId, 
      'Test Company LLC',
      { createSampleBudget: true }
    );
    console.log('✅ Tenant initialized:', initResult.message);
    console.log(`   - ${initResult.accounts} accounts created`);
    console.log(`   - ${initResult.costCenters} cost centers created`);
    console.log(`   - ${initResult.reportingPeriods} reporting periods created\n`);

    // Test 2: Journal Entry Creation
    console.log('📋 Test 2: Journal Entry Creation');
    const mockShipment = { id: 'test-shipment-123' };
    const revenueEntry = await erpService.createShipmentRevenueEntry(
      mockShipment, 
      1500.00, 
      testTenantId
    );
    console.log('✅ Revenue journal entry created:', revenueEntry.entryNumber);
    
    const mockExpense = {
      id: 'test-expense-123',
      description: 'Office supplies',
      amount: 250.00,
      expenseDate: new Date(),
      category: 'OFFICE_SUPPLIES'
    };
    const expenseEntry = await erpService.createExpenseEntry(mockExpense, testTenantId);
    console.log('✅ Expense journal entry created:', expenseEntry.entryNumber);

    const mockPayment = {
      id: 'test-payment-123',
      paymentNumber: 'PAY-001',
      amount: 1500.00,
      paymentDate: new Date()
    };
    const paymentEntry = await erpService.createPaymentReceivedEntry(mockPayment, testTenantId);
    console.log('✅ Payment journal entry created:', paymentEntry.entryNumber, '\n');

    // Test 3: Financial Reports
    console.log('📋 Test 3: Financial Reports');
    const trialBalance = await financialReportingService.generateTrialBalance(testTenantId);
    console.log('✅ Trial Balance generated');
    console.log(`   - ${trialBalance.accounts.length} accounts with balances`);
    console.log(`   - Total Debits: $${trialBalance.totalDebits}`);
    console.log(`   - Total Credits: $${trialBalance.totalCredits}`);
    console.log(`   - Balanced: ${trialBalance.isBalanced ? 'Yes' : 'No'}`);

    const balanceSheet = await financialReportingService.generateBalanceSheet(testTenantId);
    console.log('✅ Balance Sheet generated');
    console.log(`   - Total Assets: $${balanceSheet.assets.total}`);
    console.log(`   - Total Liabilities: $${balanceSheet.liabilities.total}`);
    console.log(`   - Total Equity: $${balanceSheet.equity.total}\n`);

    // Test 4: Validation
    console.log('📋 Test 4: ERP Setup Validation');
    const validation = await tenantInitializationService.validateTenantSetup(testTenantId);
    console.log('✅ ERP validation completed');
    console.log(`   - Overall Status: ${validation.overallStatus}`);
    console.log(`   - Checks Passed: ${validation.summary.passed}/${validation.summary.total}`);
    
    if (validation.summary.failed > 0) {
      console.log('   - Failed Checks:');
      validation.checks
        .filter(check => check.status === 'FAIL')
        .forEach(check => console.log(`     • ${check.check}: ${check.details}`));
    }

    console.log('\n🎉 All ERP tests completed successfully!');
    
    return {
      success: true,
      testTenantId,
      results: {
        initialization: initResult,
        journalEntries: 3,
        trialBalance: trialBalance.isBalanced,
        validation: validation.overallStatus
      }
    };

  } catch (error) {
    console.error('❌ ERP test failed:', error.message);
    return {
      success: false,
      error: error.message,
      testTenantId
    };
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData(testTenantId) {
  if (!testTenantId) return;
  
  try {
    console.log(`🧹 Cleaning up test data for tenant: ${testTenantId}`);
    
    // Delete in correct order due to foreign key constraints
    await prisma.generalLedger.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.journalEntry.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.budgetAllocation.deleteMany({ 
      where: { budget: { tenantId: testTenantId } } 
    });
    await prisma.budget.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.reportingPeriod.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.costCenter.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.chartOfAccounts.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.currency.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.journalEntrySequence.deleteMany({ where: { tenantId: testTenantId } });
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error.message);
  }
}

/**
 * Run tests if called directly
 */
if (require.main === module) {
  runERPTests()
    .then(async (result) => {
      if (result.testTenantId) {
        await cleanupTestData(result.testTenantId);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(async (error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

module.exports = {
  runERPTests,
  cleanupTestData
}; 