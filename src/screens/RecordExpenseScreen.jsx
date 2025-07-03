import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import InternalHeader from '../components/InternalHeader';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const RecordExpenseScreen = ({ navigation }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    expenseDate: new Date(),
    category: '',
    receiptFile: null,
    notes: ''
  });

  const expenseCategories = [
    { value: 'OFFICE_SUPPLIES', label: 'Office Supplies', icon: 'briefcase' },
    { value: 'UTILITIES', label: 'Utilities', icon: 'flash' },
    { value: 'RENT', label: 'Rent', icon: 'home' },
    { value: 'EQUIPMENT', label: 'Equipment', icon: 'construct' },
    { value: 'MAINTENANCE', label: 'Maintenance', icon: 'build' },
    { value: 'FUEL', label: 'Fuel', icon: 'car' },
    { value: 'INSURANCE', label: 'Insurance', icon: 'shield' },
    { value: 'PROFESSIONAL_SERVICES', label: 'Professional Services', icon: 'business' },
    { value: 'MARKETING', label: 'Marketing', icon: 'megaphone' },
    { value: 'TRAVEL', label: 'Travel', icon: 'airplane' },
    { value: 'MEALS', label: 'Meals', icon: 'restaurant' },
    { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange('expenseDate', selectedDate);
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setFormData(prev => ({
          ...prev,
          receiptFile: {
            uri: file.uri,
            name: file.name,
            type: file.mimeType,
            size: file.size
          }
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload file');
    }
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.amount || !formData.category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (isNaN(parseFloat(formData.amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      // Here you would typically call your API
      // await expenseAPI.createExpense(formData);
      
      Alert.alert('Success', 'Expense recorded successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC'
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 20
    },
    section: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: '#E2E8F0'
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1E293B',
      marginBottom: 20,
      letterSpacing: -0.5
    },
    inputGroup: {
      marginBottom: 20
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: '#374151',
      marginBottom: 10,
      letterSpacing: -0.2
    },
    requiredLabel: {
      color: '#EF4444'
    },
    input: {
      borderWidth: 2,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: '#1F2937',
      backgroundColor: '#FFFFFF',
      fontWeight: '500'
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top'
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 2,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 16,
      backgroundColor: '#FFFFFF'
    },
    dateText: {
      fontSize: 16,
      color: '#1F2937',
      fontWeight: '500'
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8
    },
    categoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      margin: 6,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      minWidth: '45%',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2
    },
    categoryButtonSelected: {
      backgroundColor: '#3B82F6',
      borderColor: '#3B82F6',
      shadowColor: '#3B82F6',
      shadowOpacity: 0.3
    },
    categoryIcon: {
      marginRight: 8
    },
    categoryText: {
      fontSize: 14,
      color: '#374151',
      flex: 1,
      fontWeight: '600'
    },
    categoryTextSelected: {
      color: '#FFFFFF',
      fontWeight: '600'
    },
    fileUploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      borderRadius: 8,
      padding: 16,
      backgroundColor: theme.colors.background
    },
    fileUploadText: {
      fontSize: 16,
      color: theme.colors.text,
      marginLeft: 8
    },
    fileInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: '#E8F5E8',
      borderRadius: 8,
      marginTop: 8
    },
    fileName: {
      fontSize: 14,
      color: '#2E7D32',
      marginLeft: 8,
      flex: 1
    },
    removeFileButton: {
      padding: 4
    },
    submitButton: {
      backgroundColor: '#10B981',
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 40,
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6
    },
    submitButtonDisabled: {
      backgroundColor: '#9CA3AF',
      opacity: 0.6,
      shadowOpacity: 0.1
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5
    }
  });

  return (
    <SafeAreaView style={styles.container}>
              <InternalHeader navigation={navigation} title="Record Expense" />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expense Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, styles.requiredLabel]}>
              Description *
            </Text>
            <TextInput
              style={styles.input}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Enter expense description"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, styles.requiredLabel]}>
              Amount *
            </Text>
            <TextInput
              style={styles.input}
              value={formData.amount}
              onChangeText={(value) => handleInputChange('amount', value)}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, styles.requiredLabel]}>
              Date *
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {formatDate(formData.expenseDate)}
              </Text>
              <Ionicons name="calendar" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={formData.expenseDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.requiredLabel]}>
            Category *
          </Text>
          
          <View style={styles.categoryGrid}>
            {expenseCategories.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={[
                  styles.categoryButton,
                  formData.category === category.value && styles.categoryButtonSelected
                ]}
                onPress={() => handleInputChange('category', category.value)}
              >
                <Ionicons
                  name={category.icon}
                  size={20}
                  color={formData.category === category.value ? '#FFFFFF' : theme.colors.text}
                  style={styles.categoryIcon}
                />
                <Text
                  style={[
                    styles.categoryText,
                    formData.category === category.value && styles.categoryTextSelected
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Receipt Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt</Text>
          
          {!formData.receiptFile ? (
            <TouchableOpacity
              style={styles.fileUploadButton}
              onPress={handleFileUpload}
            >
              <Ionicons name="cloud-upload" size={24} color={theme.colors.text} />
              <Text style={styles.fileUploadText}>
                Upload Receipt (Optional)
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.fileInfo}>
              <Ionicons name="document" size={20} color="#2E7D32" />
              <Text style={styles.fileName}>
                {formData.receiptFile.name}
              </Text>
              <TouchableOpacity
                style={styles.removeFileButton}
                onPress={() => handleInputChange('receiptFile', null)}
              >
                <Ionicons name="close-circle" size={20} color="#F44336" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(value) => handleInputChange('notes', value)}
            placeholder="Enter any additional notes..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            loading && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Recording...' : 'Record Expense'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RecordExpenseScreen; 