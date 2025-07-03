const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function createSampleLocations() {
  try {
    console.log('🏗️ Creating sample location hierarchy...');

    // Get the first warehouse
    const warehouses = await prisma.warehouse.findMany({
      take: 1
    });

    if (warehouses.length === 0) {
      console.log('❌ No warehouses found. Please create a warehouse first.');
      return;
    }

    const warehouseId = warehouses[0].id;
    console.log(`📦 Using warehouse: ${warehouses[0].name} (${warehouseId})`);

    // Sample location hierarchy data
    const locationData = [
      // Zone A
      { zone: 'A', rack: 'R1', aisle: 'A1', shelf: 'S1', bin: 'B1', x: 1, y: 1 },
      { zone: 'A', rack: 'R1', aisle: 'A1', shelf: 'S1', bin: 'B2', x: 2, y: 1 },
      { zone: 'A', rack: 'R1', aisle: 'A1', shelf: 'S2', bin: 'B1', x: 1, y: 2 },
      { zone: 'A', rack: 'R1', aisle: 'A1', shelf: 'S2', bin: 'B2', x: 2, y: 2 },
      { zone: 'A', rack: 'R2', aisle: 'A2', shelf: 'S1', bin: 'B1', x: 3, y: 1 },
      { zone: 'A', rack: 'R2', aisle: 'A2', shelf: 'S1', bin: 'B2', x: 4, y: 1 },
      
      // Zone B
      { zone: 'B', rack: 'R1', aisle: 'B1', shelf: 'S1', bin: 'B1', x: 5, y: 1 },
      { zone: 'B', rack: 'R1', aisle: 'B1', shelf: 'S1', bin: 'B2', x: 6, y: 1 },
      { zone: 'B', rack: 'R1', aisle: 'B1', shelf: 'S2', bin: 'B1', x: 5, y: 2 },
      { zone: 'B', rack: 'R2', aisle: 'B2', shelf: 'S1', bin: 'B1', x: 7, y: 1 },
      
      // Zone C
      { zone: 'C', rack: 'R1', aisle: null, shelf: 'S1', bin: 'B1', x: 8, y: 1 },
      { zone: 'C', rack: 'R1', aisle: null, shelf: 'S1', bin: 'B2', x: 9, y: 1 },
      { zone: 'C', rack: 'R2', aisle: 'C1', shelf: 'S1', bin: 'B1', x: 10, y: 1 },
    ];

    // Check if locations already exist
    const existingLocations = await prisma.location.findMany({
      where: { warehouseId }
    });

    if (existingLocations.length > 0) {
      console.log(`📍 Found ${existingLocations.length} existing locations. Skipping creation.`);
      console.log('Existing zones:', [...new Set(existingLocations.map(l => l.zone).filter(Boolean))]);
      return;
    }

    // Create locations
    const createdLocations = [];
    for (const locationInfo of locationData) {
      const location = await prisma.location.create({
        data: {
          id: randomUUID(),
          warehouseId,
          ...locationInfo
        }
      });
      createdLocations.push(location);
    }

    console.log(`✅ Created ${createdLocations.length} sample locations`);
    
    // Show summary
    const zones = [...new Set(createdLocations.map(l => l.zone))];
    const racks = [...new Set(createdLocations.map(l => l.rack))];
    const shelves = [...new Set(createdLocations.map(l => l.shelf))];
    const bins = [...new Set(createdLocations.map(l => l.bin))];

    console.log('📊 Location hierarchy summary:');
    console.log(`   Zones: ${zones.join(', ')}`);
    console.log(`   Racks: ${racks.join(', ')}`);
    console.log(`   Shelves: ${shelves.join(', ')}`);
    console.log(`   Bins: ${bins.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error creating sample locations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  createSampleLocations();
}

module.exports = { createSampleLocations }; 