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
import { maintenanceAPI } from '../api/maintenance';
import { assetAPI } from '../api/assets';

const CreateWorkOrderScreen = ({ navigation, route }) => {
  const { assetId } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assetId: assetId || '',
    workOrderType: 'CORRECTIVE',
    priority: 'MEDIUM',
    scheduledDate: '',
    estimatedDuration: '',
    estimatedCost: '',
    assignedTo: '',
    notes: '',
  });

  useEffect(() => {
    loadAssets();
    if (assetId) {
      // Pre-populate with asset information
      loadAssetInfo(assetId);
    }
  }, [assetId]);

  const loadAssets = async () => {
    try {
      const assetsData = await assetAPI.getAssets();
      setAssets(assetsData.assets || assetsData);
    } catch (error) {
      console.error('Error loading assets:', error);
      Alert.alert('Error', 'Failed to load assets');
    }
  };

  const loadAssetInfo = async (id) => {
    try {
      const asset = await assetAPI.getAsset(id);
      setFormData(prev => ({
        ...prev,
        title: `Maintenance for ${asset.name}`,
        assetId: id
      }));
    } catch (error) {
      console.error('Error loading asset info:', error);
    }
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.title.trim()) errors.push('Title is required');
    if (!formData.description.trim()) errors.push('Description is required');
    if (!formData.assetId) errors.push('Asset selection is required');
    if (!formData.scheduledDate.trim()) errors.push('Scheduled date is required');
    if (formData.estimatedCost && isNaN(parseFloat(formData.estimatedCost))) {
      errors.push('Estimated cost must be a valid number');
    }
    if (formData.estimatedDuration && isNaN(parseFloat(formData.estimatedDuration))) {
      errors.push('Estimated duration must be a valid number');
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
      const workOrderData = {
        ...formData,
        estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : null,
        estimatedDuration: formData.estimatedDuration ? parseFloat(formData.estimatedDuration) : null,
        scheduledDate: formData.scheduledDate,
        assignedTo: formData.assignedTo || null,
      };

      await maintenanceAPI.createWorkOrder(workOrderData);
      Alert.alert('Success', 'Work order created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creating work order:', error);
      Alert.alert('Error', 'Failed to create work order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const workOrderTypes = [
    { label: 'Corrective', value: 'CORRECTIVE' },
    { label: 'Preventive', value: 'PREVENTIVE' },
    { label: 'Emergency', value: 'EMERGENCY' },
    { label: 'Inspection', value: 'INSPECTION' },
    { label: 'Calibration', value: 'CALIBRATION' },
    { label: 'Upgrade', value: 'UPGRADE' },
  ];

  const priorityLevels = [
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' },
  ];

  const getPriorityColor = (priority) => {
    return maintenanceAPI.getMaintenancePriorityColor(priority);
  };

  const generateScheduleSuggestion = () => {
    const now = new Date();
    const urgencyDays = {
      'LOW': 7,
      'MEDIUM': 3,
      'HIGH': 1,
      'CRITICAL': 0
    };
    
    const daysToAdd = urgencyDays[formData.priority] || 3;
    const suggestedDate = new Date(now);
    suggestedDate.setDate(now.getDate() + daysToAdd);
    
    return suggestedDate.toISOString().split('T')[0];
  };

  const handlePriorityChange = (priority) => {
    updateFormData('priority', priority);
    if (!formData.scheduledDate) {
      updateFormData('scheduledDate', generateScheduleSuggestion());
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Create Work Order" />
      
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
                Title *
              </Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(value) => updateFormData('title', value)}
                placeholder="Enter work order title"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Description *
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => updateFormData('description', value)}
                placeholder="Describe the work to be performed"
                multiline
                numberOfLines={3}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Asset Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Asset Selection
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Asset *
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.assetId}
                  onValueChange={(value) => updateFormData('assetId', value)}
                  style={styles.picker}
                  enabled={!assetId}
                >
                  <Picker.Item label="Select Asset" value="" />
                  {assets.map((asset) => (
                    <Picker.Item
                      key={asset.id}
                      label={`${asset.name} (${asset.assetTag})`}
                      value={asset.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Work Order Type
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.workOrderType}
                  onValueChange={(value) => updateFormData('workOrderType', value)}
                  style={styles.picker}
                >
                  {workOrderTypes.map((type) => (
                    <Picker.Item
                      key={type.value}
                      label={type.label}
                      value={type.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Priority
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.priority}
                  onValueChange={handlePriorityChange}
                  style={styles.picker}
                >
                  {priorityLevels.map((priority) => (
                    <Picker.Item
                      key={priority.value}
                      label={priority.label}
                      value={priority.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.suggestionButton}
              onPress={() => updateFormData('scheduledDate', generateScheduleSuggestion())}
            >
              <Ionicons name="bulb" size={16} color="#007AFF" />
              <Text style={styles.suggestionText}>
                Suggest date based on priority
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scheduling */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Scheduling & Estimates
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Scheduled Date *
              </Text>
              <TextInput
                style={styles.input}
                value={formData.scheduledDate}
                onChangeText={(value) => updateFormData('scheduledDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Estimated Duration (hours)
              </Text>
              <TextInput
                style={styles.input}
                value={formData.estimatedDuration}
                onChangeText={(value) => updateFormData('estimatedDuration', value)}
                placeholder="0.0"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Estimated Cost
              </Text>
              <TextInput
                style={styles.input}
                value={formData.estimatedCost}
                onChangeText={(value) => updateFormData('estimatedCost', value)}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Assignment & Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Assignment & Notes
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Assigned To
              </Text>
              <TextInput
                style={styles.input}
                value={formData.assignedTo}
                onChangeText={(value) => updateFormData('assignedTo', value)}
                placeholder="Enter technician name or ID"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Additional Notes
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(value) => updateFormData('notes', value)}
                placeholder="Any additional notes or instructions"
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
                  <Text style={styles.submitButtonText}>Create Work Order</Text>
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
  suggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
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

export default CreateWorkOrderScreen; 