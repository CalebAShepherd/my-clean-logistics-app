import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Dimensions,
  Text,
  Pressable,
} from 'react-native';
import { useBuilder } from '../context/BuilderContext';
import { CAMERA_SETTINGS, snapToGrid, GRID_SIZE } from '../utils/blueprintConstants';
import BlueprintElement2D from './BlueprintElement2D';
import SelectionHandles from './SelectionHandles';
import GridOverlay from './GridOverlay';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * COORDINATE SYSTEM DOCUMENTATION
 * 
 * This 2D warehouse builder uses the following coordinate system:
 * 
 * 1. WORLD COORDINATES: Elements are positioned in meters (e.g., x: 5.0, y: 3.2)
 * 2. PIXEL COORDINATES: World coordinates × 10 for rendering (1 meter = 10 pixels)
 * 3. SCREEN COORDINATES: Pixel coordinates after camera transform
 * 
 * CAMERA TRANSFORM: React Native applies as final = original * scale + translate
 * - Elements positioned at: left: (element.x * 10), top: (element.y * 10)  
 * - Canvas transform: { translateX: offsetX, translateY: offsetY, scale: zoom }
 * - Final screen position: ((element.x * 10) * zoom) + offsetX
 * 
 * COORDINATE CONVERSIONS:
 * - screenToWorld: (screenCoord - translate) / scale / 10
 * - worldToScreen: (worldCoord * 10) * scale + translate
 * 
 * This ensures accurate touch-to-element mapping at any zoom level.
 */

export default function BlueprintCanvas() {
  const { state, actions, selectedElement } = useBuilder();
  const [containerLayout, setContainerLayout] = useState({ width: screenWidth, height: screenHeight });
  
  // Refs for gesture handling
  const lastPan = useRef({ x: 0, y: 0 });
  const lastDistance = useRef(null);
  const isDragging = useRef(false);
  const draggedElementId = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  // Pinch gesture state
  const pinchState = useRef({ initialDistance: null, initialZoom: 1, initialOffsetX: 0, initialOffsetY: 0 });
  // Store minimum zoom-out for full floor plan view
  const fitZoomRef = useRef(CAMERA_SETTINGS.MIN_ZOOM);

  // Calculate transform for camera
  const getTransform = () => {
    const { camera } = state;
    
    return {
      transform: [
        { translateX: camera.offsetX },
        { translateY: camera.offsetY },
        { scale: camera.zoom },
      ],
    };
  };

  // Convert screen coordinates to world coordinates
  const screenToWorld = (screenX, screenY) => {
    const { camera } = state;
    
    // Inverse of: screenPx = (worldPx + offset) * zoom
    const worldX = (screenX / camera.zoom - camera.offsetX) / 10;
    const worldY = (screenY / camera.zoom - camera.offsetY) / 10;
    
    return { x: worldX, y: worldY };
  };

  // Convert world coordinates to screen coordinates
  const worldToScreen = (worldX, worldY) => {
    const { camera } = state;
    
    // screenPx = (worldPx + offset) * zoom  (worldPx = world(m) * 10)
    const screenX = (worldX * 10 + camera.offsetX) * camera.zoom;
    const screenY = (worldY * 10 + camera.offsetY) * camera.zoom;
    
    return { x: screenX, y: screenY };
  };

  // Handle element selection
  const handleElementPress = (element) => {
    if (state.activeTool === 'select') {
      actions.selectElement(element.id);
    }
  };

  // Simple hit test using React Native's transform-aware coordinate system
  const getElementAtPoint = (localX, localY) => {
    // We'll check if the touch point is within any element's bounds
    // Since we're in the transformed canvas space, we can use raw pixel comparisons
    const pixelsPerMeter = 10;
    const tolerance = 2; // 2px tolerance for easier selection
    
    for (let i = state.elements.length - 1; i >= 0; i--) {
      const element = state.elements[i];
      
      // Get element bounds in pixels
      const elemX = (element.x || 0) * pixelsPerMeter;
      const elemY = (element.y || 0) * pixelsPerMeter;
      
      // Get base dimensions (before rotation)
      let baseWidth = 0, baseHeight = 0;
      switch (element.type) {
        case 'zone':
        case 'rack':
          baseWidth = (element.width || 0) * pixelsPerMeter;
          baseHeight = (element.depth || 0) * pixelsPerMeter;
          break;
        case 'aisle': {
          baseWidth = (element.length || 0) * pixelsPerMeter;
          baseHeight = (element.width || 0) * pixelsPerMeter;
          break;
        }
        case 'wall': {
          // Manual swap for walls: handle 0° and 90° by swapping dims, ignore CSS rotation
          const wallRot = element.rotation || 0;
          const wallLen = (element.length || 0) * pixelsPerMeter;
          const wallThick = (element.thickness || 0) * pixelsPerMeter;
          baseWidth = wallRot === 90 ? wallThick : wallLen;
          baseHeight = wallRot === 90 ? wallLen : wallThick;
          break;
        }
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
      
      // Wall hit test: simple bounding box
      if (element.type === 'wall') {
        if (
          localX >= elemX - tolerance && localX <= elemX + baseWidth + tolerance &&
          localY >= elemY - tolerance && localY <= elemY + baseHeight + tolerance
        ) {
          return element;
        }
        // Skip rotation test for walls
        continue;
      }

      // Handle rotation by calculating rotated bounding box
      const rotation = element.rotation || 0;
      if (rotation === 0) {
        // No rotation - simple bounding box check
        if (localX >= elemX - tolerance && localX <= elemX + baseWidth + tolerance &&
            localY >= elemY - tolerance && localY <= elemY + baseHeight + tolerance) {
          return element;
        }
      } else {
        // Rotated element - check if point is inside rotated rectangle
        const centerX = elemX + baseWidth / 2;
        const centerY = elemY + baseHeight / 2;
        
        // Rotate point back to element's local coordinate system
        const angle = -rotation * Math.PI / 180; // Negative to reverse rotation
        const relX = localX - centerX;
        const relY = localY - centerY;
        const rotatedX = relX * Math.cos(angle) - relY * Math.sin(angle);
        const rotatedY = relX * Math.sin(angle) + relY * Math.cos(angle);
        
        // Check if rotated point is within element bounds (with tolerance)
        if (Math.abs(rotatedX) <= baseWidth / 2 + tolerance &&
            Math.abs(rotatedY) <= baseHeight / 2 + tolerance) {
          return element;
        }
      }
    }
    return null;
  };

  // Gesture state (simplified like 3D version)
  const lastGesture = useRef({ distance: null, angle: null });

  // Calculate distance between two touches
  const getDistance = (touch1, touch2) => {
    return Math.sqrt(
      Math.pow(touch2.pageX - touch1.pageX, 2) + 
      Math.pow(touch2.pageY - touch1.pageY, 2)
    );
  };

  // Calculate angle between two touches
  const getAngle = (touch1, touch2) => {
    return Math.atan2(
      touch2.pageY - touch1.pageY,
      touch2.pageX - touch1.pageX
    ) * 180 / Math.PI;
  };

  // Calculate center point between two touches
  const getCenter = (touch1, touch2) => {
    return {
      x: (touch1.pageX + touch2.pageX) / 2,
      y: (touch1.pageY + touch2.pageY) / 2,
    };
  };

  // Pan responder for handling all gestures
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Start moving if there's any movement
      return Math.abs(gestureState.dx) > 1 || Math.abs(gestureState.dy) > 1;
    },
    
    onPanResponderGrant: (evt, gestureState) => {
      const touches = evt.nativeEvent.touches;
      
      if (touches.length === 1) {
        // Single touch - handle drag setup or camera pan
        const touch = touches[0];
        const { locationX, locationY, pageX, pageY } = touch;
        
        // Check if we're starting on an element for dragging
        const hitElement = getElementAtPoint(locationX, locationY);
        
        if (hitElement && state.activeTool === 'select') {
          // Starting drag on an element
          draggedElementId.current = hitElement.id;
          actions.selectElement(hitElement.id);
          
          // Calculate offset from element origin to touch point
          const worldTouch = screenToWorld(locationX, locationY);
          dragOffset.current = {
            x: worldTouch.x - (hitElement.x || 0),
            y: worldTouch.y - (hitElement.y || 0),
          };
          
          isDragging.current = true;
          actions.setDragging(true, { x: locationX, y: locationY });
        } else {
          // Starting drag on empty space - camera pan
          actions.deselectAll();
          draggedElementId.current = null;
          isDragging.current = false;
        }
        
        // Store initial pointer location (for future pan gestures)
        lastPan.current = { x: pageX, y: pageY };
        
      } else if (touches.length === 2) {
        // Two finger touch - setup zoom
        const [touch1, touch2] = touches;
        const distance = Math.hypot(
          touch2.pageX - touch1.pageX,
          touch2.pageY - touch1.pageY
        );
        const angle = Math.atan2(touch2.pageY - touch1.pageY, touch2.pageX - touch1.pageX);
        
        lastGesture.current = { distance, angle };
        
        // Cancel any element dragging
        if (draggedElementId.current) {
          draggedElementId.current = null;
          isDragging.current = false;
          actions.setDragging(false);
        }
      }
    },

    onPanResponderMove: (evt, gestureState) => {
      const touches = evt.nativeEvent.touches;
      
      if (touches.length === 1) {
        // Single finger movement
        const touch = touches[0];
        const { locationX, locationY, pageX, pageY } = touch;
        
        if (isDragging.current && draggedElementId.current) {
          // Dragging an element
          const worldTouch = screenToWorld(locationX, locationY);
          const newX = snapToGrid(worldTouch.x - dragOffset.current.x);
          const newY = snapToGrid(worldTouch.y - dragOffset.current.y);
          
          actions.updateElement(draggedElementId.current, { x: newX, y: newY });
          
        } else {
          // Panning the camera
          const deltaX = touch.pageX - lastPan.current.x;
          const deltaY = touch.pageY - lastPan.current.y;
          
          // Offset operates in pre-scale pixels; divide by zoom so panning feels 1-to-1 at any zoom level
          actions.setCamera({
            offsetX: state.camera.offsetX + deltaX / state.camera.zoom,
            offsetY: state.camera.offsetY + deltaY / state.camera.zoom,
          });
        }
        
        // Update pan reference for camera movement
        lastPan.current = { x: pageX, y: pageY };
        
      } else if (touches.length === 2) {
        // Two finger movement - zooming
        const [touch1, touch2] = touches;
        const currentDistance = Math.hypot(
          touch2.pageX - touch1.pageX,
          touch2.pageY - touch1.pageY
        );
        const currentAngle = Math.atan2(touch2.pageY - touch1.pageY, touch2.pageX - touch1.pageX);
        
        if (lastGesture.current.distance && lastGesture.current.angle !== null) {
          const deltaDistance = currentDistance - lastGesture.current.distance;
          const deltaAngle = currentAngle - lastGesture.current.angle;
          
          // Only zoom if distance change is significant
          if (Math.abs(deltaDistance) > Math.abs(deltaAngle * 100)) {
            let newZoom = state.camera.zoom + deltaDistance * 0.01;
            newZoom = Math.max(CAMERA_SETTINGS.MIN_ZOOM, Math.min(CAMERA_SETTINGS.MAX_ZOOM, newZoom));
            newZoom = Math.max(newZoom, fitZoomRef.current);
            
            // Zoom around the center point between fingers (relative to container)
            const centerX = (touch1.locationX + touch2.locationX) / 2;
            const centerY = (touch1.locationY + touch2.locationY) / 2;
            
            // Calculate world point before zoom using correct transform
            const worldPxX = centerX / state.camera.zoom - state.camera.offsetX;
            const worldPxY = centerY / state.camera.zoom - state.camera.offsetY;
            
            // Keep that same world pixel position under the finger after applying newZoom
            // newOffset = center / newZoom - worldPx
            const newOffsetX = centerX / newZoom - worldPxX;
            const newOffsetY = centerY / newZoom - worldPxY;
            
            actions.setCamera({ zoom: newZoom, offsetX: newOffsetX, offsetY: newOffsetY });
          }
        }
        
        lastGesture.current = { distance: currentDistance, angle: currentAngle };
      }
    },

    onPanResponderRelease: () => {
      // Clean up all gesture state
      lastGesture.current = { distance: null, angle: null };
      
      if (draggedElementId.current) {
        draggedElementId.current = null;
        actions.setDragging(false);
      }
      
      isDragging.current = false;
    },

    onPanResponderTerminationRequest: () => false,
    
    onPanResponderTerminate: () => {
      // Handle unexpected termination
      lastGesture.current = { distance: null, angle: null };
      
      if (draggedElementId.current) {
        draggedElementId.current = null;
        actions.setDragging(false);
      }
      
      isDragging.current = false;
    },
  });

  // Handle container layout
  const onLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerLayout({ width, height });
  };

  // Fit blueprint to view
  const fitToView = () => {
    if (state.elements.length === 0) return;
    
    // Calculate bounds of all elements
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    state.elements.forEach(element => {
      const x = element.x || 0;
      const y = element.y || 0;
      let width = 0, height = 0;
      
      switch (element.type) {
        case 'zone':
          width = element.width || 0;
          height = element.depth || 0;
          break;
        case 'rack':
          width = element.width || 0;
          height = element.depth || 0;
          break;
        // Add other element types as needed
      }
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + width);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + height);
    });
    
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate zoom to fit with padding
    const padding = 2; // 2 meter padding
    const zoomX = containerLayout.width / ((boundsWidth + padding * 2) * 10);
    const zoomY = containerLayout.height / ((boundsHeight + padding * 2) * 10);
    const zoom = Math.min(zoomX, zoomY, CAMERA_SETTINGS.MAX_ZOOM);
    
    // Center the view using correct transform: final = original * scale + translate
    // We want center of bounds to be at center of screen
    // So: screenCenter = (boundsCenter * 10) * zoom + translate
    // Therefore: translate = screenCenter - (boundsCenter * 10) * zoom
    const offsetX = containerLayout.width / 2 - (centerX * 10) * zoom;
    const offsetY = containerLayout.height / 2 - (centerY * 10) * zoom;
    actions.setCamera({ offsetX, offsetY, zoom });
    // Store this zoom as maximum zoom-out
    fitZoomRef.current = zoom;
  };

  // Auto-fit on first load
  useEffect(() => {
    if (state.elements.length > 0 && containerLayout.width > 0) {
      setTimeout(fitToView, 100);
    }
  }, [state.elements.length, containerLayout.width]);

  return (
    <View 
      style={styles.container} 
      onLayout={onLayout}
    >
      <View style={[styles.canvas, getTransform()]}>
        {/* Background for deselection and panning */}
        <View
          style={StyleSheet.absoluteFill}
          {...panResponder.panHandlers}
        />
        
        {/* Grid */}
        <GridOverlay 
          dimensions={state.dimensions}
          gridSize={GRID_SIZE}
          zoom={state.camera.zoom}
        />
        
        {/* Elements */}
        {state.elements.map((element) => {
          return (
            <BlueprintElement2D
              key={element.id}
              element={element}
              isSelected={element.id === state.selectedId}
            />
          );
        })}
        
        {/* Selection handles */}
        {selectedElement && (
          <SelectionHandles
            element={selectedElement}
            onResize={(newSize) => actions.updateElement(selectedElement.id, newSize)}
            onRotate={(rotation) => actions.updateElement(selectedElement.id, { rotation })}
          />
        )}
      </View>
      
      {/* Info overlay */}
      <View style={styles.infoOverlay}>
        <Text style={styles.infoText}>
          Zoom: {(state.camera.zoom * 100).toFixed(0)}%
        </Text>
        <Text style={styles.infoText}>
          Elements: {state.elements.length}
        </Text>
        {state.isDragging && (
          <Text style={styles.infoText}>Dragging...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  infoOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  infoText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'monospace',
  },
}); 