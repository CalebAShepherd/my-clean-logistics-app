const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createProcurementSampleData() {
  try {
    console.log('🚀 Creating procurement sample data...');

    // Get the first admin user for assignments
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      console.error('❌ No admin user found. Please create an admin user first.');
      return;
    }

    // Get the first warehouse for assignments
    const warehouse = await prisma.warehouse.findFirst();

    if (!warehouse) {
      console.error('❌ No warehouse found. Please create a warehouse first.');
      return;
    }

    console.log(`📋 Using admin user: ${adminUser.email} and warehouse: ${warehouse.name}`);

    // 1. Create Sample Suppliers
    console.log('👥 Creating sample suppliers...');
    
    // First, check if suppliers already exist
    const existingSuppliers = await prisma.supplier.findMany({
      where: {
        name: {
          in: ['ACME Corporation', 'TechSolutions Inc', 'Global Parts Supply', 'QuickShip Logistics']
        }
      }
    });

    const suppliers = [];
    
    const supplierData = [
      {
        name: 'ACME Corporation',
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
        contactInfo: 'John Smith - Primary supplier for raw materials and components',
        performanceScore: 85.5,
        qualityRating: 4.2,
        deliveryRating: 4.0,
        serviceRating: 4.5,
        costRating: 3.8
      },
      {
        name: 'TechSolutions Inc',
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
        contactInfo: 'Sarah Johnson - IT services and software solutions provider',
        performanceScore: 92.3,
        qualityRating: 4.8,
        deliveryRating: 4.6,
        serviceRating: 4.9,
        costRating: 4.1
      },
      {
        name: 'Global Parts Supply',
        email: 'procurement@globalparts.com',
        phone: '+1-555-0303',
        address: '789 Supply Chain Ave, Logistics City, LC 67890',
        website: 'https://globalparts.com',
        taxId: 'TAX-GLOBAL-003',
        supplierType: 'DISTRIBUTOR',
        status: 'ACTIVE',
        paymentTerms: 'Net 45',
        creditLimit: 75000.00,
        currency: 'USD',
        leadTime: 21,
        minimumOrder: 2000.00,
        contactInfo: 'Mike Chen - International supplier for specialized components',
        performanceScore: 78.9,
        qualityRating: 3.9,
        deliveryRating: 3.5,
        serviceRating: 4.2,
        costRating: 4.3
      },
      {
        name: 'QuickShip Logistics',
        email: 'sales@quickship.com',
        phone: '+1-555-0404',
        address: '321 Express Way, Fast City, FC 13579',
        website: 'https://quickship.com',
        taxId: 'TAX-QUICK-004',
        supplierType: 'SERVICE_PROVIDER',
        status: 'PENDING_APPROVAL',
        paymentTerms: 'Net 30',
        creditLimit: 15000.00,
        currency: 'USD',
        leadTime: 3,
        minimumOrder: 100.00,
        contactInfo: 'Lisa Rodriguez - Fast delivery and logistics services',
        performanceScore: 88.7,
        qualityRating: 4.4,
        deliveryRating: 4.8,
        serviceRating: 4.3,
        costRating: 3.9
      }
    ];

    for (const data of supplierData) {
      const existing = existingSuppliers.find(s => s.name === data.name);
      if (existing) {
        console.log(`📋 Supplier "${data.name}" already exists, using existing record`);
        suppliers.push(existing);
      } else {
        const supplier = await prisma.supplier.create({ data });
        suppliers.push(supplier);
        console.log(`✅ Created supplier: ${data.name}`);
      }
    }

    console.log(`✅ Created ${suppliers.length} suppliers`);

    // 2. Create Sample Purchase Requisitions
    console.log('📝 Creating sample purchase requisitions...');
    
    const requisitions = await Promise.all([
      prisma.purchaseRequisition.create({
        data: {
          requisitionNumber: 'PR-2024-000001',
          description: 'Monthly office supplies and equipment for Q1 operations',
          requesterId: adminUser.id,
          warehouseId: warehouse.id,
          priority: 'MEDIUM',
          status: 'APPROVED',
          requestedDate: new Date(),
          requiredDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          totalEstimated: 2500.00,
          justification: 'Regular procurement for operational needs',
          approvedBy: adminUser.id,
          approvedAt: new Date(),
          lineItems: {
            create: [
              {
                itemDescription: 'Wireless Keyboards',
                quantity: 10,
                estimatedPrice: 75.00,
                totalEstimated: 750.00,
                specification: 'Ergonomic wireless keyboards with USB receiver'
              },
              {
                itemDescription: 'LED Monitors 24"',
                quantity: 5,
                estimatedPrice: 250.00,
                totalEstimated: 1250.00,
                specification: '24-inch LED monitors, 1080p resolution'
              },
              {
                itemDescription: 'Office Chairs',
                quantity: 5,
                estimatedPrice: 100.00,
                totalEstimated: 500.00,
                specification: 'Ergonomic office chairs with lumbar support'
              }
            ]
          }
        }
      }),

      prisma.purchaseRequisition.create({
        data: {
          requisitionNumber: 'PR-2024-000002',
          description: 'Steel and aluminum materials for manufacturing operations',
          requesterId: adminUser.id,
          warehouseId: warehouse.id,
          priority: 'HIGH',
          status: 'PENDING',
          requestedDate: new Date(),
          requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          totalEstimated: 15000.00,
          justification: 'Critical materials needed for upcoming production run',
          lineItems: {
            create: [
              {
                itemDescription: 'Steel Sheets Grade A',
                quantity: 100,
                estimatedPrice: 120.00,
                totalEstimated: 12000.00,
                specification: '4x8 steel sheets, 16 gauge thickness'
              },
              {
                itemDescription: 'Aluminum Rods',
                quantity: 50,
                estimatedPrice: 60.00,
                totalEstimated: 3000.00,
                specification: '6061 aluminum rods, 1 inch diameter'
              }
            ]
          }
        }
      })
    ]);

    console.log(`✅ Created ${requisitions.length} purchase requisitions`);

    // 3. Create Sample Purchase Orders
    console.log('🛒 Creating sample purchase orders...');
    
    const purchaseOrders = await Promise.all([
      prisma.purchaseOrder.create({
        data: {
          orderNumber: 'PO-2024-000001',
          supplierId: suppliers[0].id, // ACME Corporation
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
      }),

      prisma.purchaseOrder.create({
        data: {
          orderNumber: 'PO-2024-000002',
          supplierId: suppliers[1].id, // TechSolutions Inc
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
      })
    ]);

    console.log(`✅ Created ${purchaseOrders.length} purchase orders`);

    // 4. Create Sample Vendor Scorecards
    console.log('📊 Creating sample vendor scorecards...');
    
    const scorecards = await Promise.all([
      prisma.vendorScorecard.create({
        data: {
          supplierId: suppliers[0].id, // ACME Corporation
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
          generalNotes: 'Reliable supplier with strong performance across most areas. Consider volume discounts for larger orders.'
        }
      }),

      prisma.vendorScorecard.create({
        data: {
          supplierId: suppliers[1].id, // TechSolutions Inc
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
          generalNotes: 'Top-tier supplier with excellent performance. Expand partnership for additional services.'
        }
      }),

      prisma.vendorScorecard.create({
        data: {
          supplierId: suppliers[2].id, // Global Parts Supply
          evaluatedBy: adminUser.id,
          evaluationDate: new Date(),
          qualityScore: 78,
          deliveryScore: 70,
          serviceScore: 84,
          costScore: 86,
          overallScore: 79.5,
          qualityNotes: 'Acceptable quality but some consistency issues',
          deliveryNotes: 'Frequent delays due to international shipping',
          serviceNotes: 'Good communication despite time zone differences',
          costNotes: 'Very competitive pricing for international supplier',
          generalNotes: 'Good value supplier but needs improvement in reliability. Implement quality control measures.'
        }
      })
    ]);

    console.log(`✅ Created ${scorecards.length} vendor scorecards`);

    // 5. Update supplier performance scores based on scorecards
    console.log('🔄 Updating supplier performance scores...');
    
    for (let i = 0; i < suppliers.length && i < scorecards.length; i++) {
      await prisma.supplier.update({
        where: { id: suppliers[i].id },
        data: {
          performanceScore: scorecards[i].overallScore,
          qualityRating: scorecards[i].qualityScore / 20, // Convert to 5-star scale
          deliveryRating: scorecards[i].deliveryScore / 20,
          serviceRating: scorecards[i].serviceScore / 20,
          costRating: scorecards[i].costScore / 20
        }
      });
    }

    console.log('✅ Updated supplier performance scores');

    // 6. Create some sample inventory items if they don't exist
    console.log('📦 Creating sample inventory items...');
    
    // Check if inventory items already exist
    const existingItems = await prisma.inventoryItem.findMany({
      where: {
        sku: {
          in: ['BEAR-IND-001', 'PUMP-HYD-001']
        }
      }
    });

    const inventoryItems = [];
    const itemData = [
      {
        name: 'Industrial Bearing SKF-001',
        sku: 'BEAR-IND-001',
        description: 'High-grade industrial bearing for heavy machinery',
        category: 'Components',
        warehouseId: warehouse.id,
        quantity: 150,
        unitPrice: 85.00,
        reorderLevel: 25,
        maxLevel: 200
      },
      {
        name: 'Hydraulic Pump Model HP-500',
        sku: 'PUMP-HYD-001',
        description: 'Variable displacement hydraulic pump',
        category: 'Machinery',
        warehouseId: warehouse.id,
        quantity: 12,
        unitPrice: 850.00,
        reorderLevel: 3,
        maxLevel: 15
      }
    ];

    for (const data of itemData) {
      const existing = existingItems.find(item => item.sku === data.sku);
      if (existing) {
        console.log(`📋 Inventory item "${data.sku}" already exists, using existing record`);
        inventoryItems.push(existing);
      } else {
        const item = await prisma.inventoryItem.create({ data });
        inventoryItems.push(item);
        console.log(`✅ Created inventory item: ${data.sku}`);
      }
    }

    console.log(`✅ Created ${inventoryItems.length} inventory items`);

    console.log('🎉 Procurement sample data creation completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`- ${suppliers.length} suppliers created`);
    console.log(`- ${requisitions.length} purchase requisitions created`);
    console.log(`- ${purchaseOrders.length} purchase orders created`);
    console.log(`- ${scorecards.length} vendor scorecards created`);
    console.log(`- ${inventoryItems.length} inventory items created`);
    console.log('\n🚀 You can now access the procurement analytics with sample data!');

  } catch (error) {
    console.error('❌ Error creating procurement sample data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  createProcurementSampleData()
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = createProcurementSampleData; 