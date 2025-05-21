// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { SafeAreaView } from 'react-native';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { fetchWarehouseItems } from '../api/warehouseItems';
import InternalHeader from '../components/InternalHeader';
import { getCurrentUser } from '../api/users';

function WarehouseInventoryScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [currentWarehouse, setCurrentWarehouse] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!settings?.hasWarehouses) return;
    const loadAssignedWarehouse = async () => {
      setLoading(true);
      try {
        const profile = await getCurrentUser(userToken);
        if (profile.warehouseId) {
          setCurrentWarehouse(profile.warehouseId);
        } else {
          console.error('No warehouse assigned to user');
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAssignedWarehouse();
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
      <SafeAreaView style={styles.center}>
        <Text>Warehouse feature is disabled.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Warehouse Inventory" />
      <FlatList
        data={items}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.itemId}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.InventoryItem?.name || item.itemId}</Text>
            <Text style={styles.cardText}>SKU: {item.InventoryItem?.sku || '-'}</Text>
            <Text style={styles.cardText}>Supplier: {item.InventoryItem?.supplier?.name || '-'}</Text>
            <Text style={styles.cardText}>Quantity: {item.quantity}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: 'bold', marginBottom: 8, paddingHorizontal: 16, marginTop: 16 },
  picker: { marginBottom: 16 },
  row: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 16 },
  name: { flex: 1 },
  sku: { flex: 1 },
  qty: { width: 80, textAlign: 'right' },
  sep: { height: 1, backgroundColor: '#eee' },
  list: { paddingHorizontal: 16, marginTop: 16 },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  colName: {
    flex: 2,
  },
  colSku: {
    flex: 1,
  },
  colSupplier: {
    flex: 1,
  },
  colQty: {
    width: 80,
    textAlign: 'right',
  },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  cardText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
}); 
//  export default withScreenLayout(WarehouseInventoryScreen, { title: 'WarehouseInventory' });
export default WarehouseInventoryScreen;
