import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import InternalHeader from '../components/InternalHeader';
import { facilityMaintenanceAPI } from '../api/facilityMaintenance';
import { AuthContext } from '../context/AuthContext';

const CreateMaintenanceLogScreen = ({ navigation, route }) => {
  const { facilityId, facilityName } = route.params || {};
  const { userToken } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    facilityId: facilityId || '',
    areaId: '',
    maintenanceType: 'ROUTINE',
    title: '',
    description: '',
    priority: 'MEDIUM',
    scheduledDate: new Date(),
    assignedTo: '',
    estimatedCost: '',
    isComplianceRequired: false,
    complianceNotes: ''
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // In a real app, you'd load facilities, areas, and users from APIs
      // For now, we'll use placeholder data
      setFacilities([
        { id: 'demo-facility-1', name: 'Demo Distribution Center' },
        { id: 'demo-facility-2', name: 'Warehouse A' }
      ]);
      
      setAreas([
        { id: 'area-1', name: 'Loading Dock', areaType: 'DOCK' },
        { id: 'area-2', name: 'Storage Area', areaType: 'STORAGE' },
        { id: 'area-3', name: 'Office Space', areaType: 'OFFICE' }
      ]);

      setUsers([
        { id: 'user-1', username: 'John Doe', email: 'john@example.com' },
        { id: 'user-2', username: 'Jane Smith', email: 'jane@example.com' }
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange('scheduledDate', selectedDate);
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title');
      return false;
    }
    
    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return false;
    }

    if (!formData.facilityId) {
      Alert.alert('Validation Error', 'Please select a facility');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const logData = {
        ...formData,
        estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : null,
        scheduledDate: formData.scheduledDate.toISOString()
      };

      await facilityMaintenanceAPI.createMaintenanceLog(logData, userToken);
      
      Alert.alert(
        'Success',
        'Maintenance log created successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error creating maintenance log:', error);
      Alert.alert('Error', 'Failed to create maintenance log');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Create Maintenance Log"
        rightIcons={[
          {
            icon: 'checkmark',
            onPress: handleSubmit,
            color: '#007AFF',
            disabled: loading
          }
        ]}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.title}
                onChangeText={(value) => handleInputChange('title', value)}
                placeholder="e.g., HVAC System Maintenance"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                placeholder="Detailed description of maintenance work needed..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Facility *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.facilityId}
                  onValueChange={(value) => handleInputChange('facilityId', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Facility" value="" />
                  {facilities.map((facility) => (
                    <Picker.Item
                      key={facility.id}
                      label={facility.name}
                      value={facility.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Area (Optional)</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.areaId}
                  onValueChange={(value) => handleInputChange('areaId', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Area" value="" />
                  {areas.map((area) => (
                    <Picker.Item
                      key={area.id}
                      label={`${area.name} (${area.areaType})`}
                      value={area.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Maintenance Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Maintenance Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.maintenanceType}
                  onValueChange={(value) => handleInputChange('maintenanceType', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Routine" value="ROUTINE" />
                  <Picker.Item label="Preventive" value="PREVENTIVE" />
                  <Picker.Item label="Corrective" value="CORRECTIVE" />
                  <Picker.Item label="Emergency" value="EMERGENCY" />
                  <Picker.Item label="Inspection" value="INSPECTION" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.priority}
                  onValueChange={(value) => handleInputChange('priority', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Low" value="LOW" />
                  <Picker.Item label="Medium" value="MEDIUM" />
                  <Picker.Item label="High" value="HIGH" />
                  <Picker.Item label="Critical" value="CRITICAL" />
                </Picker>
              </View>
            </View>
          </View>

          {/* Scheduling */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scheduling</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Scheduled Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color="#6B7280" />
                <Text style={styles.dateText}>{formatDate(formData.scheduledDate)}</Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Assign To (Optional)</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.assignedTo}
                  onValueChange={(value) => handleInputChange('assignedTo', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Unassigned" value="" />
                  {users.map((user) => (
                    <Picker.Item
                      key={user.id}
                      label={user.username}
                      value={user.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Cost & Compliance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cost & Compliance</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Estimated Cost ($)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.estimatedCost}
                onChangeText={(value) => handleInputChange('estimatedCost', value)}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.switchGroup}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.label}>Compliance Required</Text>
                <Text style={styles.switchDescription}>
                  Enable if this maintenance requires compliance documentation
                </Text>
              </View>
              <Switch
                value={formData.isComplianceRequired}
                onValueChange={(value) => handleInputChange('isComplianceRequired', value)}
                trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                thumbColor={formData.isComplianceRequired ? '#FFFFFF' : '#F9FAFB'}
              />
            </View>

            {formData.isComplianceRequired && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Compliance Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.complianceNotes}
                  onChangeText={(value) => handleInputChange('complianceNotes', value)}
                  placeholder="Enter compliance requirements and documentation notes..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitText}>
              {loading ? 'Creating...' : 'Create Maintenance Log'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={formData.scheduledDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  scrollView: {
    flex: 1
  },
  formContainer: {
    padding: 20
  },

  // Sections
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16
  },

  // Form Inputs
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF'
  },
  textArea: {
    minHeight: 100
  },

  // Picker
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF'
  },
  picker: {
    height: 50,
    color: '#111827'
  },

  // Date Picker
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF'
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12
  },

  // Switch
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16
  },
  switchDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },

  // Submit Button
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  submitText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  }
});

export default CreateMaintenanceLogScreen; 