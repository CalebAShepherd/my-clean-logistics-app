import React, { useEffect, useState, useContext } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { fetchWarehouses } from '../api/warehouses';
import { fetchWarehouseItems } from '../api/warehouseItems';
import { createTransferOrder } from '../api/transferOrders';
import InternalHeader from '../components/InternalHeader';

// Custom styled button component
const CustomButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

function CreateTransferOrderScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouses, setWarehouses] = useState([]);
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [items, setItems] = useState([]);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWarehouses = async () => {
      setLoading(true);
      try {
        const data = await fetchWarehouses(userToken);
        setWarehouses(data);
        if (data.length > 0) setFromWarehouse(data[0].id);
      } catch (err) {
        console.error('Error loading warehouses:', err);
      } finally {
        setLoading(false);
      }
    };
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (!fromWarehouse) return;
    const loadItems = async () => {
      setLoading(true);
      try {
        const data = await fetchWarehouseItems(userToken, { warehouseId: fromWarehouse });
        setItems(data);
      } catch (err) {
        console.error('Error loading items:', err);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, [fromWarehouse]);

  const onSubmit = async () => {
    if (!fromWarehouse || !toWarehouse || !itemId || !quantity) {
      Alert.alert('Validation error', 'All fields are required');
      return;
    }
    setLoading(true);
    try {
      await createTransferOrder(userToken, { fromWarehouseId: fromWarehouse, toWarehouseId: toWarehouse, itemId, quantity: parseInt(quantity, 10) });
      Alert.alert('Success', 'Transfer completed');
      navigation.goBack();
    } catch (err) {
      console.error('Error initiating transfer:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Initiate Transfer" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>From Warehouse</Text>
          <Picker selectedValue={fromWarehouse} onValueChange={setFromWarehouse} style={styles.picker}>
            <Picker.Item label="Select warehouse" value="" />
            {warehouses.map(w => <Picker.Item key={w.id} label={w.name} value={w.id} />)}
          </Picker>

          <Text style={styles.fieldLabel}>To Warehouse</Text>
          <Picker selectedValue={toWarehouse} onValueChange={setToWarehouse} style={styles.picker}>
            <Picker.Item label="Select warehouse" value="" />
            {warehouses.map(w => <Picker.Item key={w.id} label={w.name} value={w.id} />)}
          </Picker>

          <Text style={styles.fieldLabel}>Item</Text>
          <Picker selectedValue={itemId} onValueChange={setItemId} style={styles.picker}>
            <Picker.Item label="Select item" value="" />
            {items.map(i => <Picker.Item key={i.itemId} label={i.InventoryItem?.name || i.itemId} value={i.itemId} />)}
          </Picker>

          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="Enter quantity"
          />

          <CustomButton title="Submit Transfer" onPress={onSubmit} />
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  fieldLabel: { marginTop: 12, fontSize: 14, color: '#444', fontWeight: '600' },
  picker: { marginTop: 8, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 12, marginTop: 8, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 6, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { marginTop: 12, fontWeight: 'bold' },
});

export default CreateTransferOrderScreen; 