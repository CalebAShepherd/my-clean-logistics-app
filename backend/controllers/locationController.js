const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

/**
 * Emit a bin creation event (placeholder for real-time events)
 */
function emitBinCreated(locationData) {
  // TODO: Implement real-time event emission (WebSocket/Socket.io)
  console.log('🔔 New bin created:', {
    id: locationData.id,
    zone: locationData.zone,
    aisle: locationData.aisle,
    shelf: locationData.shelf,
    bin: locationData.bin,
    x: locationData.x,
    y: locationData.y,
    warehouseId: locationData.warehouseId
  });
  
  // For now, just log the event. In a full implementation, this would:
  // 1. Emit via WebSocket to connected 3D view clients
  // 2. Include 3D position calculations for immediate mesh spawning
  // 3. Include bin metadata (size, color, etc.)
}

/**
 * List all locations, optionally filtered by warehouseId
 */
exports.getLocations = async (req, res) => {
  try {
    const { warehouseId } = req.query;
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    const locations = await prisma.location.findMany({ where });
    return res.json(locations);
  } catch (err) {
    console.error('Error fetching locations:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single location by ID
 */
exports.getLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const location = await prisma.location.findUnique({ where: { id } });
    if (!location) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(location);
  } catch (err) {
    console.error('Error fetching location:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new location
 */
exports.createLocation = async (req, res) => {
  try {
    const { warehouseId, zone, aisle, shelf, bin, x, y } = req.body;
    if (!warehouseId) {
      return res.status(400).json({ error: 'warehouseId is required' });
    }

    // Generate a unique ID for the new location
    const id = randomUUID();
    
    // Build data object, x/y optional
    const data = { id, warehouseId };
    if (x !== undefined) data.x = Number(x);
    if (y !== undefined) data.y = Number(y);
    if (zone !== undefined) data.zone = zone;
    if (aisle !== undefined) data.aisle = aisle;
    if (shelf !== undefined) data.shelf = shelf;
    if (bin !== undefined) data.bin = bin;
    
    // Create location record
    let newLocation = await prisma.location.create({ data });
    
    // Auto-place bin coordinates if missing
    if (newLocation.x == null || newLocation.y == null) {
      // Load 2D blueprint and convert to 3D objects
      const blueprint = await prisma.blueprint.findFirst({
        where: { warehouseId },
        orderBy: { updatedAt: 'desc' }
      });
      if (blueprint && blueprint.elements) {
        const { blueprintTo3D } = require('../utils/blueprintTo3D');
        const layoutObjects = blueprintTo3D(blueprint);
        // Find corresponding rack object
        const rackObj = layoutObjects.find(o => o.type === 'rack' && o.label === newLocation.rack);
        if (rackObj) {
          // Parse shelf index from shelf label (expects 'Rack-L#')
          const levelMatch = (newLocation.shelf || '').match(/-L(\d+)$/);
          const shelfIndex = levelMatch ? parseInt(levelMatch[1], 10) - 1 : 0;
          // Count existing bins for this rack/shelf
          const existing = await prisma.location.findMany({
            where: { warehouseId, zone: newLocation.zone, rack: newLocation.rack, shelf: newLocation.shelf },
            select: { id: true }
          });
          const columnIndex = Math.max(0, existing.length - 1);
          // Compute dimensions
          const numColumns = rackObj.columns || 1;
          const numLevels = rackObj.levels || 1;
          const shelfTh = rackObj.shelfThickness || 0;
          const cellWidth = rackObj.size.x / numColumns;
          const cellDepth = rackObj.size.z;
          const levelGap = rackObj.size.y / (numLevels + 1);
          const binHeight = levelGap - shelfTh;
          const shelfY = (shelfIndex + 1) * levelGap;
          // Compute positions
          const posX = rackObj.position.x - rackObj.size.x/2 + cellWidth/2 + columnIndex * cellWidth;
          const posZ = rackObj.position.z;
          // Update DB record
          newLocation = await prisma.location.update({
            where: { id },
            data: { x: posX, y: posZ }
          });
        }
      }
    }

    // Emit bin creation event for real-time 3D view updates
    emitBinCreated(newLocation);
    
    return res.status(201).json(newLocation);
  } catch (err) {
    console.error('Error creating location:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an existing location
 */
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await prisma.location.update({
      where: { id },
      data: updates
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error updating location:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a location
 */
exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete all dependent records first to avoid foreign key constraint errors
    console.log(`🗑  Deleting location ${id} and all dependent records...`);
    
    // Delete warehouse items referencing this location
    const deletedItems = await prisma.warehouseItem.deleteMany({
      where: { locationId: id }
    });
    console.log(`   Deleted ${deletedItems.count} warehouse items`);
    
    // Delete pick tasks referencing this location
    const deletedPickTasks = await prisma.pickTask.deleteMany({
      where: { locationId: id }
    });
    console.log(`   Deleted ${deletedPickTasks.count} pick tasks`);
    
    // Delete put-away tasks referencing this location (both from and to)
    const deletedPutAwayFrom = await prisma.putAwayTask.deleteMany({
      where: { fromLocationId: id }
    });
    const deletedPutAwayTo = await prisma.putAwayTask.deleteMany({
      where: { toLocationId: id }
    });
    console.log(`   Deleted ${deletedPutAwayFrom.count + deletedPutAwayTo.count} put-away tasks`);
    
    // Delete cycle count items and tasks referencing this location
    const deletedCycleCountItems = await prisma.cycleCountItem.deleteMany({
      where: { locationId: id }
    });
    const deletedCycleCountTasks = await prisma.cycleCountTask.deleteMany({
      where: { locationId: id }
    });
    console.log(`   Deleted ${deletedCycleCountItems.count} cycle count items and ${deletedCycleCountTasks.count} cycle count tasks`);
    
    // Delete assets referencing this location
    const deletedAssets = await prisma.asset.deleteMany({
      where: { locationId: id }
    });
    console.log(`   Deleted ${deletedAssets.count} assets`);
    
    // Finally delete the location itself
    await prisma.location.delete({ where: { id } });
    console.log(`   Deleted location ${id}`);
    
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting location:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete all locations and associated warehouse items
 */
exports.deleteAllLocations = async (req, res) => {
  try {
    console.log('🗑  Deleting all warehouse items referencing locations...');
    await prisma.warehouseItem.deleteMany();
    console.log('🗑  Deleting pick tasks...');
    await prisma.pickTask.deleteMany();
    console.log('🗑  Deleting put-away tasks...');
    await prisma.putAwayTask.deleteMany();
    console.log('🗑  Deleting cycle count items...');
    await prisma.cycleCountItem.deleteMany();
    console.log('🗑  Deleting cycle count tasks...');
    await prisma.cycleCountTask.deleteMany();
    console.log('🗑  Deleting assets referencing locations...');
    await prisma.asset.deleteMany({ where: { locationId: { not: null } } });
    console.log('🗑  Deleting all stored bin locations...');
    await prisma.location.deleteMany();
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting all locations:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get location hierarchy for hierarchical pickers
 * Returns unique zones, racks, shelves, and bins with filtering
 * First tries to extract from 3D warehouse layout, falls back to database records
 */
exports.getLocationHierarchy = async (req, res) => {
  try {
    const { warehouseId, zone, rack, shelf } = req.query;
    
    if (!warehouseId) {
      return res.status(400).json({ error: 'warehouseId is required' });
    }

    // Try to get hierarchy from 3D warehouse layout first
    try {
      const layoutHierarchy = await extractHierarchyFromWarehouseLayout(warehouseId, { zone, rack, shelf, aisle: req.query.aisle });
      if (layoutHierarchy && (layoutHierarchy.zones.length > 0 || layoutHierarchy.racks.length > 0)) {
        console.log('📐 Using hierarchy from 3D warehouse layout:', layoutHierarchy);
        return res.json(layoutHierarchy);
      }
    } catch (layoutError) {
      console.warn('⚠️  Could not extract hierarchy from 3D layout, falling back to database:', layoutError.message);
    }

    // Fallback to database records (existing implementation)
    console.log('📊 Falling back to database-based hierarchy');
    
    // Base filter for warehouse
    const baseWhere = { warehouseId };

    // Get unique zones
    const zones = await prisma.location.findMany({
      where: baseWhere,
      select: { zone: true },
      distinct: ['zone'],
      orderBy: { zone: 'asc' }
    });

    // Get unique racks filtered by zone
    const rackWhere = { ...baseWhere };
    if (zone) rackWhere.zone = zone;
    
    const racks = await prisma.location.findMany({
      where: rackWhere,
      select: { rack: true },
      distinct: ['rack'],
      orderBy: { rack: 'asc' }
    });

    // Get unique aisles filtered by zone and rack
    const aisleWhere = { ...baseWhere };
    if (zone) aisleWhere.zone = zone;
    if (rack) aisleWhere.rack = rack;
    
    const aisles = await prisma.location.findMany({
      where: aisleWhere,
      select: { aisle: true },
      distinct: ['aisle'],
      orderBy: { aisle: 'asc' }
    });

    // Get unique shelves filtered by zone, rack, and aisle
    const shelfWhere = { ...baseWhere };
    if (zone) shelfWhere.zone = zone;
    if (rack) shelfWhere.rack = rack;
    if (req.query.aisle) shelfWhere.aisle = req.query.aisle;
    
    const shelves = await prisma.location.findMany({
      where: shelfWhere,
      select: { shelf: true },
      distinct: ['shelf'],
      orderBy: { shelf: 'asc' }
    });

    // Get unique bins filtered by zone, rack, aisle, and shelf
    const binWhere = { ...baseWhere };
    if (zone) binWhere.zone = zone;
    if (rack) binWhere.rack = rack;
    if (req.query.aisle) binWhere.aisle = req.query.aisle;
    if (shelf) binWhere.shelf = shelf;
    
    const bins = await prisma.location.findMany({
      where: binWhere,
      select: { bin: true },
      distinct: ['bin'],
      orderBy: { bin: 'asc' }
    });

    // Filter out null values and format response
    const hierarchy = {
      zones: zones.map(z => z.zone).filter(Boolean),
      racks: racks.map(r => r.rack).filter(Boolean),
      aisles: aisles.map(a => a.aisle).filter(Boolean),
      shelves: shelves.map(s => s.shelf).filter(Boolean),
      bins: bins.map(b => b.bin).filter(Boolean)
    };

    return res.json(hierarchy);
  } catch (err) {
    console.error('Error fetching location hierarchy:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Extract location hierarchy from 3D warehouse layout objects
 * Handles both old shelves (separate components) and new shelves (built into racks)
 */
async function extractHierarchyFromWarehouseLayout(warehouseId, filters = {}) {
  // First, try to get the layout from blueprints
  let layoutObjects = [];
  
  try {
    // Get the most recent blueprint for this warehouse
    const blueprint = await prisma.blueprint.findFirst({
      where: { warehouseId },
      orderBy: { updatedAt: 'desc' }
    });
    
    if (blueprint && blueprint.elements) {
      // Convert 2D blueprint elements to 3D objects for analysis
      const { blueprintTo3D } = require('../utils/blueprintTo3D');
      layoutObjects = blueprintTo3D(blueprint);
      console.log(`📋 Found blueprint with ${layoutObjects.length} 3D objects`);
    }
  } catch (blueprintError) {
    console.warn('Could not load blueprint:', blueprintError.message);
  }
  
  // If no blueprint found, try to load from AsyncStorage-style saved layouts
  // Note: In a real implementation, you might store layouts in the database
  // For now, we'll work with what we have from blueprints
  
  if (layoutObjects.length === 0) {
    throw new Error('No warehouse layout found for hierarchy extraction');
  }
  
  // Extract zones, racks, and shelves from layout objects
  const zones = new Set();
  const racks = new Set();
  const aisles = new Set();
  const shelves = new Set();
  const bins = new Set();
  
  // Spatial relationship tracking
  const zoneRackMap = new Map(); // zone -> Set of racks
  const rackShelfMap = new Map(); // rack -> Set of shelves
  const aisleMap = new Map(); // For optional aisle tracking
  
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
  
  // Filter by other criteria as needed
  // Note: Aisle filtering is optional and complex with spatial relationships
  
  const hierarchy = {
    zones: filteredZones,
    racks: filteredRacks,
    aisles: filteredAisles,
    shelves: filteredShelves,
    bins: filteredBins
  };
  
  console.log('🏗️  Extracted hierarchy from 3D layout:', {
    zones: hierarchy.zones.length,
    racks: hierarchy.racks.length,
    aisles: hierarchy.aisles.length,
    shelves: hierarchy.shelves.length,
    bins: hierarchy.bins.length
  });
  
  return hierarchy;
}

/**
 * Find which zone a rack belongs to based on spatial positioning
 */
function findParentZone(rack, layoutObjects) {
  const zones = layoutObjects.filter(obj => obj.type === 'zone');
  
  for (const zone of zones) {
    // Check if rack is spatially within the zone bounds
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

/**
 * Find which rack a shelf belongs to based on spatial positioning
 */
function findParentRack(shelf, layoutObjects) {
  const racks = layoutObjects.filter(obj => obj.type === 'rack');
  
  for (const rack of racks) {
    // Check if shelf is spatially within or very close to the rack bounds
    const shelfX = shelf.position.x;
    const shelfZ = shelf.position.z;
    
    const rackMinX = rack.position.x - rack.size.x / 2 - 0.1; // Small tolerance
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