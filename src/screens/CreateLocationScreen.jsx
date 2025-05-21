// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { fetchWarehouses } from '../api/warehouses';
import { createLocation } from '../api/locations';
import { SafeAreaView } from 'react-native';
import InternalHeader from '../components/InternalHeader';
import { fetchInventoryItems } from '../api/inventoryItems';
import { createWarehouseItem } from '../api/warehouseItems';

function CreateLocationScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [zone, setZone] = useState('');
  const [shelf, setShelf] = useState('');
  const [bin, setBin] = useState('');
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [maxThreshold, setMaxThreshold] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const wh = await fetchWarehouses(userToken);
        setWarehouses(wh);
        if (wh.length) setWarehouseId(wh[0].id);
      } catch (err) {
        console.error('Error loading warehouses:', err);
        Alert.alert('Error', 'Failed to load warehouses');
      } finally {
        setLoading(false);
      }
    };
    loadWarehouses();
    const loadItems = async () => {
      try {
        const items = await fetchInventoryItems(userToken);
        setInventoryItems(items);
        if (items.length) setItemId(items[0].id);
      } catch (err) {
        console.error('Error loading inventory items:', err);
      }
    };
    loadItems();
  }, [userToken]);

  const onSave = async () => {
    if (!warehouseId || !zone.trim() || !shelf.trim() || !bin.trim() || !x.trim() || !y.trim() || !itemId || !quantity.trim() || !maxThreshold.trim()) {
      Alert.alert('Validation', 'All fields (including item, quantity, capacity, X and Y) are required');
      return;
    }
    try {
      const newLoc = await createLocation(userToken, { warehouseId, zone, shelf, bin, x: parseFloat(x), y: parseFloat(y) });
      await createWarehouseItem(userToken, {
        warehouseId,
        itemId,
        locationId: newLoc.id,
        quantity: parseInt(quantity, 10),
        maxThreshold: parseInt(maxThreshold, 10)
      });
      Alert.alert('Success', 'Location and rack item created');
      navigation.goBack();
    } catch (err) {
      console.error('Create location error:', err);
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Create Location" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.label}>Warehouse</Text>
        <Picker
          selectedValue={warehouseId}
          onValueChange={setWarehouseId}
          style={styles.picker}
        >
          {warehouses.map((w) => (
            <Picker.Item key={w.id} label={w.name} value={w.id} />
          ))}
        </Picker>
        <Text style={styles.label}>Zone</Text>
        <TextInput style={styles.input} value={zone} onChangeText={setZone} />
        <Text style={styles.label}>Shelf</Text>
        <TextInput style={styles.input} value={shelf} onChangeText={setShelf} />
        <Text style={styles.label}>Bin</Text>
        <TextInput style={styles.input} value={bin} onChangeText={setBin} />
        <Text style={styles.label}>X Coordinate</Text>
        <TextInput
          style={styles.input}
          value={x}
          onChangeText={setX}
          keyboardType='numeric'
        />
        <Text style={styles.label}>Y Coordinate</Text>
        <TextInput
          style={styles.input}
          value={y}
          onChangeText={setY}
          keyboardType='numeric'
        />
        <Text style={styles.label}>Item</Text>
        <Picker
          selectedValue={itemId}
          onValueChange={setItemId}
          style={styles.picker}
        >
          {inventoryItems.map((it) => (
            <Picker.Item key={it.id} label={it.name || it.sku} value={it.id} />
          ))}
        </Picker>
        <Text style={styles.label}>Quantity</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType='numeric'
        />
        <Text style={styles.label}>Capacity (Max Threshold)</Text>
        <TextInput
          style={styles.input}
          value={maxThreshold}
          onChangeText={setMaxThreshold}
          keyboardType='numeric'
        />
        <Button title="Save" onPress={onSave} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: 'bold', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 4, marginTop: 4 },
  picker: { marginVertical: 8 },
}); 
// export default withScreenLayout(CreateLocationScreen, { title: 'CreateLocation' });
export default CreateLocationScreen;
