// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, SafeAreaView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { fetchLocation, updateLocation, deleteLocation } from '../api/locations';
import InternalHeader from '../components/InternalHeader';
import { Picker } from '@react-native-picker/picker';
import { fetchWarehouseItems, updateWarehouseItem, createWarehouseItem } from '../api/warehouseItems';
import { fetchInventoryItems } from '../api/inventoryItems';

function LocationDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { userToken } = useContext(AuthContext);
  const [location, setLocation] = useState(null);
  const [zone, setZone] = useState('');
  const [aisle, setAisle] = useState('');
  const [shelf, setShelf] = useState('');
  const [bin, setBin] = useState('');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [maxThreshold, setMaxThreshold] = useState('');
  const [warehouseItem, setWarehouseItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [locationData, inventoryItems] = await Promise.all([
          fetchLocation(userToken, id),
          fetchInventoryItems(userToken)
        ]);
        
        setLocation(locationData);
        setZone(locationData.zone);
        setAisle(locationData.aisle || '');
        setShelf(locationData.shelf);
        setBin(locationData.bin);
        
        setInventoryItems(inventoryItems);
        
        // Load warehouse items for this location
        const warehouseItems = await fetchWarehouseItems(userToken, { 
          warehouseId: locationData.warehouseId, 
          locationId: id 
        });
        
        if (warehouseItems.length > 0) {
          const w = warehouseItems[0];
          setWarehouseItem(w);
          setItemId(w.itemId);
          setQuantity(w.quantity.toString());
          setMaxThreshold((w.maxThreshold ?? '').toString());
        }
      } catch (err) {
        console.error('Error loading location:', err);
        Alert.alert('Error', 'Failed to load location details. Please try again.');
        navigation.goBack();
      } finally {
        setLoading(false);
        setLoadingInventory(false);
      }
    };
    loadData();
  }, [id]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!zone.trim()) {
      newErrors.zone = 'Zone is required';
    }
    if (!shelf.trim()) {
      newErrors.shelf = 'Shelf is required';
      }
    if (!bin.trim()) {
      newErrors.bin = 'Bin is required';
    }
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
      const updatedLoc = await updateLocation(userToken, id, { 
        zone: zone.trim(), 
        aisle: aisle.trim(), 
        shelf: shelf.trim(), 
        bin: bin.trim() 
      });
      setLocation(updatedLoc);
      
      if (warehouseItem) {
        const updatedW = await updateWarehouseItem(userToken, location.warehouseId, itemId, {
          locationId: id,
          quantity: parseInt(quantity, 10),
          maxThreshold: parseInt(maxThreshold, 10),
        });
        setWarehouseItem(updatedW);
      } else {
        const newW = await createWarehouseItem(userToken, {
          warehouseId: location.warehouseId,
          itemId,
          locationId: id,
          quantity: parseInt(quantity, 10),
          maxThreshold: parseInt(maxThreshold, 10),
        });
        setWarehouseItem(newW);
      }
      
      setIsEditing(false);
      Alert.alert('Success', 'Location updated successfully!');
    } catch (err) {
      console.error('Error updating location:', err);
      Alert.alert('Error', err.message || 'Failed to update location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete location "${zone}-${shelf}-${bin}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteItem }
      ]
    );
  };

  const deleteItem = async () => {
    setDeleting(true);
    try {
      await deleteLocation(userToken, id);
      Alert.alert(
        'Location Deleted',
        'The location has been removed successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err) {
      console.error('Error deleting location:', err);
      Alert.alert('Error', err.message || 'Failed to delete location. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const cancelEdit = () => {
    if (location) {
      setZone(location.zone);
      setAisle(location.aisle || '');
      setShelf(location.shelf);
      setBin(location.bin);
    }
    if (warehouseItem) {
      setItemId(warehouseItem.itemId);
      setQuantity(warehouseItem.quantity.toString());
      setMaxThreshold((warehouseItem.maxThreshold ?? '').toString());
    }
    setErrors({});
    setIsEditing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Location Details" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading location details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedItem = inventoryItems.find(item => item.id === itemId);
  const locationCode = `${zone}-${shelf}-${bin}`;
  const capacityPercentage = quantity && maxThreshold ? Math.round((parseInt(quantity) / parseInt(maxThreshold)) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Location Details"
        rightIcons={!isEditing ? [
          {
            icon: 'pencil',
            color: '#007AFF',
            onPress: () => setIsEditing(true)
          },
          {
            icon: 'delete',
            color: '#FF3B30',
            onPress: onDelete
          }
        ] : []}
      />
      
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
              <MaterialCommunityIcons name="map-marker" size={32} color="#007AFF" />
            </View>
            <Text style={styles.headerTitle}>{locationCode}</Text>
            <Text style={styles.headerSubtitle}>
              {location?.warehouse?.name || 'Storage Location'}
            </Text>
          </View>

          {!isEditing ? (
            <>
              {/* View Mode - Location Information */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="information" size={20} color="#007AFF" />
                  <Text style={styles.cardTitle}>Location Information</Text>
                </View>
                
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Zone</Text>
                    <Text style={styles.infoValue}>{location?.zone}</Text>
                  </View>
                  
                  {location?.aisle && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Aisle</Text>
                      <Text style={styles.infoValue}>{location.aisle}</Text>
                    </View>
                  )}
                  
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Shelf</Text>
                    <Text style={styles.infoValue}>{location?.shelf}</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Bin</Text>
                    <Text style={styles.infoValue}>{location?.bin}</Text>
                  </View>
                </View>
                
                {location?.x !== undefined && location?.y !== undefined && (
                  <View style={styles.coordinatesSection}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={16} color="#5856D6" />
                    <Text style={styles.coordinatesText}>
                      Position: ({location.x}, {location.y})
                    </Text>
                  </View>
                )}
              </View>

              {/* Current Inventory */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="package-variant" size={20} color="#34C759" />
                  <Text style={styles.cardTitle}>Current Inventory</Text>
                </View>
                
                {warehouseItem && selectedItem ? (
                  <>
                    <View style={styles.inventoryInfo}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>{selectedItem.name}</Text>
                        <Text style={styles.itemSku}>SKU: {selectedItem.sku}</Text>
                        <Text style={styles.itemUnit}>Unit: {selectedItem.unit}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.quantitySection}>
                      <View style={styles.quantityStats}>
                        <View style={styles.quantityStat}>
                          <Text style={styles.quantityNumber}>{warehouseItem.quantity}</Text>
                          <Text style={styles.quantityLabel}>Current Stock</Text>
                        </View>
                        <View style={styles.quantityStat}>
                          <Text style={styles.quantityNumber}>{warehouseItem.maxThreshold}</Text>
                          <Text style={styles.quantityLabel}>Max Capacity</Text>
                        </View>
                        <View style={styles.quantityStat}>
                          <Text style={[styles.quantityNumber, { color: capacityPercentage > 90 ? '#FF3B30' : capacityPercentage > 70 ? '#FF9500' : '#34C759' }]}>
                            {capacityPercentage}%
                          </Text>
                          <Text style={styles.quantityLabel}>Capacity Used</Text>
                        </View>
                      </View>
                      
                      <View style={styles.capacityBar}>
                        <LinearGradient
                          colors={capacityPercentage > 90 ? ['#FF3B30', '#FF6B6B'] : capacityPercentage > 70 ? ['#FF9500', '#FFAD33'] : ['#34C759', '#30D158']}
                          style={[styles.capacityFill, { width: `${Math.min(capacityPercentage, 100)}%` }]}
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyInventory}>
                    <MaterialCommunityIcons name="package-variant-closed" size={48} color="#C7C7CC" />
                    <Text style={styles.emptyInventoryText}>No inventory assigned</Text>
                    <Text style={styles.emptyInventorySubtext}>This location is currently empty</Text>
                  </View>
                )}
              </View>

              {/* Quick Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={() => setIsEditing(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#007AFF', '#5856D6']}
                    style={styles.editGradient}
                  >
                    <MaterialCommunityIcons name="pencil" size={20} color="white" />
                    <Text style={styles.editText}>Edit Location</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.deleteButton} 
                  onPress={onDelete}
                  activeOpacity={0.8}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="delete" size={20} color="#FF3B30" />
                      <Text style={styles.deleteText}>Delete Location</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Edit Mode - Location Details */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="pencil" size={20} color="#007AFF" />
                  <Text style={styles.cardTitle}>Edit Location Details</Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Zone <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput 
                    style={[styles.input, errors.zone && styles.inputError]} 
                    value={zone} 
                    onChangeText={(text) => {
                      setZone(text);
                      if (errors.zone) setErrors(prev => ({ ...prev, zone: null }));
                    }}
                    placeholder="e.g. A, B, C"
                    placeholderTextColor="#8E8E93"
                    autoCapitalize="characters"
                  />
                  {errors.zone && <Text style={styles.errorText}>{errors.zone}</Text>}
                </View>
                
                <View style={styles.formGroup}>
      <Text style={styles.label}>Aisle</Text>
                  <TextInput 
                    style={styles.input} 
                    value={aisle} 
                    onChangeText={setAisle}
                    placeholder="Optional aisle identifier"
                    placeholderTextColor="#8E8E93"
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Shelf <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput 
                    style={[styles.input, errors.shelf && styles.inputError]} 
                    value={shelf} 
                    onChangeText={(text) => {
                      setShelf(text);
                      if (errors.shelf) setErrors(prev => ({ ...prev, shelf: null }));
                    }}
                    placeholder="e.g. 01, 02, 03"
                    placeholderTextColor="#8E8E93"
                  />
                  {errors.shelf && <Text style={styles.errorText}>{errors.shelf}</Text>}
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Bin <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput 
                    style={[styles.input, errors.bin && styles.inputError]} 
                    value={bin} 
                    onChangeText={(text) => {
                      setBin(text);
                      if (errors.bin) setErrors(prev => ({ ...prev, bin: null }));
                    }}
                    placeholder="e.g. A, B, C"
                    placeholderTextColor="#8E8E93"
                    autoCapitalize="characters"
                  />
                  {errors.bin && <Text style={styles.errorText}>{errors.bin}</Text>}
                </View>
              </View>

              {/* Edit Inventory */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="package-variant" size={20} color="#34C759" />
                  <Text style={styles.cardTitle}>Inventory Assignment</Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Item <Text style={styles.required}>*</Text>
                  </Text>
                  
                  {loadingInventory ? (
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
        {inventoryItems.map(it => (
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
                      Quantity <Text style={styles.required}>*</Text>
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
                      style={styles.capacityBarPreview}
                    >
                      <View style={[
                        styles.capacityFillPreview,
                        { width: `${Math.min((parseInt(quantity) / parseInt(maxThreshold)) * 100, 100)}%` }
                      ]} />
                    </LinearGradient>
                    <Text style={styles.capacityTextPreview}>
                      {quantity} / {maxThreshold} ({Math.round((parseInt(quantity) / parseInt(maxThreshold)) * 100)}% full)
                    </Text>
                  </View>
                )}
              </View>

              {/* Edit Actions */}
              <View style={styles.editActionsContainer}>
                <TouchableOpacity 
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                  onPress={onSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={saving ? ['#C7C7CC', '#C7C7CC'] : ['#34C759', '#30D158']}
                    style={styles.saveGradient}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <MaterialCommunityIcons name="content-save" size={20} color="white" />
                    )}
                    <Text style={styles.saveText}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={cancelEdit}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
      </View>
            </>
          )}
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
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
  
  // Info Display (View Mode)
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  
  coordinatesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  
  coordinatesText: {
    fontSize: 14,
    color: '#5856D6',
    fontWeight: '500',
    marginLeft: 6,
  },
  
  // Inventory Info
  inventoryInfo: {
    marginBottom: 20,
  },
  
  itemHeader: {
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#15803D',
    marginBottom: 4,
  },
  
  itemSku: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '500',
    marginBottom: 2,
  },
  
  itemUnit: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '500',
  },
  
  // Quantity Section
  quantitySection: {
    // Container styling
  },
  
  quantityStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  
  quantityStat: {
    alignItems: 'center',
    flex: 1,
  },
  
  quantityNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  
  quantityLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  capacityBar: {
    height: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  
  capacityFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  // Empty Inventory
  emptyInventory: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  
  emptyInventoryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 4,
  },
  
  emptyInventorySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },
  
  // Actions (View Mode)
  actionsContainer: {
    marginTop: 20,
  },
  
  editButton: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  editGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  
  editText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  
  deleteText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Form Styles (Edit Mode)
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
  
  // Inventory Inputs
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
  
  capacityBarPreview: {
    height: 8,
    backgroundColor: '#E1E5E9',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  
  capacityFillPreview: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  
  capacityTextPreview: {
    fontSize: 14,
    color: '#15803D',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Edit Actions
  editActionsContainer: {
    marginTop: 20,
  },
  
  saveButton: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#34C759',
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

export default LocationDetailScreen;
