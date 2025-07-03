import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ELEMENT_TYPES, DEFAULT_COLORS, getElementStyle } from '../utils/blueprintConstants';

export default function BlueprintElement2D({ element, isSelected, onPress }) {
  const getElementDimensions = () => {
    const pixelsPerMeter = 10; // 10 pixels per meter at base scale
    
    switch (element.type) {
      case ELEMENT_TYPES.ZONE:
        return {
          width: (element.width || 0) * pixelsPerMeter,
          height: (element.depth || 0) * pixelsPerMeter,
        };
      case ELEMENT_TYPES.AISLE:
        // Always use length as width and width as height; rotation is handled by CSS transform
        return {
          width: (element.length || 0) * pixelsPerMeter,
          height: (element.width || 0) * pixelsPerMeter,
        };
      case ELEMENT_TYPES.RACK:
        return {
          width: (element.width || 0) * pixelsPerMeter,
          height: (element.depth || 0) * pixelsPerMeter,
        };
      case ELEMENT_TYPES.WALL:
        // Manual swap for walls: rotation handled by dimension swapping
        const wallRot = element.rotation || 0;
        const wallLen = (element.length || 0) * pixelsPerMeter;
        const wallThick = (element.thickness || 0) * pixelsPerMeter;
        return {
          width: wallRot === 90 ? wallThick : wallLen,
          height: wallRot === 90 ? wallLen : wallThick,
        };
      case ELEMENT_TYPES.DOOR:
        return {
          width: (element.width || 0) * pixelsPerMeter,
          height: 5, // Fixed small height for doors
        };
      case ELEMENT_TYPES.OFFICE:
        return {
          width: (element.width || 0) * pixelsPerMeter,
          height: (element.depth || 0) * pixelsPerMeter,
        };
      default:
        return { width: 10, height: 10 };
    }
  };

  const getElementPosition = () => {
    const pixelsPerMeter = 10;
    return {
      left: (element.x || 0) * pixelsPerMeter,
      top: (element.y || 0) * pixelsPerMeter,
    };
  };

  const getElementColor = () => {
    if (element.color) {
      return element.color;
    }
    return DEFAULT_COLORS[element.type] || '#CCCCCC';
  };

  const renderElementContent = () => {
    switch (element.type) {
      case ELEMENT_TYPES.ZONE:
        return <ZoneElement element={element} isSelected={isSelected} />;
      case ELEMENT_TYPES.AISLE:
        return <AisleElement element={element} isSelected={isSelected} />;
      case ELEMENT_TYPES.RACK:
        return <RackElement element={element} isSelected={isSelected} />;
      case ELEMENT_TYPES.WALL:
        return <WallElement element={element} isSelected={isSelected} />;
      case ELEMENT_TYPES.DOOR:
        return <DoorElement element={element} isSelected={isSelected} />;
      case ELEMENT_TYPES.OFFICE:
        return <OfficeElement element={element} isSelected={isSelected} />;
      default:
        return <DefaultElement element={element} isSelected={isSelected} />;
    }
  };

  const dimensions = getElementDimensions();
  const position = getElementPosition();
  const baseStyle = getElementStyle(element, isSelected);

  // Apply rotation only for non-wall elements
  const rotation = element.rotation || 0;
  const rotationTransform = (element.type !== ELEMENT_TYPES.WALL && rotation !== 0)
    ? { transform: [{ rotate: `${rotation}deg` }] }
    : {};

  return (
    <Pressable
      onPress={() => onPress && onPress(element)}
      style={[
        styles.element,
        baseStyle,
        position,
        dimensions,
        { backgroundColor: getElementColor() },
        rotationTransform,
      ]}
      pointerEvents="none"
    >
      {renderElementContent()}
    </Pressable>
  );
}

// Zone element
function ZoneElement({ element, isSelected }) {
  return (
    <View style={styles.zoneContent}>
      <Text style={[styles.elementLabel, styles.zoneLabel]} numberOfLines={1}>
        {element.label || 'Zone'}
      </Text>
      <View style={styles.zoneBorder} />
    </View>
  );
}

// Aisle element
function AisleElement({ element, isSelected }) {
  return (
    <View style={styles.aisleContent}>
      <View style={styles.aisleStripes} />
      <Text style={[styles.elementLabel, styles.aisleLabel]} numberOfLines={1}>
        {element.label || 'Aisle'}
      </Text>
    </View>
  );
}

// Rack element
function RackElement({ element, isSelected }) {
  const levels = element.levels || 4;
  const binsPerShelf = element.binsPerShelf || 3;
  
  return (
    <View style={styles.rackContent}>
      {/* Rack structure visualization */}
      <View style={styles.rackFrame}>
        {Array.from({ length: levels }, (_, levelIndex) => (
          <View key={levelIndex} style={styles.rackLevel}>
            {Array.from({ length: binsPerShelf }, (_, binIndex) => (
              <View key={binIndex} style={styles.rackBin} />
            ))}
          </View>
        ))}
      </View>
      <Text style={[styles.elementLabel, styles.rackLabel]} numberOfLines={1}>
        {element.label || 'Rack'}
      </Text>
    </View>
  );
}

// Wall element
function WallElement({ element, isSelected }) {
  return (
    <View style={styles.wallContent}>
      <View style={styles.wallPattern} />
      {(element.width || 0) * 10 > 30 && ( // Only show label if wall is wide enough
        <Text style={[styles.elementLabel, styles.wallLabel]} numberOfLines={1}>
          {element.label || 'Wall'}
        </Text>
      )}
    </View>
  );
}

// Door element
function DoorElement({ element, isSelected }) {
  return (
    <View style={styles.doorContent}>
      <View style={styles.doorFrame} />
      <Text style={[styles.elementLabel, styles.doorLabel]} numberOfLines={1}>
        {element.label || 'Door'}
      </Text>
    </View>
  );
}

// Office element
function OfficeElement({ element, isSelected }) {
  return (
    <View style={styles.officeContent}>
      <View style={styles.officeGrid}>
        {/* Simple grid pattern for office */}
        <View style={styles.officeGridLine} />
        <View style={[styles.officeGridLine, styles.officeGridLineVertical]} />
      </View>
      <Text style={[styles.elementLabel, styles.officeLabel]} numberOfLines={1}>
        {element.label || 'Office'}
      </Text>
    </View>
  );
}

// Default element
function DefaultElement({ element, isSelected }) {
  return (
    <View style={styles.defaultContent}>
      <Text style={[styles.elementLabel, styles.defaultLabel]} numberOfLines={1}>
        {element.label || element.type}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  element: {
    position: 'absolute',
    borderRadius: 2,
    overflow: 'hidden',
    minWidth: 10,
    minHeight: 10,
  },
  
  // Zone styles
  zoneContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  zoneBorder: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
    borderRadius: 2,
  },
  zoneLabel: {
    color: '#2196F3',
    fontWeight: '600',
  },
  
  // Aisle styles
  aisleContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  aisleStripes: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
  },
  aisleLabel: {
    color: '#666',
    fontSize: 10,
  },
  
  // Rack styles
  rackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  rackFrame: {
    flex: 1,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  rackLevel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 2,
    backgroundColor: '#8B4513',
    marginVertical: 1,
  },
  rackBin: {
    width: 2,
    height: 2,
    backgroundColor: '#DEB887',
  },
  rackLabel: {
    color: '#8B4513',
    fontSize: 8,
    fontWeight: '500',
    position: 'absolute',
    bottom: 1,
  },
  
  // Wall styles
  wallContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  wallPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#424242',
  },
  wallLabel: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '500',
  },
  
  // Door styles
  doorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  doorFrame: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderWidth: 1,
    borderColor: '#2E7D32',
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  doorLabel: {
    color: '#2E7D32',
    fontSize: 8,
    fontWeight: '600',
  },
  
  // Office styles
  officeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  officeGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  officeGridLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  officeGridLineVertical: {
    top: 0,
    left: '50%',
    right: 'auto',
    bottom: 0,
    width: 1,
    height: 'auto',
  },
  officeLabel: {
    color: '#2E7D32',
    fontSize: 10,
    fontWeight: '500',
  },
  
  // Default styles
  defaultContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultLabel: {
    color: '#666',
    fontSize: 10,
  },
  
  // Common label styles
  elementLabel: {
    fontSize: 9,
    textAlign: 'center',
    fontWeight: '500',
  },
}); 