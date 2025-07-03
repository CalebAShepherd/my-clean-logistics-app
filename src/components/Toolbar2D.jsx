import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBuilder } from '../context/BuilderContext';
import { ELEMENT_TYPES, generateId, DEFAULT_SIZES } from '../utils/blueprintConstants';

export default function Toolbar2D({ onViewIn3D, onOpenProperties }) {
  const { state, actions, canUndo, canRedo } = useBuilder();

  const addElement = (type) => {
    const defaultSize = DEFAULT_SIZES[type];
    const centerX = 10; // Default position
    const centerY = 10;

    let newElement = {
      id: generateId(),
      type,
      x: centerX,
      y: centerY,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${state.elements.filter(e => e.type === type).length + 1}`,
    };

    // Add type-specific properties
    switch (type) {
      case ELEMENT_TYPES.ZONE:
        newElement = {
          ...newElement,
          width: defaultSize.width,
          depth: defaultSize.depth,
          color: '#E3F2FD',
        };
        break;
      case ELEMENT_TYPES.AISLE:
        newElement = {
          ...newElement,
          length: defaultSize.length,
          width: defaultSize.width,
          rotation: 0,
        };
        break;
      case ELEMENT_TYPES.RACK:
        newElement = {
          ...newElement,
          width: defaultSize.width,
          depth: defaultSize.depth,
          binsPerShelf: defaultSize.binsPerShelf,
          levels: 4,
          rotation: 0,
        };
        break;
      case ELEMENT_TYPES.WALL:
        newElement = {
          ...newElement,
          length: defaultSize.length,
          thickness: defaultSize.thickness,
          rotation: 0,
        };
        break;
      case ELEMENT_TYPES.DOOR:
        newElement = {
          ...newElement,
          width: defaultSize.width,
        };
        break;
      case ELEMENT_TYPES.OFFICE:
        newElement = {
          ...newElement,
          width: defaultSize.width,
          depth: defaultSize.depth,
        };
        break;
    }

    actions.addElement(newElement);
    actions.selectElement(newElement.id);
  };

  const deleteSelected = () => {
    if (state.selectedId) {
      actions.deleteElement(state.selectedId);
    }
  };

  const tools = [
    {
      id: 'select',
      icon: 'cursor-default',
      label: 'Select',
      onPress: () => {
        if (state.activeTool === 'select') {
          // Turn off select mode and clear selection
          actions.setActiveTool(null);
          actions.deselectAll();
        } else {
          // Turn on select mode
          actions.setActiveTool('select');
        }
      },
    },
    {
      id: 'zone',
      icon: 'square-outline',
      label: 'Zone',
      onPress: () => addElement(ELEMENT_TYPES.ZONE),
    },
    {
      id: 'aisle',
      icon: 'road',
      label: 'Aisle',
      onPress: () => addElement(ELEMENT_TYPES.AISLE),
    },
    {
      id: 'rack',
      icon: 'view-module',
      label: 'Rack',
      onPress: () => addElement(ELEMENT_TYPES.RACK),
    },
    {
      id: 'wall',
      icon: 'wall',
      label: 'Wall',
      onPress: () => addElement(ELEMENT_TYPES.WALL),
    },
    {
      id: 'door',
      icon: 'door-open',
      label: 'Door',
      onPress: () => addElement(ELEMENT_TYPES.DOOR),
    },
    {
      id: 'office',
      icon: 'office-building',
      label: 'Office',
      onPress: () => addElement(ELEMENT_TYPES.OFFICE),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Main toolbar */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.toolsContainer}
        contentContainerStyle={styles.toolsContent}
      >
        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={[
              styles.tool,
              state.activeTool === tool.id && styles.toolActive,
            ]}
            onPress={() => {
              if (tool.id === 'select') {
                if (state.activeTool === 'select') {
                  actions.setActiveTool(null);
                  actions.deselectAll();
                } else {
                  actions.setActiveTool('select');
                }
              } else {
                tool.onPress();
              }
            }}
          >
            <MaterialCommunityIcons
              name={tool.icon}
              size={20}
              color={state.activeTool === tool.id ? '#FFF' : '#666'}
            />
            <Text style={[
              styles.toolLabel,
              state.activeTool === tool.id && styles.toolLabelActive,
            ]}>
              {tool.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        {/* Undo/Redo */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={[styles.actionButton, !canUndo && styles.actionButtonDisabled]}
            onPress={actions.undo}
            disabled={!canUndo}
          >
            <MaterialCommunityIcons
              name="undo"
              size={20}
              color={canUndo ? '#007AFF' : '#CCC'}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, !canRedo && styles.actionButtonDisabled]}
            onPress={actions.redo}
            disabled={!canRedo}
          >
            <MaterialCommunityIcons
              name="redo"
              size={20}
              color={canRedo ? '#007AFF' : '#CCC'}
            />
          </TouchableOpacity>
        </View>

        {/* Zoom controls */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={actions.zoomOut}
          >
            <MaterialCommunityIcons name="minus" size={20} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={actions.zoomIn}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Delete */}
        {state.selectedId && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={deleteSelected}
          >
            <MaterialCommunityIcons name="delete" size={20} color="#FF3B30" />
          </TouchableOpacity>
        )}

        {/* Properties */}
        {state.selectedId && (
          <TouchableOpacity
            style={[styles.actionButton, styles.propertiesButton]}
            onPress={onOpenProperties}
          >
            <MaterialCommunityIcons name="cog" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}

        {/* View in 3D */}
        <TouchableOpacity
          style={[styles.actionButton, styles.view3DButton]}
          onPress={onViewIn3D}
        >
          <MaterialCommunityIcons name="cube-outline" size={20} color="#FFF" />
          <Text style={styles.view3DText}>3D</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingBottom: 10,
  },
  toolsContainer: {
    maxHeight: 80,
  },
  toolsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  tool: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    minWidth: 60,
  },
  toolActive: {
    backgroundColor: '#007AFF',
  },
  toolLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  toolLabelActive: {
    color: '#FFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    borderColor: '#FF3B30',
  },
  propertiesButton: {
    borderColor: '#007AFF',
  },
  view3DButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    width: 'auto',
    gap: 4,
  },
  view3DText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
}); 