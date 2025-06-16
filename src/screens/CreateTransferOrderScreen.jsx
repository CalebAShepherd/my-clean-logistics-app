import React, { useEffect, useState, useContext } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { fetchWarehouses } from '../api/warehouses';
import { fetchWarehouseItems } from '../api/warehouseItems';
import { createTransferOrder } from '../api/transferOrders';
import InternalHeader from '../components/InternalHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';

function CreateTransferOrderScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouses, setWarehouses] = useState([]);
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [items, setItems] = useState([]);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (fromWarehouse) {
      loadItems();
    } else {
      setItems([]);
      setItemId('');
    }
  }, [fromWarehouse]);

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const data = await fetchWarehouses(userToken);
      setWarehouses(data || []);
      if (data && data.length > 0) {
        setFromWarehouse(data[0].id);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
      Alert.alert('Error', 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    if (!fromWarehouse) return;
    
    setLoadingItems(true);
    try {
      const data = await fetchWarehouseItems(userToken, { warehouseId: fromWarehouse });
      setItems(data || []);
      setItemId(''); // Reset selected item when warehouse changes
    } catch (error) {
      console.error('Error loading items:', error);
      Alert.alert('Error', 'Failed to load warehouse items');
    } finally {
      setLoadingItems(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!fromWarehouse) {
      newErrors.fromWarehouse = 'Source warehouse is required';
    }
    
    if (!toWarehouse) {
      newErrors.toWarehouse = 'Destination warehouse is required';
    }
    
    if (fromWarehouse === toWarehouse) {
      newErrors.toWarehouse = 'Destination must be different from source';
    }
    
    if (!itemId) {
      newErrors.itemId = 'Item selection is required';
    }
    
    if (!quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else {
      const qty = parseInt(quantity.trim(), 10);
      if (isNaN(qty) || qty <= 0) {
        newErrors.quantity = 'Quantity must be a positive number';
      }
      
      // Check available quantity
      const selectedItem = items.find(item => item.itemId === itemId);
      if (selectedItem && qty > selectedItem.quantity) {
        newErrors.quantity = `Only ${selectedItem.quantity} available in stock`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const onSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors below before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await createTransferOrder(userToken, { 
        fromWarehouseId: fromWarehouse, 
        toWarehouseId: toWarehouse, 
        itemId, 
        quantity: parseInt(quantity.trim(), 10) 
      });
      Alert.alert('Success', 'Transfer order created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creating transfer order:', error);
      Alert.alert('Error', error.message || 'Failed to create transfer order');
    } finally {
      setSubmitting(false);
    }
  };

  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : 'Unknown Warehouse';
  };

  const getSelectedItem = () => {
    return items.find(item => item.itemId === itemId);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Loading..." />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading warehouse information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Create Transfer Order" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Visual Header Section */}
          <View style={styles.visualHeader}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="swap-horizontal" size={48} color="#007AFF" />
            </View>
            <Text style={styles.headerTitle}>Create Transfer Order</Text>
            <Text style={styles.headerSubtitle}>
              Move inventory between warehouse locations
            </Text>
          </View>

          {/* Transfer Direction Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Transfer Direction</Text>
            <Text style={styles.cardSubtitle}>
              Select source and destination warehouses
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                From Warehouse <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.pickerContainer, errors.fromWarehouse && styles.pickerError]}>
                <MaterialCommunityIcons name="warehouse" size={20} color="#007AFF" />
                <Picker 
                  selectedValue={fromWarehouse} 
                  onValueChange={(value) => {
                    setFromWarehouse(value);
                    clearError('fromWarehouse');
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select source warehouse" value="" />
                  {warehouses.map(w => (
                    <Picker.Item key={w.id} label={w.name} value={w.id} />
                  ))}
                </Picker>
              </View>
              {errors.fromWarehouse && (
                <Text style={styles.errorText}>{errors.fromWarehouse}</Text>
              )}
            </View>

            <View style={styles.transferArrow}>
              <MaterialCommunityIcons name="arrow-down" size={24} color="#007AFF" />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                To Warehouse <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.pickerContainer, errors.toWarehouse && styles.pickerError]}>
                <MaterialCommunityIcons name="warehouse" size={20} color="#34C759" />
                <Picker 
                  selectedValue={toWarehouse} 
                  onValueChange={(value) => {
                    setToWarehouse(value);
                    clearError('toWarehouse');
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select destination warehouse" value="" />
                  {warehouses.map(w => (
                    <Picker.Item key={w.id} label={w.name} value={w.id} />
                  ))}
                </Picker>
              </View>
              {errors.toWarehouse && (
                <Text style={styles.errorText}>{errors.toWarehouse}</Text>
              )}
            </View>
          </View>

          {/* Item Selection Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Item Selection</Text>
            <Text style={styles.cardSubtitle}>
              Choose item and quantity to transfer
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                Item <Text style={styles.required}>*</Text>
              </Text>
              {loadingItems ? (
                <View style={styles.loadingItemsContainer}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.loadingItemsText}>Loading items...</Text>
                </View>
              ) : (
                <View style={[styles.pickerContainer, errors.itemId && styles.pickerError]}>
                  <MaterialCommunityIcons name="package-variant" size={20} color="#FF9500" />
                  <Picker 
                    selectedValue={itemId} 
                    onValueChange={(value) => {
                      setItemId(value);
                      clearError('itemId');
                    }}
                    style={styles.picker}
                    enabled={items.length > 0}
                  >
                    <Picker.Item label="Select item to transfer" value="" />
                    {items.map(item => (
                      <Picker.Item 
                        key={item.itemId} 
                        label={`${item.InventoryItem?.name || item.itemId} (${item.quantity} available)`} 
                        value={item.itemId} 
                      />
                    ))}
                  </Picker>
                </View>
              )}
              {errors.itemId && (
                <Text style={styles.errorText}>{errors.itemId}</Text>
              )}
              {!fromWarehouse && (
                <Text style={styles.fieldHint}>Select a source warehouse first</Text>
              )}
              {fromWarehouse && items.length === 0 && !loadingItems && (
                <Text style={styles.fieldHint}>No items available in selected warehouse</Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                Quantity <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.quantityContainer}>
                <View style={[styles.quantityInput, errors.quantity && styles.inputError]}>
                  <MaterialCommunityIcons name="counter" size={20} color="#AF52DE" />
                  <TextInput
                    style={styles.quantityTextInput}
                    value={quantity}
                    onChangeText={(text) => {
                      setQuantity(text);
                      clearError('quantity');
                    }}
                    keyboardType="numeric"
                    placeholder="Enter quantity"
                    placeholderTextColor="#8E8E93"
                    editable={!!itemId}
                  />
                </View>
                {getSelectedItem() && (
                  <View style={styles.availableContainer}>
                    <Text style={styles.availableLabel}>Available:</Text>
                    <Text style={styles.availableQuantity}>{getSelectedItem().quantity}</Text>
                  </View>
                )}
              </View>
              {errors.quantity && (
                <Text style={styles.errorText}>{errors.quantity}</Text>
              )}
            </View>
          </View>

          {/* Summary Card */}
          {fromWarehouse && toWarehouse && itemId && quantity && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <MaterialCommunityIcons name="clipboard-check" size={20} color="#34C759" />
                <Text style={styles.summaryTitle}>Transfer Summary</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>From:</Text>
                <Text style={styles.summaryValue}>{getWarehouseName(fromWarehouse)}</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>To:</Text>
                <Text style={styles.summaryValue}>{getWarehouseName(toWarehouse)}</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Item:</Text>
                <Text style={styles.summaryValue}>
                  {getSelectedItem()?.InventoryItem?.name || itemId}
                </Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Quantity:</Text>
                <Text style={styles.summaryValue}>{quantity}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity 
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={onSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={submitting ? ['#C7C7CC', '#C7C7CC'] : ['#007AFF', '#0056CC']}
              style={styles.submitGradient}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.submitText}>Create Transfer Order</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F2F2F7' 
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: { 
    padding: 16,
    paddingBottom: 120,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },

  // Visual Header
  visualHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    lineHeight: 20,
  },

  // Form Fields
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: { 
    fontSize: 16,
    color: '#1C1C1E', 
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  fieldHint: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 6,
    lineHeight: 18,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 6,
    lineHeight: 18,
  },

  // Picker Styles
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  pickerError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  picker: {
    flex: 1,
    height: 50,
  },

  // Transfer Arrow
  transferArrow: {
    alignItems: 'center',
    marginVertical: 16,
  },

  // Loading Items
  loadingItemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    gap: 12,
  },
  loadingItemsText: {
    fontSize: 16,
    color: '#8E8E93',
  },

  // Quantity Input
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  quantityTextInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1C1C1E',
  },
  availableContainer: {
    alignItems: 'center',
    backgroundColor: '#E8F8EA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  availableLabel: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  availableQuantity: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: '700',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1E7FF',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
    marginLeft: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    width: 80,
  },
  summaryValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
    flex: 1,
  },

  // Submit Button
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default CreateTransferOrderScreen; 