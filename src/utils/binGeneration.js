/**
 * Bin Auto-Generation Utilities
 * 
 * This module provides utilities for converting locations to 3D bin meshes
 * and will support future bulk bin generation features.
 */

/**
 * Simple debounce utility
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Default bin configuration
 */
export const BIN_CONFIG = {
  size: { x: 1, y: 1, z: 1 },
  color: 0x8bc34a, // Green color for bins
  defaultLabel: 'Storage Bin',
};

/**
 * Convert a location record to a 3D bin mesh object
 * @param {Object} location - Location record from database
 * @param {Object} options - Optional configuration overrides
 * @returns {Object} 3D mesh object for Warehouse3DView
 */
export const locationToBinMesh = (location, options = {}) => {
  const config = { ...BIN_CONFIG, ...options };
  
  const posX = location.x != null ? location.x : 0;
  const posZ = location.y != null ? location.y : 0;
  
  return {
    id: `bin-${location.id}`,
    type: 'bin',
    position: { 
      x: posX,
      y: config.size.y / 2, // Place bin on ground (center Y at half height)
      z: posZ  // Map location Y coordinate to world Z coordinate
    },
    size: config.size,
    color: config.color,
    label: location.bin || `${config.defaultLabel}-${location.id.slice(-4)}`,
    metadata: {
      locationId: location.id,
      zone: location.zone,
      rack: location.rack,
      aisle: location.aisle,
      shelf: location.shelf,
      bin: location.bin,
      warehouseId: location.warehouseId,
      createdAt: new Date().toISOString(),
      ...config.metadata // Merge any additional metadata from options
    }
  };
};

/**
 * Generate multiple bins from a list of locations
 * @param {Array} locations - Array of location records
 * @param {Object} options - Optional configuration overrides
 * @returns {Array} Array of 3D mesh objects
 */
export const locationsToBinMeshes = (locations, options = {}) => {
  return locations.map(location => locationToBinMesh(location, options));
};

/**
 * Calculate optimal camera position for viewing a set of bins
 * @param {Array} binMeshes - Array of bin mesh objects
 * @returns {Object} Camera position and target
 */
export const calculateOptimalCameraView = (binMeshes) => {
  if (!binMeshes || binMeshes.length === 0) {
    return {
      position: { radius: 10, theta: Math.PI / 4, phi: Math.PI / 4 },
      target: { x: 0, y: 0, z: 0 }
    };
  }
  
  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  binMeshes.forEach(bin => {
    const { position, size } = bin;
    minX = Math.min(minX, position.x - size.x / 2);
    maxX = Math.max(maxX, position.x + size.x / 2);
    minY = Math.min(minY, position.y - size.y / 2);
    maxY = Math.max(maxY, position.y + size.y / 2);
    minZ = Math.min(minZ, position.z - size.z / 2);
    maxZ = Math.max(maxZ, position.z + size.z / 2);
  });
  
  // Calculate center
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  
  // Calculate optimal radius
  const sizeX = maxX - minX;
  const sizeZ = maxZ - minZ;
  const maxSize = Math.max(sizeX, sizeZ);
  const radius = Math.max(maxSize * 1.5, 8); // Minimum radius of 8
  
  return {
    position: { 
      radius, 
      theta: Math.PI / 4, 
      phi: Math.PI / 3 
    },
    target: { 
      x: centerX, 
      y: centerY, 
      z: centerZ 
    }
  };
};

/**
 * Event emission utilities for real-time bin updates
 */
class BinEventEmitter {
  constructor() {
    this.listeners = [];
  }

  onBinCreated(callback) {
    this.listeners.push(callback);
  }

  offBinCreated(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  emitBinCreated(binMesh) {
    console.log('🔔 New bin mesh generated:', {
      id: binMesh.id,
      type: binMesh.type,
      position: binMesh.position,
      label: binMesh.label,
      locationId: binMesh.metadata?.locationId,
      warehouseId: binMesh.metadata?.warehouseId
    });
    
    // Notify all listeners
    this.listeners.forEach(callback => {
      try {
        callback(binMesh);
      } catch (error) {
        console.error('Error in bin event listener:', error);
      }
    });
  }

  emitBulkBinsCreated(binMeshes) {
    console.log(`🔔 ${binMeshes.length} bin meshes generated in bulk`);
    binMeshes.forEach(bin => this.emitBinCreated(bin));
  }
}

export const BinEvents = new BinEventEmitter(); 