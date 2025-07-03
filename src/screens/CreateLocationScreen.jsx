// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { fetchWarehouses } from '../api/warehouses';
import { createLocation, fetchLocationHierarchy } from '../api/locations';
import { SafeAreaView } from 'react-native';
import InternalHeader from '../components/InternalHeader';
import { fetchInventoryItems } from '../api/inventoryItems';
import { createWarehouseItem } from '../api/warehouseItems';
import { locationToBinMesh, BinEvents } from '../utils/binGeneration';

function CreateLocationScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [zone, setZone] = useState('');
  const [rack, setRack] = useState('');
  const [aisle, setAisle] = useState('');
  const [shelf, setShelf] = useState('');
  const [bin, setBin] = useState('');
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [maxThreshold, setMaxThreshold] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Location hierarchy state
  const [locationHierarchy, setLocationHierarchy] = useState({
    zones: [],
    racks: [],
    aisles: [],
    shelves: [],
    bins: []
  });
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [wh, items] = await Promise.all([
          fetchWarehouses(userToken),
          fetchInventoryItems(userToken)
        ]);
        
        setWarehouses(wh);
        if (wh.length) {
          setWarehouseId(wh[0].id);
          // Load initial hierarchy for first warehouse
          loadLocationHierarchy(wh[0].id);
        }
        
        setInventoryItems(items);
        if (items.length) setItemId(items[0].id);
      } catch (err) {
        console.error('Error loading data:', err);
        Alert.alert('Error', 'Failed to load required data. Please try again.');
      } finally {
        setLoading(false);
        setLoadingItems(false);
      }
    };
    loadData();
  }, [userToken]);

  // Load location hierarchy when warehouse changes
  const loadLocationHierarchy = async (selectedWarehouseId, filters = {}) => {
    if (!selectedWarehouseId) return;
    
    setLoadingHierarchy(true);
    try {
      console.log('Loading hierarchy for warehouse:', selectedWarehouseId, 'with filters:', filters);
      const hierarchy = await fetchLocationHierarchy(userToken, selectedWarehouseId, filters);
      console.log('Received hierarchy:', hierarchy);
      setLocationHierarchy(hierarchy);
    } catch (err) {
      console.error('Error loading location hierarchy:', err);
      Alert.alert('Error', 'Failed to load location options. Please try again.');
    } finally {
      setLoadingHierarchy(false);
    }
  };

  // Handle warehouse selection change
  const handleWarehouseChange = (selectedWarehouseId) => {
    setWarehouseId(selectedWarehouseId);
    // Reset all location fields
    setZone('');
    setRack('');
    setAisle('');
    setShelf('');
    setBin('');
    // Load new hierarchy
    loadLocationHierarchy(selectedWarehouseId);
  };

  // Handle zone selection change
  const handleZoneChange = (selectedZone) => {
    setZone(selectedZone);
    // Reset dependent fields
    setRack('');
    setAisle('');
    setShelf('');
    setBin('');
    // Load filtered hierarchy
    loadLocationHierarchy(warehouseId, { zone: selectedZone });
  };

  // Handle rack selection change
  const handleRackChange = (selectedRack) => {
    setRack(selectedRack);
    // Reset dependent fields
    setAisle('');
    setShelf('');
    setBin('');
    // Load filtered hierarchy
    loadLocationHierarchy(warehouseId, { zone, rack: selectedRack });
  };

  // Handle aisle selection change
  const handleAisleChange = (selectedAisle) => {
    setAisle(selectedAisle);
    // Reset dependent fields
    setShelf('');
    setBin('');
    // Load filtered hierarchy (aisle is optional, so it doesn't affect filtering much)
    const filters = { zone, rack };
    if (selectedAisle) filters.aisle = selectedAisle;
    loadLocationHierarchy(warehouseId, filters);
  };

  // Handle shelf selection change
  const handleShelfChange = (selectedShelf) => {
    setShelf(selectedShelf);
    // Reset dependent fields
    setBin('');
    // Load filtered hierarchy (aisle is optional)
    const filters = { zone, rack, shelf: selectedShelf };
    if (aisle) filters.aisle = aisle;
    loadLocationHierarchy(warehouseId, filters);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!warehouseId) {
      newErrors.warehouse = 'Warehouse selection is required';
    }
    if (!zone.trim()) {
      newErrors.zone = 'Zone is required';
    }
    if (!rack.trim()) {
      newErrors.rack = 'Rack is required';
    }
    // Aisle is optional - no validation required
    if (!shelf.trim()) {
      newErrors.shelf = 'Shelf is required';
    }
    // Bin label optional - no validation required
    if (!itemId) {
      newErrors.item = 'Item selection is required';
    }
    if (!quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) < 0) {
      newErrors.quantity = 'Quantity must be a valid positive number';
    }
    if (!maxThreshold.trim()) {
      newErrors.maxThreshold = 'Capacity is required';
    } else if (isNaN(parseInt(maxThreshold, 10)) || parseInt(maxThreshold, 10) <= 0) {
      newErrors.maxThreshold = 'Capacity must be a valid positive number';
    } else if (parseInt(quantity, 10) > parseInt(maxThreshold, 10)) {
      newErrors.quantity = 'Quantity cannot exceed capacity';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors below and try again.');
      return;
    }
    
    setSaving(true);
    try {
      const newLoc = await createLocation(userToken, { 
        warehouseId, 
        zone: zone.trim(), 
        rack: rack.trim(),
        aisle: aisle.trim() || null, // Optional field
        shelf: shelf.trim(), 
        bin: bin.trim() || null // Optional label
      });
      
      await createWarehouseItem(userToken, {
        warehouseId,
        itemId,
        locationId: newLoc.id,
        quantity: parseInt(quantity, 10),
        maxThreshold: parseInt(maxThreshold, 10)
      });

      // Generate 3D bin mesh data with new bin flag
      const newBinMesh = locationToBinMesh(newLoc, { 
        metadata: { 
          isNewBin: true, // Flag to highlight new bins
          warehouseId: warehouseId // Include warehouse ID for filtering
        } 
      });
      
      console.log('🔔 About to emit bin created event:', {
        binId: newBinMesh.id,
        warehouseId: warehouseId,
        label: newBinMesh.label
      });
      
      // Emit bin creation event
      BinEvents.emitBinCreated(newBinMesh);
      
      Alert.alert(
        'Success',
        'Location and inventory item created successfully!',
        [
          {
            text: 'View in 3D',
            onPress: () => {
              // Navigate to 3D view with the new bin highlighted
              navigation.navigate('Warehouse3DView', {
                warehouseId: warehouseId,
                preloadedObjects: [newBinMesh],
                fromNewBin: true,
                newBinId: newBinMesh.id
              });
            }
          },
          {
            text: 'Stay Here',
            style: 'cancel',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err) {
      console.error('Create location error:', err);
      Alert.alert('Error', err.message || 'Failed to create location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Create Location" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading warehouses and items...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedWarehouse = warehouses.find(w => w.id === warehouseId);
  const selectedItem = inventoryItems.find(item => item.id === itemId);

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Create Location" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="map-marker-plus" size={32} color="#007AFF" />
            </View>
            <Text style={styles.headerTitle}>New Storage Location</Text>
            <Text style={styles.headerSubtitle}>Create a new location and add initial inventory</Text>
          </View>

          {/* Warehouse Selection */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="warehouse" size={20} color="#007AFF" />
              <Text style={styles.cardTitle}>Warehouse Selection</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Warehouse <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.pickerContainer, errors.warehouse && styles.inputError]}>
                <Picker
                  selectedValue={warehouseId}
                  onValueChange={(value) => {
                    handleWarehouseChange(value);
                    if (errors.warehouse) setErrors(prev => ({ ...prev, warehouse: null }));
                  }}
                  style={styles.picker}
                >
                  {warehouses.map((w) => (
                    <Picker.Item key={w.id} label={w.name} value={w.id} />
                  ))}
                </Picker>
              </View>
              {errors.warehouse && <Text style={styles.errorText}>{errors.warehouse}</Text>}
              
              {selectedWarehouse && (
                <View style={styles.selectionInfo}>
                  <MaterialCommunityIcons name="check-circle" size={16} color="#34C759" />
                  <Text style={styles.selectionText}>
                    Selected: {selectedWarehouse.name}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Location Details */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#007AFF" />
              <Text style={styles.cardTitle}>Location Details</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Zone <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.pickerContainer, errors.zone && styles.inputError]}>
                                 <Picker
                   selectedValue={zone}
                   onValueChange={(value) => {
                     handleZoneChange(value);
                     if (errors.zone) setErrors(prev => ({ ...prev, zone: null }));
                   }}
                   style={styles.picker}
                 >
                   <Picker.Item label="Select a zone..." value="" />
                   {locationHierarchy.zones.map((z) => (
                     <Picker.Item key={z} label={z} value={z} />
                   ))}
                 </Picker>
              </View>
              {errors.zone && <Text style={styles.errorText}>{errors.zone}</Text>}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Rack <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.pickerContainer, errors.rack && styles.inputError]}>
                                 <Picker
                   selectedValue={rack}
                   onValueChange={(value) => {
                     handleRackChange(value);
                     if (errors.rack) setErrors(prev => ({ ...prev, rack: null }));
                   }}
                   style={styles.picker}
                   enabled={!!zone}
                 >
                   <Picker.Item label={zone ? "Select a rack..." : "Select zone first"} value="" />
                   {locationHierarchy.racks.map((r) => (
                     <Picker.Item key={r} label={r} value={r} />
                   ))}
                 </Picker>
              </View>
              {errors.rack && <Text style={styles.errorText}>{errors.rack}</Text>}
            </View>
            
                         <View style={styles.formGroup}>
               <Text style={styles.label}>
                 Aisle <Text style={styles.optional}>(Optional)</Text>
               </Text>
              <View style={[styles.pickerContainer, errors.aisle && styles.inputError]}>
                                 <Picker
                   selectedValue={aisle}
                   onValueChange={(value) => {
                     handleAisleChange(value);
                     if (errors.aisle) setErrors(prev => ({ ...prev, aisle: null }));
                   }}
                   style={styles.picker}
                   enabled={!!rack}
                 >
                   <Picker.Item label={rack ? "Select an aisle (optional)..." : "Select rack first"} value="" />
                   {locationHierarchy.aisles.map((a) => (
                     <Picker.Item key={a} label={a} value={a} />
                   ))}
                 </Picker>
              </View>
              {errors.aisle && <Text style={styles.errorText}>{errors.aisle}</Text>}
            </View>
            
            {/* Shelf Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Shelf <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.pickerContainer, errors.shelf && styles.inputError]}>
                <Picker
                  selectedValue={shelf}
                  onValueChange={value => {
                    handleShelfChange(value);
                    if (errors.shelf) setErrors(prev => ({ ...prev, shelf: null }));
                  }}
                  enabled={!!rack}
                  style={styles.picker}
                >
                  <Picker.Item label={rack ? "Select a shelf..." : "Select rack first"} value="" />
                  {locationHierarchy.shelves.map(s => (
                    <Picker.Item key={s} label={s} value={s} />
                  ))}
                </Picker>
              </View>
              {errors.shelf && <Text style={styles.errorText}>{errors.shelf}</Text>}
            </View>
            
            {/* Bin Label Input (optional) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Bin Label (optional)</Text>
              <TextInput
                style={styles.input}
                value={bin}
                onChangeText={text => setBin(text)}
                placeholder="Enter bin label"
                placeholderTextColor="#8E8E93"
                // no validation error display, label is optional
              />
            </View>
          </View>

          {/* Initial Inventory */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="package-variant" size={20} color="#34C759" />
              <Text style={styles.cardTitle}>Initial Inventory</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Item <Text style={styles.required}>*</Text>
              </Text>
              
              {loadingItems ? (
                <View style={styles.loadingItems}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.loadingText}>Loading items...</Text>
                </View>
              ) : (
                <>
                  <View style={[styles.pickerContainer, errors.item && styles.inputError]}>
                    <Picker
                      selectedValue={itemId}
                      onValueChange={(value) => {
                        setItemId(value);
                        if (errors.item) setErrors(prev => ({ ...prev, item: null }));
                      }}
                      style={styles.picker}
                    >
                      {inventoryItems.map((it) => (
                        <Picker.Item key={it.id} label={`${it.name} (${it.sku})`} value={it.id} />
                      ))}
                    </Picker>
                  </View>
                  {errors.item && <Text style={styles.errorText}>{errors.item}</Text>}
                  
                  {selectedItem && (
                    <View style={styles.selectionInfo}>
                      <MaterialCommunityIcons name="package-variant" size={16} color="#34C759" />
                      <Text style={styles.selectionText}>
                        {selectedItem.name} • {selectedItem.sku} • {selectedItem.unit}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
            
            <View style={styles.inventoryInputs}>
              <View style={styles.inventoryInput}>
                <Text style={styles.label}>
                  Initial Quantity <Text style={styles.required}>*</Text>
                </Text>
                <TextInput 
                  style={[styles.input, errors.quantity && styles.inputError]} 
                  value={quantity} 
                  onChangeText={(text) => {
                    setQuantity(text);
                    if (errors.quantity) setErrors(prev => ({ ...prev, quantity: null }));
                  }}
                  placeholder="0"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                />
                {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
              </View>
              
              <View style={styles.inventoryInput}>
                <Text style={styles.label}>
                  Max Capacity <Text style={styles.required}>*</Text>
                </Text>
                <TextInput 
                  style={[styles.input, errors.maxThreshold && styles.inputError]} 
                  value={maxThreshold} 
                  onChangeText={(text) => {
                    setMaxThreshold(text);
                    if (errors.maxThreshold) setErrors(prev => ({ ...prev, maxThreshold: null }));
                  }}
                  placeholder="100"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                />
                {errors.maxThreshold && <Text style={styles.errorText}>{errors.maxThreshold}</Text>}
              </View>
            </View>
            
            {quantity && maxThreshold && !errors.quantity && !errors.maxThreshold && (
              <View style={styles.capacityPreview}>
                <LinearGradient
                  colors={['#34C759', '#30D158']}
                  style={styles.capacityBar}
                >
                  <View style={[
                    styles.capacityFill,
                    { width: `${Math.min((parseInt(quantity) / parseInt(maxThreshold)) * 100, 100)}%` }
                  ]} />
                </LinearGradient>
                <Text style={styles.capacityText}>
                  {quantity} / {maxThreshold} ({Math.round((parseInt(quantity) / parseInt(maxThreshold)) * 100)}% full)
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
              onPress={onSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={saving ? ['#C7C7CC', '#C7C7CC'] : ['#007AFF', '#5856D6']}
                style={styles.saveGradient}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialCommunityIcons name="content-save" size={20} color="white" />
                )}
                <Text style={styles.saveText}>
                  {saving ? 'Creating...' : 'Create Location'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  keyboardView: {
    flex: 1,
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Card Styles
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  
  // Form Styles
  formGroup: {
    marginBottom: 20,
  },
  
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  
  required: {
    color: '#FF3B30',
  },
  optional: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '400',
  },
  
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1C1C1E',
  },
  
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    marginLeft: 4,
  },
  
  // Picker Styles
  pickerContainer: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  picker: {
    height: 50,
    color: '#1C1C1E',
  },
  
  // Selection Info
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  
  selectionText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
    marginLeft: 6,
  },
  
  loadingItems: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  
  // Inventory Section
  inventoryInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  
  inventoryInput: {
    flex: 1,
  },
  
  // Capacity Preview
  capacityPreview: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  
  capacityBar: {
    height: 8,
    backgroundColor: '#E1E5E9',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  
  capacityFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  
  capacityText: {
    fontSize: 14,
    color: '#15803D',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Action Container
  actionContainer: {
    marginTop: 20,
  },
  
  saveButton: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  saveButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  cancelButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  
  cancelText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateLocationScreen;
