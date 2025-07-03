import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useBuilder } from '../context/BuilderContext';
import { ELEMENT_TYPES, DEFAULT_COLORS } from '../utils/blueprintConstants';

export default function PropertyPanel({ visible, onClose }) {
  const { state, actions, selectedElement } = useBuilder();
  const [localProperties, setLocalProperties] = useState({});

  // Update local properties when selected element changes
  useEffect(() => {
    if (selectedElement) {
      setLocalProperties({ ...selectedElement });
    }
  }, [selectedElement]);

  // Apply changes to the element
  const applyChanges = () => {
    if (selectedElement && localProperties) {
      const updates = { ...localProperties };
      delete updates.id; // Don't update the ID
      actions.updateElement(selectedElement.id, updates);
    }
    onClose();
  };

  // Update local property
  const updateProperty = (key, value) => {
    setLocalProperties(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Parse numeric input
  const parseNumeric = (value, fallback = 0) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  };

  if (!selectedElement || !visible) {
    return null;
  }

  const renderBasicProperties = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Basic Properties</Text>
      
      <View style={styles.property}>
        <Text style={styles.propertyLabel}>Label</Text>
        <TextInput
          style={styles.textInput}
          value={localProperties.label || ''}
          onChangeText={(value) => updateProperty('label', value)}
          placeholder="Enter label"
        />
      </View>

      <View style={styles.property}>
        <Text style={styles.propertyLabel}>X Position (m)</Text>
        <TextInput
          style={styles.textInput}
          value={String(localProperties.x || 0)}
          onChangeText={(value) => updateProperty('x', parseNumeric(value))}
          keyboardType="numeric"
          placeholder="0"
        />
      </View>

      <View style={styles.property}>
        <Text style={styles.propertyLabel}>Y Position (m)</Text>
        <TextInput
          style={styles.textInput}
          value={String(localProperties.y || 0)}
          onChangeText={(value) => updateProperty('y', parseNumeric(value))}
          keyboardType="numeric"
          placeholder="0"
        />
      </View>
    </View>
  );

  const renderDimensionProperties = () => {
    switch (selectedElement.type) {
      case ELEMENT_TYPES.ZONE:
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dimensions</Text>
            
            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Width (m)</Text>
              <TextInput
                style={styles.textInput}
                value={String(localProperties.width || 0)}
                onChangeText={(value) => updateProperty('width', parseNumeric(value))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Depth (m)</Text>
              <TextInput
                style={styles.textInput}
                value={String(localProperties.depth || 0)}
                onChangeText={(value) => updateProperty('depth', parseNumeric(value))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Color</Text>
              <View style={styles.colorPicker}>
                {Object.entries(DEFAULT_COLORS).map(([key, color]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      localProperties.color === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => updateProperty('color', color)}
                  />
                ))}
              </View>
            </View>
          </View>
        );

      case ELEMENT_TYPES.AISLE:
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dimensions</Text>
            
            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Length (m)</Text>
              <TextInput
                style={styles.textInput}
                value={String(localProperties.length || 0)}
                onChangeText={(value) => updateProperty('length', parseNumeric(value))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Width (m)</Text>
              <TextInput
                style={styles.textInput}
                value={String(localProperties.width || 0)}
                onChangeText={(value) => updateProperty('width', parseNumeric(value))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Rotation</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={localProperties.rotation || 0}
                  onValueChange={(value) => updateProperty('rotation', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Horizontal (0°)" value={0} />
                  <Picker.Item label="Vertical (90°)" value={90} />
                </Picker>
              </View>
            </View>
          </View>
        );

      case ELEMENT_TYPES.RACK:
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rack Configuration</Text>
            
            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Width (m)</Text>
              <TextInput
                style={styles.textInput}
                value={String(localProperties.width || 0)}
                onChangeText={(value) => updateProperty('width', parseNumeric(value))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Depth (m)</Text>
              <TextInput
                style={styles.textInput}
                value={String(localProperties.depth || 0)}
                onChangeText={(value) => updateProperty('depth', parseNumeric(value))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Levels</Text>
              <TextInput
                style={styles.textInput}
                value={String(localProperties.levels || 4)}
                onChangeText={(value) => updateProperty('levels', parseInt(value) || 4)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Bins per Shelf</Text>
              <TextInput
                style={styles.textInput}
                value={String(localProperties.binsPerShelf || 3)}
                onChangeText={(value) => updateProperty('binsPerShelf', parseInt(value) || 3)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Rotation</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={localProperties.rotation || 0}
                  onValueChange={(value) => updateProperty('rotation', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="0°" value={0} />
                  <Picker.Item label="90°" value={90} />
                  <Picker.Item label="180°" value={180} />
                  <Picker.Item label="270°" value={270} />
                </Picker>
              </View>
            </View>
          </View>
        );

      case ELEMENT_TYPES.WALL:
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wall Properties</Text>
            
            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Length (m)</Text>
              <TextInput
                style={styles.textInput}
                value={String(localProperties.length || 0)}
                onChangeText={(value) => updateProperty('length', parseNumeric(value))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Thickness (m)</Text>
              <TextInput
                style={styles.textInput}
                value={String(localProperties.thickness || 0)}
                onChangeText={(value) => updateProperty('thickness', parseNumeric(value))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Rotation</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={localProperties.rotation || 0}
                  onValueChange={(value) => updateProperty('rotation', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Horizontal (0°)" value={0} />
                  <Picker.Item label="Vertical (90°)" value={90} />
                </Picker>
              </View>
            </View>
          </View>
        );

      case ELEMENT_TYPES.DOOR:
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Door Properties</Text>
            
            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Width (m)</Text>
              <TextInput
                style={styles.textInput}
                value={String(localProperties.width || 0)}
                onChangeText={(value) => updateProperty('width', parseNumeric(value))}
                keyboardType="numeric"
              />
            </View>
          </View>
        );

      case ELEMENT_TYPES.OFFICE:
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Office Properties</Text>
            
            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Width (m)</Text>
              <TextInput
                style={styles.textInput}
                value={String(localProperties.width || 0)}
                onChangeText={(value) => updateProperty('width', parseNumeric(value))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.property}>
              <Text style={styles.propertyLabel}>Depth (m)</Text>
              <TextInput
                style={styles.textInput}
                value={String(localProperties.depth || 0)}
                onChangeText={(value) => updateProperty('depth', parseNumeric(value))}
                keyboardType="numeric"
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)} Properties
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {renderBasicProperties()}
          {renderDimensionProperties()}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.applyButton]}
            onPress={applyChanges}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  property: {
    marginBottom: 16,
  },
  propertyLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  picker: {
    height: 50,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#007AFF',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#007AFF',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 