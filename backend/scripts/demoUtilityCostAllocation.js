const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDemoData() {
  console.log('🏭 Creating utility cost allocation demo...');

  try {
    // Create a sample facility
    const facility = await prisma.facility.upsert({
      where: { id: 'demo-facility-1' },
      update: {},
      create: {
        id: 'demo-facility-1',
        name: 'Demo Distribution Center',
        facilityType: 'WAREHOUSE',
        address: '123 Industrial Blvd',
        city: 'Atlanta',
        state: 'GA',
        zipCode: '30309',
        country: 'US',
        totalSquareFeet: 50000,
        warehouseSquareFeet: 40000,
        officeSquareFeet: 10000,
        electricityMeterNumber: 'E123456',
        gasMeterNumber: 'G789012',
        waterMeterNumber: 'W345678'
      }
    });
    console.log('✅ Created facility:', facility.name);

    // Create facility areas
    const warehouseArea = await prisma.facilityArea.upsert({
      where: { id: 'demo-area-warehouse' },
      update: {},
      create: {
        id: 'demo-area-warehouse',
        facilityId: facility.id,
        name: 'Main Warehouse Floor',
        areaType: 'WAREHOUSE_FLOOR',
        squareFeet: 35000,
        height: 24,
        currentUtilization: 75.5,
        maxUtilization: 90
      }
    });

    const officeArea = await prisma.facilityArea.upsert({
      where: { id: 'demo-area-office' },
      update: {},
      create: {
        id: 'demo-area-office',
        facilityId: facility.id,
        name: 'Administrative Office',
        areaType: 'OFFICE_SPACE',
        squareFeet: 8000,
        height: 10,
        currentUtilization: 60,
        maxUtilization: 85
      }
    });

    const dockArea = await prisma.facilityArea.upsert({
      where: { id: 'demo-area-dock' },
      update: {},
      create: {
        id: 'demo-area-dock',
        facilityId: facility.id,
        name: 'Loading Dock',
        areaType: 'LOADING_AREA',
        squareFeet: 5000,
        height: 16,
        currentUtilization: 85,
        maxUtilization: 95
      }
    });

    console.log('✅ Created facility areas');

    // Create allocation rules
    const electricityRule = await prisma.utilityCostAllocationRule.upsert({
      where: { id: 'demo-rule-electricity' },
      update: {},
      create: {
        id: 'demo-rule-electricity',
        facilityId: facility.id,
        ruleName: 'Electricity - Square Footage Based',
        utilityType: 'ELECTRICITY',
        allocationType: 'WAREHOUSE',
        allocationMethod: 'SQUARE_FOOTAGE',
        squareFootageBase: 'WAREHOUSE_FLOOR',
        priority: 1,
        isActive: true
      }
    });

    const gasRule = await prisma.utilityCostAllocationRule.upsert({
      where: { id: 'demo-rule-gas' },
      update: {},
      create: {
        id: 'demo-rule-gas',
        facilityId: facility.id,
        ruleName: 'Natural Gas - Fixed Percentage',
        utilityType: 'NATURAL_GAS',
        allocationType: 'WAREHOUSE',
        allocationMethod: 'FIXED_PERCENTAGE',
        fixedPercentage: 80.0, // 80% to warehouse, 20% to office
        priority: 1,
        isActive: true
      }
    });

    const officeRule = await prisma.utilityCostAllocationRule.upsert({
      where: { id: 'demo-rule-office' },
      update: {},
      create: {
        id: 'demo-rule-office',
        facilityId: facility.id,
        ruleName: 'Office Utilities - Fixed Percentage',
        utilityType: 'ELECTRICITY',
        allocationType: 'OFFICE',
        allocationMethod: 'FIXED_PERCENTAGE',
        fixedPercentage: 20.0, // 20% to office
        priority: 2,
        isActive: true
      }
    });

    console.log('✅ Created allocation rules');

    // Create utility bills
    const currentDate = new Date();
    const serviceStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const serviceEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const electricityBill = await prisma.utilityBill.upsert({
      where: { id: 'demo-bill-electricity' },
      update: {},
      create: {
        id: 'demo-bill-electricity',
        facilityId: facility.id,
        utilityType: 'ELECTRICITY',
        billDate: currentDate,
        serviceStart,
        serviceEnd,
        previousReading: 45000,
        currentReading: 48500,
        usage: 3500,
        unit: 'kWh',
        amount: 1750.50,
        ratePerUnit: 0.50,
        isAllocated: false
      }
    });

    const gasBill = await prisma.utilityBill.upsert({
      where: { id: 'demo-bill-gas' },
      update: {},
      create: {
        id: 'demo-bill-gas',
        facilityId: facility.id,
        utilityType: 'NATURAL_GAS',
        billDate: currentDate,
        serviceStart,
        serviceEnd,
        previousReading: 2000,
        currentReading: 2250,
        usage: 250,
        unit: 'therms',
        amount: 425.75,
        ratePerUnit: 1.70,
        isAllocated: false
      }
    });

    const waterBill = await prisma.utilityBill.upsert({
      where: { id: 'demo-bill-water' },
      update: {},
      create: {
        id: 'demo-bill-water',
        facilityId: facility.id,
        utilityType: 'WATER',
        billDate: currentDate,
        serviceStart,
        serviceEnd,
        previousReading: 15000,
        currentReading: 15750,
        usage: 750,
        unit: 'gallons',
        amount: 285.25,
        ratePerUnit: 0.38,
        isAllocated: false
      }
    });

    console.log('✅ Created utility bills');

    // Create budgets
    const currentYear = currentDate.getFullYear();
    
    // Try to find existing budget first, then create if not found
    let electricityBudget = await prisma.utilityBudget.findFirst({
      where: {
        facilityId: facility.id,
        utilityType: 'ELECTRICITY',
        budgetYear: currentYear,
        budgetMonth: null
      }
    });

    if (!electricityBudget) {
      electricityBudget = await prisma.utilityBudget.create({
        data: {
          facilityId: facility.id,
          utilityType: 'ELECTRICITY',
          budgetYear: currentYear,
          budgetMonth: null, // Explicitly set to null for annual budget
          budgetedAmount: 21000, // Annual budget
          budgetedUsage: 42000,
          warehouseBudget: 16800,
          officeBudget: 4200
        }
      });
    }

    let gasBudget = await prisma.utilityBudget.findFirst({
      where: {
        facilityId: facility.id,
        utilityType: 'NATURAL_GAS',
        budgetYear: currentYear,
        budgetMonth: null
      }
    });

    if (!gasBudget) {
      gasBudget = await prisma.utilityBudget.create({
        data: {
          facilityId: facility.id,
          utilityType: 'NATURAL_GAS',
          budgetYear: currentYear,
          budgetMonth: null, // Explicitly set to null for annual budget
          budgetedAmount: 5100, // Annual budget
          budgetedUsage: 3000,
          warehouseBudget: 4080,
          officeBudget: 1020
        }
      });
    }

    console.log('✅ Created utility budgets');

    console.log('\n📊 Demo Data Summary:');
    console.log(`Facility: ${facility.name}`);
    console.log(`Total Square Feet: ${facility.totalSquareFeet?.toLocaleString()}`);
    console.log(`Warehouse Square Feet: ${facility.warehouseSquareFeet?.toLocaleString()}`);
    console.log(`Office Square Feet: ${facility.officeSquareFeet?.toLocaleString()}`);
    console.log(`\nUtility Bills Created:`);
    console.log(`- Electricity: $${electricityBill.amount} (${electricityBill.usage} ${electricityBill.unit})`);
    console.log(`- Natural Gas: $${gasBill.amount} (${gasBill.usage} ${gasBill.unit})`);
    console.log(`- Water: $${waterBill.amount} (${waterBill.usage} ${waterBill.unit})`);
    console.log(`\nAllocation Rules Created: 3`);
    console.log(`Budgets Created: 2`);

    return {
      facility,
      bills: [electricityBill, gasBill, waterBill],
      rules: [electricityRule, gasRule, officeRule],
      budgets: [electricityBudget, gasBudget]
    };

  } catch (error) {
    console.error('❌ Error creating demo data:', error);
    throw error;
  }
}

async function demonstrateAllocation(billId) {
  console.log(`\n🔄 Demonstrating cost allocation for bill: ${billId}`);

  try {
    // Get the utility bill
    const bill = await prisma.utilityBill.findUnique({
      where: { id: billId },
      include: {
        facility: {
          include: {
            warehouses: true,
            facilityAreas: true
          }
        }
      }
    });

    if (!bill) {
      console.log('❌ Bill not found');
      return;
    }

    console.log(`Bill: ${bill.utilityType} - $${bill.amount}`);

    // Get allocation rules for this facility and utility type
    const rules = await prisma.utilityCostAllocationRule.findMany({
      where: {
        facilityId: bill.facilityId,
        utilityType: bill.utilityType,
        isActive: true
      },
      orderBy: { priority: 'desc' }
    });

    console.log(`Found ${rules.length} allocation rules`);

    // Clear existing allocations
    await prisma.utilityCostAllocation.deleteMany({
      where: { utilityBillId: billId }
    });

    const allocations = [];
    let totalAllocated = 0;

    // Process each rule
    for (const rule of rules) {
      let allocation = await calculateAllocation(bill, rule);
      if (allocation && allocation.amount > 0) {
        const createdAllocation = await prisma.utilityCostAllocation.create({
          data: {
            utilityBillId: billId,
            allocationType: rule.allocationType,
            allocationKey: rule.ruleName,
            percentage: allocation.percentage,
            amount: allocation.amount,
            allocationMethod: rule.allocationMethod,
            squareFeet: allocation.squareFeet,
            totalSquareFeet: allocation.totalSquareFeet
          }
        });
        allocations.push(createdAllocation);
        totalAllocated += parseFloat(allocation.amount);
        
        console.log(`  ✅ ${rule.ruleName}: $${allocation.amount.toFixed(2)} (${allocation.percentage.toFixed(1)}%)`);
      }
    }

    // Update utility bill allocation status
    await prisma.utilityBill.update({
      where: { id: billId },
      data: {
        allocatedAmount: totalAllocated,
        unallocatedAmount: parseFloat(bill.amount) - totalAllocated,
        isAllocated: true,
        allocationMethod: 'RULE_BASED'
      }
    });

    console.log(`\n📊 Allocation Summary:`);
    console.log(`Total Bill Amount: $${parseFloat(bill.amount).toFixed(2)}`);
    console.log(`Total Allocated: $${totalAllocated.toFixed(2)}`);
    console.log(`Unallocated: $${(parseFloat(bill.amount) - totalAllocated).toFixed(2)}`);

    return allocations;

  } catch (error) {
    console.error('❌ Error during allocation:', error);
    throw error;
  }
}

// Helper function to calculate allocation based on rule
async function calculateAllocation(bill, rule) {
  const totalAmount = parseFloat(bill.amount);
  let allocation = { amount: 0, percentage: 0 };

  switch (rule.allocationMethod) {
    case 'FIXED_PERCENTAGE':
      allocation.percentage = rule.fixedPercentage || 0;
      allocation.amount = (totalAmount * allocation.percentage) / 100;
      break;

    case 'SQUARE_FOOTAGE':
      // Get facility areas for calculation
      const facilityAreas = await prisma.facilityArea.findMany({
        where: { facilityId: bill.facilityId }
      });
      
      const totalSquareFeet = facilityAreas.reduce((sum, area) => sum + (area.squareFeet || 0), 0);
      
      let targetSquareFeet = 0;
      if (rule.squareFootageBase) {
        // Use specific area type
        targetSquareFeet = facilityAreas
          .filter(area => area.areaType === rule.squareFootageBase)
          .reduce((sum, area) => sum + (area.squareFeet || 0), 0);
      }

      if (totalSquareFeet > 0) {
        allocation.percentage = (targetSquareFeet / totalSquareFeet) * 100;
        allocation.amount = (totalAmount * allocation.percentage) / 100;
        allocation.squareFeet = targetSquareFeet;
        allocation.totalSquareFeet = totalSquareFeet;
      }
      break;

    default:
      console.warn(`Unknown allocation method: ${rule.allocationMethod}`);
  }

  return allocation;
}

async function generateVarianceAnalysis(facilityId) {
  console.log('\n📈 Generating variance analysis...');

  try {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Get actual utility costs for the period
    const actualCosts = await prisma.utilityBill.groupBy({
      by: ['utilityType'],
      where: {
        facilityId,
        billDate: { gte: startDate, lt: endDate }
      },
      _sum: { amount: true, usage: true },
      _count: { id: true }
    });

    // Get budgets for the period
    const budgets = await prisma.utilityBudget.findMany({
      where: {
        facilityId,
        budgetYear: year
      }
    });

    const variances = [];

    for (const actual of actualCosts) {
      const budget = budgets.find(b => b.utilityType === actual.utilityType);
      
      if (budget) {
        const actualAmount = parseFloat(actual._sum.amount || 0);
        const budgetedAmount = parseFloat(budget.budgetedAmount) / 12; // Monthly budget
        const variance = actualAmount - budgetedAmount;
        const variancePercent = budgetedAmount > 0 ? (variance / budgetedAmount) * 100 : 0;

        const varianceRecord = await prisma.utilityCostVariance.create({
          data: {
            facilityId,
            utilityType: actual.utilityType,
            analysisDate: new Date(),
            periodStart: startDate,
            periodEnd: endDate,
            actualAmount,
            budgetedAmount,
            variance,
            variancePercent,
            actualUsage: parseFloat(actual._sum.usage || 0),
            budgetedUsage: parseFloat(budget.budgetedUsage || 0) / 12,
            usageVariance: parseFloat(actual._sum.usage || 0) - (parseFloat(budget.budgetedUsage || 0) / 12)
          }
        });

        variances.push(varianceRecord);

        console.log(`  📊 ${actual.utilityType}:`);
        console.log(`    Actual: $${actualAmount.toFixed(2)}`);
        console.log(`    Budget: $${budgetedAmount.toFixed(2)}`);
        console.log(`    Variance: $${variance.toFixed(2)} (${variancePercent.toFixed(1)}%)`);
      }
    }

    console.log(`\n✅ Generated ${variances.length} variance analyses`);
    return variances;

  } catch (error) {
    console.error('❌ Error generating variance analysis:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Utility Cost Allocation Demo\n');

    // Create demo data
    const { facility, bills, rules, budgets } = await createDemoData();

    // Demonstrate allocation for each bill
    for (const bill of bills) {
      await demonstrateAllocation(bill.id);
    }

    // Generate variance analysis
    await generateVarianceAnalysis(facility.id);

    console.log('\n🎉 Demo completed successfully!');
    console.log('\nYou can now:');
    console.log('1. Visit the Facility Management screen');
    console.log('2. Click on "Utility Management"');
    console.log('3. Explore the utility cost tracking and allocation features');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the demo
if (require.main === module) {
  main();
}

module.exports = {
  createDemoData,
  demonstrateAllocation,
  generateVarianceAnalysis,
  calculateAllocation
}; 