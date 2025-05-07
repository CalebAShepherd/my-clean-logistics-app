//  import withScreenLayout from '../components/withScreenLayout';
import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { createInventoryItem } from '../api/inventoryItems';

function CreateInventoryItemScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!sku || !name || !unit) {
      Alert.alert('Validation error', 'SKU, name, and unit are required.');
      return;
    }
    setLoading(true);
    try {
      await createInventoryItem(userToken, { sku, name, description, unit });
      navigation.goBack();
    } catch (err) {
      console.error('Error creating item:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>SKU</Text>
      <TextInput style={styles.input} value={sku} onChangeText={setSku} placeholder="e.g. ABC-123" />
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Item name" />
      <Text style={styles.label}>Description</Text>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Optional" />
      <Text style={styles.label}>Unit of Measure</Text>
      <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="e.g. kg, pcs" />
      {loading ? (
        <ActivityIndicator style={styles.loading} size="large" />
      ) : (
        <Button title="Create Item" onPress={onSubmit} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { marginTop: 12, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginTop: 4 },
  loading: { marginTop: 16 },
}); 
// export default withScreenLayout(CreateInventoryItemScreen, { title: 'CreateInventoryItem' });
