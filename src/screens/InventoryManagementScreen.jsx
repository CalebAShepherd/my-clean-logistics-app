// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { SafeAreaView } from 'react-native';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { fetchInventoryItems } from '../api/inventoryItems';
import InternalHeader from '../components/InternalHeader';

function InventoryManagementScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = async () => {
    try {
      const data = await fetchInventoryItems(userToken);
      setItems(data);
    } catch (err) {
      console.error('Error loading inventory items:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Inventory Management" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Inventory Management" />
      
      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.primaryActionCard} 
            onPress={() => navigation.navigate('Create Inventory Item')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#007AFF', '#5856D6']}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="plus-circle" size={28} color="white" />
              <Text style={styles.primaryActionText}>Add Item</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryActionCard} 
            onPress={() => navigation.navigate('Add New Supplier')}
            activeOpacity={0.8}
          >
            <View style={styles.secondaryActionContent}>
              <MaterialCommunityIcons name="account-plus" size={24} color="#007AFF" />
              <Text style={styles.secondaryActionText}>Add Supplier</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Inventory List */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Inventory Items</Text>
          <Text style={styles.itemCount}>{items.length} items</Text>
        </View>
        
        <FlatList
          data={items}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="package-variant-closed" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No Inventory Items</Text>
              <Text style={styles.emptySubtitle}>Get started by adding your first inventory item</Text>
              <TouchableOpacity 
                style={styles.emptyActionButton}
                onPress={() => navigation.navigate('Create Inventory Item')}
              >
                <Text style={styles.emptyActionText}>Add First Item</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => navigation.navigate('Inventory Item Detail', { id: item.id })}
              activeOpacity={0.7}
            >
              <View style={styles.inventoryCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.itemIconContainer}>
                    <MaterialCommunityIcons name="package-variant" size={24} color="#007AFF" />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSku}>SKU: {item.sku}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
                </View>
                
                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="cube-outline" size={16} color="#8E8E93" />
                    <Text style={styles.detailText}>Unit: {item.unit}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="truck" size={16} color="#8E8E93" />
                    <Text style={styles.detailText}>
                      Supplier: {item.supplier?.name || 'No supplier assigned'}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  
  // Actions Section
  actionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  
  // Primary Action Card
  primaryActionCard: {
    flex: 1,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  primaryActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Secondary Action Card
  secondaryActionCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E1E5E9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  secondaryActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  secondaryActionText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // List Section
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  itemCount: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 32,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Inventory Card Styles
  inventoryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  itemIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  cardContent: {
    flex: 1,
  },
  
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  
  cardSku: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  cardDetails: {
    paddingLeft: 8,
  },
  
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  
  detailText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 8,
  },
}); 
// export default withScreenLayout(InventoryManagementScreen, { title: 'InventoryManagement' });
export default InventoryManagementScreen;
