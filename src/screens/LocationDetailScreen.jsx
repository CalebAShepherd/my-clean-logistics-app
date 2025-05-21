// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert, ScrollView, SafeAreaView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { fetchLocation, updateLocation, deleteLocation } from '../api/locations';
import InternalHeader from '../components/InternalHeader';
import { Picker } from '@react-native-picker/picker';
import { fetchWarehouseItems, updateWarehouseItem, createWarehouseItem } from '../api/warehouseItems';
import { fetchInventoryItems } from '../api/inventoryItems';

function LocationDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { userToken } = useContext(AuthContext);
  const [location, setLocation] = useState(null);
  const [zone, setZone] = useState('');
  const [aisle, setAisle] = useState('');
  const [shelf, setShelf] = useState('');
  const [bin, setBin] = useState('');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [maxThreshold, setMaxThreshold] = useState('');
  const [warehouseItem, setWarehouseItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchLocation(userToken, id);
        setLocation(data);
        setZone(data.zone);
        setAisle(data.aisle || '');
        setShelf(data.shelf);
        setBin(data.bin);
      } catch (err) {
        console.error('Error loading location:', err);
        Alert.alert('Error', 'Failed to load location');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const items = await fetchInventoryItems(userToken);
        setInventoryItems(items);
      } catch (err) {
        console.error('Error loading inventory items:', err);
      }
    };
    loadInventory();
  }, [userToken]);

  useEffect(() => {
    if (!location) return;
    const loadRack = async () => {
      try {
        const items = await fetchWarehouseItems(userToken, { warehouseId: location.warehouseId, locationId: id });
        if (items.length > 0) {
          const w = items[0];
          setWarehouseItem(w);
          setItemId(w.itemId);
          setQuantity(w.quantity.toString());
          setMaxThreshold((w.maxThreshold ?? '').toString());
        }
      } catch (err) {
        console.error('Error loading rack item:', err);
      }
    };
    loadRack();
  }, [location]);

  const onSave = async () => {
    if (!zone.trim() || !aisle.trim() || !shelf.trim() || !bin.trim() || !itemId || !quantity.trim() || !maxThreshold.trim()) {
      Alert.alert('Validation', 'All fields (zone, aisle, shelf, bin, item, quantity, capacity) are required');
      return;
    }
    setLoading(true);
    try {
      const updatedLoc = await updateLocation(userToken, id, { zone, aisle, shelf, bin });
      setLocation(updatedLoc);
      if (warehouseItem) {
        const updatedW = await updateWarehouseItem(userToken, location.warehouseId, itemId, {
          locationId: id,
          quantity: parseInt(quantity, 10),
          maxThreshold: parseInt(maxThreshold, 10),
        });
        setWarehouseItem(updatedW);
      } else {
        const newW = await createWarehouseItem(userToken, {
          warehouseId: location.warehouseId,
          itemId,
          locationId: id,
          quantity: parseInt(quantity, 10),
          maxThreshold: parseInt(maxThreshold, 10),
        });
        setWarehouseItem(newW);
      }
      Alert.alert('Success', 'Location and rack updated');
    } catch (err) {
      console.error('Error updating location:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this location?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteItem }
      ]
    );
  };

  const deleteItem = async () => {
    setLoading(true);
    try {
      await deleteLocation(userToken, id);
      Alert.alert('Deleted', 'Location removed');
      navigation.goBack();
    } catch (err) {
      console.error('Error deleting location:', err);
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
      <InternalHeader navigation={navigation} title="Location Detail" />
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Zone</Text>
      <TextInput style={styles.input} value={zone} onChangeText={setZone} />
      <Text style={styles.label}>Aisle</Text>
      <TextInput style={styles.input} value={aisle} onChangeText={setAisle} />
      <Text style={styles.label}>Shelf</Text>
      <TextInput style={styles.input} value={shelf} onChangeText={setShelf} />
      <Text style={styles.label}>Bin</Text>
      <TextInput style={styles.input} value={bin} onChangeText={setBin} />
      <Text style={styles.label}>Item</Text>
      <Picker selectedValue={itemId} onValueChange={setItemId} style={styles.picker}>
        {inventoryItems.map(it => (
          <Picker.Item key={it.id} label={it.name || it.sku} value={it.id} />
        ))}
      </Picker>
      <Text style={styles.label}>Quantity</Text>
      <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType='numeric' />
      <Text style={styles.label}>Capacity</Text>
      <TextInput style={styles.input} value={maxThreshold} onChangeText={setMaxThreshold} keyboardType='numeric' />
      <Button title="Save" onPress={onSave} />
      <View style={styles.deleteBtn}>
        <Button title="Delete" color="red" onPress={onDelete} />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: 'bold', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginTop: 4, borderRadius: 4 },
  deleteBtn: { marginTop: 16 }
}); 
// export default withScreenLayout(LocationDetailScreen, { title: 'LocationDetail' });
export default LocationDetailScreen;
