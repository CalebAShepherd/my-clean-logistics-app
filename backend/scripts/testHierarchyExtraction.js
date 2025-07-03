const { PrismaClient } = require('@prisma/client');
const { blueprintTo3D } = require('../utils/blueprintTo3D');

const prisma = new PrismaClient();

// Sample blueprint data for testing
const sampleBlueprint = {
  id: 'test-blueprint-1',
  name: 'Test Warehouse Layout',
  warehouseId: 'test-warehouse-1',
  dimensions: { width: 30, depth: 20 },
  elements: [
    // Zones
    {
      id: 'zone-a',
      type: 'zone',
      x: 2,
      y: 2,
      width: 12,
      depth: 8,
      label: 'Zone A'
    },
    {
      id: 'zone-b',
      type: 'zone',
      x: 16,
      y: 2,
      width: 12,
      depth: 8,
      label: 'Zone B'
    },
    {
      id: 'zone-c',
      type: 'zone',
      x: 2,
      y: 12,
      width: 26,
      depth: 6,
      label: 'Zone C'
    },
    
    // Aisles
    {
      id: 'aisle-main',
      type: 'aisle',
      x: 14,
      y: 1,
      length: 2.5,
      width: 18,
      rotation: 90,
      label: 'Main Aisle'
    },
    {
      id: 'aisle-cross',
      type: 'aisle',
      x: 2,
      y: 10,
      length: 26,
      width: 2,
      rotation: 0,
      label: 'Cross Aisle'
    },
    
    // Racks in Zone A
    {
      id: 'rack-a1',
      type: 'rack',
      x: 3,
      y: 3,
      width: 1.2,
      depth: 0.6,
      levels: 4,
      binsPerShelf: 3,
      label: 'Rack A1'
    },
    {
      id: 'rack-a2',
      type: 'rack',
      x: 5,
      y: 3,
      width: 1.2,
      depth: 0.6,
      levels: 5,
      binsPerShelf: 4,
      label: 'Rack A2'
    },
    {
      id: 'rack-a3',
      type: 'rack',
      x: 7,
      y: 3,
      width: 1.2,
      depth: 0.6,
      levels: 3,
      binsPerShelf: 2,
      label: 'Rack A3'
    },
    
    // Racks in Zone B
    {
      id: 'rack-b1',
      type: 'rack',
      x: 17,
      y: 4,
      width: 1.2,
      depth: 0.6,
      levels: 4,
      binsPerShelf: 3,
      label: 'Rack B1'
    },
    {
      id: 'rack-b2',
      type: 'rack',
      x: 19,
      y: 4,
      width: 1.2,
      depth: 0.6,
      levels: 4,
      binsPerShelf: 3,
      label: 'Rack B2'
    },
    
    // Racks in Zone C
    {
      id: 'rack-c1',
      type: 'rack',
      x: 4,
      y: 14,
      width: 1.2,
      depth: 0.6,
      levels: 6,
      binsPerShelf: 5,
      label: 'Rack C1'
    },
    {
      id: 'rack-c2',
      type: 'rack',
      x: 8,
      y: 14,
      width: 1.2,
      depth: 0.6,
      levels: 6,
      binsPerShelf: 5,
      label: 'Rack C2'
    },
    
    // Some old-style separate shelves for testing
    {
      id: 'shelf-legacy-1',
      type: 'shelf',
      x: 11,
      y: 14,
      width: 1.2,
      depth: 0.6,
      label: 'Legacy Shelf 1'
    },
    {
      id: 'shelf-legacy-2',
      type: 'shelf',
      x: 13,
      y: 14,
      width: 1.2,
      depth: 0.6,
      label: 'Legacy Shelf 2'
    },
    
    // Walls
    {
      id: 'wall-north',
      type: 'wall',
      x: 0,
      y: 19.8,
      length: 30,
      thickness: 0.2,
      rotation: 0,
      label: 'North Wall'
    },
    {
      id: 'wall-south',
      type: 'wall',
      x: 0,
      y: 0,
      length: 30,
      thickness: 0.2,
      rotation: 0,
      label: 'South Wall'
    }
  ]
};

async function testHierarchyExtraction() {
  console.log('🧪 Testing warehouse layout hierarchy extraction...\n');
  
  try {
    // Step 1: Convert blueprint to 3D objects
    console.log('📋 Converting sample blueprint to 3D objects...');
    const objects3D = blueprintTo3D(sampleBlueprint);
    console.log(`✅ Converted ${objects3D.length} elements to 3D objects\n`);
    
    // Step 2: Test the hierarchy extraction logic
    console.log('🏗️  Testing hierarchy extraction...');
    
    // Import the extraction function (simulate what the controller does)
    const { extractHierarchyFromWarehouseLayout } = require('../controllers/locationController');
    
    // Simulate saving the blueprint to test database lookup
    console.log('💾 Creating test blueprint in database...');
    
    // Clean up any existing test data
    await prisma.blueprint.deleteMany({ where: { warehouseId: 'test-warehouse-1' } });
    
    // Create test blueprint
    await prisma.blueprint.create({
      data: {
        id: sampleBlueprint.id,
        name: sampleBlueprint.name,
        warehouseId: sampleBlueprint.warehouseId,
        elements: sampleBlueprint.elements,
        dimensions: sampleBlueprint.dimensions,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Test blueprint saved to database\n');
    
    // Step 3: Test hierarchy extraction with different filters
    const testCases = [
      { name: 'All hierarchy (no filters)', filters: {} },
      { name: 'Zone A racks only', filters: { zone: 'Zone A' } },
      { name: 'Zone B racks only', filters: { zone: 'Zone B' } },
      { name: 'Zone C racks only', filters: { zone: 'Zone C' } },
      { name: 'Rack A1 shelves only', filters: { zone: 'Zone A', rack: 'Rack A1' } },
      { name: 'Rack B1 shelves only', filters: { zone: 'Zone B', rack: 'Rack B1' } }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🔍 Testing: ${testCase.name}`);
      console.log(`   Filters:`, testCase.filters);
      
      try {
        // This would normally be called from the controller, but we'll test it directly
        // Since extractHierarchyFromWarehouseLayout is not exported, we'll test via the controller
        const hierarchy = await testHierarchyExtractionDirect('test-warehouse-1', testCase.filters);
        
        console.log(`   Results:`);
        console.log(`     Zones: [${hierarchy.zones.join(', ')}]`);
        console.log(`     Racks: [${hierarchy.racks.join(', ')}]`);
        console.log(`     Aisles: [${hierarchy.aisles.join(', ')}]`);
        console.log(`     Shelves: [${hierarchy.shelves.slice(0, 5).join(', ')}${hierarchy.shelves.length > 5 ? '...' : ''}] (${hierarchy.shelves.length} total)`);
        console.log(`     Bins: [${hierarchy.bins.join(', ')}]`);
        
      } catch (error) {
        console.error(`   ❌ Error:`, error.message);
      }
    }
    
    console.log('\n✅ Hierarchy extraction test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up test data
    await prisma.blueprint.deleteMany({ where: { warehouseId: 'test-warehouse-1' } });
    await prisma.$disconnect();
  }
}

// Direct test of hierarchy extraction logic (copy of the controller function for testing)
async function testHierarchyExtractionDirect(warehouseId, filters = {}) {
  // Get the most recent blueprint for this warehouse
  const blueprint = await prisma.blueprint.findFirst({
    where: { warehouseId },
    orderBy: { updatedAt: 'desc' }
  });
  
  if (!blueprint || !blueprint.elements) {
    throw new Error('No warehouse layout found for hierarchy extraction');
  }
  
  // Convert 2D blueprint elements to 3D objects for analysis
  const layoutObjects = blueprintTo3D(blueprint);
  console.log(`📋 Found blueprint with ${layoutObjects.length} 3D objects`);
  
  // Extract zones, racks, and shelves from layout objects
  const zones = new Set();
  const racks = new Set();
  const aisles = new Set();
  const shelves = new Set();
  const bins = new Set();
  
  // Spatial relationship tracking
  const zoneRackMap = new Map(); // zone -> Set of racks
  const rackShelfMap = new Map(); // rack -> Set of shelves
  
  // Process each layout object
  layoutObjects.forEach(obj => {
    switch (obj.type) {
      case 'zone':
        zones.add(obj.label);
        if (!zoneRackMap.has(obj.label)) {
          zoneRackMap.set(obj.label, new Set());
        }
        break;
        
      case 'aisle':
        if (obj.label) {
          aisles.add(obj.label);
        }
        break;
        
      case 'rack':
        racks.add(obj.label);
        
        // Find which zone this rack belongs to based on spatial positioning
        const rackZone = findParentZone(obj, layoutObjects);
        if (rackZone) {
          if (!zoneRackMap.has(rackZone)) {
            zoneRackMap.set(rackZone, new Set());
          }
          zoneRackMap.get(rackZone).add(obj.label);
        }
        
        // Generate shelf labels for this rack (new shelves built into racks)
        if (obj.levels && obj.levels > 0) {
          const rackShelfSet = new Set();
          for (let level = 1; level <= obj.levels; level++) {
            const shelfLabel = `${obj.label}-L${level}`;
            shelves.add(shelfLabel);
            rackShelfSet.add(shelfLabel);
          }
          rackShelfMap.set(obj.label, rackShelfSet);
        }
        break;
        
      case 'shelf':
        // Handle old separate shelf components
        shelves.add(obj.label);
        
        // Find which rack this shelf belongs to
        const shelfRack = findParentRack(obj, layoutObjects);
        if (shelfRack) {
          if (!rackShelfMap.has(shelfRack)) {
            rackShelfMap.set(shelfRack, new Set());
          }
          rackShelfMap.get(shelfRack).add(obj.label);
        }
        break;
        
      case 'bin':
        bins.add(obj.label);
        break;
    }
  });
  
  // Apply filters to hierarchy
  let filteredZones = Array.from(zones).sort();
  let filteredRacks = Array.from(racks).sort();
  let filteredAisles = Array.from(aisles).sort();
  let filteredShelves = Array.from(shelves).sort();
  let filteredBins = Array.from(bins).sort();
  
  // Filter racks by selected zone
  if (filters.zone && zoneRackMap.has(filters.zone)) {
    filteredRacks = Array.from(zoneRackMap.get(filters.zone)).sort();
  }
  
  // Filter shelves by selected rack
  if (filters.rack && rackShelfMap.has(filters.rack)) {
    filteredShelves = Array.from(rackShelfMap.get(filters.rack)).sort();
  }
  
  const hierarchy = {
    zones: filteredZones,
    racks: filteredRacks,
    aisles: filteredAisles,
    shelves: filteredShelves,
    bins: filteredBins
  };
  
  return hierarchy;
}

// Helper functions (copied from controller)
function findParentZone(rack, layoutObjects) {
  const zones = layoutObjects.filter(obj => obj.type === 'zone');
  
  for (const zone of zones) {
    const rackX = rack.position.x;
    const rackZ = rack.position.z;
    
    const zoneMinX = zone.position.x - zone.size.x / 2;
    const zoneMaxX = zone.position.x + zone.size.x / 2;
    const zoneMinZ = zone.position.z - zone.size.z / 2;
    const zoneMaxZ = zone.position.z + zone.size.z / 2;
    
    if (rackX >= zoneMinX && rackX <= zoneMaxX && 
        rackZ >= zoneMinZ && rackZ <= zoneMaxZ) {
      return zone.label;
    }
  }
  
  return null;
}

function findParentRack(shelf, layoutObjects) {
  const racks = layoutObjects.filter(obj => obj.type === 'rack');
  
  for (const rack of racks) {
    const shelfX = shelf.position.x;
    const shelfZ = shelf.position.z;
    
    const rackMinX = rack.position.x - rack.size.x / 2 - 0.1;
    const rackMaxX = rack.position.x + rack.size.x / 2 + 0.1;
    const rackMinZ = rack.position.z - rack.size.z / 2 - 0.1;
    const rackMaxZ = rack.position.z + rack.size.z / 2 + 0.1;
    
    if (shelfX >= rackMinX && shelfX <= rackMaxX && 
        shelfZ >= rackMinZ && shelfZ <= rackMaxZ) {
      return rack.label;
    }
  }
  
  return null;
}

// Run the test
if (require.main === module) {
  testHierarchyExtraction().catch(console.error);
}

module.exports = { testHierarchyExtraction, sampleBlueprint }; 