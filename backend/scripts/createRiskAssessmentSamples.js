const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createRiskAssessmentSamples() {
  try {
    console.log('⚠️  Creating risk assessment samples...');

    // Get the first tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.error('❌ No tenant found. Please create a tenant first.');
      return;
    }

    const tenantId = tenant.id;
    console.log(`📋 Using tenant: ${tenant.name} (${tenantId})`);

    // Get the first user for assignments
    const user = await prisma.user.findFirst({
      where: { tenantId }
    });
    if (!user) {
      console.error('❌ No user found for this tenant.');
      return;
    }

    // Create current and future dates
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), Math.floor(Math.random() * 28) + 1);
    const futureReview = new Date(now.getFullYear(), now.getMonth() + 3, 15); // 3 months from now

    // Create Risk Assessments
    await Promise.all([
      prisma.riskAssessment.create({
        data: {
          entityType: 'Customer',
          entityId: 'CUST-ABC-001',
          entityName: 'ABC Manufacturing Corp',
          overallRisk: 'MEDIUM',
          creditRisk: 'LOW',
          operationalRisk: 'MEDIUM',
          complianceRisk: 'LOW',
          creditScore: 720,
          riskScore: 65.5,
          riskFactors: JSON.stringify([
            'Large order volumes',
            'Stable payment history',
            'Industry volatility',
            'Geographic concentration'
          ]),
          assessmentDate: currentMonth,
          assessmentNotes: 'Solid customer with good payment history but operates in volatile manufacturing sector. Recommend quarterly reviews.',
          reviewDate: futureReview,
          assessedBy: user.id,
          tenantId
        }
      }),
      prisma.riskAssessment.create({
        data: {
          entityType: 'Supplier',
          entityId: 'SUPP-GLS-001',
          entityName: 'Global Logistics Solutions',
          overallRisk: 'HIGH',
          creditRisk: 'HIGH',
          operationalRisk: 'MEDIUM',
          complianceRisk: 'HIGH',
          creditScore: 580,
          riskScore: 85.2,
          riskFactors: JSON.stringify([
            'Recent financial difficulties',
            'Compliance violations',
            'Geographic concentration',
            'Single point of failure',
            'Regulatory changes'
          ]),
          assessmentDate: new Date(now.getFullYear(), now.getMonth() - 1, 15), // Last month
          assessmentNotes: 'High risk supplier requiring close monitoring and mitigation strategies. Consider diversifying supplier base.',
          reviewDate: new Date(now.getFullYear(), now.getMonth() + 1, 15), // Next month
          assessedBy: user.id,
          tenantId
        }
      }),
      prisma.riskAssessment.create({
        data: {
          entityType: 'Customer',
          entityId: 'CUST-TI-002',
          entityName: 'Tech Innovations LLC',
          overallRisk: 'LOW',
          creditRisk: 'LOW',
          operationalRisk: 'LOW',
          complianceRisk: 'LOW',
          creditScore: 785,
          riskScore: 25.8,
          riskFactors: JSON.stringify([
            'Strong financial position',
            'Excellent payment history',
            'Diversified revenue streams',
            'Good compliance record'
          ]),
          assessmentDate: currentMonth,
          assessmentNotes: 'Low risk customer with excellent track record. Minimal monitoring required.',
          reviewDate: new Date(now.getFullYear() + 1, now.getMonth(), 15), // Annual review
          assessedBy: user.id,
          tenantId
        }
      }),
      prisma.riskAssessment.create({
        data: {
          entityType: 'Supplier',
          entityId: 'SUPP-RS-003',
          entityName: 'Reliable Shipping Co',
          overallRisk: 'MEDIUM',
          creditRisk: 'MEDIUM',
          operationalRisk: 'LOW',
          complianceRisk: 'MEDIUM',
          creditScore: 680,
          riskScore: 55.0,
          riskFactors: JSON.stringify([
            'Seasonal demand fluctuations',
            'Fuel price sensitivity',
            'Driver shortage concerns',
            'Insurance coverage gaps'
          ]),
          assessmentDate: new Date(now.getFullYear(), now.getMonth() - 2, 10), // 2 months ago
          assessmentNotes: 'Medium risk supplier with operational challenges. Monitor fuel costs and driver availability.',
          reviewDate: new Date(now.getFullYear(), now.getMonth() + 2, 10), // 2 months from now
          assessedBy: user.id,
          tenantId
        }
      }),
      prisma.riskAssessment.create({
        data: {
          entityType: 'Customer',
          entityId: 'CUST-MG-004',
          entityName: 'Metro Grocers Inc',
          overallRisk: 'CRITICAL',
          creditRisk: 'CRITICAL',
          operationalRisk: 'HIGH',
          complianceRisk: 'MEDIUM',
          creditScore: 450,
          riskScore: 92.5,
          riskFactors: JSON.stringify([
            'Multiple late payments',
            'Declining market share',
            'Management turnover',
            'Liquidity concerns',
            'Legal disputes'
          ]),
          assessmentDate: new Date(now.getFullYear(), now.getMonth(), 5),
          assessmentNotes: 'CRITICAL: Immediate action required. Consider credit hold and alternative payment terms. Weekly monitoring essential.',
          reviewDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7), // Next week
          assessedBy: user.id,
          tenantId
        }
      }),
      prisma.riskAssessment.create({
        data: {
          entityType: 'Supplier',
          entityId: 'SUPP-QM-005',
          entityName: 'Quality Materials Ltd',
          overallRisk: 'LOW',
          creditRisk: 'LOW',
          operationalRisk: 'MEDIUM',
          complianceRisk: 'LOW',
          creditScore: 750,
          riskScore: 35.0,
          riskFactors: JSON.stringify([
            'Strong financials',
            'ISO certifications current',
            'Capacity constraints during peak',
            'New facility expansion'
          ]),
          assessmentDate: currentMonth,
          assessmentNotes: 'Low risk supplier with excellent quality standards. Monitor capacity during peak seasons.',
          reviewDate: new Date(now.getFullYear(), now.getMonth() + 6, 1), // 6 months
          assessedBy: user.id,
          tenantId
        }
      })
    ]);

    console.log('✅ Risk assessment samples created successfully!');
    console.log('📋 Summary:');
    console.log('   - 6 Risk Assessments');
    console.log('   - 3 Customer assessments (1 Low, 1 Medium, 1 Critical)');
    console.log('   - 3 Supplier assessments (1 Low, 1 Medium, 1 High)');

  } catch (error) {
    console.error('❌ Error creating risk assessment samples:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRiskAssessmentSamples(); 