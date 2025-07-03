import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import InternalHeader from '../components/InternalHeader';
import { assetAPI } from '../api/assets';
import { suppliersAPI } from '../api/suppliers';
import { warehousesAPI } from '../api/warehouses';
import { locationsAPI } from '../api/locations';

const CreateAssetScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    assetTag: '',
    category: 'WAREHOUSE_EQUIPMENT',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    purchasePrice: '',
    warrantyExpiryDate: '',
    supplierId: '',
    warehouseId: '',
    locationId: '',
    condition: 'GOOD',
    status: 'ACTIVE',
    description: '',
    specifications: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [suppliersData, warehousesData] = await Promise.all([
        suppliersAPI.getSuppliers(),
        warehousesAPI.getWarehouses(),
      ]);
      setSuppliers(suppliersData.suppliers || suppliersData);
      setWarehouses(warehousesData.warehouses || warehousesData);
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load initial data');
    }
  };

  const loadLocations = async (warehouseId) => {
    if (!warehouseId) {
      setLocations([]);
      return;
    }
    try {
      const locationsData = await locationsAPI.getLocationsByWarehouse(warehouseId);
      setLocations(locationsData.locations || locationsData);
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    }
  };

  const handleWarehouseChange = (warehouseId) => {
    setFormData(prev => ({ ...prev, warehouseId, locationId: '' }));
    loadLocations(warehouseId);
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.name.trim()) errors.push('Asset name is required');
    if (!formData.assetTag.trim()) errors.push('Asset tag is required');
    if (!formData.category) errors.push('Category is required');
    if (formData.purchasePrice && isNaN(parseFloat(formData.purchasePrice))) {
      errors.push('Purchase price must be a valid number');
    }

    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const assetData = {
        ...formData,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        purchaseDate: formData.purchaseDate || null,
        warrantyExpiryDate: formData.warrantyExpiryDate || null,
        supplierId: formData.supplierId || null,
        warehouseId: formData.warehouseId || null,
        locationId: formData.locationId || null,
      };

      await assetAPI.createAsset(assetData);
      Alert.alert('Success', 'Asset created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creating asset:', error);
      Alert.alert('Error', 'Failed to create asset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const assetCategories = [
    { label: 'Warehouse Equipment', value: 'WAREHOUSE_EQUIPMENT' },
    { label: 'Material Handling', value: 'MATERIAL_HANDLING' },
    { label: 'Transportation', value: 'TRANSPORTATION' },
    { label: 'Facility Infrastructure', value: 'FACILITY_INFRASTRUCTURE' },
    { label: 'IT Equipment', value: 'IT_EQUIPMENT' },
    { label: 'Safety Equipment', value: 'SAFETY_EQUIPMENT' },
    { label: 'Office Equipment', value: 'OFFICE_EQUIPMENT' },
    { label: 'Other', value: 'OTHER' },
  ];

  const assetConditions = [
    { label: 'Excellent', value: 'EXCELLENT' },
    { label: 'Good', value: 'GOOD' },
    { label: 'Fair', value: 'FAIR' },
    { label: 'Poor', value: 'POOR' },
    { label: 'Critical', value: 'CRITICAL' },
  ];

  const assetStatuses = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
    { label: 'Retired', value: 'RETIRED' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Add New Asset" />
      
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Basic Information
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Asset Name *
              </Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                placeholder="Enter asset name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Asset Tag *
              </Text>
              <TextInput
                style={styles.input}
                value={formData.assetTag}
                onChangeText={(value) => updateFormData('assetTag', value)}
                placeholder="Enter asset tag/number"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Category *
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.category}
                  onValueChange={(value) => updateFormData('category', value)}
                  style={styles.picker}
                >
                  {assetCategories.map((category) => (
                    <Picker.Item
                      key={category.value}
                      label={category.label}
                      value={category.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Model
              </Text>
              <TextInput
                style={styles.input}
                value={formData.model}
                onChangeText={(value) => updateFormData('model', value)}
                placeholder="Enter model number"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Serial Number
              </Text>
              <TextInput
                style={styles.input}
                value={formData.serialNumber}
                onChangeText={(value) => updateFormData('serialNumber', value)}
                placeholder="Enter serial number"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Purchase Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Purchase Information
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Purchase Date
              </Text>
              <TextInput
                style={styles.input}
                value={formData.purchaseDate}
                onChangeText={(value) => updateFormData('purchaseDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Purchase Price
              </Text>
              <TextInput
                style={styles.input}
                value={formData.purchasePrice}
                onChangeText={(value) => updateFormData('purchasePrice', value)}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Warranty Expiry Date
              </Text>
              <TextInput
                style={styles.input}
                value={formData.warrantyExpiryDate}
                onChangeText={(value) => updateFormData('warrantyExpiryDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Supplier
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.supplierId}
                  onValueChange={(value) => updateFormData('supplierId', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Supplier" value="" />
                  {suppliers.map((supplier) => (
                    <Picker.Item
                      key={supplier.id}
                      label={supplier.name}
                      value={supplier.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Location Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Location Information
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Warehouse
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.warehouseId}
                  onValueChange={handleWarehouseChange}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Warehouse" value="" />
                  {warehouses.map((warehouse) => (
                    <Picker.Item
                      key={warehouse.id}
                      label={warehouse.name}
                      value={warehouse.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Location
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.locationId}
                  onValueChange={(value) => updateFormData('locationId', value)}
                  style={styles.picker}
                  enabled={locations.length > 0}
                >
                  <Picker.Item label="Select Location" value="" />
                  {locations.map((location) => (
                    <Picker.Item
                      key={location.id}
                      label={location.name}
                      value={location.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Status Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Status Information
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Condition
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.condition}
                  onValueChange={(value) => updateFormData('condition', value)}
                  style={styles.picker}
                >
                  {assetConditions.map((condition) => (
                    <Picker.Item
                      key={condition.value}
                      label={condition.label}
                      value={condition.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Status
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.status}
                  onValueChange={(value) => updateFormData('status', value)}
                  style={styles.picker}
                >
                  {assetStatuses.map((status) => (
                    <Picker.Item
                      key={status.value}
                      label={status.label}
                      value={status.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Additional Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Additional Information
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Description
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => updateFormData('description', value)}
                placeholder="Enter asset description"
                multiline
                numberOfLines={3}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Technical Specifications
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.specifications}
                onChangeText={(value) => updateFormData('specifications', value)}
                placeholder="Enter technical specifications"
                multiline
                numberOfLines={3}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Create Asset</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    marginBottom: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  picker: {
    color: '#111827',
  },
  submitContainer: {
    padding: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CreateAssetScreen; 