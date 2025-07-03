import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getApiUrl } from '../utils/apiHost';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  getApiUrl();

export default function CreateDriverScreen({ route, navigation }) {
  const { userToken } = useContext(AuthContext);
  const { driverId } = route.params || {};
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditMode = !!driverId;

  useEffect(() => {
    if (driverId) {
      loadDriverData();
    }
  }, [driverId]);

  const loadDriverData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${driverId}`, { 
        headers: { Authorization: `Bearer ${userToken}` } 
      });
      const data = await res.json();
      setEmail(data.email || '');
      setUsername(data.username || '');
    } catch (error) {
      console.error('Error loading driver:', error);
      Alert.alert('Error', 'Failed to load driver information');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!isEditMode && !password.trim()) {
      newErrors.password = 'Password is required for new drivers';
    } else if (password.trim() && password.trim().length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors below before saving.');
      return;
    }

    setSaving(true);
    try {
      const payload = { 
        email: email.trim(), 
        username: username.trim(), 
        role: 'transporter' 
      };
      
      if (password.trim()) {
        payload.password = password.trim();
      }
      
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode ? `${API_URL}/users/${driverId}` : `${API_URL}/users`;
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${userToken}` 
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save driver');
      }
      
      Alert.alert('Success', `Driver ${isEditMode ? 'updated' : 'created'} successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving driver:', error);
      Alert.alert('Error', error.message || 'Failed to save driver');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Loading..." />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading driver information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title={isEditMode ? 'Edit Driver' : 'Add Driver'} 
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
          {/* Visual Header Section */}
          <View style={styles.visualHeader}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name={isEditMode ? "account-edit" : "account-plus"} 
                size={48} 
                color="#007AFF" 
              />
            </View>
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Edit Driver Account' : 'Add New Driver'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isEditMode 
                ? 'Update driver account information'
                : 'Create a new driver account for your logistics team'
              }
            </Text>
          </View>

          {/* Account Information Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Information</Text>
            <Text style={styles.cardSubtitle}>
              Basic details for the driver account
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                Email Address <Text style={styles.required}>*</Text>
              </Text>
              <TextInput 
                style={[
                  styles.input,
                  errors.email && styles.inputError
                ]} 
                value={email} 
                onChangeText={(text) => {
                  setEmail(text);
                  clearError('email');
                }}
                placeholder="Enter email address"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none" 
                keyboardType="email-address"
                autoComplete="email"
                autoCorrect={false}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
              <Text style={styles.fieldHint}>
                Used for login and notifications
              </Text>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                Username <Text style={styles.required}>*</Text>
              </Text>
              <TextInput 
                style={[
                  styles.input,
                  errors.username && styles.inputError
                ]} 
                value={username} 
                onChangeText={(text) => {
                  setUsername(text);
                  clearError('username');
                }}
                placeholder="Enter username"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect={false}
              />
              {errors.username && (
                <Text style={styles.errorText}>{errors.username}</Text>
              )}
              <Text style={styles.fieldHint}>
                Unique identifier for the driver
              </Text>
            </View>
          </View>

          {/* Security Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Security</Text>
            <Text style={styles.cardSubtitle}>
              {isEditMode 
                ? 'Leave password blank to keep current password'
                : 'Set initial password for the account'
              }
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                Password {!isEditMode && <Text style={styles.required}>*</Text>}
                {isEditMode && <Text style={styles.optional}> (optional)</Text>}
              </Text>
              <TextInput 
                style={[
                  styles.input,
                  errors.password && styles.inputError
                ]} 
                value={password} 
                onChangeText={(text) => {
                  setPassword(text);
                  clearError('password');
                }}
                placeholder={isEditMode ? "Enter new password (optional)" : "Enter password"}
                placeholderTextColor="#8E8E93"
                secureTextEntry
                autoComplete="password"
                autoCorrect={false}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
              <Text style={styles.fieldHint}>
                {isEditMode 
                  ? 'Only enter if you want to change the current password'
                  : 'Minimum 6 characters required'
                }
              </Text>
            </View>
          </View>

          {/* Driver Role Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <MaterialCommunityIcons name="information" size={20} color="#007AFF" />
              <Text style={styles.infoTitle}>Driver Account</Text>
            </View>
            <Text style={styles.infoText}>
              This account will be created with transporter role, giving access to:
            </Text>
            <View style={styles.infoList}>
              <View style={styles.infoListItem}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#34C759" />
                <Text style={styles.infoListText}>Route assignments and navigation</Text>
              </View>
              <View style={styles.infoListItem}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#34C759" />
                <Text style={styles.infoListText}>Delivery status updates</Text>
              </View>
              <View style={styles.infoListItem}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#34C759" />
                <Text style={styles.infoListText}>Communication with dispatchers</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity 
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={saving ? ['#C7C7CC', '#C7C7CC'] : ['#007AFF', '#0056CC']}
              style={styles.submitGradient}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons 
                    name={isEditMode ? "content-save" : "account-plus"} 
                    size={20} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.submitText}>
                    {isEditMode ? 'Update Driver' : 'Create Driver'}
                  </Text>
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
  optional: {
    color: '#8E8E93',
    fontWeight: '400',
  },
  input: { 
    borderWidth: 1.5, 
    borderColor: '#E5E5EA', 
    borderRadius: 12, 
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#1C1C1E',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
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

  // Info Card
  infoCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1E7FF',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoList: {
    marginLeft: 8,
  },
  infoListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoListText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
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