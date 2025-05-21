// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { SafeAreaView } from 'react-native';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { fetchInventoryItems } from '../api/inventoryItems';
import InternalHeader from '../components/InternalHeader';

function InventoryManagementScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await fetchInventoryItems(userToken);
      setItems(data);
    } catch (err) {
      console.error('Error loading inventory items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Inventory Management" />
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Create Inventory Item')}>
          <Text style={styles.primaryButtonText}>Add Item</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Add New Supplier')}>
          <Text style={styles.primaryButtonText}>Add New Supplier</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={loadItems}>
          <Text style={styles.secondaryButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('Inventory Item Detail', { id: item.id })}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardText}>SKU: {item.sku}</Text>
              <Text style={styles.cardText}>Unit: {item.unit}</Text>
              <Text style={styles.cardText}>Supplier: {item.supplier?.name || '-'}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 },
  primaryButton: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, marginBottom: 8 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, marginBottom: 8 },
  secondaryButtonText: { color: '#007AFF', fontSize: 14, fontWeight: 'bold' },
  listContent: { paddingHorizontal: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
}); 
// export default withScreenLayout(InventoryManagementScreen, { title: 'InventoryManagement' });
export default InventoryManagementScreen;
