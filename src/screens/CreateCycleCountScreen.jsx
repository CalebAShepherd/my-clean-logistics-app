import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || `http://${localhost}:3000`;
// Optional date time picker - will gracefully handle if not available
let DateTimePicker;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
  console.warn('DateTimePicker not available:', error);
  DateTimePicker = null;
}

const CreateCycleCountScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userToken } = useContext(AuthContext);
  const { warehouseId } = route.params;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    countType: 'RANDOM',
    frequency: 'MONTHLY',
    scheduledDate: new Date(),
    assignedToId: '',
    settings: {
      taskCount: 10,
      includeZeroQty: false,
      minValue: 0,
      maxValue: null
    }
  });

  const [availableUsers, setAvailableUsers] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const countTypes = [
    { value: 'RANDOM', label: 'Random Selection', description: 'Randomly select items across the warehouse' },
    { value: 'ABC_ANALYSIS', label: 'ABC Analysis', description: 'Prioritize high-value items' },
    { value: 'VELOCITY_BASED', label: 'Velocity Based', description: 'Focus on fast-moving items' },
    { value: 'LOCATION_BASED', label: 'Location Based', description: 'Count by specific zones/areas' },
    { value: 'FULL_WAREHOUSE', label: 'Full Warehouse', description: 'Count all items in warehouse' }
  ];

  const frequencies = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'ANNUALLY', label: 'Annually' },
    { value: 'CUSTOM', label: 'One-time' }
  ];

  useEffect(() => {
    loadAvailableUsers();
    generateDefaultName();
  }, []);

  const loadAvailableUsers = async () => {
    try {
      if (!userToken) return;
      const response = await fetch(
        `${API_URL}/users?role=warehouse_admin`,
        {
          headers: { 'Authorization': `Bearer ${userToken}` }
        }
      );

      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const generateDefaultName = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString();
    setFormData(prev => ({
      ...prev,
      name: `Cycle Count - ${dateStr}`
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSettingsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange('scheduledDate', selectedDate);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a name for the cycle count');
      return false;
    }

    if (formData.scheduledDate < new Date().setHours(0, 0, 0, 0)) {
      Alert.alert('Error', 'Scheduled date cannot be in the past');
      return false;
    }

    if (formData.settings.taskCount < 1 || formData.settings.taskCount > 100) {
      Alert.alert('Error', 'Task count must be between 1 and 100');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (!userToken) {
        Alert.alert('Authentication Error', 'Please log in again');
        return;
      }
      const response = await fetch(
        `${API_URL}/cycle-counts/warehouse/${warehouseId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formData,
            warehouseId,
            scheduledDate: formData.scheduledDate.toISOString()
          })
        }
      );

      if (response.ok) {
        const newCycleCount = await response.json();
        Alert.alert(
          'Success',
          'Cycle count created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
                // Navigate to the new cycle count details
                navigation.navigate('CycleCountDetails', { 
                  cycleCountId: newCycleCount.id 
                });
              }
            }
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to create cycle count');
      }
    } catch (error) {
      console.error('Error creating cycle count:', error);
      Alert.alert('Error', 'Failed to create cycle count');
    } finally {
      setLoading(false);
    }
  };

  const renderCountTypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Count Type</Text>
      {countTypes.map(type => (
        <TouchableOpacity
          key={type.value}
          style={[
            styles.optionCard,
            formData.countType === type.value && styles.selectedOptionCard
          ]}
          onPress={() => handleInputChange('countType', type.value)}
        >
          <View style={styles.optionHeader}>
            <Text style={[
              styles.optionTitle,
              formData.countType === type.value && styles.selectedOptionTitle
            ]}>
              {type.label}
            </Text>
            <View style={[
              styles.radioButton,
              formData.countType === type.value && styles.selectedRadioButton
            ]}>
              {formData.countType === type.value && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
          </View>
          <Text style={styles.optionDescription}>{type.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFrequencySelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Frequency</Text>
      <View style={styles.frequencyGrid}>
        {frequencies.map(freq => (
          <TouchableOpacity
            key={freq.value}
            style={[
              styles.frequencyButton,
              formData.frequency === freq.value && styles.selectedFrequencyButton
            ]}
            onPress={() => handleInputChange('frequency', freq.value)}
          >
            <Text style={[
              styles.frequencyButtonText,
              formData.frequency === freq.value && styles.selectedFrequencyButtonText
            ]}>
              {freq.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderUserSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Assign To (Optional)</Text>
      <View style={styles.userGrid}>
        <TouchableOpacity
          style={[
            styles.userButton,
            !formData.assignedToId && styles.selectedUserButton
          ]}
          onPress={() => handleInputChange('assignedToId', '')}
        >
          <Text style={[
            styles.userButtonText,
            !formData.assignedToId && styles.selectedUserButtonText
          ]}>
            Unassigned
          </Text>
        </TouchableOpacity>
        {availableUsers.map(user => (
          <TouchableOpacity
            key={user.id}
            style={[
              styles.userButton,
              formData.assignedToId === user.id && styles.selectedUserButton
            ]}
            onPress={() => handleInputChange('assignedToId', user.id)}
          >
            <Text style={[
              styles.userButtonText,
              formData.assignedToId === user.id && styles.selectedUserButtonText
            ]}>
              {user.username}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Create Cycle Count"
        rightIcon="checkmark"
        rightIconColor={loading ? '#ccc' : '#2196F3'}
        onRightPress={loading ? null : handleSubmit}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Enter cycle count name"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Enter description (optional)"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Scheduled Date *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => DateTimePicker ? setShowDatePicker(true) : Alert.alert('Date Picker Unavailable', 'Please enter date manually')}
            >
              <Text style={styles.dateButtonText}>
                {formData.scheduledDate.toLocaleDateString()}
              </Text>
              <Ionicons name="calendar" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {renderCountTypeSelector()}
        {renderFrequencySelector()}
        {renderUserSelector()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Settings</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Number of Tasks</Text>
            <TextInput
              style={styles.textInput}
              value={formData.settings.taskCount.toString()}
              onChangeText={(value) => handleSettingsChange('taskCount', parseInt(value) || 1)}
              placeholder="10"
              keyboardType="numeric"
            />
            <Text style={styles.inputHint}>
              Maximum number of counting tasks to generate (1-100)
            </Text>
          </View>

          <View style={styles.switchContainer}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Include Zero Quantity Items</Text>
              <Text style={styles.switchDescription}>
                Include items with zero on-hand quantity in the count
              </Text>
            </View>
            <Switch
              value={formData.settings.includeZeroQty}
              onValueChange={(value) => handleSettingsChange('includeZeroQty', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={formData.settings.includeZeroQty ? '#2196F3' : '#f4f3f4'}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Minimum Item Value ($)</Text>
            <TextInput
              style={styles.textInput}
              value={formData.settings.minValue.toString()}
              onChangeText={(value) => handleSettingsChange('minValue', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />
            <Text style={styles.inputHint}>
              Only include items with value above this threshold
            </Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {showDatePicker && DateTimePicker && (
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
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center'
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  disabledButton: {
    backgroundColor: '#ccc'
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  content: {
    flex: 1
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  inputContainer: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333'
  },
  optionCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff'
  },
  selectedOptionCard: {
    borderColor: '#2196F3',
    backgroundColor: '#f0f8ff'
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  selectedOptionTitle: {
    color: '#2196F3'
  },
  optionDescription: {
    fontSize: 14,
    color: '#666'
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center'
  },
  selectedRadioButton: {
    borderColor: '#2196F3'
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196F3'
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff'
  },
  selectedFrequencyButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3'
  },
  frequencyButtonText: {
    fontSize: 14,
    color: '#666'
  },
  selectedFrequencyButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  userGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  userButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff'
  },
  selectedUserButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3'
  },
  userButtonText: {
    fontSize: 14,
    color: '#666'
  },
  selectedUserButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8
  },
  switchInfo: {
    flex: 1,
    marginRight: 16
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  switchDescription: {
    fontSize: 12,
    color: '#666'
  },
  bottomPadding: {
    height: 20
  }
});

export default CreateCycleCountScreen; 