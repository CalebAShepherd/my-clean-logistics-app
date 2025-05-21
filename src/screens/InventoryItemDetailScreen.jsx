// import withScreenLayout from '../components/withScreenLayout';
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { fetchInventoryItem, updateInventoryItem, deleteInventoryItem } from '../api/inventoryItems';
import { fetchSuppliers } from '../api/suppliers';
import { Picker } from '@react-native-picker/picker';
import InternalHeader from '../components/InternalHeader';

function InventoryItemDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { userToken } = useContext(AuthContext);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');

  useEffect(() => {
    const loadItem = async () => {
      setLoading(true);
      try {
        const data = await fetchInventoryItem(userToken, id);
        setItem(data);
        setSku(data.sku);
        setName(data.name);
        setDescription(data.description || '');
        setUnit(data.unit);
        setSelectedSupplier(data.supplierId || '');
      } catch (err) {
        console.error('Error loading item:', err);
        Alert.alert('Error', 'Failed to load item');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    loadItem();
  }, []);

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

  const onSave = async () => {
    if (!sku || !name || !unit) {
      Alert.alert('Validation', 'SKU, name, and unit are required');
      return;
    }
    setLoading(true);
    try {
      const updated = await updateInventoryItem(userToken, id, { sku, name, description, unit, supplierId: selectedSupplier || null });
      setItem(updated);
      Alert.alert('Success', 'Item updated');
    } catch (err) {
      console.error('Error updating item:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteItem }
      ]
    );
  };

  const deleteItem = async () => {
    setLoading(true);
    try {
      await deleteInventoryItem(userToken, id);
      Alert.alert('Deleted', 'Item has been deleted');
      navigation.goBack();
    } catch (err) {
      console.error('Error deleting item:', err);
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
      <InternalHeader navigation={navigation} title="Inventory Item Detail" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SKU</Text>
          <TextInput style={styles.input} value={sku} onChangeText={setSku} />
          <Text style={styles.cardLabel}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
          <Text style={styles.cardLabel}>Description</Text>
          <TextInput style={styles.input} value={description} onChangeText={setDescription} multiline />
          <Text style={styles.cardLabel}>Unit</Text>
          <TextInput style={styles.input} value={unit} onChangeText={setUnit} />
          <Text style={styles.cardLabel}>Supplier</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedSupplier} onValueChange={setSelectedSupplier}>
              <Picker.Item label="None" value="" />
              {suppliers.map((s) => (
                <Picker.Item key={s.id} label={s.name} value={s.id} />
              ))}
            </Picker>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={onSave}>
              <Text style={styles.primaryButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.destructiveButton} onPress={onDelete}>
              <Text style={styles.destructiveButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLabel: { fontWeight: 'bold', color: '#333', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginBottom: 12 },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginBottom: 12 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  primaryButton: { flex: 1, backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 6, marginRight: 8, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  destructiveButton: { flex: 1, backgroundColor: '#FF3B30', paddingVertical: 12, borderRadius: 6, marginLeft: 8, alignItems: 'center' },
  destructiveButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
}); 
// export default withScreenLayout(InventoryItemDetailScreen, { title: 'InventoryItemDetail' });
export default InventoryItemDetailScreen;
