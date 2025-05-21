import React, { useState, useContext } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { createSKUAttribute } from '../api/skuAttributes';
import InternalHeader from '../components/InternalHeader';

// Custom styled button component
const CustomButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

function CreateSKUAttributeScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('STRING');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!key || !label || !type) {
      Alert.alert('Validation error', 'Key, label, and type are required.');
      return;
    }
    setLoading(true);
    try {
      await createSKUAttribute(userToken, { key, label, type });
      navigation.goBack();
    } catch (err) {
      console.error('Error creating attribute:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Create SKU Attribute" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Key</Text>
          <TextInput style={styles.input} value={key} onChangeText={setKey} placeholder="e.g., weight" />

          <Text style={styles.fieldLabel}>Label</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g., Weight" />

          <Text style={styles.fieldLabel}>Type</Text>
          <TextInput style={styles.input} value={type} onChangeText={setType} placeholder="STRING or NUMBER" />

          {loading ? (
            <ActivityIndicator style={styles.loading} size="large" />
          ) : (
            <CustomButton title="Create Attribute" onPress={onSubmit} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  content: { padding: 16 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
  },
  fieldLabel: { marginTop: 12, fontSize: 14, color: '#444', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 12, marginTop: 8, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 6, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loading: { marginTop: 16 },
});

export default CreateSKUAttributeScreen; 