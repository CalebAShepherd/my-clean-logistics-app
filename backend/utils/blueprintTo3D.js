// Backend utility to convert 2D blueprint elements to 3D objects
// Simplified version for hierarchy extraction (no Three.js dependencies)

const ELEMENT_TYPES = {
  ZONE: 'zone',
  AISLE: 'aisle',
  RACK: 'rack',
  WALL: 'wall',
  DOOR: 'door',
  OFFICE: 'office',
  SHELF: 'shelf'
};

/**
 * Convert 2D blueprint to 3D objects for hierarchy analysis
 * @param {Object} blueprint - Blueprint object with elements array
 * @returns {Array} Array of 3D objects
 */
function blueprintTo3D(blueprint) {
  if (!blueprint || !blueprint.elements) {
    console.warn('Invalid blueprint provided to blueprintTo3D');
    return [];
  }

  const elements = blueprint.elements;
  const dimensions = blueprint.dimensions || { width: 50, depth: 30 };
  
  // Calculate blueprint center for coordinate conversion
  const blueprintCenterX = dimensions.width / 2;
  const blueprintCenterZ = dimensions.depth / 2;
  
  console.log(`🔄 Converting ${elements.length} 2D blueprint elements to 3D objects`);
  console.log(`📐 Blueprint dimensions: ${dimensions.width}m x ${dimensions.depth}m`);
  console.log(`🎯 Blueprint center: (${blueprintCenterX}, ${blueprintCenterZ})`);

  const objects3D = [];

  elements.forEach(element => {
    try {
      const obj3D = elementToMesh(element, blueprintCenterX, blueprintCenterZ);
      if (obj3D) {
        objects3D.push(obj3D);
        console.log(`  ✅ Converted ${element.type} "${element.label || 'unlabeled'}" to 3D`);
      }
    } catch (error) {
      console.error('Error converting element to 3D:', error, element);
    }
  });

  console.log(`Successfully converted ${objects3D.length} elements to 3D objects`);
  return objects3D;
}

/**
 * Convert a single 2D element to 3D object
 */
function elementToMesh(element, blueprintCenterX = 0, blueprintCenterZ = 0) {
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
    case ELEMENT_TYPES.SHELF:
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

  // Create 3D object based on element type
  switch (element.type) {
    case ELEMENT_TYPES.ZONE:
      return {
        id: `zone-${baseId}`,
        type: 'zone',
        position: { x: worldX, y: 0.001, z: worldZ }, // Layer 0: Ground level
        size: { x: element.width || 10, y: 0.002, z: element.depth || 10 },
        color: 0xFFFF00, // Yellow for zones
        label: element.label || 'Zone',
        opacity: 0.25,
        metadata: {
          originalElement: element,
          isZone: true,
          isAreaMarker: true,
          massless: true,
          layer: 0,
          source: '2d-blueprint',
        },
      };

    case ELEMENT_TYPES.AISLE:
      const aisleLength = element.length || 10;
      const aisleWidth = element.width || 2.5;
      const rotation = element.rotation || 0;
      
      return {
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
        opacity: 0.35,
        metadata: {
          originalElement: element,
          isAisle: true,
          isAreaMarker: true,
          massless: true,
          layer: 1,
          source: '2d-blueprint',
        },
      };

    case ELEMENT_TYPES.RACK:
      const rackHeight = 3.0; // Standard rack height
      return {
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
          layer: 2,
          source: '2d-blueprint',
        },
      };

    case ELEMENT_TYPES.SHELF:
      // Handle old separate shelf components
      const shelfHeight = 0.05; // Thin shelf
      return {
        id: `shelf-${baseId}`,
        type: 'shelf',
        position: { x: worldX, y: 0.05 + shelfHeight / 2, z: worldZ },
        size: { x: element.width || 1.2, y: shelfHeight, z: element.depth || 0.6 },
        color: 0xDEB887, // Burlywood for shelves
        label: element.label || 'Shelf',
        metadata: {
          originalElement: element,
          layer: 2,
          source: '2d-blueprint',
        },
      };

    case ELEMENT_TYPES.WALL:
      const wallHeight = 4.0;
      const wallRotation = element.rotation || 0;
      return {
        id: `wall-${baseId}`,
        type: 'wall',
        position: { x: worldX, y: wallHeight / 2, z: worldZ },
        size: { 
          x: wallRotation === 90 ? (element.thickness || 0.2) : (element.length || 5),
          y: wallHeight,
          z: wallRotation === 90 ? (element.length || 5) : (element.thickness || 0.2)
        },
        color: 0x808080, // Gray for walls
        label: element.label || 'Wall',
        metadata: {
          originalElement: element,
          isWall: true,
          isFixed: true,
          untappable: true,
          source: '2d-blueprint',
        },
      };

    case ELEMENT_TYPES.DOOR:
      return {
        id: `door-${baseId}`,
        type: 'door',
        position: { x: worldX, y: 1.0, z: worldZ },
        size: { x: element.width || 2, y: 2.0, z: 0.1 },
        color: 0x4CAF50, // Green for doors
        label: element.label || 'Door',
        metadata: {
          originalElement: element,
          isDoor: true,
          source: '2d-blueprint',
        },
      };

    case ELEMENT_TYPES.OFFICE:
      return {
        id: `office-${baseId}`,
        type: 'office',
        position: { x: worldX, y: 1.5, z: worldZ },
        size: { x: element.width || 5, y: 3.0, z: element.depth || 4 },
        color: 0xE8F5E8, // Light green for office
        label: element.label || 'Office',
        metadata: {
          originalElement: element,
          isOffice: true,
          source: '2d-blueprint',
        },
      };

    default:
      console.warn(`Unknown element type for conversion: ${element.type}`);
      return null;
  }
}

module.exports = {
  blueprintTo3D,
  elementToMesh,
  ELEMENT_TYPES
}; 