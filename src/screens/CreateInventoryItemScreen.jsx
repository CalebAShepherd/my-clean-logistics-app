//  import withScreenLayout from '../components/withScreenLayout';
import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView, Alert, SafeAreaView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { createInventoryItem } from '../api/inventoryItems';
import { fetchSuppliers } from '../api/suppliers';
import { Picker } from '@react-native-picker/picker';
import InternalHeader from '../components/InternalHeader';

function CreateInventoryItemScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [errors, setErrors] = useState({});

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

  const onSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }
    
    setLoading(true);
    try {
      await createInventoryItem(userToken, { 
        sku: sku.trim(), 
        name: name.trim(), 
        description: description.trim(), 
        unit: unit.trim(), 
        supplierId: selectedSupplier || null 
      });
      
      Alert.alert(
        'Success',
        'Inventory item created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err) {
      console.error('Error creating item:', err);
      Alert.alert('Error', err.message || 'Failed to create inventory item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedSupplierData = suppliers.find(s => s.id === selectedSupplier);

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Create Inventory Item" />
      
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
              <MaterialCommunityIcons name="package-variant-closed" size={32} color="#007AFF" />
            </View>
            <Text style={styles.headerTitle}>New Inventory Item</Text>
            <Text style={styles.headerSubtitle}>Add a new item to your inventory management system</Text>
          </View>

          {/* Basic Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="information" size={20} color="#007AFF" />
              <Text style={styles.cardTitle}>Basic Information</Text>
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

          {/* Supplier Information Card */}
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

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#C7C7CC', '#C7C7CC'] : ['#007AFF', '#5856D6']}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialCommunityIcons name="plus-circle" size={20} color="white" />
                )}
                <Text style={styles.submitText}>
                  {loading ? 'Creating...' : 'Create Item'}
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
  
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
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
  
  // Action Container
  actionContainer: {
    marginTop: 20,
  },
  
  submitButton: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  submitButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  
  submitText: {
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
// export default withScreenLayout(CreateInventoryItemScreen, { title: 'CreateInventoryItem' });
export default CreateInventoryItemScreen;
