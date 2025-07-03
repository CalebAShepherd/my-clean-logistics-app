import { ELEMENT_TYPES } from './blueprintConstants';

// Convert a single blueprint element to a 3D object
export const elementToMesh = (element, blueprintCenterX = 0, blueprintCenterZ = 0) => {
  const baseId = element.id || `${element.type}-${Date.now()}`;
  
  // Get element dimensions for center point calculation
  let elementWidth = 0, elementDepth = 0;
  switch (element.type) {
    case ELEMENT_TYPES.ZONE:
      elementWidth = element.width || 10;
      elementDepth = element.depth || 10;
      break;
    case ELEMENT_TYPES.AISLE:
      elementWidth = element.rotation === 90 ? (element.width || 2.5) : (element.length || 10);
      elementDepth = element.rotation === 90 ? (element.length || 10) : (element.width || 2.5);
      break;
    case ELEMENT_TYPES.RACK:
      elementWidth = element.width || 1.2;
      elementDepth = element.depth || 0.6;
      break;
    case ELEMENT_TYPES.WALL:
      elementWidth = element.rotation === 90 ? (element.thickness || 0.2) : (element.length || 5);
      elementDepth = element.rotation === 90 ? (element.length || 5) : (element.thickness || 0.2);
      break;
    case ELEMENT_TYPES.DOOR:
      elementWidth = element.width || 2;
      elementDepth = 0.1;
      break;
    case ELEMENT_TYPES.OFFICE:
      elementWidth = element.width || 5;
      elementDepth = element.depth || 4;
      break;
    default:
      elementWidth = 1;
      elementDepth = 1;
  }
  
  // Coordinate conversion with proper centering:
  // 2D: element.x, element.y (in meters) - positioned by TOP-LEFT CORNER
  // 3D: position.x, position.z - positioned by CENTER POINT
  // 
  // Step 1: Convert from corner to center positioning
  const centerX = (element.x || 0) + elementWidth / 2;
  const centerZ = (element.y || 0) + elementDepth / 2; // 2D Y becomes 3D Z
  
  // Step 2: Apply blueprint centering offset
  const worldX = centerX - blueprintCenterX;
  const worldZ = centerZ - blueprintCenterZ;
  
  console.log(`🔄 Converting ${element.type} from 2D(${element.x}, ${element.y}) → center(${centerX}, ${centerZ}) → 3D(${worldX}, ?, ${worldZ}) [size: ${elementWidth}x${elementDepth}]`);
  
  switch (element.type) {
    case ELEMENT_TYPES.ZONE:
      const zoneObj = {
        id: `zone-${baseId}`,
        type: 'zone',
        position: { x: worldX, y: 0.001, z: worldZ }, // Layer 0: Bottom-most floor markers
        size: { x: element.width || 10, y: 0.002, z: element.depth || 10 },
        color: element.color ? parseInt(element.color.replace('#', '0x')) : 0x2196F3,
        label: element.label || 'Zone',
        opacity: 0.25, // Very transparent for bottom layer
        metadata: {
          originalElement: element,
          isZone: true,
          isAreaMarker: true, // Mark as massless area marker
          massless: true,
          layer: 0, // Bottom layer
          source: '2d-blueprint',
        },
      };
      console.log(`  ✅ Zone positioned at (${zoneObj.position.x}, ${zoneObj.position.y}, ${zoneObj.position.z}) with size (${zoneObj.size.x}, ${zoneObj.size.y}, ${zoneObj.size.z})`);
      return zoneObj;

    case ELEMENT_TYPES.AISLE:
      // Aisles are represented as floor markings
      const aisleLength = element.length || 10;
      const aisleWidth = element.width || 2.5;
      const rotation = element.rotation || 0;
      
      const aisleObj = {
        id: `aisle-${baseId}`,
        type: 'aisle',
        position: { x: worldX, y: 0.01, z: worldZ }, // Layer 1: Above zones
        size: { 
          x: rotation === 90 ? aisleWidth : aisleLength,
          y: 0.02, 
          z: rotation === 90 ? aisleLength : aisleWidth
        },
        color: 0xFFEB3B, // Yellow for visibility
        label: element.label || 'Aisle',
        opacity: 0.35, // Semi-transparent area marker
        metadata: {
          originalElement: element,
          isAisle: true,
          isAreaMarker: true, // Mark as massless area marker
          massless: true,
          layer: 1, // Second layer
          source: '2d-blueprint',
        },
      };
      console.log(`  ✅ Aisle positioned at (${aisleObj.position.x}, ${aisleObj.position.y}, ${aisleObj.position.z}) with size (${aisleObj.size.x}, ${aisleObj.size.y}, ${aisleObj.size.z})`);
      return aisleObj;

    case ELEMENT_TYPES.RACK:
      // Enhanced rack conversion with proper 3D positioning
      const rackHeight = 3.0; // Standard rack height
      const rackObj = {
        id: `rack-${baseId}`,
        type: 'rack',
        position: { x: worldX, y: 0.05 + rackHeight / 2, z: worldZ }, // Layer 2: Above floor markers
        size: { x: element.width || 1.2, y: rackHeight, z: element.depth || 0.6 },
        color: 0x8B4513, // Brown for racks
        label: element.label || 'Rack',
        levels: element.levels || 4,
        columns: element.binsPerShelf || 3,
        shelfThickness: 0.05,
        rotation: element.rotation || 0,
        metadata: {
          capacity: (element.levels || 4) * (element.binsPerShelf || 3),
          binsPerShelf: element.binsPerShelf || 3,
          originalElement: element,
          layer: 2, // Physical objects layer
          source: '2d-blueprint',
        },
      };
      console.log(`  ✅ Rack positioned at (${rackObj.position.x}, ${rackObj.position.y}, ${rackObj.position.z}) with size (${rackObj.size.x}, ${rackObj.size.y}, ${rackObj.size.z})`);
      return rackObj;

    case ELEMENT_TYPES.WALL:
      const wallLength = element.length || 5;
      const wallThickness = element.thickness || 0.2;
      const wallRotation = element.rotation || 0;
      const wallHeight = 3.0; // Standard wall height
      
      const wallObj = {
        id: `wall-${baseId}`,
        type: 'wall',
        position: { x: worldX, y: 0.05 + wallHeight / 2, z: worldZ }, // Layer 2: Above floor markers
        size: { 
          x: wallRotation === 90 ? wallThickness : wallLength,
          y: wallHeight, 
          z: wallRotation === 90 ? wallLength : wallThickness
        },
        color: 0x424242, // Dark gray
        label: element.label || 'Wall',
        metadata: {
          originalElement: element,
          isWall: true,
          isFixed: true, // Mark as completely fixed architectural element
          untappable: true, // Cannot be selected
          immovable: true, // Cannot be moved
          layer: 2, // Physical objects layer
          source: '2d-blueprint',
        },
      };
      console.log(`  ✅ Wall positioned at (${wallObj.position.x}, ${wallObj.position.y}, ${wallObj.position.z}) with size (${wallObj.size.x}, ${wallObj.size.y}, ${wallObj.size.z})`);
      return wallObj;

    case ELEMENT_TYPES.DOOR:
      const doorObj = {
        id: `door-${baseId}`,
        type: 'door',
        position: { x: worldX, y: 0.05 + 1.25, z: worldZ }, // Layer 2: Above floor markers
        size: { x: element.width || 2, y: 2.5, z: 0.1 },
        color: 0x4CAF50, // Green
        label: element.label || 'Door',
        metadata: {
          originalElement: element,
          isDoor: true,
          layer: 2, // Physical objects layer
          source: '2d-blueprint',
        },
      };
      console.log(`  ✅ Door positioned at (${doorObj.position.x}, ${doorObj.position.y}, ${doorObj.position.z}) with size (${doorObj.size.x}, ${doorObj.size.y}, ${doorObj.size.z})`);
      return doorObj;

    case ELEMENT_TYPES.OFFICE:
      const officeHeight = 3.0;
      const officeObj = {
        id: `office-${baseId}`,
        type: 'office',
        position: { x: worldX, y: 0.05 + officeHeight / 2, z: worldZ }, // Layer 2: Above floor markers
        size: { x: element.width || 5, y: officeHeight, z: element.depth || 4 },
        color: 0xE8F5E8, // Light green
        label: element.label || 'Office',
        metadata: {
          originalElement: element,
          isOffice: true,
          layer: 2, // Physical objects layer
          source: '2d-blueprint',
        },
      };
      console.log(`  ✅ Office positioned at (${officeObj.position.x}, ${officeObj.position.y}, ${officeObj.position.z}) with size (${officeObj.size.x}, ${officeObj.size.y}, ${officeObj.size.z})`);
      return officeObj;

    default:
      console.warn(`Unknown element type: ${element.type}`);
      return null;
  }
};

// Convert an entire blueprint to 3D objects
export const blueprintTo3D = (blueprint) => {
  if (!blueprint || !blueprint.elements) {
    console.warn('Invalid blueprint provided to blueprintTo3D');
    return [];
  }

  console.log('Converting 2D blueprint to 3D:', {
    elementsCount: blueprint.elements.length,
    dimensions: blueprint.dimensions
  });

  // Calculate blueprint center offset to position elements correctly in 3D world
  const blueprintCenterX = (blueprint.dimensions?.width || 50) / 2;
  const blueprintCenterZ = (blueprint.dimensions?.depth || 30) / 2;
  
  console.log(`📐 Blueprint dimensions: ${blueprint.dimensions?.width || 50}m x ${blueprint.dimensions?.depth || 30}m`);
  console.log(`🎯 Blueprint center offset: (${blueprintCenterX}, ${blueprintCenterZ})`);

  const objects = [];
  
  // Convert each element
  blueprint.elements.forEach((element, index) => {
    try {
      const mesh = elementToMesh(element, blueprintCenterX, blueprintCenterZ);
      if (mesh) {
        objects.push(mesh);
        console.log(`Converted ${element.type} from 2D(${element.x}, ${element.y}) to 3D(${mesh.position.x}, ${mesh.position.z}) [offset applied]`);
      }
    } catch (error) {
      console.error(`Error converting element ${index}:`, error, element);
    }
  });

  // Add blueprint metadata to objects
  if (blueprint.dimensions) {
    objects.forEach(obj => {
      obj.metadata = {
        ...obj.metadata,
        blueprintDimensions: blueprint.dimensions,
        centerOffset: { x: blueprintCenterX, z: blueprintCenterZ },
      };
    });
  }

  console.log(`Successfully converted ${objects.length} elements from 2D blueprint to 3D objects`);
  return objects;
};

// Helper function to calculate bounds of all elements
export const calculateBlueprintBounds = (elements) => {
  if (!elements || elements.length === 0) {
    return { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  elements.forEach(element => {
    const x = element.x || 0;
    const y = element.y || 0; // This is Z in 3D
    
    // Calculate element bounds based on type
    let width = 0;
    let depth = 0;
    
    switch (element.type) {
      case ELEMENT_TYPES.ZONE:
        width = element.width || 0;
        depth = element.depth || 0;
        break;
      case ELEMENT_TYPES.AISLE:
        const rotation = element.rotation || 0;
        width = rotation === 90 ? element.width : element.length;
        depth = rotation === 90 ? element.length : element.width;
        break;
      case ELEMENT_TYPES.RACK:
        width = element.width || 0;
        depth = element.depth || 0;
        break;
      case ELEMENT_TYPES.WALL:
        const wallRotation = element.rotation || 0;
        width = wallRotation === 90 ? element.thickness : element.length;
        depth = wallRotation === 90 ? element.length : element.thickness;
        break;
      case ELEMENT_TYPES.DOOR:
        width = element.width || 0;
        depth = 0.1;
        break;
      case ELEMENT_TYPES.OFFICE:
        width = element.width || 0;
        depth = element.depth || 0;
        break;
    }

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + width);
    minZ = Math.min(minZ, y);
    maxZ = Math.max(maxZ, y + depth);
  });

  return { minX, maxX, minZ, maxZ };
};

// Helper function to get camera position to fit blueprint
export const getCameraPositionForBlueprint = (elements) => {
  const bounds = calculateBlueprintBounds(elements);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  
  // Calculate camera distance to fit the blueprint
  const maxDimension = Math.max(width, depth);
  const cameraDistance = maxDimension * 1.5; // 1.5x for padding
  
  return {
    x: centerX,
    y: cameraDistance * 0.8, // Elevated view
    z: centerZ + cameraDistance * 0.6,
    lookAt: { x: centerX, y: 0, z: centerZ },
  };
};

// Reverse conversion: Convert 3D objects back to 2D blueprint elements
export const meshesToBlueprint = (objects) => {
  if (!objects || !Array.isArray(objects)) {
    console.warn('Invalid objects provided to meshesToBlueprint');
    return { elements: [], dimensions: { width: 50, depth: 30 } };
  }

  const elements = [];
  let bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };

  // First pass: calculate bounds in 3D space
  objects.forEach(obj => {
    if (!obj.metadata?.source || obj.metadata.source === '2d-blueprint' || 
        ['zone', 'aisle', 'rack', 'wall', 'door', 'office'].includes(obj.type)) {
      
      const objMinX = obj.position.x - obj.size.x / 2;
      const objMaxX = obj.position.x + obj.size.x / 2;
      const objMinZ = obj.position.z - obj.size.z / 2;
      const objMaxZ = obj.position.z + obj.size.z / 2;
      
      bounds.minX = Math.min(bounds.minX, objMinX);
      bounds.maxX = Math.max(bounds.maxX, objMaxX);
      bounds.minZ = Math.min(bounds.minZ, objMinZ);
      bounds.maxZ = Math.max(bounds.maxZ, objMaxZ);
    }
  });

  // Calculate blueprint dimensions and center offset
  const blueprintWidth = Math.max(50, Math.ceil(bounds.maxX - bounds.minX + 10)); // Add padding
  const blueprintDepth = Math.max(30, Math.ceil(bounds.maxZ - bounds.minZ + 10));
  const blueprintCenterX = blueprintWidth / 2;
  const blueprintCenterZ = blueprintDepth / 2;

  console.log(`🔄 Converting 3D objects back to 2D blueprint`);
  console.log(`📐 Calculated blueprint dimensions: ${blueprintWidth}m x ${blueprintDepth}m`);
  console.log(`🎯 Blueprint center offset: (${blueprintCenterX}, ${blueprintCenterZ})`);

  // Second pass: convert objects to 2D elements with proper offset
  objects.forEach(obj => {
    if (!obj.metadata?.source || obj.metadata.source === '2d-blueprint' || 
        ['zone', 'aisle', 'rack', 'wall', 'door', 'office'].includes(obj.type)) {
      
      try {
        const element = meshToElement(obj, blueprintCenterX, blueprintCenterZ);
        if (element) {
          elements.push(element);
          console.log(`  ✅ Converted ${obj.type} from 3D(${obj.position.x}, ${obj.position.z}) to 2D(${element.x}, ${element.y})`);
        }
      } catch (error) {
        console.error('Error converting 3D object to 2D element:', error, obj);
      }
    }
  });

  const dimensions = { width: blueprintWidth, depth: blueprintDepth };
  console.log(`Successfully converted ${elements.length} 3D objects to 2D blueprint elements`);

  return { elements, dimensions };
};

// Convert a single 3D mesh back to a 2D blueprint element
const meshToElement = (mesh, blueprintCenterX = 0, blueprintCenterZ = 0) => {
  // Reverse coordinate conversion: 3D center point back to 2D corner position
  // Step 1: Convert from 3D world space to 2D center point
  const centerX = mesh.position.x + blueprintCenterX;
  const centerZ = mesh.position.z + blueprintCenterZ; // 3D Z becomes 2D Y
  
  // Step 2: Convert from center point to corner positioning (2D uses top-left corner)
  const blueprint2DX = centerX - mesh.size.x / 2;
  const blueprint2DY = centerZ - mesh.size.z / 2;
  
  console.log(`🔄 Reverse converting ${mesh.type} from 3D(${mesh.position.x}, ?, ${mesh.position.z}) → center(${centerX}, ${centerZ}) → 2D(${blueprint2DX}, ${blueprint2DY}) [size: ${mesh.size.x}x${mesh.size.z}]`);
  
  const baseElement = {
    id: mesh.id,
    type: mesh.type,
    x: Math.max(0, blueprint2DX), // Ensure non-negative coordinates
    y: Math.max(0, blueprint2DY), // Ensure non-negative coordinates
    label: mesh.label,
  };

  switch (mesh.type) {
    case 'zone':
      return {
        ...baseElement,
        width: mesh.size.x,
        depth: mesh.size.z,
        color: `#${mesh.color.toString(16).padStart(6, '0')}`,
      };

    case 'aisle':
      // Determine if rotated based on dimensions
      const isRotated = mesh.size.x < mesh.size.z;
      return {
        ...baseElement,
        length: isRotated ? mesh.size.z : mesh.size.x,
        width: isRotated ? mesh.size.x : mesh.size.z,
        rotation: isRotated ? 90 : 0,
      };

    case 'rack':
      return {
        ...baseElement,
        width: mesh.size.x,
        depth: mesh.size.z,
        levels: mesh.levels || 4,
        binsPerShelf: mesh.columns || mesh.metadata?.binsPerShelf || 3,
        rotation: mesh.rotation || 0,
      };

    case 'wall':
      const wallIsRotated = mesh.size.x < mesh.size.z;
      return {
        ...baseElement,
        length: wallIsRotated ? mesh.size.z : mesh.size.x,
        thickness: wallIsRotated ? mesh.size.x : mesh.size.z,
        rotation: wallIsRotated ? 90 : 0,
      };

    case 'door':
      return {
        ...baseElement,
        width: mesh.size.x,
      };

    case 'office':
      return {
        ...baseElement,
        width: mesh.size.x,
        depth: mesh.size.z,
      };

    default:
      console.warn(`Unknown mesh type for conversion: ${mesh.type}`);
      return null;
  }
};

// Test function to validate 2D to 3D conversion
export const test2DTo3DConversion = () => {
  console.log('🧪 Testing 2D to 3D conversion with coordinate system fix...');
  
  // Sample 2D blueprint elements
  const testBlueprint = {
    dimensions: { width: 20, depth: 15 },
    elements: [
      {
        id: 'test-zone-1',
        type: 'zone',
        x: 2,
        y: 2,
        width: 8,
        depth: 6,
        label: 'Storage Zone A',
        color: '#E3F2FD'
      },
      {
        id: 'test-rack-1', 
        type: 'rack',
        x: 10, // Center of blueprint X (should become 0 in 3D)
        y: 7.5, // Center of blueprint Z (should become 0 in 3D)
        width: 1.2,
        depth: 0.6,
        levels: 4,
        binsPerShelf: 3,
        label: 'Rack A1 (Center)'
      },
      {
        id: 'test-wall-1',
        type: 'wall',
        x: 0, // Left edge (should become -10 in 3D)
        y: 0, // Top edge (should become -7.5 in 3D)
        length: 20,
        thickness: 0.2,
        rotation: 0,
        label: 'North Wall'
      },
      {
        id: 'test-aisle-1',
        type: 'aisle',
        x: 6,
        y: 3,
        length: 8,
        width: 2.5,
        rotation: 0,
        label: 'Main Aisle'
      }
    ]
  };

  console.log('📋 Original 2D Blueprint:');
  console.log(`  Dimensions: ${testBlueprint.dimensions.width}m x ${testBlueprint.dimensions.depth}m`);
  console.log(`  Center should be at: (${testBlueprint.dimensions.width/2}, ${testBlueprint.dimensions.depth/2})`);
  testBlueprint.elements.forEach(el => {
    console.log(`  ${el.type} "${el.label}" at 2D(${el.x}, ${el.y})`);
  });

  // Convert to 3D
  const objects3D = blueprintTo3D(testBlueprint);
  
  console.log('✅ 3D Conversion Results:');
  console.log(`📦 Generated ${objects3D.length} 3D objects from ${testBlueprint.elements.length} 2D elements`);
  
  objects3D.forEach((obj, index) => {
    const originalEl = testBlueprint.elements.find(el => el.id === obj.id);
    const expectedX = (originalEl?.x || 0) - testBlueprint.dimensions.width / 2;
    const expectedZ = (originalEl?.y || 0) - testBlueprint.dimensions.depth / 2;
    const matches = Math.abs(obj.position.x - expectedX) < 0.001 && Math.abs(obj.position.z - expectedZ) < 0.001;
    console.log(`  ${index + 1}. ${obj.type} "${obj.label}" at 3D(${obj.position.x}, ${obj.position.z}) ${matches ? '✅' : '❌'}`);
    if (!matches) {
      console.log(`      Expected: (${expectedX}, ${expectedZ})`);
    }
  });

  // Test reverse conversion
  const blueprint2D = meshesToBlueprint(objects3D);
  console.log('🔄 Reverse Conversion Results:');
  console.log(`📐 Generated ${blueprint2D.elements.length} 2D elements from ${objects3D.length} 3D objects`);
  console.log(`📏 Blueprint dimensions: ${blueprint2D.dimensions.width}m x ${blueprint2D.dimensions.depth}m`);

  // Validate round-trip accuracy
  let allMatched = true;
  blueprint2D.elements.forEach(convertedEl => {
    const originalEl = testBlueprint.elements.find(el => el.id === convertedEl.id);
    if (originalEl) {
      const xMatches = Math.abs(convertedEl.x - originalEl.x) < 0.1;
      const yMatches = Math.abs(convertedEl.y - originalEl.y) < 0.1;
      const matches = xMatches && yMatches;
      console.log(`  ${convertedEl.type} "${convertedEl.label}": 2D(${originalEl.x}, ${originalEl.y}) → 3D → 2D(${convertedEl.x}, ${convertedEl.y}) ${matches ? '✅' : '❌'}`);
      if (!matches) allMatched = false;
    }
  });

  console.log(allMatched ? '🎉 2D to 3D conversion test PASSED! Coordinate system is working correctly!' : '⚠️ 2D to 3D conversion test had some issues.');
  
  return { original: testBlueprint, converted3D: objects3D, convertedBack2D: blueprint2D, testPassed: allMatched };
};

// Test area markers specifically
export const testAreaMarkers = () => {
  console.log('🎯 Testing Area Markers (Massless Zones & Aisles)...');
  
  const testBlueprint = {
    dimensions: { width: 30, depth: 20 },
    elements: [
      {
        id: 'zone-storage',
        type: 'zone',
        x: 5,
        y: 5,
        width: 15,
        depth: 10,
        label: 'Storage Zone',
        color: '#2196F3'
      },
      {
        id: 'aisle-main',
        type: 'aisle',
        x: 10,
        y: 2,
        length: 16,
        width: 3,
        rotation: 0,
        label: 'Main Aisle'
      },
      {
        id: 'rack-normal',
        type: 'rack',
        x: 8,
        y: 8,
        width: 1.2,
        depth: 0.6,
        levels: 4,
        label: 'Normal Rack'
      }
    ]
  };

  const objects3D = blueprintTo3D(testBlueprint);
  
  console.log('🔍 Layered Object Properties:');
  objects3D.forEach(obj => {
    const isAreaMarker = obj.metadata?.isAreaMarker;
    const isMassless = obj.metadata?.massless;
    const isFixed = obj.metadata?.isFixed;
    const isUntappable = obj.metadata?.untappable;
    const layer = obj.metadata?.layer;
    const opacity = obj.opacity;
    const height = obj.size.y;
    
    console.log(`  ${obj.type} "${obj.label}": 
      🏗️  Layer: ${layer !== undefined ? layer : 'undefined'}
      🏷️  Area Marker: ${isAreaMarker ? '✅' : '❌'}
      ⚖️  Massless: ${isMassless ? '✅' : '❌'}
      🔒 Fixed: ${isFixed ? '✅' : '❌'}
      🚫 Untappable: ${isUntappable ? '✅' : '❌'}
      👻 Opacity: ${opacity || 'solid'}
      📏 Height: ${height}m
      📍 Y Position: ${obj.position.y}m`);
  });
  
  console.log('\n📋 Layer System:');
  console.log('  Layer 0: Zones (bottom, y~0.001) - tappable, immovable');
  console.log('  Layer 1: Aisles (middle, y~0.01) - tappable, immovable'); 
  console.log('  Layer 2: Physical Objects (top, y≥0.05) - interactive');
  console.log('  🔒 Walls: Fixed architectural elements - untappable, immovable');

  return objects3D;
}; 