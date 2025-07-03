import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function GridOverlay({ dimensions, gridSize = 0.5, zoom = 1 }) {
  const pixelsPerMeter = 10 * zoom;
  const gridPixelSize = gridSize * pixelsPerMeter;
  
  // Only show grid if it's not too dense or too sparse
  if (gridPixelSize < 5 || gridPixelSize > 100) {
    return null;
  }

  const { width, depth } = dimensions;
  const totalWidth = width * pixelsPerMeter;
  const totalHeight = depth * pixelsPerMeter;

  // Calculate number of grid lines
  const verticalLines = Math.floor(width / gridSize) + 1;
  const horizontalLines = Math.floor(depth / gridSize) + 1;

  return (
    <View style={[styles.container, { width: totalWidth, height: totalHeight }]}>
      {/* Vertical lines */}
      {Array.from({ length: verticalLines }, (_, index) => (
        <View
          key={`v-${index}`}
          style={[
            styles.verticalLine,
            {
              left: index * gridPixelSize,
              height: totalHeight,
            },
          ]}
        />
      ))}
      
      {/* Horizontal lines */}
      {Array.from({ length: horizontalLines }, (_, index) => (
        <View
          key={`h-${index}`}
          style={[
            styles.horizontalLine,
            {
              top: index * gridPixelSize,
              width: totalWidth,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
  },
  verticalLine: {
    position: 'absolute',
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  horizontalLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
}); 