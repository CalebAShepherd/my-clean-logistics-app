import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, ScrollView, Alert, SafeAreaView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { createSupplier } from '../api/suppliers';
import InternalHeader from '../components/InternalHeader';

function AddSupplierScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation error', 'Supplier name is required.');
      return;
    }
    setLoading(true);
    try {
      await createSupplier(userToken, { name: name.trim(), contactInfo: contactInfo.trim() || null });
      Alert.alert('Success', 'Supplier created.');
      navigation.goBack();
    } catch (err) {
      console.error('Error creating supplier:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Add New Supplier" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Supplier name"
        />
        <Text style={styles.label}>Contact Info</Text>
        <TextInput
          style={styles.input}
          value={contactInfo}
          onChangeText={setContactInfo}
          placeholder="Optional contact details"
        />
        {loading ? (
          <ActivityIndicator style={styles.loading} size="large" />
        ) : (
          <Button title="Create Supplier" onPress={onSubmit} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontWeight: 'bold', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginTop: 4 },
  loading: { marginTop: 16 },
});

export default AddSupplierScreen; 