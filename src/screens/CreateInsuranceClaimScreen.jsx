import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, SafeAreaView } from 'react-native';
import { createInsuranceClaim } from '../api/insuranceClaims';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import InternalHeader from '../components/InternalHeader';

export default function CreateInsuranceClaimScreen({ navigation, route }) {
  const { userToken } = useAuth();
  const { prefilledData, sourceType, sourceData } = route.params || {};
  
  const [form, setForm] = useState({
    claimNumber: '',
    insurer: '',
    dateFiled: new Date().toISOString().substring(0,10),
    claimAmount: '',
    description: prefilledData?.description || '',
    referenceId: prefilledData?.referenceId || '',
    referenceType: prefilledData?.referenceType || ''
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, val) => setForm({ ...form, [field]: val });

  const handleSave = async () => {
    if (!form.claimNumber || !form.insurer || !form.claimAmount) {
      Alert.alert('Validation', 'Claim number, insurer and amount are required');
      return;
    }
    
    const amount = parseFloat(form.claimAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Please enter a valid claim amount');
      return;
    }

    setSaving(true);
    try {
      await createInsuranceClaim(userToken, { ...form, claimAmount: amount });
      Alert.alert('Success', 'Insurance claim filed successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="File Insurance Claim" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sourceType === 'DamageReport' && sourceData && (
          <View style={[styles.formSection, styles.referenceSection]}>
            <Text style={styles.sectionTitle}>Related Incident</Text>
            <View style={styles.referenceInfo}>
              <View style={styles.referenceHeader}>
                <Ionicons name="link" size={20} color="#007AFF" />
                <Text style={styles.referenceTitle}>Damage Report</Text>
              </View>
              <Text style={styles.referenceDetail}>
                {sourceData.InventoryItem?.name} ({sourceData.InventoryItem?.sku})
              </Text>
              <Text style={styles.referenceDetail}>
                {sourceData.type} - Quantity: {sourceData.quantity}
              </Text>
              <Text style={styles.referenceDetail}>
                Reported: {new Date(sourceData.reportedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Claim Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Claim Number *</Text>
            <TextInput 
              style={styles.input} 
              value={form.claimNumber} 
              onChangeText={t => handleChange('claimNumber', t)}
              placeholder="e.g., CLM-2024-001"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Insurance Company *</Text>
            <TextInput 
              style={styles.input} 
              value={form.insurer} 
              onChangeText={t => handleChange('insurer', t)}
              placeholder="Name of insurance company"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date Filed</Text>
            <TextInput 
              style={styles.input} 
              value={form.dateFiled} 
              onChangeText={t => handleChange('dateFiled', t)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Claim Amount *</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput 
                style={[styles.input, styles.amountInput]} 
                keyboardType="numeric" 
                value={form.claimAmount} 
                onChangeText={t => handleChange('claimAmount', t)}
                placeholder="0.00"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Claim Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              multiline 
              numberOfLines={5}
              value={form.description} 
              onChangeText={t => handleChange('description', t)}
              placeholder="Provide details about the incident, damages, and circumstances leading to this claim..."
              placeholderTextColor="#999"
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave} 
            disabled={saving}
          >
            {saving && <Ionicons name="sync" size={16} color="#fff" style={styles.buttonIcon} />}
            <Text style={styles.saveButtonText}>
              {saving ? 'Filing...' : 'File Claim'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  referenceSection: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  referenceInfo: {
    marginTop: -8,
  },
  referenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  referenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  referenceDetail: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    paddingLeft: 28,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingLeft: 12,
  },
  amountInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
}); 