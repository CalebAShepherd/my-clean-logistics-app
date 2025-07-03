import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createSoxControl } from '../api/soxCompliance';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import InternalHeader from '../components/InternalHeader';

export default function CreateSoxControlScreen({ navigation }) {
  const { userToken } = useAuth();
  const [form, setForm] = useState({
    controlNumber: '',
    name: '',
    description: '',
    area: 'FINANCIAL_REPORTING',
    frequency: 'ANNUAL'
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, val) => setForm({ ...form, [field]: val });

  const handleSave = async () => {
    if (!form.controlNumber || !form.name) {
      Alert.alert('Validation', 'Control number and name are required');
      return;
    }
    setSaving(true);
    try {
      await createSoxControl(userToken, form);
      Alert.alert('Success', 'SOX control created successfully', [
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
      <InternalHeader navigation={navigation} title="Create SOX Control" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Control Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Control Number *</Text>
            <TextInput 
              style={styles.input} 
              value={form.controlNumber} 
              onChangeText={t => handleChange('controlNumber', t)}
              placeholder="e.g., FR-001"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Control Name *</Text>
            <TextInput 
              style={styles.input} 
              value={form.name} 
              onChangeText={t => handleChange('name', t)}
              placeholder="Brief name for the control"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              multiline 
              numberOfLines={4}
              value={form.description} 
              onChangeText={t => handleChange('description', t)}
              placeholder="Detailed description of the control..."
              placeholderTextColor="#999"
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Control Settings</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Area</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.area}
                onValueChange={v => handleChange('area', v)}
                style={styles.picker}
              >
                <Picker.Item label="Financial Reporting" value="FINANCIAL_REPORTING" />
                <Picker.Item label="Information Technology" value="INFORMATION_TECHNOLOGY" />
                <Picker.Item label="Operations" value="OPERATIONS" />
                <Picker.Item label="Compliance" value="COMPLIANCE" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.frequency}
                onValueChange={v => handleChange('frequency', v)}
                style={styles.picker}
              >
                <Picker.Item label="Annual" value="ANNUAL" />
                <Picker.Item label="Quarterly" value="QUARTERLY" />
                <Picker.Item label="Monthly" value="MONTHLY" />
                <Picker.Item label="Weekly" value="WEEKLY" />
                <Picker.Item label="Daily" value="DAILY" />
              </Picker>
            </View>
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
              {saving ? 'Creating...' : 'Create Control'}
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
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
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