const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createPhase5SampleData() {
  try {
    console.log('🚀 Creating Phase 5 sample data...');

    // Get first tenant and user for the data
    const tenant = await prisma.tenant.findFirst();
    const user = await prisma.user.findFirst();
    
    if (!tenant || !user) {
      console.log('❌ No tenant or user found. Please ensure you have basic data set up first.');
      return;
    }

    console.log(`Using tenant: ${tenant.name} and user: ${user.email}`);

    // Create SOX Controls
    const soxControls = [
      {
        controlNumber: 'FR001',
        name: 'Monthly Financial Close Process',
        description: 'Ensures accurate and timely monthly financial closing procedures',
        area: 'FINANCIAL_REPORTING',
        frequency: 'MONTHLY',
        status: 'EFFECTIVE',
      },
      {
        controlNumber: 'FR002', 
        name: 'Revenue Recognition Control',
        description: 'Validates proper revenue recognition in accordance with accounting standards',
        area: 'REVENUE_RECOGNITION',
        frequency: 'MONTHLY',
        status: 'TESTED',
      },
      {
        controlNumber: 'IT001',
        name: 'Access Control Management',
        description: 'Controls user access to critical financial systems',
        area: 'IT_GENERAL_CONTROLS',
        frequency: 'QUARTERLY',
        status: 'IMPLEMENTED',
      },
      {
        controlNumber: 'IT002',
        name: 'Data Backup and Recovery',
        description: 'Ensures data integrity through regular backup procedures',
        area: 'IT_GENERAL_CONTROLS', 
        frequency: 'DAILY',
        status: 'EFFECTIVE',
      },
      {
        controlNumber: 'INV001',
        name: 'Inventory Count Procedures',
        description: 'Physical inventory counting and reconciliation controls',
        area: 'INVENTORY',
        frequency: 'QUARTERLY',
        status: 'DESIGN',
      },
      {
        controlNumber: 'INV002',
        name: 'Inventory Valuation Review',
        description: 'Review and validation of inventory valuation methods',
        area: 'INVENTORY',
        frequency: 'MONTHLY',
        status: 'INEFFECTIVE',
      },
      {
        controlNumber: 'BIL001',
        name: 'Invoice Approval Process',
        description: 'Multi-level approval process for customer invoices',
        area: 'BILLING',
        frequency: 'DAILY',
        status: 'EFFECTIVE',
      },
      {
        controlNumber: 'BIL002',
        name: 'Credit Memo Authorization',
        description: 'Authorization controls for credit memo issuance',
        area: 'BILLING',
        frequency: 'WEEKLY',
        status: 'TESTED',
      }
    ];

    console.log('Creating SOX Controls...');
    const createdControls = [];
    for (const control of soxControls) {
      const created = await prisma.soxControl.create({
        data: {
          ...control,
          owner: user.id,
          tenantId: tenant.id,
          lastTested: control.status === 'TESTED' || control.status === 'EFFECTIVE' ? 
            new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
          nextTestDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000),
        }
      });
      createdControls.push(created);
    }
    console.log(`✅ Created ${createdControls.length} SOX Controls`);

    // Create SOX Tests for some controls
    console.log('Creating SOX Tests...');
    const testResults = ['PASS', 'FAIL', 'PARTIAL'];
    let testsCreated = 0;
    
    for (const control of createdControls.slice(0, 6)) { // Test first 6 controls
      for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
        const testDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
        const result = testResults[Math.floor(Math.random() * testResults.length)];
        
        await prisma.soxTest.create({
          data: {
            controlId: control.id,
            testDate,
            testedBy: user.id,
            result,
            issuesFound: result === 'FAIL' ? 'Control execution was incomplete and lacked proper documentation' : 
                        result === 'PARTIAL' ? 'Minor documentation gaps identified' : null,
            remediationPlan: result !== 'PASS' ? 'Implement additional training and documentation requirements' : null,
            retestDate: result !== 'PASS' ? new Date(testDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null,
            tenantId: tenant.id,
          }
        });
        testsCreated++;
      }
    }
    console.log(`✅ Created ${testsCreated} SOX Tests`);

    // Create Insurance Claims
    const facilities = await prisma.facility.findMany({ take: 5 });
    
    const insuranceClaims = [
      {
        claimNumber: 'INS-2024-001',
        insurer: 'Lloyd\'s of London',
        claimAmount: 25000.00,
        description: 'Water damage to inventory due to roof leak in warehouse section A',
        status: 'UNDER_REVIEW',
        facilityId: facilities[0]?.id,
      },
      {
        claimNumber: 'INS-2024-002', 
        insurer: 'AIG Insurance',
        claimAmount: 15000.00,
        description: 'Forklift collision resulting in damaged racking system',
        status: 'APPROVED',
        facilityId: facilities[1]?.id,
      },
      {
        claimNumber: 'INS-2024-003',
        insurer: 'Zurich Insurance',
        claimAmount: 8500.00,
        description: 'Theft of electronics from loading dock area',
        status: 'CLOSED',
        facilityId: facilities[0]?.id,
      },
      {
        claimNumber: 'INS-2024-004',
        insurer: 'Travelers Insurance',
        claimAmount: 45000.00,
        description: 'Fire damage to conveyor system and surrounding inventory',
        status: 'OPEN',
        facilityId: facilities[2]?.id,
      },
      {
        claimNumber: 'INS-2024-005',
        insurer: 'Liberty Mutual',
        claimAmount: 12000.00,
        description: 'Slip and fall incident resulting in worker compensation claim',
        status: 'REJECTED',
        facilityId: facilities[1]?.id,
      },
      {
        claimNumber: 'INS-2024-006',
        insurer: 'State Farm Commercial',
        claimAmount: 32000.00,
        description: 'Vehicle collision in parking lot damaging multiple customer vehicles',
        status: 'UNDER_REVIEW',
        facilityId: facilities[0]?.id,
      }
    ];

    console.log('Creating Insurance Claims...');
    let claimsCreated = 0;
    for (const claim of insuranceClaims) {
      await prisma.insuranceClaim.create({
        data: {
          ...claim,
          dateFiled: new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000),
          documentsUrls: [`/uploads/claim-${claim.claimNumber.toLowerCase()}.pdf`],
          tenantId: tenant.id,
        }
      });
      claimsCreated++;
    }
    console.log(`✅ Created ${claimsCreated} Insurance Claims`);

    // Create some audit logs
    console.log('Creating Audit Logs...');
    const auditActions = ['CREATE', 'UPDATE', 'VIEW', 'DELETE'];
    const entityTypes = ['SOX_CONTROL', 'SOX_TEST', 'INSURANCE_CLAIM', 'USER', 'SHIPMENT'];
    
    let auditLogsCreated = 0;
    for (let i = 0; i < 20; i++) {
      await prisma.auditLog.create({
        data: {
          entityType: entityTypes[Math.floor(Math.random() * entityTypes.length)],
          entityId: `entity-${Math.random().toString(36).substring(7)}`,
          action: auditActions[Math.floor(Math.random() * auditActions.length)],
          changes: {
            field: 'status',
            oldValue: 'DRAFT',
            newValue: 'ACTIVE'
          },
          performedBy: user.id,
          tenantId: tenant.id,
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        }
      });
      auditLogsCreated++;
    }
    console.log(`✅ Created ${auditLogsCreated} Audit Logs`);

    // Create Document Retention Policies
    console.log('Creating Document Retention Policies...');
    const retentionPolicies = [
      {
        name: 'Financial Records Policy',
        description: 'Retention policy for financial documents and records',
        documentType: 'POLICY',
        retentionPeriod: 2555, // 7 years in days
        reminderDays: 90,
        isActive: true,
      },
      {
        name: 'Audit Documentation Policy',
        description: 'Retention requirements for audit reports and supporting documentation',
        documentType: 'AUDIT_REPORT',
        retentionPeriod: 1825, // 5 years in days
        reminderDays: 60,
        isActive: true,
      },
      {
        name: 'Insurance Policy Retention',
        description: 'Retention schedule for insurance policies and claims documentation',
        documentType: 'INSURANCE_POLICY',
        retentionPeriod: 3650, // 10 years in days
        reminderDays: 180,
        isActive: true,
      }
    ];

    let policiesCreated = 0;
    for (const policy of retentionPolicies) {
      await prisma.documentRetentionPolicy.create({
        data: {
          ...policy,
          createdBy: user.id,
          tenantId: tenant.id,
        }
      });
      policiesCreated++;
    }
    console.log(`✅ Created ${policiesCreated} Document Retention Policies`);

    // Create Compliance Documents
    console.log('Creating Compliance Documents...');
    const complianceDocuments = [
      {
        title: 'SOX Compliance Policy 2024',
        description: 'Updated Sarbanes-Oxley compliance policy for fiscal year 2024',
        documentType: 'POLICY',
        category: 'COMPLIANCE',
        filePath: '/uploads/compliance/sox-policy-2024.pdf',
        fileSize: 2457600, // 2.4MB
        mimeType: 'application/pdf',
        accessLevel: 'INTERNAL',
        isConfidential: true,
        retentionPeriod: 2555,
      },
      {
        title: 'Internal Audit Procedures Manual',
        description: 'Comprehensive guide for conducting internal audits',
        documentType: 'PROCEDURE',
        category: 'COMPLIANCE',
        filePath: '/uploads/compliance/audit-procedures.pdf',
        fileSize: 1843200, // 1.8MB
        mimeType: 'application/pdf',
        accessLevel: 'CONFIDENTIAL',
        isConfidential: true,
        retentionPeriod: 1825,
      },
      {
        title: 'Risk Management Framework',
        description: 'Enterprise risk management framework and guidelines',
        documentType: 'POLICY',
        category: 'OPERATIONAL',
        filePath: '/uploads/compliance/risk-framework.pdf',
        fileSize: 3276800, // 3.2MB
        mimeType: 'application/pdf',
        accessLevel: 'INTERNAL',
        isConfidential: false,
        retentionPeriod: 1095,
      },
      {
        title: 'Insurance Coverage Certificate 2024',
        description: 'Current insurance coverage certificate and policy details',
        documentType: 'CERTIFICATE',
        category: 'FINANCIAL',
        filePath: '/uploads/compliance/insurance-cert-2024.pdf',
        fileSize: 512000, // 500KB
        mimeType: 'application/pdf',
        accessLevel: 'RESTRICTED',
        isConfidential: true,
        retentionPeriod: 3650,
      },
      {
        title: 'Q3 2024 Internal Audit Report',
        description: 'Third quarter internal audit findings and recommendations',
        documentType: 'AUDIT_REPORT',
        category: 'COMPLIANCE',
        filePath: '/uploads/compliance/q3-2024-audit.pdf',
        fileSize: 4194304, // 4MB
        mimeType: 'application/pdf',
        accessLevel: 'CONFIDENTIAL',
        isConfidential: true,
        retentionPeriod: 1825,
      },
      {
        title: 'Vendor Contract Template',
        description: 'Standard contract template for vendor agreements',
        documentType: 'CONTRACT',
        category: 'LEGAL',
        filePath: '/uploads/compliance/vendor-contract-template.docx',
        fileSize: 102400, // 100KB
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        accessLevel: 'INTERNAL',
        isConfidential: false,
        retentionPeriod: 1095,
      }
    ];

    let documentsCreated = 0;
    for (const doc of complianceDocuments) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + doc.retentionPeriod);
      
      await prisma.complianceDocument.create({
        data: {
          ...doc,
          uploadedBy: user.id,
          expiryDate,
          tenantId: tenant.id,
        }
      });
      documentsCreated++;
    }
    console.log(`✅ Created ${documentsCreated} Compliance Documents`);

    // Create Risk Assessments
    console.log('Creating Risk Assessments...');
    const riskAssessments = [
      {
        title: 'Cybersecurity Risk Assessment',
        description: 'Comprehensive assessment of cybersecurity risks and vulnerabilities',
        category: 'TECHNOLOGY',
        riskLevel: 'HIGH',
        probability: 4,
        impact: 5,
        mitigation: 'Implement multi-factor authentication, regular security training, and enhanced monitoring systems',
        status: 'ASSESSED',
      },
      {
        title: 'Supply Chain Disruption Risk',
        description: 'Assessment of potential supply chain disruptions and their impact on operations',
        category: 'OPERATIONAL',
        riskLevel: 'MEDIUM',
        probability: 3,
        impact: 4,
        mitigation: 'Diversify supplier base, maintain safety stock, and develop contingency plans',
        status: 'MITIGATED',
      },
      {
        title: 'Regulatory Compliance Risk',
        description: 'Risk assessment for potential regulatory compliance violations',
        category: 'COMPLIANCE',
        riskLevel: 'HIGH',
        probability: 2,
        impact: 5,
        mitigation: 'Regular compliance training, automated monitoring systems, and quarterly compliance reviews',
        status: 'IDENTIFIED',
      },
      {
        title: 'Market Volatility Financial Risk',
        description: 'Assessment of financial risks due to market volatility and economic uncertainty',
        category: 'FINANCIAL',
        riskLevel: 'MEDIUM',
        probability: 4,
        impact: 3,
        mitigation: 'Diversify revenue streams, maintain cash reserves, and implement hedging strategies',
        status: 'RESOLVED',
      },
      {
        title: 'Key Personnel Departure Risk',
        description: 'Risk of losing critical personnel and institutional knowledge',
        category: 'STRATEGIC',
        riskLevel: 'MEDIUM',
        probability: 3,
        impact: 3,
        mitigation: 'Succession planning, knowledge documentation, and competitive retention packages',
        status: 'MITIGATED',
      },
      {
        title: 'Brand Reputation Risk',
        description: 'Assessment of potential damage to company reputation from various factors',
        category: 'REPUTATIONAL',
        riskLevel: 'LOW',
        probability: 2,
        impact: 4,
        mitigation: 'Proactive communication strategy, crisis management plan, and stakeholder engagement',
        status: 'CLOSED',
      }
    ];

    let assessmentsCreated = 0;
    for (const assessment of riskAssessments) {
      const assessmentDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      const dueDate = new Date(assessmentDate.getTime() + (Math.random() * 180 + 30) * 24 * 60 * 60 * 1000);
      
      await prisma.riskAssessment.create({
        data: {
          ...assessment,
          assessmentDate,
          dueDate,
          riskScore: assessment.probability * assessment.impact,
          assessedBy: user.id,
          tenantId: tenant.id,
        }
      });
      assessmentsCreated++;
    }
    console.log(`✅ Created ${assessmentsCreated} Risk Assessments`);

    // Create Credit Limits
    console.log('Creating Credit Limits...');
    const creditLimits = [
      {
        entityName: 'Global Manufacturing Corp',
        entityType: 'CUSTOMER',
        creditLimit: 500000.00,
        currentExposure: 325000.00,
        status: 'ACTIVE',
      },
      {
        entityName: 'TechStart Innovations',
        entityType: 'CUSTOMER', 
        creditLimit: 150000.00,
        currentExposure: 145000.00,
        status: 'UNDER_REVIEW',
      },
      {
        entityName: 'Reliable Suppliers Inc',
        entityType: 'SUPPLIER',
        creditLimit: 250000.00,
        currentExposure: 180000.00,
        status: 'ACTIVE',
      }
    ];

    let creditsCreated = 0;
    for (const credit of creditLimits) {
      const lastReviewed = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
      const nextReview = new Date(lastReviewed.getTime() + 90 * 24 * 60 * 60 * 1000);
      
      await prisma.creditLimit.create({
        data: {
          ...credit,
          lastReviewed,
          nextReview,
          reviewedBy: user.id,
          tenantId: tenant.id,
        }
      });
      creditsCreated++;
    }
    console.log(`✅ Created ${creditsCreated} Credit Limits`);

    // Create Compliance Reports
    console.log('Creating Compliance Reports...');
    const complianceReports = [
      {
        title: 'Q4 2024 SOX Compliance Report',
        description: 'Quarterly SOX compliance status and testing results',
        reportType: 'SOX_COMPLIANCE',
        reportPeriod: 'QUARTERLY',
        periodStartDate: new Date('2024-10-01'),
        periodEndDate: new Date('2024-12-31'),
        status: 'APPROVED',
      },
      {
        title: 'Annual Insurance Claims Summary 2024',
        description: 'Comprehensive summary of all insurance claims filed in 2024',
        reportType: 'INSURANCE_SUMMARY',
        reportPeriod: 'ANNUAL',
        periodStartDate: new Date('2024-01-01'),
        periodEndDate: new Date('2024-12-31'),
        status: 'GENERATED',
      },
      {
        title: 'November 2024 Audit Activity Report',
        description: 'Monthly summary of audit activities and findings',
        reportType: 'AUDIT_SUMMARY',
        reportPeriod: 'MONTHLY',
        periodStartDate: new Date('2024-11-01'),
        periodEndDate: new Date('2024-11-30'),
        status: 'REVIEWED',
      },
      {
        title: 'Document Compliance Status Report',
        description: 'Current status of document management and retention compliance',
        reportType: 'DOCUMENT_COMPLIANCE',
        reportPeriod: 'QUARTERLY',
        periodStartDate: new Date('2024-10-01'),
        periodEndDate: new Date('2024-12-31'),
        status: 'DRAFT',
      }
    ];

    let reportsCreated = 0;
    for (const report of complianceReports) {
      await prisma.complianceReport.create({
        data: {
          ...report,
          generatedBy: user.id,
          tenantId: tenant.id,
        }
      });
      reportsCreated++;
    }
    console.log(`✅ Created ${reportsCreated} Compliance Reports`);

    // Create Compliance Metrics
    console.log('Creating Compliance Metrics...');
    const complianceMetrics = [
      {
        metricType: 'SOX_CONTROL_EFFECTIVENESS',
        value: 92.5,
        period: 'QUARTERLY',
        periodStartDate: new Date('2024-10-01'),
        periodEndDate: new Date('2024-12-31'),
      },
      {
        metricType: 'AUDIT_FINDINGS_COUNT',
        value: 3,
        period: 'MONTHLY',
        periodStartDate: new Date('2024-11-01'),
        periodEndDate: new Date('2024-11-30'),
      },
      {
        metricType: 'DOCUMENT_COMPLIANCE_RATE',
        value: 87.8,
        period: 'QUARTERLY',
        periodStartDate: new Date('2024-10-01'),
        periodEndDate: new Date('2024-12-31'),
      },
      {
        metricType: 'INSURANCE_CLAIM_RESOLUTION_TIME',
        value: 28.5,
        period: 'MONTHLY',
        periodStartDate: new Date('2024-11-01'),
        periodEndDate: new Date('2024-11-30'),
      }
    ];

    let metricsCreated = 0;
    for (const metric of complianceMetrics) {
      await prisma.complianceMetric.create({
        data: {
          ...metric,
          calculatedBy: user.id,
          tenantId: tenant.id,
        }
      });
      metricsCreated++;
    }
    console.log(`✅ Created ${metricsCreated} Compliance Metrics`);

    console.log('🎉 Enhanced Phase 5 sample data creation completed successfully!');
    console.log(`
    Summary:
    - ${createdControls.length} SOX Controls
    - ${testsCreated} SOX Tests  
    - ${claimsCreated} Insurance Claims
    - ${auditLogsCreated} Audit Log Entries
    - ${policiesCreated} Document Retention Policies
    - ${documentsCreated} Compliance Documents
    - ${assessmentsCreated} Risk Assessments
    - ${creditsCreated} Credit Limits
    - ${reportsCreated} Compliance Reports
    - ${metricsCreated} Compliance Metrics
    `);

  } catch (error) {
    console.error('❌ Error creating Phase 5 sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createPhase5SampleData();
}

module.exports = { createPhase5SampleData }; 