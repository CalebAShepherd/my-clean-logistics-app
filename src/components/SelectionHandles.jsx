import React from 'react';
import { View, TouchableOpacity, StyleSheet, PanResponder } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SELECTION_HANDLE_SIZE } from '../utils/blueprintConstants';

export default function SelectionHandles({ element, onResize, onRotate }) {
  const pixelsPerMeter = 10;
  
  // Get element dimensions and position
  const getElementBounds = () => {
    const x = (element.x || 0) * pixelsPerMeter;
    const y = (element.y || 0) * pixelsPerMeter;
    
    // Get base dimensions (before rotation)
    let baseWidth = 0;
    let baseHeight = 0;
    
    switch (element.type) {
      case 'zone':
        baseWidth = (element.width || 0) * pixelsPerMeter;
        baseHeight = (element.depth || 0) * pixelsPerMeter;
        break;
      case 'aisle':
        baseWidth = (element.length || 0) * pixelsPerMeter;
        baseHeight = (element.width || 0) * pixelsPerMeter;
        break;
      case 'rack':
        baseWidth = (element.width || 0) * pixelsPerMeter;
        baseHeight = (element.depth || 0) * pixelsPerMeter;
        break;
      case 'wall':
        // Manual swap for walls: rotation 0° or 90° by swapping dims
        const wallRotHandle = element.rotation || 0;
        const wallLenHandle = (element.length || 0) * pixelsPerMeter;
        const wallThickHandle = (element.thickness || 0) * pixelsPerMeter;
        baseWidth = wallRotHandle === 90 ? wallThickHandle : wallLenHandle;
        baseHeight = wallRotHandle === 90 ? wallLenHandle : wallThickHandle;
        break;
      case 'door':
        baseWidth = (element.width || 0) * pixelsPerMeter;
        baseHeight = 5;
        break;
      case 'office':
        baseWidth = (element.width || 0) * pixelsPerMeter;
        baseHeight = (element.depth || 0) * pixelsPerMeter;
        break;
      default:
        baseWidth = 10;
        baseHeight = 10;
    }
    
    // Calculate bounding box for rotated element
    const rotation = element.rotation || 0;
    if (rotation === 0) {
      // No rotation - return original bounds
      return { x, y, width: baseWidth, height: baseHeight };
    } else {
      // Calculate bounding box that encompasses the rotated rectangle
      const angle = rotation * Math.PI / 180;
      const cos = Math.abs(Math.cos(angle));
      const sin = Math.abs(Math.sin(angle));
      
      const rotatedWidth = baseWidth * cos + baseHeight * sin;
      const rotatedHeight = baseWidth * sin + baseHeight * cos;
      
      // Adjust position so the bounding box is centered on the original center
      const centerX = x + baseWidth / 2;
      const centerY = y + baseHeight / 2;
      const newX = centerX - rotatedWidth / 2;
      const newY = centerY - rotatedHeight / 2;
      
      return { x: newX, y: newY, width: rotatedWidth, height: rotatedHeight };
    }
  };

  const bounds = getElementBounds();
  const handleOffset = SELECTION_HANDLE_SIZE / 2;

  // Helper to get current dimension based on element type
  const getElementDimension = (dimension) => {
    switch (element.type) {
      case 'zone':
      case 'rack':
      case 'office':
        return dimension === 'width' ? (element.width || 0) : (element.depth || 0);
      case 'aisle':
        const rotation = element.rotation || 0;
        if (rotation === 90) {
          return dimension === 'width' ? (element.width || 0) : (element.length || 0);
        } else {
          return dimension === 'width' ? (element.length || 0) : (element.width || 0);
        }
      case 'wall':
        const wallRotation = element.rotation || 0;
        if (wallRotation === 90) {
          return dimension === 'width' ? (element.thickness || 0) : (element.length || 0);
        } else {
          return dimension === 'width' ? (element.length || 0) : (element.thickness || 0);
        }
      case 'door':
        return dimension === 'width' ? (element.width || 0) : 0.5;
      default:
        return 1;
    }
  };

  // Helper to resize element with proper property mapping
  const resizeElement = (changes) => {
    console.log('resizeElement called with:', changes);
    console.log('element type:', element.type);
    console.log('element current properties:', element);
    
    const updates = { ...changes };
    
    // Map width/height to element-specific properties
    if ('width' in changes || 'height' in changes) {
      const originalWidth = updates.width;
      const originalHeight = updates.height;
      
      // Remove the generic width/height properties first
      delete updates.width;
      delete updates.height;
      
      switch (element.type) {
        case 'zone':
        case 'rack':
        case 'office':
          if (originalWidth !== undefined) updates.width = originalWidth;
          if (originalHeight !== undefined) updates.depth = originalHeight;
          break;
        case 'aisle':
          const rotation = element.rotation || 0;
          if (rotation === 90) {
            if (originalWidth !== undefined) updates.width = originalWidth;
            if (originalHeight !== undefined) updates.length = originalHeight;
          } else {
            if (originalWidth !== undefined) updates.length = originalWidth;
            if (originalHeight !== undefined) updates.width = originalHeight;
          }
          break;
        case 'wall':
          const wallRotation = element.rotation || 0;
          if (wallRotation === 90) {
            if (originalWidth !== undefined) updates.thickness = originalWidth;
            if (originalHeight !== undefined) updates.length = originalHeight;
          } else {
            if (originalWidth !== undefined) updates.length = originalWidth;
            if (originalHeight !== undefined) updates.thickness = originalHeight;
          }
          break;
        case 'door':
          if (originalWidth !== undefined) updates.width = originalWidth;
          // Height is fixed for doors
          break;
      }
    }
    
    console.log('final updates to send:', updates);
    onResize(updates);
  };

  // Handle resize operations
  const handleResizeTopLeft = () => {
    console.log('handleResizeTopLeft called');
    // Corner resize: both width and height
    const currentWidth = getElementDimension('width');
    const currentHeight = getElementDimension('height');
    const newWidth = Math.max(0.5, currentWidth - 0.5); // Decrease width, min 0.5m
    const newHeight = Math.max(0.5, currentHeight - 0.5); // Decrease height, min 0.5m
    
    // Adjust position to maintain bottom-right corner
    const newX = (element.x || 0) + (currentWidth - newWidth);
    const newY = (element.y || 0) + (currentHeight - newHeight);
    
    resizeElement({ width: newWidth, height: newHeight, x: newX, y: newY });
  };

  // Handle continuous resize during drag
  const handleResizeTopLeftDrag = (gestureState) => {
    // Convert gesture distance to meters (roughly 1px = 0.05m at normal zoom)
    const pixelsToMeters = 0.05;
    const deltaWidth = -gestureState.dx * pixelsToMeters; // Negative because dragging left increases width
    const deltaHeight = -gestureState.dy * pixelsToMeters; // Negative because dragging up increases height
    
    console.log('TOP-LEFT DRAG:', {
      dx: gestureState.dx,
      dy: gestureState.dy,
      deltaWidth,
      deltaHeight
    });
    
    const currentWidth = getElementDimension('width');
    const currentHeight = getElementDimension('height');
    const newWidth = Math.max(0.5, currentWidth + deltaWidth);
    const newHeight = Math.max(0.5, currentHeight + deltaHeight);
    
    console.log('TOP-LEFT DIMENSIONS:', {
      currentWidth,
      currentHeight,
      newWidth,
      newHeight
    });
    
    // Adjust position to maintain bottom-right corner
    const newX = (element.x || 0) + (currentWidth - newWidth);
    const newY = (element.y || 0) + (currentHeight - newHeight);
    
    console.log('TOP-LEFT FINAL:', {
      width: newWidth,
      height: newHeight,
      x: newX,
      y: newY
    });
    
    resizeElement({ width: newWidth, height: newHeight, x: newX, y: newY });
  };

  // Handle other corner and edge drags
  const handleResizeTopRightDrag = (gestureState) => {
    const pixelsToMeters = 0.05;
    const deltaWidth = gestureState.dx * pixelsToMeters; // Positive because dragging right increases width
    const deltaHeight = -gestureState.dy * pixelsToMeters; // Negative because dragging up increases height
    
    const currentWidth = getElementDimension('width');
    const currentHeight = getElementDimension('height');
    const newWidth = Math.max(0.5, currentWidth + deltaWidth);
    const newHeight = Math.max(0.5, currentHeight + deltaHeight);
    
    // Adjust position to maintain bottom-left corner
    const newY = (element.y || 0) + (currentHeight - newHeight);
    
    resizeElement({ width: newWidth, height: newHeight, y: newY });
  };

  const handleResizeBottomLeftDrag = (gestureState) => {
    const pixelsToMeters = 0.05;
    const deltaWidth = -gestureState.dx * pixelsToMeters; // Negative because dragging left increases width
    const deltaHeight = gestureState.dy * pixelsToMeters; // Positive because dragging down increases height
    
    const currentWidth = getElementDimension('width');
    const currentHeight = getElementDimension('height');
    const newWidth = Math.max(0.5, currentWidth + deltaWidth);
    const newHeight = Math.max(0.5, currentHeight + deltaHeight);
    
    // Adjust position to maintain top-right corner
    const newX = (element.x || 0) + (currentWidth - newWidth);
    
    resizeElement({ width: newWidth, height: newHeight, x: newX });
  };

  const handleResizeBottomRightDrag = (gestureState) => {
    const pixelsToMeters = 0.05;
    const deltaWidth = gestureState.dx * pixelsToMeters; // Positive because dragging right increases width
    const deltaHeight = gestureState.dy * pixelsToMeters; // Positive because dragging down increases height
    
    const currentWidth = getElementDimension('width');
    const currentHeight = getElementDimension('height');
    const newWidth = Math.max(0.5, currentWidth + deltaWidth);
    const newHeight = Math.max(0.5, currentHeight + deltaHeight);
    
    // No position adjustment needed - expanding from top-left corner
    resizeElement({ width: newWidth, height: newHeight });
  };

  // Edge handles - only resize one dimension
  const handleResizeTopDrag = (gestureState) => {
    const pixelsToMeters = 0.05;
    const deltaHeight = -gestureState.dy * pixelsToMeters;
    
    const currentHeight = getElementDimension('height');
    const newHeight = Math.max(0.5, currentHeight + deltaHeight);
    
    const newY = (element.y || 0) + (currentHeight - newHeight);
    resizeElement({ height: newHeight, y: newY });
  };

  const handleResizeBottomDrag = (gestureState) => {
    const pixelsToMeters = 0.05;
    const deltaHeight = gestureState.dy * pixelsToMeters;
    
    const currentHeight = getElementDimension('height');
    const newHeight = Math.max(0.5, currentHeight + deltaHeight);
    
    resizeElement({ height: newHeight });
  };

  const handleResizeLeftDrag = (gestureState) => {
    const pixelsToMeters = 0.05;
    const deltaWidth = -gestureState.dx * pixelsToMeters;
    
    const currentWidth = getElementDimension('width');
    const newWidth = Math.max(0.5, currentWidth + deltaWidth);
    
    const newX = (element.x || 0) + (currentWidth - newWidth);
    resizeElement({ width: newWidth, x: newX });
  };

  const handleResizeRightDrag = (gestureState) => {
    const pixelsToMeters = 0.05;
    const deltaWidth = gestureState.dx * pixelsToMeters;
    
    const currentWidth = getElementDimension('width');
    const newWidth = Math.max(0.5, currentWidth + deltaWidth);
    
    resizeElement({ width: newWidth });
  };

  // Create PanResponders for all handles
  const createPanResponder = (dragHandler) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          dragHandler(gestureState);
        }
      },
    });
  };

  const topLeftPanResponder = createPanResponder(handleResizeTopLeftDrag);
  const topRightPanResponder = createPanResponder(handleResizeTopRightDrag);
  const bottomLeftPanResponder = createPanResponder(handleResizeBottomLeftDrag);
  const bottomRightPanResponder = createPanResponder(handleResizeBottomRightDrag);
  const topPanResponder = createPanResponder(handleResizeTopDrag);
  const bottomPanResponder = createPanResponder(handleResizeBottomDrag);
  const leftPanResponder = createPanResponder(handleResizeLeftDrag);
  const rightPanResponder = createPanResponder(handleResizeRightDrag);

  const handleRotate = () => {
    const currentRotation = element.rotation || 0;
    const newRotation = (currentRotation + 45) % 360;
    onRotate(newRotation);
  };

  // Don't show handles for very small elements
  if (bounds.width < 20 || bounds.height < 20) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          left: bounds.x - handleOffset,
          top: bounds.y - handleOffset,
          width: bounds.width + SELECTION_HANDLE_SIZE,
          height: bounds.height + SELECTION_HANDLE_SIZE,
        },
      ]}
    >
      {/* Corner handles */}
      <View
        style={[styles.handle, styles.cornerHandle, styles.topLeft]}
        {...topLeftPanResponder.panHandlers}
      >
        <View style={styles.handleDot} />
      </View>

      <View
        style={[styles.handle, styles.cornerHandle, styles.topRight]}
        {...topRightPanResponder.panHandlers}
      >
        <View style={styles.handleDot} />
      </View>

      <View
        style={[styles.handle, styles.cornerHandle, styles.bottomLeft]}
        {...bottomLeftPanResponder.panHandlers}
      >
        <View style={styles.handleDot} />
      </View>

      <View
        style={[styles.handle, styles.cornerHandle, styles.bottomRight]}
        {...bottomRightPanResponder.panHandlers}
      >
        <View style={styles.handleDot} />
      </View>

      {/* Edge handles */}
      <View
        style={[styles.handle, styles.edgeHandle, styles.topEdge]}
        {...topPanResponder.panHandlers}
      >
        <View style={styles.handleDot} />
      </View>

      <View
        style={[styles.handle, styles.edgeHandle, styles.bottomEdge]}
        {...bottomPanResponder.panHandlers}
      >
        <View style={styles.handleDot} />
      </View>

      <View
        style={[styles.handle, styles.edgeHandle, styles.leftEdge]}
        {...leftPanResponder.panHandlers}
      >
        <View style={styles.handleDot} />
      </View>

      <View
        style={[styles.handle, styles.edgeHandle, styles.rightEdge]}
        {...rightPanResponder.panHandlers}
      >
        <View style={styles.handleDot} />
      </View>

      {/* Rotation handle */}
      <TouchableOpacity
        style={[styles.handle, styles.rotationHandle]}
        onPress={handleRotate}
      >
        <MaterialCommunityIcons
          name="rotate-right"
          size={12}
          color="#007AFF"
        />
      </TouchableOpacity>

      {/* Selection border */}
      <View style={styles.selectionBorder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    pointerEvents: 'box-none',
  },
  selectionBorder: {
    position: 'absolute',
    top: SELECTION_HANDLE_SIZE / 2,
    left: SELECTION_HANDLE_SIZE / 2,
    right: SELECTION_HANDLE_SIZE / 2,
    bottom: SELECTION_HANDLE_SIZE / 2,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    pointerEvents: 'none',
  },
  handle: {
    position: 'absolute',
    width: SELECTION_HANDLE_SIZE,
    height: SELECTION_HANDLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: SELECTION_HANDLE_SIZE / 2,
  },
  handleDot: {
    width: 4,
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  cornerHandle: {
    // Corner handles are positioned at the corners
  },
  edgeHandle: {
    // Edge handles are positioned at the middle of edges
  },
  rotationHandle: {
    top: -SELECTION_HANDLE_SIZE * 2,
    left: '50%',
    marginLeft: -SELECTION_HANDLE_SIZE / 2,
    backgroundColor: '#FFF',
    borderColor: '#007AFF',
  },
  
  // Corner positions
  topLeft: {
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
  },
  
  // Edge positions
  topEdge: {
    top: 0,
    left: '50%',
    marginLeft: -SELECTION_HANDLE_SIZE / 2,
  },
  bottomEdge: {
    bottom: 0,
    left: '50%',
    marginLeft: -SELECTION_HANDLE_SIZE / 2,
  },
  leftEdge: {
    left: 0,
    top: '50%',
    marginTop: -SELECTION_HANDLE_SIZE / 2,
  },
  rightEdge: {
    right: 0,
    top: '50%',
    marginTop: -SELECTION_HANDLE_SIZE / 2,
  },
}); 