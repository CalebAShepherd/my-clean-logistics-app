// import withScreenLayout from '../components/withScreenLayout';
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { fetchInventoryItem, updateInventoryItem, deleteInventoryItem } from '../api/inventoryItems';

function InventoryItemDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { userToken } = useContext(AuthContext);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');

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

  const onSave = async () => {
    if (!sku || !name || !unit) {
      Alert.alert('Validation', 'SKU, name, and unit are required');
      return;
    }
    setLoading(true);
    try {
      const updated = await updateInventoryItem(userToken, id, { sku, name, description, unit });
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>SKU</Text>
      <TextInput style={styles.input} value={sku} onChangeText={setSku} />
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Text style={styles.label}>Description</Text>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} />
      <Text style={styles.label}>Unit</Text>
      <TextInput style={styles.input} value={unit} onChangeText={setUnit} />
      <Button title="Save" onPress={onSave} />
      <View style={styles.deleteBtn}>
        <Button title="Delete" color="red" onPress={onDelete} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: 'bold', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginTop: 4, borderRadius: 4 },
  deleteBtn: { marginTop: 16 }
}); 
// export default withScreenLayout(InventoryItemDetailScreen, { title: 'InventoryItemDetail' });
export default InventoryItemDetailScreen;
