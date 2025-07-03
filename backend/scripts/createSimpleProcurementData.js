const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSimpleProcurementData() {
  try {
    console.log('🚀 Creating simple procurement sample data...');

    // Get the first admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      console.error('❌ No admin user found. Please create an admin user first.');
      return;
    }

    // Get the first warehouse
    const warehouse = await prisma.warehouse.findFirst();

    if (!warehouse) {
      console.error('❌ No warehouse found. Please create a warehouse first.');
      return;
    }

    console.log(`📋 Using admin user: ${adminUser.email} and warehouse: ${warehouse.name}`);

    // Clear existing data to avoid conflicts
    console.log('🧹 Cleaning up existing procurement data...');
    await prisma.vendorScorecard.deleteMany({});
    await prisma.purchaseOrderItem.deleteMany({});
    await prisma.purchaseOrder.deleteMany({});
    await prisma.purchaseRequisitionItem.deleteMany({});
    await prisma.purchaseRequisition.deleteMany({});
    await prisma.supplier.deleteMany({});

    // 1. Create Suppliers with exact schema fields
    console.log('👥 Creating suppliers...');
    
    const supplier1 = await prisma.supplier.create({
      data: {
        name: 'ACME Corporation',
        contactInfo: 'John Smith - Primary contact for manufacturing supplies',
        email: 'sales@acmecorp.com',
        phone: '+1-555-0101',
        address: '123 Industrial Blvd, Manufacturing City, MC 12345',
        website: 'https://acmecorp.com',
        taxId: 'TAX-ACME-001',
        supplierType: 'MANUFACTURER',
        status: 'ACTIVE',
        paymentTerms: 'Net 30',
        creditLimit: 50000.00,
        currency: 'USD',
        leadTime: 14,
        minimumOrder: 1000.00,
        performanceScore: 85.5,
        qualityRating: 4.2,
        deliveryRating: 4.0,
        serviceRating: 4.5,
        costRating: 3.8
      }
    });

    const supplier2 = await prisma.supplier.create({
      data: {
        name: 'TechSolutions Inc',
        contactInfo: 'Sarah Johnson - IT services and software solutions',
        email: 'orders@techsolutions.com',
        phone: '+1-555-0202',
        address: '456 Technology Drive, Silicon Valley, SV 54321',
        website: 'https://techsolutions.com',
        taxId: 'TAX-TECH-002',
        supplierType: 'SERVICE_PROVIDER',
        status: 'ACTIVE',
        paymentTerms: 'Net 15',
        creditLimit: 25000.00,
        currency: 'USD',
        leadTime: 7,
        minimumOrder: 500.00,
        performanceScore: 92.3,
        qualityRating: 4.8,
        deliveryRating: 4.6,
        serviceRating: 4.9,
        costRating: 4.1
      }
    });

    console.log('✅ Created 2 suppliers');

    // 2. Create Purchase Requisitions with exact schema fields
    console.log('📝 Creating purchase requisitions...');
    
    const requisition1 = await prisma.purchaseRequisition.create({
      data: {
        requisitionNumber: 'PR-2025-000001',
        requesterId: adminUser.id,
        warehouseId: warehouse.id,
        status: 'APPROVED',
        priority: 'MEDIUM',
        description: 'Office equipment and supplies for Q1 operations',
        justification: 'Regular procurement for operational needs',
        totalEstimated: 2500.00,
        requestedDate: new Date(),
        requiredDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        approvedBy: adminUser.id,
        approvedAt: new Date(),
        lineItems: {
          create: [
            {
              itemDescription: 'Wireless Keyboards',
              specification: 'Ergonomic wireless keyboards with USB receiver',
              quantity: 10,
              estimatedPrice: 75.00,
              totalEstimated: 750.00,
              category: 'Office Equipment'
            },
            {
              itemDescription: 'LED Monitors 24"',
              specification: '24-inch LED monitors, 1080p resolution',
              quantity: 5,
              estimatedPrice: 250.00,
              totalEstimated: 1250.00,
              category: 'Office Equipment'
            }
          ]
        }
      }
    });

    const requisition2 = await prisma.purchaseRequisition.create({
      data: {
        requisitionNumber: 'PR-2025-000002',
        requesterId: adminUser.id,
        warehouseId: warehouse.id,
        status: 'PENDING',
        priority: 'HIGH',
        description: 'Raw materials for manufacturing operations',
        justification: 'Critical materials needed for upcoming production run',
        totalEstimated: 15000.00,
        requestedDate: new Date(),
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lineItems: {
          create: [
            {
              itemDescription: 'Steel Sheets Grade A',
              specification: '4x8 steel sheets, 16 gauge thickness',
              quantity: 100,
              estimatedPrice: 120.00,
              totalEstimated: 12000.00,
              category: 'Raw Materials'
            }
          ]
        }
      }
    });

    console.log('✅ Created 2 purchase requisitions');

    // 3. Create Purchase Orders with exact schema fields
    console.log('🛒 Creating purchase orders...');
    
    const purchaseOrder1 = await prisma.purchaseOrder.create({
      data: {
        orderNumber: 'PO-2025-000001',
        supplierId: supplier1.id,
        warehouseId: warehouse.id,
        createdBy: adminUser.id,
        status: 'APPROVED',
        orderDate: new Date(),
        expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        subtotal: 8500.00,
        taxAmount: 680.00,
        shippingCost: 120.00,
        totalAmount: 9300.00,
        paymentTerms: 'Net 30',
        notes: 'Standard procurement order for Q1 inventory',
        approvedBy: adminUser.id,
        approvedAt: new Date(),
        totalItems: 2,
        requisitionId: requisition1.id,
        lineItems: {
          create: [
            {
              itemDescription: 'Industrial Bearings',
              quantity: 50,
              unitPrice: 85.00,
              totalPrice: 4250.00
            },
            {
              itemDescription: 'Hydraulic Pumps',
              quantity: 5,
              unitPrice: 850.00,
              totalPrice: 4250.00
            }
          ]
        }
      }
    });

    const purchaseOrder2 = await prisma.purchaseOrder.create({
      data: {
        orderNumber: 'PO-2025-000002',
        supplierId: supplier2.id,
        warehouseId: warehouse.id,
        createdBy: adminUser.id,
        status: 'PENDING_APPROVAL',
        orderDate: new Date(),
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subtotal: 12000.00,
        taxAmount: 960.00,
        shippingCost: 0.00,
        totalAmount: 12960.00,
        paymentTerms: 'Net 15',
        notes: 'Software licensing and IT services',
        totalItems: 2,
        lineItems: {
          create: [
            {
              itemDescription: 'Enterprise Software License',
              quantity: 1,
              unitPrice: 8000.00,
              totalPrice: 8000.00
            },
            {
              itemDescription: 'IT Consulting Services',
              quantity: 20,
              unitPrice: 200.00,
              totalPrice: 4000.00
            }
          ]
        }
      }
    });

    console.log('✅ Created 2 purchase orders');

    // 4. Create Vendor Scorecards with exact schema fields
    console.log('📊 Creating vendor scorecards...');
    
    const scorecard1 = await prisma.vendorScorecard.create({
      data: {
        supplierId: supplier1.id,
        evaluatedBy: adminUser.id,
        evaluationDate: new Date(),
        qualityScore: 85,
        deliveryScore: 80,
        serviceScore: 90,
        costScore: 75,
        overallScore: 82.5,
        qualityNotes: 'Good quality products with occasional minor defects',
        deliveryNotes: 'Generally on time, some delays during peak seasons',
        serviceNotes: 'Excellent customer service and responsiveness',
        costNotes: 'Competitive pricing but room for improvement',
        generalNotes: 'Reliable supplier with strong performance across most areas'
      }
    });

    const scorecard2 = await prisma.vendorScorecard.create({
      data: {
        supplierId: supplier2.id,
        evaluatedBy: adminUser.id,
        evaluationDate: new Date(),
        qualityScore: 95,
        deliveryScore: 92,
        serviceScore: 98,
        costScore: 82,
        overallScore: 91.75,
        qualityNotes: 'Exceptional quality in software and services',
        deliveryNotes: 'Consistently meets deadlines and commitments',
        serviceNotes: 'Outstanding support and proactive communication',
        costNotes: 'Premium pricing but justified by quality',
        generalNotes: 'Top-tier supplier with excellent performance'
      }
    });

    console.log('✅ Created 2 vendor scorecards');

    // 5. Update supplier performance scores based on scorecards
    console.log('🔄 Updating supplier performance scores...');
    
    await prisma.supplier.update({
      where: { id: supplier1.id },
      data: {
        performanceScore: scorecard1.overallScore,
        qualityRating: scorecard1.qualityScore / 20,
        deliveryRating: scorecard1.deliveryScore / 20,
        serviceRating: scorecard1.serviceScore / 20,
        costRating: scorecard1.costScore / 20
      }
    });

    await prisma.supplier.update({
      where: { id: supplier2.id },
      data: {
        performanceScore: scorecard2.overallScore,
        qualityRating: scorecard2.qualityScore / 20,
        deliveryRating: scorecard2.deliveryScore / 20,
        serviceRating: scorecard2.serviceScore / 20,
        costRating: scorecard2.costScore / 20
      }
    });

    console.log('✅ Updated supplier performance scores');

    console.log('🎉 Simple procurement sample data creation completed successfully!');
    console.log('\n📈 Summary:');
    console.log('- 2 suppliers created');
    console.log('- 2 purchase requisitions created');
    console.log('- 2 purchase orders created');
    console.log('- 2 vendor scorecards created');
    console.log('\n🚀 You can now access the procurement analytics with sample data!');

  } catch (error) {
    console.error('❌ Error creating simple procurement sample data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  createSimpleProcurementData()
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = createSimpleProcurementData; 