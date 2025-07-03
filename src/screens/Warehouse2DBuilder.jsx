import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { BuilderProvider, useBuilder } from '../context/BuilderContext';
import { fetchWarehouses } from '../api/warehouses';
import { createBlueprint, updateBlueprint, getBlueprintById, getBlueprintsByWarehouse, getMyBlueprints } from '../api/blueprints';
import { analyzeFloorPlanBackend } from '../api/floorplan';
import { generateStarterTemplate } from '../utils/starterTemplate';
import { blueprintTo3D } from '../utils/blueprintTo3D';
import BlueprintCanvas from '../components/BlueprintCanvas';
import Toolbar2D from '../components/Toolbar2D';
import PropertyPanel from '../components/PropertyPanel';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Main screen component wrapped in provider
export default function Warehouse2DBuilder({ route, navigation }) {
  return (
    <BuilderProvider>
      <Warehouse2DBuilderContent route={route} navigation={navigation} />
    </BuilderProvider>
  );
}

// Main content component
function Warehouse2DBuilderContent({ route, navigation }) {
  const { userToken } = useContext(AuthContext);
  const { state, actions, selectedElement } = useBuilder();
  
  // Local state
  const [warehouses, setWarehouses] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [showNewBlueprintModal, setShowNewBlueprintModal] = useState(false);
  const [showLoadBlueprintModal, setShowLoadBlueprintModal] = useState(false);
  const [showDimensionsModal, setShowDimensionsModal] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Form state
  const [newBlueprintName, setNewBlueprintName] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [dimensionWidth, setDimensionWidth] = useState('50');
  const [dimensionDepth, setDimensionDepth] = useState('30');
  
  // Load blueprint state
  const [existingBlueprints, setExistingBlueprints] = useState([]);
  const [loadingBlueprints, setLoadingBlueprints] = useState(false);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState('');

  // Load warehouses on mount
  useEffect(() => {
    loadWarehouses();
  }, [userToken]);

  // Handle route params (if editing existing blueprint)
  useEffect(() => {
    if (route?.params?.preloadedBlueprint) {
      // Load blueprint from 3D conversion
      const { preloadedBlueprint } = route.params;
      
      // Set warehouse if provided
      if (route.params.warehouseId) {
        const warehouse = warehouses.find(w => w.id === route.params.warehouseId);
        if (warehouse) {
          actions.setWarehouse({
            id: warehouse.id,
            name: warehouse.name,
          });
        }
      }

      // Load the converted blueprint
      actions.loadBlueprint({
        blueprintId: route.params.blueprintId || null,
        blueprintName: preloadedBlueprint.name,
        warehouseId: route.params.warehouseId,
        warehouseName: warehouses.find(w => w.id === route.params.warehouseId)?.name || '',
        dimensions: preloadedBlueprint.dimensions,
        elements: preloadedBlueprint.elements,
      });

      // Fit camera to show the converted blueprint
      setTimeout(() => {
        const { width, depth } = preloadedBlueprint.dimensions;
        actions.setCamera({
          offsetX: -width * 5, // Convert to pixels and center
          offsetY: -depth * 5,
          zoom: Math.min(screenWidth / (width * 10), screenHeight / (depth * 10)) * 0.8,
        });

        // Show success message if coming from 3D
        if (route?.params?.from3D) {
          Alert.alert(
            'Successfully Converted!',
            `Your 3D warehouse layout has been converted back to a 2D blueprint with ${preloadedBlueprint.elements.length} elements.`,
            [{ text: 'OK' }]
          );
        }
      }, 100);

    } else if (route?.params?.blueprintId) {
      loadExistingBlueprint(route.params.blueprintId);
    } else if (route?.params?.warehouseId) {
      // Start new blueprint for specific warehouse
      setSelectedWarehouseId(route.params.warehouseId);
      setShowNewBlueprintModal(true);
    } else {
      // Show start menu if no params
      setShowStartMenu(true);
    }
  }, [route?.params, warehouses]);

  // Property panel is now opened manually via toolbar button
  // useEffect(() => {
  //   if (selectedElement) {
  //     setShowPropertiesPanel(true);
  //   }
  // }, [selectedElement]);

  const loadWarehouses = async () => {
    try {
      setLoadingWarehouses(true);
      const warehouseList = await fetchWarehouses(userToken);
      setWarehouses(warehouseList || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
      actions.setError('Failed to load warehouses');
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const loadExistingBlueprints = async () => {
    try {
      setLoadingBlueprints(true);
      const blueprints = await getMyBlueprints();
      setExistingBlueprints(blueprints || []);
    } catch (error) {
      console.error('Error loading blueprints:', error);
      Alert.alert('Error', 'Failed to load existing blueprints');
    } finally {
      setLoadingBlueprints(false);
    }
  };

  const loadExistingBlueprint = async (blueprintId) => {
    try {
      actions.setLoading(true);
      const blueprint = await getBlueprintById(blueprintId);
      
      actions.loadBlueprint({
        blueprintId: blueprint.id,
        blueprintName: blueprint.name,
        warehouseId: blueprint.warehouseId,
        warehouseName: blueprint.warehouse.name,
        dimensions: blueprint.dimensions,
        elements: blueprint.elements,
      });
    } catch (error) {
      console.error('Error loading blueprint:', error);
      actions.setError('Failed to load blueprint');
    } finally {
      actions.setLoading(false);
    }
  };

  const handleStartMenuChoice = (choice) => {
    setShowStartMenu(false);
    
    if (choice === 'new') {
      setShowNewBlueprintModal(true);
    } else if (choice === 'load') {
      loadExistingBlueprints();
      setShowLoadBlueprintModal(true);
    }
  };

  const handleNewBlueprint = () => {
    if (!newBlueprintName.trim()) {
      Alert.alert('Error', 'Please enter a blueprint name');
      return;
    }

    if (!selectedWarehouseId) {
      Alert.alert('Error', 'Please select a warehouse');
      return;
    }

    const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
    if (!selectedWarehouse) {
      Alert.alert('Error', 'Selected warehouse not found');
      return;
    }

    // Set warehouse info
    actions.setWarehouse({
      id: selectedWarehouseId,
      name: selectedWarehouse.name,
    });

    setShowNewBlueprintModal(false);
    setShowDimensionsModal(true);
  };

  const handleLoadBlueprint = async () => {
    if (!selectedBlueprintId) {
      Alert.alert('Error', 'Please select a blueprint');
      return;
    }

    setShowLoadBlueprintModal(false);
    await loadExistingBlueprint(selectedBlueprintId);
  };

  const handleSetDimensions = () => {
    const width = parseFloat(dimensionWidth);
    const depth = parseFloat(dimensionDepth);

    if (isNaN(width) || isNaN(depth) || width <= 0 || depth <= 0) {
      Alert.alert('Error', 'Please enter valid dimensions');
      return;
    }

    const dimensions = { width, depth };
    const elements = generateStarterTemplate(dimensions);

    actions.newBlueprint({
      dimensions,
      elements,
    });

    actions.saveBlueprint({
      name: newBlueprintName,
    });

    setShowDimensionsModal(false);
    
    // Fit camera to show entire blueprint
    setTimeout(() => {
      actions.setCamera({
        offsetX: -width / 2,
        offsetY: -depth / 2,
        zoom: Math.min(screenWidth / width, screenHeight / depth) * 0.8,
      });
    }, 100);
  };

  const handleSaveBlueprint = async () => {
    try {
      actions.setLoading(true);

      const blueprintData = {
        name: state.blueprintName || newBlueprintName,
        warehouseId: state.warehouseId,
        dimensions: state.dimensions,
        elements: state.elements,
      };

      if (state.blueprintId) {
        // Update existing
        await updateBlueprint(state.blueprintId, blueprintData);
      } else {
        // Create new
        const newBlueprint = await createBlueprint(blueprintData);
        actions.saveBlueprint({
          id: newBlueprint.id,
          name: newBlueprint.name,
        });
      }

      Alert.alert('Success', 'Blueprint saved successfully');
    } catch (error) {
      console.error('Error saving blueprint:', error);
      Alert.alert('Error', 'Failed to save blueprint');
    } finally {
      actions.setLoading(false);
    }
  };

  const handleViewIn3D = () => {
    if (state.elements.length === 0) {
      Alert.alert(
        'No Elements', 
        'Add some elements to your blueprint first to view in 3D.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Show loading state briefly for user feedback
      actions.setLoading(true);
      
      // Convert 2D blueprint to 3D objects
      const objects3D = blueprintTo3D({
        elements: state.elements,
        dimensions: state.dimensions,
      });

      // Validate conversion results
      if (!objects3D || objects3D.length === 0) {
        actions.setLoading(false);
        Alert.alert(
          'Conversion Error',
          'Unable to convert your blueprint to 3D. Please check that your elements have valid dimensions.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Provide feedback about the conversion
      const elementCounts = state.elements.reduce((counts, element) => {
        counts[element.type] = (counts[element.type] || 0) + 1;
        return counts;
      }, {});

      const conversionSummary = Object.entries(elementCounts)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');

      console.log(`Converting blueprint with ${conversionSummary} to 3D view`);
      console.log(`📐 Blueprint dimensions: ${state.dimensions.width}m x ${state.dimensions.depth}m`);
      
      // Log first few conversions for debugging
      const sampleElements = state.elements.slice(0, 3);
      sampleElements.forEach(el => {
        const centerX = state.dimensions.width / 2;
        const centerZ = state.dimensions.depth / 2;
        const expected3DX = el.x - centerX;
        const expected3DZ = el.y - centerZ;
        console.log(`  📍 ${el.type} at 2D(${el.x}, ${el.y}) → expected 3D(${expected3DX}, ?, ${expected3DZ})`);
      });

      // Navigate to 3D view with converted objects
      navigation.navigate('Warehouse3DView', {
        warehouseId: state.warehouseId,
        preloadedObjects: objects3D,
        fromBlueprint: true,
        blueprintName: state.blueprintName,
        blueprintId: state.blueprintId,
      });

      actions.setLoading(false);

    } catch (error) {
      console.error('Error converting blueprint to 3D:', error);
      actions.setLoading(false);
      Alert.alert(
        'Conversion Error',
        'An error occurred while converting your blueprint to 3D. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleImportFloorPlan = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const image = result.assets[0];
        actions.setLoading(true);
        
        // Convert image to base64
        const response = await fetch(image.uri);
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onload = async () => {
          try {
            const base64 = reader.result.split(',')[1];
            const analysisResults = await analyzeFloorPlanBackend(
              base64, 
              image.width, 
              image.height
            );
            
            // Convert analysis results to blueprint elements
            // This would need to be implemented based on your existing floor plan analysis
            console.log('Floor plan analysis results:', analysisResults);
            
            Alert.alert('Success', 'Floor plan imported successfully');
          } catch (error) {
            console.error('Error analyzing floor plan:', error);
            Alert.alert('Error', 'Failed to analyze floor plan');
          } finally {
            actions.setLoading(false);
          }
        };
        
        reader.readAsDataURL(blob);
      }
    } catch (error) {
      console.error('Error importing floor plan:', error);
      Alert.alert('Error', 'Failed to import floor plan');
      actions.setLoading(false);
    }
    
    setShowImportModal(false);
  };

  const handleBack = () => {
    if (state.hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save before leaving?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', onPress: () => navigation.goBack() },
          { text: 'Save', onPress: async () => {
            await handleSaveBlueprint();
            navigation.goBack();
          }},
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  if (loadingWarehouses) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading warehouses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {state.blueprintName || 'New Blueprint'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {state.warehouseName}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => setShowImportModal(true)} 
            style={styles.headerButton}
          >
            <MaterialCommunityIcons name="file-import" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleSaveBlueprint} 
            style={styles.headerButton}
            disabled={state.isLoading}
          >
            <MaterialCommunityIcons 
              name="content-save" 
              size={24} 
              color={state.hasUnsavedChanges ? "#FF6B35" : "#007AFF"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Canvas */}
        <View style={styles.canvasContainer}>
          <BlueprintCanvas />
          
          {/* Loading overlay */}
          {state.isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}
        </View>

        {/* Toolbar */}
        <Toolbar2D 
          onViewIn3D={handleViewIn3D} 
          onOpenProperties={() => setShowPropertiesPanel(true)}
        />
      </View>

      {/* Property Panel */}
      <PropertyPanel 
        visible={showPropertiesPanel}
        onClose={() => setShowPropertiesPanel(false)}
      />

      {/* Start Menu Modal */}
      <Modal
        visible={showStartMenu}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Warehouse Layout Builder</Text>
            <TouchableOpacity 
              onPress={() => {
                setShowStartMenu(false);
                navigation.goBack();
              }}
              style={styles.modalCloseButton}
            >
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Choose how you'd like to get started with your warehouse layout.
            </Text>

            <TouchableOpacity 
              style={styles.startMenuOption}
              onPress={() => handleStartMenuChoice('new')}
            >
              <MaterialCommunityIcons name="plus-circle" size={48} color="#007AFF" />
              <View style={styles.startMenuTextContainer}>
                <Text style={styles.startMenuTitle}>Create New Layout</Text>
                <Text style={styles.startMenuSubtitle}>Start with a blank warehouse and design your layout from scratch</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.startMenuOption}
              onPress={() => handleStartMenuChoice('load')}
            >
              <MaterialCommunityIcons name="folder-open" size={48} color="#34C759" />
              <View style={styles.startMenuTextContainer}>
                <Text style={styles.startMenuTitle}>Load Existing Layout</Text>
                <Text style={styles.startMenuSubtitle}>Continue working on a previously saved warehouse layout</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Load Blueprint Modal */}
      <Modal
        visible={showLoadBlueprintModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Load Existing Layout</Text>
            <TouchableOpacity 
              onPress={() => {
                setShowLoadBlueprintModal(false);
                setShowStartMenu(true);
              }}
              style={styles.modalCloseButton}
            >
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {loadingBlueprints ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading blueprints...</Text>
              </View>
            ) : existingBlueprints.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <MaterialCommunityIcons name="file-outline" size={64} color="#8E8E93" />
                <Text style={styles.emptyStateTitle}>No Saved Layouts</Text>
                <Text style={styles.emptyStateSubtitle}>
                  You haven't created any warehouse layouts yet. Create your first layout to get started.
                </Text>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => {
                    setShowLoadBlueprintModal(false);
                    setShowNewBlueprintModal(true);
                  }}
                >
                  <Text style={styles.primaryButtonText}>Create New Layout</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalDescription}>
                  Select a warehouse layout to continue editing.
                </Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Select Blueprint</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedBlueprintId}
                      onValueChange={setSelectedBlueprintId}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select a blueprint..." value="" />
                      {existingBlueprints.map(blueprint => (
                        <Picker.Item 
                          key={blueprint.id} 
                          label={`${blueprint.name} - ${blueprint.warehouse.name}`} 
                          value={blueprint.id} 
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={handleLoadBlueprint}
                >
                  <Text style={styles.primaryButtonText}>Load Blueprint</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* New Blueprint Modal */}
      <Modal
        visible={showNewBlueprintModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Blueprint</Text>
            <TouchableOpacity 
              onPress={() => {
                setShowNewBlueprintModal(false);
                setShowStartMenu(true);
              }}
              style={styles.modalCloseButton}
            >
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Blueprint Name</Text>
              <TextInput
                style={styles.textInput}
                value={newBlueprintName}
                onChangeText={setNewBlueprintName}
                placeholder="Enter blueprint name"
                autoFocus
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Warehouse</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedWarehouseId}
                  onValueChange={setSelectedWarehouseId}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a warehouse..." value="" />
                  {warehouses.map(warehouse => (
                    <Picker.Item 
                      key={warehouse.id} 
                      label={warehouse.name} 
                      value={warehouse.id} 
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleNewBlueprint}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Dimensions Modal */}
      <Modal
        visible={showDimensionsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Warehouse Dimensions</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Enter the dimensions of your warehouse in meters.
            </Text>

            <View style={styles.dimensionsRow}>
              <View style={styles.dimensionInput}>
                <Text style={styles.label}>Width (m)</Text>
                <TextInput
                  style={styles.textInput}
                  value={dimensionWidth}
                  onChangeText={setDimensionWidth}
                  placeholder="50"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.dimensionInput}>
                <Text style={styles.label}>Depth (m)</Text>
                <TextInput
                  style={styles.textInput}
                  value={dimensionDepth}
                  onChangeText={setDimensionDepth}
                  placeholder="30"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleSetDimensions}
            >
              <Text style={styles.primaryButtonText}>Create Blueprint</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Import Modal */}
      <Modal
        visible={showImportModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Import Floor Plan</Text>
            <TouchableOpacity 
              onPress={() => setShowImportModal(false)}
              style={styles.modalCloseButton}
            >
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Import an existing floor plan image to automatically generate your warehouse layout.
            </Text>

            <TouchableOpacity 
              style={styles.importButton}
              onPress={handleImportFloorPlan}
            >
              <MaterialCommunityIcons name="file-image" size={48} color="#007AFF" />
              <Text style={styles.importButtonText}>Select Floor Plan Image</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Error Display */}
      {state.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{state.error}</Text>
          <TouchableOpacity 
            onPress={() => actions.setError(null)}
            style={styles.errorCloseButton}
          >
            <MaterialCommunityIcons name="close" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  picker: {
    height: 50,
  },
  dimensionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  dimensionInput: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  importButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  errorContainer: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
  },
  errorCloseButton: {
    marginLeft: 12,
  },
  // Start Menu Styles
  startMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  startMenuTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  startMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  startMenuSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Empty State Styles
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
}); 