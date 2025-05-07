// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Button, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { fetchInventoryItems } from '../api/inventoryItems';

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
    <View style={styles.container}>
      <View style={styles.actions}>
        <Button title="Add Item" onPress={() => navigation.navigate('Create Inventory Item')} />
        <Button title="Refresh" onPress={loadItems} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('Inventory Item Detail', { id: item.id })}>
            <View style={styles.item}>
              <Text style={styles.title}>{item.name} (SKU: {item.sku})</Text>
              <Text>Unit: {item.unit}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#ccc' },
  title: { fontWeight: 'bold' },
}); 
// export default withScreenLayout(InventoryManagementScreen, { title: 'InventoryManagement' });
