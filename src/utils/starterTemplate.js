import { generateId, ELEMENT_TYPES, DEFAULT_SIZES, snapToGrid } from './blueprintConstants';

// Generate a starter template for a warehouse based on dimensions
export const generateStarterTemplate = (warehouseDimensions) => {
  const { width, depth } = warehouseDimensions;
  const elements = [];

  // 1. Create outer walls (perimeter)
  const wallThickness = DEFAULT_SIZES.wall.thickness;
  
  // North wall (top)
  elements.push({
    id: generateId(),
    type: ELEMENT_TYPES.WALL,
    x: 0,
    y: depth - wallThickness,
    length: width,
    thickness: wallThickness,
    label: 'North Wall',
  });

  // South wall (bottom)
  elements.push({
    id: generateId(),
    type: ELEMENT_TYPES.WALL,
    x: 0,
    y: 0,
    length: width,
    thickness: wallThickness,
    label: 'South Wall',
  });

  // East wall (right)
  elements.push({
    id: generateId(),
    type: ELEMENT_TYPES.WALL,
    x: width - wallThickness,
    y: 0,
    length: wallThickness,
    thickness: depth,
    label: 'East Wall',
  });

  // West wall (left)
  elements.push({
    id: generateId(),
    type: ELEMENT_TYPES.WALL,
    x: 0,
    y: 0,
    length: wallThickness,
    thickness: depth,
    label: 'West Wall',
  });

  // 2. Create office area (typically in one corner)
  const officeSize = DEFAULT_SIZES.office;
  const officeMargin = 1; // 1 meter from walls
  
  elements.push({
    id: generateId(),
    type: ELEMENT_TYPES.OFFICE,
    x: officeMargin,
    y: depth - officeSize.depth - officeMargin,
    width: officeSize.width,
    depth: officeSize.depth,
    label: 'Office',
  });

  // 3. Create dock doors (on south wall)
  const doorWidth = DEFAULT_SIZES.door.width;
  const numDoors = Math.min(4, Math.floor(width / (doorWidth * 2))); // Max 4 doors, spaced appropriately
  const doorSpacing = width / (numDoors + 1);

  for (let i = 0; i < numDoors; i++) {
    elements.push({
      id: generateId(),
      type: ELEMENT_TYPES.DOOR,
      x: snapToGrid(doorSpacing * (i + 1) - doorWidth / 2),
      y: 0,
      width: doorWidth,
      label: `Dock Door ${i + 1}`,
    });
  }

  // 4. Create zones for different areas
  const zoneMargin = 2; // 2 meters from walls
  const availableWidth = width - (2 * zoneMargin);
  const availableDepth = depth - (2 * zoneMargin) - officeSize.depth - 1; // Account for office

  // Receiving zone (near dock doors)
  elements.push({
    id: generateId(),
    type: ELEMENT_TYPES.ZONE,
    x: zoneMargin,
    y: zoneMargin,
    width: availableWidth,
    depth: Math.min(8, availableDepth * 0.25), // 25% of available depth or 8m max
    label: 'Receiving Zone',
    color: '#E8F5E8',
  });

  // Storage zone (main area)
  const receivingDepth = Math.min(8, availableDepth * 0.25);
  const storageDepth = availableDepth - receivingDepth - 4; // Leave 4m for shipping
  
  elements.push({
    id: generateId(),
    type: ELEMENT_TYPES.ZONE,
    x: zoneMargin,
    y: zoneMargin + receivingDepth + 1,
    width: availableWidth,
    depth: storageDepth,
    label: 'Storage Zone',
    color: '#E3F2FD',
  });

  // Shipping zone (near back)
  elements.push({
    id: generateId(),
    type: ELEMENT_TYPES.ZONE,
    x: zoneMargin,
    y: zoneMargin + receivingDepth + storageDepth + 2,
    width: availableWidth * 0.7, // Leave space for office
    depth: 4,
    label: 'Shipping Zone',
    color: '#FFF3E0',
  });

  // 5. Create main aisles
  const aisleWidth = DEFAULT_SIZES.aisle.width;
  const mainAisleX = snapToGrid(width / 2 - aisleWidth / 2);
  
  // Main aisle running north-south
  elements.push({
    id: generateId(),
    type: ELEMENT_TYPES.AISLE,
    x: mainAisleX,
    y: zoneMargin + receivingDepth + 1,
    length: aisleWidth,
    width: storageDepth,
    label: 'Main Aisle',
  });

  // Cross aisle in storage zone
  const crossAisleY = snapToGrid(zoneMargin + receivingDepth + storageDepth / 2);
  elements.push({
    id: generateId(),
    type: ELEMENT_TYPES.AISLE,
    x: zoneMargin,
    y: crossAisleY,
    length: availableWidth,
    width: aisleWidth,
    rotation: 0,
    label: 'Cross Aisle',
  });

  // 6. Create sample racks in storage zone
  const rackSize = DEFAULT_SIZES.rack;
  const rackSpacing = 1; // 1 meter between racks
  const racksPerRow = Math.floor((availableWidth / 2 - aisleWidth / 2 - zoneMargin) / (rackSize.width + rackSpacing));
  
  // Left side racks
  for (let i = 0; i < Math.min(3, racksPerRow); i++) {
    elements.push({
      id: generateId(),
      type: ELEMENT_TYPES.RACK,
      x: snapToGrid(zoneMargin + i * (rackSize.width + rackSpacing)),
      y: snapToGrid(zoneMargin + receivingDepth + 2),
      width: rackSize.width,
      depth: rackSize.depth,
      rotation: 0,
      binsPerShelf: rackSize.binsPerShelf,
      levels: 4,
      label: `Rack A${i + 1}`,
    });
  }

  // Right side racks
  const rightRackStartX = mainAisleX + aisleWidth + 1;
  for (let i = 0; i < Math.min(3, racksPerRow); i++) {
    elements.push({
      id: generateId(),
      type: ELEMENT_TYPES.RACK,
      x: snapToGrid(rightRackStartX + i * (rackSize.width + rackSpacing)),
      y: snapToGrid(zoneMargin + receivingDepth + 2),
      width: rackSize.width,
      depth: rackSize.depth,
      rotation: 0,
      binsPerShelf: rackSize.binsPerShelf,
      levels: 4,
      label: `Rack B${i + 1}`,
    });
  }

  return elements;
};

// Generate a minimal template for testing
export const generateMinimalTemplate = (warehouseDimensions) => {
  const { width, depth } = warehouseDimensions;
  const elements = [];

  // Just create a simple zone and a rack for testing
  elements.push({
    id: generateId(),
    type: ELEMENT_TYPES.ZONE,
    x: 2,
    y: 2,
    width: width - 4,
    depth: depth - 4,
    label: 'Storage Zone',
    color: '#E3F2FD',
  });

  elements.push({
    id: generateId(),
    type: ELEMENT_TYPES.RACK,
    x: 5,
    y: 5,
    width: 1.2,
    depth: 0.6,
    rotation: 0,
    binsPerShelf: 4,
    levels: 4,
    label: 'Sample Rack',
  });

  return elements;
}; 