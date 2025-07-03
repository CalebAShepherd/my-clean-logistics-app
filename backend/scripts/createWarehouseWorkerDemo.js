const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createWarehouseWorkerDemo() {
  try {
    console.log('Creating warehouse worker demo data...');

    // Create warehouse worker users
    const hashedPassword = await bcrypt.hash('worker123', 10);
    
    const worker1 = await prisma.user.upsert({
      where: { email: 'worker1@warehouse.com' },
      update: {},
      create: {
        email: 'worker1@warehouse.com',
        username: 'worker1',
        password: hashedPassword,
        role: 'warehouse_worker',
        phone: '+1234567890'
      }
    });

    const worker2 = await prisma.user.upsert({
      where: { email: 'worker2@warehouse.com' },
      update: {},
      create: {
        email: 'worker2@warehouse.com',
        username: 'worker2',
        password: hashedPassword,
        role: 'warehouse_worker',
        phone: '+1234567891'
      }
    });

    console.log('✅ Created warehouse workers');

    // Get or create warehouse
    let warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
      warehouse = await prisma.warehouse.create({
        data: {
          name: 'Main Warehouse',
          address: '123 Warehouse St, City, State 12345'
        }
      });
    }

    // Create locations if they don't exist
    const locations = [];
    for (let zone = 1; zone <= 3; zone++) {
      for (let aisle = 1; aisle <= 5; aisle++) {
        for (let shelf = 1; shelf <= 4; shelf++) {
          const location = await prisma.location.upsert({
            where: {
              id: `${warehouse.id}-Z${zone}-A${aisle}-S${shelf}-B1`
            },
            update: {},
            create: {
              id: `${warehouse.id}-Z${zone}-A${aisle}-S${shelf}-B1`,
              warehouseId: warehouse.id,
              zone: `Z${zone}`,
              aisle: `A${aisle}`,
              shelf: `S${shelf}`,
              bin: 'B1',
              x: aisle * 10,
              y: zone * 10
            }
          });
          locations.push(location);
        }
      }
    }

    console.log('✅ Created warehouse locations');

    // Create inventory items
    const items = [];
    const itemNames = [
      'Widget A', 'Widget B', 'Gadget X', 'Gadget Y', 'Component Z',
      'Tool Alpha', 'Tool Beta', 'Part Gamma', 'Device Delta', 'Module Epsilon'
    ];

    for (let i = 0; i < itemNames.length; i++) {
      const item = await prisma.inventoryItem.upsert({
        where: { sku: `SKU-ITEM-${String(i + 1).padStart(3, '0')}` },
        update: {},
        create: {
          id: `item-${i + 1}`,
          sku: `SKU-ITEM-${String(i + 1).padStart(3, '0')}`,
          name: itemNames[i],
          description: `Description for ${itemNames[i]}`,
          unit: 'EA',
          unitCost: Math.floor(Math.random() * 100) + 10,
          supplierId: null,
          updatedAt: new Date()
        }
      });
      items.push(item);
    }

    console.log('✅ Created inventory items');

    // Create warehouse items (inventory in locations)
    for (const item of items) {
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      await prisma.warehouseItem.upsert({
        where: {
          warehouseId_itemId_locationId: {
            warehouseId: warehouse.id,
            itemId: item.id,
            locationId: randomLocation.id
          }
        },
        update: {},
        create: {
          warehouseId: warehouse.id,
          itemId: item.id,
          locationId: randomLocation.id,
          quantity: Math.floor(Math.random() * 100) + 50,
          minThreshold: 10,
          maxThreshold: 200
        }
      });
    }

    console.log('✅ Created warehouse inventory');

    // Create waves and pick lists
    const wave = await prisma.wave.create({
      data: {
        waveNumber: `WAVE-${Date.now()}`,
        warehouseId: warehouse.id,
        status: 'RELEASED',
        priority: 1,
        createdBy: worker1.id,
        totalOrders: 3,
        totalItems: 10
      }
    });

    const pickList = await prisma.pickList.create({
      data: {
        listNumber: `PICK-${Date.now()}`,
        warehouseId: warehouse.id,
        waveId: wave.id,
        status: 'ASSIGNED',
        priority: 'HIGH',
        assignedPickerId: worker1.id,
        totalItems: 5,
        estimatedTime: 30
      }
    });

    // Create pick tasks
    for (let i = 0; i < 5; i++) {
      const randomItem = items[Math.floor(Math.random() * items.length)];
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      
      await prisma.pickTask.create({
        data: {
          pickListId: pickList.id,
          inventoryItemId: randomItem.id,
          locationId: randomLocation.id,
          quantityToPick: Math.floor(Math.random() * 5) + 1,
          status: Math.random() > 0.7 ? 'IN_PROGRESS' : 'PENDING',
          priority: ['HIGH', 'MEDIUM', 'LOW'][Math.floor(Math.random() * 3)],
          pickerId: worker1.id
        }
      });
    }

    console.log('✅ Created pick tasks');

    // Create put-away tasks
    for (let i = 0; i < 3; i++) {
      const randomItem = items[Math.floor(Math.random() * items.length)];
      const fromLocation = locations[Math.floor(Math.random() * locations.length)];
      const toLocation = locations[Math.floor(Math.random() * locations.length)];
      
      await prisma.putAwayTask.create({
        data: {
          warehouseId: warehouse.id,
          inventoryItemId: randomItem.id,
          fromLocationId: fromLocation.id,
          toLocationId: toLocation.id,
          quantity: Math.floor(Math.random() * 10) + 1,
          status: 'ASSIGNED',
          priority: ['HIGH', 'MEDIUM', 'LOW'][Math.floor(Math.random() * 3)],
          assignedUser: { connect: { id: worker2.id } }
        }
      });
    }

    console.log('✅ Created put-away tasks');

    // Create cycle count
    const cycleCount = await prisma.cycleCount.create({
      data: {
        name: `Cycle Count ${new Date().toISOString().split('T')[0]}`,
        description: 'Daily cycle count for Zone 1',
        warehouseId: warehouse.id,
        countType: 'RANDOM',
        frequency: 'DAILY',
        status: 'ACTIVE',
        scheduledDate: new Date(),
        createdById: worker1.id,
        assignedToId: worker2.id
      }
    });

    // Create cycle count tasks
    for (let i = 0; i < 3; i++) {
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      
      await prisma.cycleCountTask.create({
        data: {
          cycleCountId: cycleCount.id,
          locationId: randomLocation.id,
          status: 'ASSIGNED',
          assignedToId: worker2.id,
          itemsToCount: Math.floor(Math.random() * 5) + 1
        }
      });
    }

    console.log('✅ Created cycle count tasks');

    // Create ASN and receipts for receiving tasks
    const asn = await prisma.aSN.create({
      data: {
        asnNumber: `ASN-${Date.now()}`,
        warehouseId: warehouse.id,
        status: 'CONFIRMED',
        expectedDate: new Date(),
        totalItems: 5
      }
    });

    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber: `RCP-${Date.now()}`,
        warehouseId: warehouse.id,
        asnId: asn.id,
        status: 'PENDING',
        receiverId: worker1.id,
        totalItems: 5
      }
    });

    console.log('✅ Created receiving tasks');

    console.log('\n🎉 Demo data created successfully!');
    console.log('\nWarehouse Worker Accounts:');
    console.log('📧 worker1@warehouse.com | 🔑 worker123');
    console.log('📧 worker2@warehouse.com | 🔑 worker123');
    console.log('\nDemo includes:');
    console.log('• 5 Pick tasks (worker1)');
    console.log('• 3 Put-away tasks (worker2)');
    console.log('• 3 Cycle count tasks (worker2)');
    console.log('• 1 Receiving task (worker1)');
    console.log('• 10 Inventory items with barcodes');
    console.log('• 60 Warehouse locations');

  } catch (error) {
    console.error('❌ Error creating demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  createWarehouseWorkerDemo()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createWarehouseWorkerDemo }; 