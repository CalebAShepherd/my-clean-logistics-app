const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createComplianceDocuments() {
  try {
    console.log('📄 Creating compliance documents...');

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

    // Create current date for documents
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), Math.floor(Math.random() * 28) + 1);

    // Create Compliance Documents
    const documents = await Promise.all([
      prisma.complianceDocument.create({
        data: {
          title: 'SOX Control Procedures Manual',
          description: 'Comprehensive guide for SOX compliance procedures',
          fileName: 'sox-procedures-2025.pdf',
          filePath: '/uploads/compliance/sox-procedures-2025.pdf',
          fileSize: 2048000,
          mimeType: 'application/pdf',
          documentType: 'SOX_CONTROL_PROCEDURE',
          category: 'POLICIES_PROCEDURES',
          retentionPeriod: 7,
          expiryDate: new Date('2031-12-31'),
          isConfidential: true,
          accessLevel: 'RESTRICTED',
          uploadedBy: user.id,
          tenantId,
          createdAt: currentMonth
        }
      }),
      prisma.complianceDocument.create({
        data: {
          title: 'Insurance Policy Certificate',
          description: 'Current insurance policy documentation',
          fileName: 'insurance-policy-2025.pdf',
          filePath: '/uploads/compliance/insurance-policy-2025.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          documentType: 'INSURANCE_POLICY',
          category: 'INSURANCE_DOCUMENTATION',
          retentionPeriod: 10,
          expiryDate: new Date('2025-12-31'),
          isConfidential: false,
          accessLevel: 'INTERNAL',
          uploadedBy: user.id,
          tenantId,
          createdAt: currentMonth
        }
      }),
      prisma.complianceDocument.create({
        data: {
          title: 'Annual Audit Report 2025',
          description: 'External audit findings and recommendations',
          fileName: 'audit-report-2025.pdf',
          filePath: '/uploads/compliance/audit-report-2025.pdf',
          fileSize: 3072000,
          mimeType: 'application/pdf',
          documentType: 'AUDIT_REPORT',
          category: 'AUDIT_EVIDENCE',
          retentionPeriod: 7,
          expiryDate: new Date('2031-12-31'),
          isConfidential: true,
          accessLevel: 'CONFIDENTIAL',
          uploadedBy: user.id,
          tenantId,
          createdAt: currentMonth
        }
      }),
      prisma.complianceDocument.create({
        data: {
          title: 'Risk Management Policy',
          description: 'Company-wide risk management procedures and guidelines',
          fileName: 'risk-management-policy-2025.pdf',
          filePath: '/uploads/compliance/risk-management-policy-2025.pdf',
          fileSize: 1536000,
          mimeType: 'application/pdf',
          documentType: 'PROCEDURE_MANUAL',
          category: 'POLICIES_PROCEDURES',
          retentionPeriod: 5,
          expiryDate: new Date('2030-12-31'),
          isConfidential: false,
          accessLevel: 'INTERNAL',
          uploadedBy: user.id,
          tenantId,
          createdAt: currentMonth
        }
      }),
      prisma.complianceDocument.create({
        data: {
          title: 'IT Security Compliance Certificate',
          description: 'Current IT security and data protection compliance certificate',
          fileName: 'it-security-cert-2025.pdf',
          filePath: '/uploads/compliance/it-security-cert-2025.pdf',
          fileSize: 512000,
          mimeType: 'application/pdf',
          documentType: 'COMPLIANCE_CERTIFICATE',
          category: 'CERTIFICATIONS',
          retentionPeriod: 3,
          expiryDate: new Date('2026-06-30'),
          isConfidential: false,
          accessLevel: 'INTERNAL',
          uploadedBy: user.id,
          tenantId,
          createdAt: currentMonth
        }
      })
    ]);

    // Create Document Reminders for some documents
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
          documentId: documents[4].id, // IT Security cert
          reminderDate: new Date('2026-04-30'), // 2 months before expiry
          reminderType: 'EXPIRY_WARNING',
          isCompleted: false,
          emailSent: false,
          assignedTo: user.id,
          tenantId
        }
      })
    ]);

    console.log('✅ Compliance documents created successfully!');
    console.log('📋 Summary:');
    console.log('   - 5 Compliance Documents');
    console.log('   - 2 Document Reminders');

  } catch (error) {
    console.error('❌ Error creating compliance documents:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createComplianceDocuments(); 