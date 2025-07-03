import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createSoxTest, fetchSoxControls } from '../api/soxCompliance';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import InternalHeader from '../components/InternalHeader';

export default function CreateSoxTestScreen({ navigation }) {
  const { userToken } = useAuth();
  const [controls, setControls] = useState([]);
  const [form, setForm] = useState({
    controlId: '',
    testDate: new Date().toISOString().substring(0,10),
    result: 'PASS',
    issuesFound: '',
    remediationPlan: ''
  });
  const [loadingControls, setLoadingControls] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSoxControls(userToken, { limit: 100 });
        setControls(data.controls || []);
        if (data.controls?.length) setForm(f => ({...f, controlId: data.controls[0].id}));
      } catch(err) {
        console.error('load controls', err);
        Alert.alert('Error', 'Failed to load SOX controls');
      } finally {
        setLoadingControls(false);
      }
    })();
  }, [userToken]);

  const handleChange = (field, val) => setForm({...form, [field]: val});

  const handleSave = async () => {
    if (!form.controlId) { 
      Alert.alert('Validation', 'Please select a control'); 
      return; 
    }
    setSaving(true);
    try {
      await createSoxTest(userToken, form);
      Alert.alert('Success', 'SOX test recorded successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch(err) { 
      Alert.alert('Error', err.message); 
    } finally { 
      setSaving(false); 
    }
  };

  if (loadingControls) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Record SOX Test" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading SOX controls...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (controls.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Record SOX Test" />
        <View style={styles.emptyContainer}>
          <Ionicons name="shield-checkmark-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No SOX Controls Available</Text>
          <Text style={styles.emptySubtitle}>
            You need to create SOX controls before recording tests
          </Text>
          <TouchableOpacity 
            style={styles.createControlButton}
            onPress={() => navigation.navigate('CreateSoxControl')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createControlButtonText}>Create Control</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Record SOX Test" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Test Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>SOX Control *</Text>
            <View style={styles.pickerContainer}>
              <Picker 
                selectedValue={form.controlId} 
                onValueChange={v => handleChange('controlId', v)}
                style={styles.picker}
              >
                {controls.map(c => 
                  <Picker.Item 
                    key={c.id} 
                    label={`${c.controlNumber} - ${c.name}`} 
                    value={c.id} 
                  />
                )}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Test Date</Text>
            <TextInput 
              style={styles.input} 
              value={form.testDate} 
              onChangeText={t => handleChange('testDate', t)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Test Result *</Text>
            <View style={styles.pickerContainer}>
              <Picker 
                selectedValue={form.result} 
                onValueChange={v => handleChange('result', v)}
                style={styles.picker}
              >
                <Picker.Item label="✓ PASS" value="PASS" />
                <Picker.Item label="✗ FAIL" value="FAIL" />
                <Picker.Item label="⚠ PARTIAL" value="PARTIAL" />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Test Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Issues Found</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              multiline 
              numberOfLines={4}
              value={form.issuesFound} 
              onChangeText={t => handleChange('issuesFound', t)}
              placeholder="Describe any issues identified during testing..."
              placeholderTextColor="#999"
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Remediation Plan</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              multiline 
              numberOfLines={4}
              value={form.remediationPlan} 
              onChangeText={t => handleChange('remediationPlan', t)}
              placeholder="Outline steps to address any issues..."
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
              {saving ? 'Recording...' : 'Record Test'}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createControlButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
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