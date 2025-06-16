import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView, Alert, SafeAreaView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { createSupplier } from '../api/suppliers';
import InternalHeader from '../components/InternalHeader';

function AddSupplierScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Supplier name is required';
    }
    
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors below and try again.');
      return;
    }
    
    setLoading(true);
    try {
      const supplierData = {
        name: name.trim(),
        contactInfo: [
          contactInfo.trim() || null,
          email.trim() ? `Email: ${email.trim()}` : null,
          phone.trim() ? `Phone: ${phone.trim()}` : null,
          address.trim() ? `Address: ${address.trim()}` : null
        ].filter(Boolean).join(' | ') || null
      };
      
      await createSupplier(userToken, supplierData);
      
      Alert.alert(
        'Success', 
        'Supplier created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err) {
      console.error('Error creating supplier:', err);
      Alert.alert('Error', err.message || 'Failed to create supplier. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Add New Supplier" />
      
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
              <MaterialCommunityIcons name="account-plus" size={32} color="#007AFF" />
            </View>
            <Text style={styles.headerTitle}>New Supplier</Text>
            <Text style={styles.headerSubtitle}>Add a new supplier to your network</Text>
          </View>

          {/* Basic Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="information" size={20} color="#007AFF" />
              <Text style={styles.cardTitle}>Supplier Information</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Supplier Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  clearError('name');
                }}
                placeholder="Enter supplier name"
                placeholderTextColor="#8E8E93"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={contactInfo}
                onChangeText={setContactInfo}
                placeholder="Brief description of the supplier..."
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Contact Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="phone" size={20} color="#34C759" />
              <Text style={styles.cardTitle}>Contact Information</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  clearError('email');
                }}
                placeholder="supplier@example.com"
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor="#8E8E93"
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="Street address, city, state, ZIP"
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
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
                  <MaterialCommunityIcons name="plus" size={20} color="white" />
                )}
                <Text style={styles.submitText}>
                  {loading ? 'Creating Supplier...' : 'Create Supplier'}
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
  },
  
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    marginLeft: 4,
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

export default AddSupplierScreen; 