//  import withScreenLayout from '../components/withScreenLayout';
import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, ScrollView, Alert, SafeAreaView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { createInventoryItem } from '../api/inventoryItems';
import { fetchSuppliers } from '../api/suppliers';
import { Picker } from '@react-native-picker/picker';
import InternalHeader from '../components/InternalHeader';

function CreateInventoryItemScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const list = await fetchSuppliers(userToken);
        setSuppliers(list);
      } catch (err) {
        console.error('Error loading suppliers:', err);
      }
    };
    loadSuppliers();
  }, [userToken]);

  const onSubmit = async () => {
    if (!sku || !name || !unit) {
      Alert.alert('Validation error', 'SKU, name, and unit are required.');
      return;
    }
    setLoading(true);
    try {
      await createInventoryItem(userToken, { sku, name, description, unit, supplierId: selectedSupplier || null });
      navigation.goBack();
    } catch (err) {
      console.error('Error creating item:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Create Inventory Item" />
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>SKU</Text>
      <TextInput style={styles.input} value={sku} onChangeText={setSku} placeholder="e.g. ABC-123" />
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Item name" />
      <Text style={styles.label}>Description</Text>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Optional" />
      <Text style={styles.label}>Unit of Measure</Text>
      <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="e.g. kg, pcs" />
      <Text style={styles.label}>Supplier</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={selectedSupplier} onValueChange={setSelectedSupplier}>
          <Picker.Item label="None" value="" />
          {suppliers.map((s) => (
            <Picker.Item key={s.id} label={s.name} value={s.id} />
          ))}
        </Picker>
      </View>
      {loading ? (
        <ActivityIndicator style={styles.loading} size="large" />
      ) : (
        <Button title="Create Item" onPress={onSubmit} />
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { marginTop: 12, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginTop: 4 },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginTop: 4 },
  loading: { marginTop: 16 },
}); 
// export default withScreenLayout(CreateInventoryItemScreen, { title: 'CreateInventoryItem' });
export default CreateInventoryItemScreen;
