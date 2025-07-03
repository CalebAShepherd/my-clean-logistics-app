// Z-index ordering for blueprint elements (lower renders first, sits "beneath" higher)
export const zForType = {
  zone: 0,
  aisle: 1,
  rack: 2,
  wall: 3,
  door: 4,
  office: 5,
  selection: 10, // Selection handles and gizmos
};

// Element types
export const ELEMENT_TYPES = {
  ZONE: 'zone',
  AISLE: 'aisle', 
  RACK: 'rack',
  WALL: 'wall',
  DOOR: 'door',
  OFFICE: 'office',
};

// Default colors for different element types
export const DEFAULT_COLORS = {
  zone: '#E3F2FD',      // Light blue
  aisle: '#F5F5F5',     // Light gray
  rack: '#FFF3E0',      // Light orange
  wall: '#424242',      // Dark gray
  door: '#4CAF50',      // Green
  office: '#E8F5E8',    // Light green
  selected: '#2196F3',  // Blue for selection
};

// Default sizes in meters
export const DEFAULT_SIZES = {
  zone: { width: 10, depth: 10 },
  aisle: { length: 20, width: 2.5 },
  rack: { width: 1.2, depth: 0.6, binsPerShelf: 4 },
  wall: { length: 5, thickness: 0.2 },
  door: { width: 2 },
  office: { width: 5, depth: 4 },
};

// Grid settings
export const GRID_SIZE = 0.5; // 0.5 meter grid
export const SNAP_THRESHOLD = 0.25; // Snap when within 25cm

// Camera settings
export const CAMERA_SETTINGS = {
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 5.0,
  DEFAULT_ZOOM: 1.0,
  ZOOM_SENSITIVITY: 0.002,
  PAN_SENSITIVITY: 1,
};

// Selection handle size
export const SELECTION_HANDLE_SIZE = 12; // pixels

// Helper function to snap value to grid
export const snapToGrid = (value, gridSize = GRID_SIZE) => {
  return Math.round(value / gridSize) * gridSize;
};

// Helper function to generate unique ID
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to get element style with z-index
export const getElementStyle = (element, isSelected = false) => {
  const baseStyle = {
    position: 'absolute',
    zIndex: zForType[element.type] || 0,
    borderWidth: isSelected ? 2 : 1,
    borderColor: isSelected ? DEFAULT_COLORS.selected : '#CCCCCC',
  };

  return baseStyle;
}; 