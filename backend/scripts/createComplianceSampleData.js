const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createComplianceSampleData() {
  try {
    console.log('🏗️  Creating compliance sample data...');

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

    // 1. Create SOX Controls
    console.log('🛡️  Creating SOX Controls...');
    const soxControls = await Promise.all([
      prisma.soxControl.create({
        data: {
          controlNumber: 'SOX-001',
          name: 'Revenue Recognition Control',
          description: 'Ensures proper revenue recognition in accordance with accounting standards',
          area: 'FINANCIAL_REPORTING',
          frequency: 'QUARTERLY',
          status: 'EFFECTIVE',
          owner: user.id,
          tenantId,
          lastTested: new Date('2024-12-01'),
          nextTestDate: new Date('2025-03-01')
        }
      }),
      prisma.soxControl.create({
        data: {
          controlNumber: 'SOX-002',
          name: 'IT Access Controls',
          description: 'Controls user access to financial systems and data',
          area: 'IT_GENERAL_CONTROLS',
          frequency: 'MONTHLY',
          status: 'TESTED',
          owner: user.id,
          tenantId,
          lastTested: new Date('2024-11-15'),
          nextTestDate: new Date('2025-02-15')
        }
      }),
      prisma.soxControl.create({
        data: {
          controlNumber: 'SOX-003',
          name: 'Inventory Valuation Control',
          description: 'Ensures accurate inventory valuation and cost allocation',
          area: 'INVENTORY',
          frequency: 'QUARTERLY',
          status: 'DESIGN',
          owner: user.id,
          tenantId,
          nextTestDate: new Date('2025-01-31')
        }
      })
    ]);

    // 2. Create SOX Tests
    console.log('🧪 Creating SOX Tests...');
    await Promise.all([
      prisma.soxTest.create({
        data: {
          controlId: soxControls[0].id,
          testDate: new Date('2024-12-01'),
          testedBy: user.id,
          result: 'PASS',
          issuesFound: null,
          tenantId
        }
      }),
      prisma.soxTest.create({
        data: {
          controlId: soxControls[1].id,
          testDate: new Date('2024-11-15'),
          testedBy: user.id,
          result: 'PASS',
          issuesFound: null,
          tenantId
        }
      }),
      prisma.soxTest.create({
        data: {
          controlId: soxControls[1].id,
          testDate: new Date('2024-10-15'),
          testedBy: user.id,
          result: 'FAIL',
          issuesFound: 'Unauthorized access detected in audit logs',
          remediationPlan: 'Update access controls and review user permissions',
          retestDate: new Date('2024-11-30'),
          tenantId
        }
      })
    ]);

    // 3. Create Insurance Claims
    console.log('🛡️  Creating Insurance Claims...');
    await Promise.all([
      prisma.insuranceClaim.create({
        data: {
          claimNumber: 'INS-2024-001',
          referenceType: 'Shipment',
          referenceId: 'SHP-001',
          insurer: 'Logistics Insurance Corp',
          dateFiled: new Date('2024-11-20'),
          claimAmount: 15000.00,
          status: 'APPROVED',
          description: 'Damaged goods during transportation',
          documentsUrls: ['claim-form.pdf', 'damage-photos.jpg'],
          tenantId
        }
      }),
      prisma.insuranceClaim.create({
        data: {
          claimNumber: 'INS-2024-002',
          referenceType: 'Facility',
          referenceId: 'FAC-001',
          insurer: 'Property Insurance LLC',
          dateFiled: new Date('2024-12-05'),
          claimAmount: 8500.00,
          status: 'UNDER_REVIEW',
          description: 'Water damage to warehouse equipment',
          documentsUrls: ['incident-report.pdf'],
          tenantId
        }
      }),
      prisma.insuranceClaim.create({
        data: {
          claimNumber: 'INS-2024-003',
          referenceType: 'Vehicle',
          referenceId: 'VEH-001',
          insurer: 'Fleet Insurance Group',
          dateFiled: new Date('2024-10-15'),
          claimAmount: 25000.00,
          status: 'REJECTED',
          description: 'Vehicle accident during delivery',
          documentsUrls: ['police-report.pdf', 'vehicle-photos.jpg'],
          tenantId
        }
      })
    ]);

    // 4. Create Compliance Documents
    console.log('📄 Creating Compliance Documents...');
    const documents = await Promise.all([
      prisma.complianceDocument.create({
        data: {
          title: 'SOX Control Procedures Manual',
          description: 'Comprehensive guide for SOX compliance procedures',
          fileName: 'sox-procedures-2024.pdf',
          filePath: '/uploads/compliance/sox-procedures-2024.pdf',
          fileSize: 2048000,
          mimeType: 'application/pdf',
          documentType: 'SOX_CONTROL_PROCEDURE',
          category: 'POLICIES_PROCEDURES',
          retentionPeriod: 7,
          expiryDate: new Date('2031-12-31'),
          isConfidential: true,
          accessLevel: 'RESTRICTED',
          uploadedBy: user.id,
          tenantId
        }
      }),
      prisma.complianceDocument.create({
        data: {
          title: 'Insurance Policy Certificate',
          description: 'Current insurance policy documentation',
          fileName: 'insurance-policy-2024.pdf',
          filePath: '/uploads/compliance/insurance-policy-2024.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          documentType: 'INSURANCE_POLICY',
          category: 'INSURANCE_DOCUMENTATION',
          retentionPeriod: 10,
          expiryDate: new Date('2025-12-31'),
          isConfidential: false,
          accessLevel: 'INTERNAL',
          uploadedBy: user.id,
          tenantId
        }
      }),
      prisma.complianceDocument.create({
        data: {
          title: 'Annual Audit Report 2024',
          description: 'External audit findings and recommendations',
          fileName: 'audit-report-2024.pdf',
          filePath: '/uploads/compliance/audit-report-2024.pdf',
          fileSize: 3072000,
          mimeType: 'application/pdf',
          documentType: 'AUDIT_REPORT',
          category: 'AUDIT_EVIDENCE',
          retentionPeriod: 7,
          expiryDate: new Date('2031-12-31'),
          isConfidential: true,
          accessLevel: 'CONFIDENTIAL',
          uploadedBy: user.id,
          tenantId
        }
      })
    ]);

    // 5. Create Document Reminders
    console.log('⏰ Creating Document Reminders...');
    await Promise.all([
      prisma.documentReminder.create({
        data: {
          documentId: documents[1].id, // Insurance policy
          reminderDate: new Date('2025-11-01'), // 2 months before expiry
          reminderType: 'EXPIRY_WARNING',
          isCompleted: false,
          emailSent: false,
          assignedTo: user.id,
          tenantId
        }
      }),
      prisma.documentReminder.create({
        data: {
          documentId: documents[0].id, // SOX procedures
          reminderDate: new Date('2025-06-01'), // Mid-year review
          reminderType: 'REVIEW_DUE',
          isCompleted: false,
          emailSent: false,
          assignedTo: user.id,
          tenantId
        }
      })
    ]);

    // 6. Create Compliance Reports
    console.log('📊 Creating Compliance Reports...');
    const reportData = {
      soxControls: soxControls.length,
      effectiveControls: soxControls.filter(c => c.status === 'EFFECTIVE').length,
      testsPerformed: 3,
      passedTests: 2,
      failedTests: 1
    };

    await Promise.all([
      prisma.complianceReport.create({
        data: {
          title: 'Q4 2024 SOX Compliance Report',
          reportType: 'SOX_COMPLIANCE',
          reportPeriod: 'QUARTERLY',
          startDate: new Date('2024-10-01'),
          endDate: new Date('2024-12-31'),
          reportData: JSON.stringify(reportData),
          summary: 'Overall SOX compliance is strong with 2 of 3 controls effective',
          status: 'APPROVED',
          generatedBy: user.id,
          tenantId,
          completedAt: new Date('2024-12-15')
        }
      }),
      prisma.complianceReport.create({
        data: {
          title: 'Insurance Claims Summary - 2024',
          reportType: 'INSURANCE_SUMMARY',
          reportPeriod: 'ANNUAL',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          reportData: JSON.stringify({
            totalClaims: 3,
            approvedClaims: 1,
            rejectedClaims: 1,
            pendingClaims: 1,
            totalClaimAmount: 48500.00
          }),
          summary: 'Total claims of $48,500 with 33% approval rate',
          status: 'GENERATED',
          generatedBy: user.id,
          tenantId,
          completedAt: new Date('2024-12-20')
        }
      })
    ]);

    // 7. Create Risk Assessments
    console.log('⚠️  Creating Risk Assessments...');
    await Promise.all([
      prisma.riskAssessment.create({
        data: {
          entityType: 'Customer',
          entityId: 'CUST-001',
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
            'Industry volatility'
          ]),
          assessmentDate: new Date('2024-12-01'),
          assessmentNotes: 'Solid customer with good payment history but operates in volatile market',
          reviewDate: new Date('2025-06-01'),
          assessedBy: user.id,
          tenantId
        }
      }),
      prisma.riskAssessment.create({
        data: {
          entityType: 'Supplier',
          entityId: 'SUPP-001',
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
            'Geographic concentration'
          ]),
          assessmentDate: new Date('2024-11-15'),
          assessmentNotes: 'High risk supplier requiring close monitoring and mitigation strategies',
          reviewDate: new Date('2025-02-15'),
          assessedBy: user.id,
          tenantId
        }
      })
    ]);

    // 8. Create Credit Limits
    console.log('💳 Creating Credit Limits...');
    await Promise.all([
      prisma.creditLimit.create({
        data: {
          customerId: 'CUST-001',
          customerName: 'ABC Manufacturing Corp',
          creditLimit: 100000.00,
          availableCredit: 75000.00,
          currentBalance: 25000.00,
          paymentTerms: 30,
          interestRate: 2.5,
          status: 'ACTIVE',
          approvalDate: new Date('2024-01-15'),
          expiryDate: new Date('2025-01-15'),
          approvedBy: user.id,
          tenantId
        }
      }),
      prisma.creditLimit.create({
        data: {
          customerId: 'CUST-002',
          customerName: 'Tech Innovations LLC',
          creditLimit: 50000.00,
          availableCredit: 50000.00,
          currentBalance: 0.00,
          paymentTerms: 15,
          interestRate: 1.8,
          status: 'ACTIVE',
          approvalDate: new Date('2024-06-01'),
          expiryDate: new Date('2025-06-01'),
          approvedBy: user.id,
          tenantId
        }
      })
    ]);

    console.log('✅ Compliance sample data created successfully!');
    console.log('📋 Summary:');
    console.log('   - 3 SOX Controls');
    console.log('   - 3 SOX Tests');
    console.log('   - 3 Insurance Claims');
    console.log('   - 3 Compliance Documents');
    console.log('   - 2 Document Reminders');
    console.log('   - 2 Compliance Reports');
    console.log('   - 2 Risk Assessments');
    console.log('   - 2 Credit Limits');

  } catch (error) {
    console.error('❌ Error creating compliance sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createComplianceSampleData(); 