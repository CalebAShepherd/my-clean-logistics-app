// import withScreenLayout from '../components/withScreenLayout';
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, SafeAreaView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { fetchInventoryItem, updateInventoryItem, deleteInventoryItem } from '../api/inventoryItems';
import { fetchSuppliers } from '../api/suppliers';
import { Picker } from '@react-native-picker/picker';
import InternalHeader from '../components/InternalHeader';

function InventoryItemDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { userToken } = useContext(AuthContext);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadItem = async () => {
      setLoading(true);
      try {
        const data = await fetchInventoryItem(userToken, id);
        setItem(data);
        setSku(data.sku);
        setName(data.name);
        setDescription(data.description || '');
        setUnit(data.unit);
        setSelectedSupplier(data.supplierId || '');
      } catch (err) {
        console.error('Error loading item:', err);
        Alert.alert('Error', 'Failed to load item');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    loadItem();
  }, []);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const list = await fetchSuppliers(userToken);
        setSuppliers(list);
      } catch (err) {
        console.error('Error loading suppliers:', err);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    loadSuppliers();
  }, [userToken]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!sku.trim()) {
      newErrors.sku = 'SKU is required';
    }
    if (!name.trim()) {
      newErrors.name = 'Item name is required';
    }
    if (!unit.trim()) {
      newErrors.unit = 'Unit of measure is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }
    
    setSaving(true);
    try {
      const updated = await updateInventoryItem(userToken, id, { 
        sku: sku.trim(), 
        name: name.trim(), 
        description: description.trim(), 
        unit: unit.trim(), 
        supplierId: selectedSupplier || null 
      });
      setItem(updated);
      setIsEditing(false);
      Alert.alert('Success', 'Item updated successfully!');
    } catch (err) {
      console.error('Error updating item:', err);
      Alert.alert('Error', err.message || 'Failed to update item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteItem }
      ]
    );
  };

  const deleteItem = async () => {
    setDeleting(true);
    try {
      await deleteInventoryItem(userToken, id);
      Alert.alert(
        'Item Deleted',
        'The inventory item has been deleted successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err) {
      console.error('Error deleting item:', err);
      Alert.alert('Error', err.message || 'Failed to delete item. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const cancelEdit = () => {
    if (item) {
      setSku(item.sku);
      setName(item.name);
      setDescription(item.description || '');
      setUnit(item.unit);
      setSelectedSupplier(item.supplierId || '');
    }
    setErrors({});
    setIsEditing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Item Details" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading item details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedSupplierData = suppliers.find(s => s.id === selectedSupplier);

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Item Details"
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
              <MaterialCommunityIcons name="package-variant" size={32} color="#007AFF" />
            </View>
            <Text style={styles.headerTitle}>{item?.name}</Text>
            <Text style={styles.headerSubtitle}>SKU: {item?.sku}</Text>
          </View>

          {!isEditing ? (
            <>
              {/* View Mode - Item Information */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="information" size={20} color="#007AFF" />
                  <Text style={styles.cardTitle}>Item Information</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>SKU</Text>
                  <Text style={styles.infoValue}>{item?.sku}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{item?.name}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Description</Text>
                  <Text style={styles.infoValue}>
                    {item?.description || 'No description provided'}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Unit of Measure</Text>
                  <Text style={styles.infoValue}>{item?.unit}</Text>
                </View>
              </View>

              {/* Supplier Information */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="truck" size={20} color="#007AFF" />
                  <Text style={styles.cardTitle}>Supplier Information</Text>
                </View>
                
                {item?.supplier ? (
                  <View style={styles.supplierCard}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#34C759" />
                    <View style={styles.supplierDetails}>
                      <Text style={styles.supplierName}>{item.supplier.name}</Text>
                      <Text style={styles.supplierLabel}>Assigned Supplier</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noSupplierCard}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF9500" />
                    <Text style={styles.noSupplierText}>No supplier assigned</Text>
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
                    <Text style={styles.editText}>Edit Item</Text>
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
                      <Text style={styles.deleteText}>Delete Item</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Edit Mode - Form */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="pencil" size={20} color="#007AFF" />
                  <Text style={styles.cardTitle}>Edit Item Information</Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    SKU <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput 
                    style={[styles.input, errors.sku && styles.inputError]} 
                    value={sku} 
                    onChangeText={(text) => {
                      setSku(text);
                      if (errors.sku) setErrors(prev => ({ ...prev, sku: null }));
                    }}
                    placeholder="e.g. ABC-123"
                    placeholderTextColor="#8E8E93"
                    autoCapitalize="characters"
                  />
                  {errors.sku && <Text style={styles.errorText}>{errors.sku}</Text>}
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Item Name <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput 
                    style={[styles.input, errors.name && styles.inputError]} 
                    value={name} 
                    onChangeText={(text) => {
                      setName(text);
                      if (errors.name) setErrors(prev => ({ ...prev, name: null }));
                    }}
                    placeholder="Enter item name"
                    placeholderTextColor="#8E8E93"
                  />
                  {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput 
                    style={[styles.input, styles.textArea]} 
                    value={description} 
                    onChangeText={setDescription}
                    placeholder="Optional description"
                    placeholderTextColor="#8E8E93"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Unit of Measure <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput 
                    style={[styles.input, errors.unit && styles.inputError]} 
                    value={unit} 
                    onChangeText={(text) => {
                      setUnit(text);
                      if (errors.unit) setErrors(prev => ({ ...prev, unit: null }));
                    }}
                    placeholder="e.g. kg, pcs, liters"
                    placeholderTextColor="#8E8E93"
                  />
                  {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}
                </View>
              </View>

              {/* Edit Supplier */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="truck" size={20} color="#007AFF" />
                  <Text style={styles.cardTitle}>Supplier Information</Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Supplier</Text>
                  
                  {loadingSuppliers ? (
                    <View style={styles.loadingSuppliers}>
                      <ActivityIndicator size="small" color="#007AFF" />
                      <Text style={styles.loadingText}>Loading suppliers...</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.pickerContainer}>
                        <Picker 
                          selectedValue={selectedSupplier} 
                          onValueChange={setSelectedSupplier}
                          style={styles.picker}
                        >
                          <Picker.Item label="No supplier selected" value="" />
                          {suppliers.map((s) => (
                            <Picker.Item key={s.id} label={s.name} value={s.id} />
                          ))}
                        </Picker>
                      </View>
                      
                      {selectedSupplierData && (
                        <View style={styles.supplierInfo}>
                          <MaterialCommunityIcons name="check-circle" size={16} color="#34C759" />
                          <Text style={styles.supplierText}>
                            Selected: {selectedSupplierData.name}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
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
    textAlign: 'center',
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
  
  // Info Display Styles
  infoRow: {
    marginBottom: 16,
  },
  
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  
  infoValue: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 22,
  },
  
  // Supplier Styles
  supplierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  
  supplierDetails: {
    marginLeft: 12,
    flex: 1,
  },
  
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#15803D',
    marginBottom: 2,
  },
  
  supplierLabel: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '500',
  },
  
  noSupplierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  
  noSupplierText: {
    fontSize: 16,
    color: '#D97706',
    fontWeight: '500',
    marginLeft: 12,
  },
  
  // Actions Container
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
  
  textArea: {
    height: 80,
    paddingTop: 14,
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
  
  // Supplier Info
  loadingSuppliers: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  
  supplierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  
  supplierText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
    marginLeft: 6,
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
// export default withScreenLayout(InventoryItemDetailScreen, { title: 'InventoryItemDetail' });
export default InventoryItemDetailScreen;
