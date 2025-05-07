// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { fetchWarehouses } from '../api/warehouses';
import { fetchWarehouseItems } from '../api/warehouseItems';

function WarehouseInventoryScreen() {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [warehouses, setWarehouses] = useState([]);
  const [currentWarehouse, setCurrentWarehouse] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWarehouses = async () => {
      setLoading(true);
      try {
        const wh = await fetchWarehouses(userToken);
        setWarehouses(wh);
        if (wh.length) setCurrentWarehouse(wh[0].id);
      } catch (err) {
        console.error('Error loading warehouses:', err);
      } finally {
        setLoading(false);
      }
    };
    if (settings?.hasWarehouses) {
      loadWarehouses();
    } else {
      setLoading(false);
    }
  }, [userToken, settings]);

  useEffect(() => {
    if (!currentWarehouse) return;
    const loadItems = async () => {
      setLoading(true);
      try {
        const data = await fetchWarehouseItems(userToken, { warehouseId: currentWarehouse });
        setItems(data);
      } catch (err) {
        console.error('Error loading stock levels:', err);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, [userToken, currentWarehouse]);

  if (!settings?.hasWarehouses) {
    return (
      <View style={styles.center}>
        <Text>Warehouse feature is disabled.</Text>
      </View>
    );
  }

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Warehouse</Text>
      <Picker
        selectedValue={currentWarehouse}
        onValueChange={setCurrentWarehouse}
        style={styles.picker}
      >
        {warehouses.map((w) => (
          <Picker.Item key={w.id} label={w.name} value={w.id} />
        ))}
      </Picker>
      <FlatList
        data={items}
        keyExtractor={(item) => item.itemId}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.item.name || item.itemId}</Text>
            <Text style={styles.qty}>Qty: {item.quantity}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: 'bold', marginBottom: 8 },
  picker: { marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  name: { flex: 1 },
  qty: { width: 80, textAlign: 'right' },
  sep: { height: 1, backgroundColor: '#eee' },
}); 
//  export default withScreenLayout(WarehouseInventoryScreen, { title: 'WarehouseInventory' });
