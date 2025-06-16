// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { fetchWarehouses } from '../api/warehouses';
import { fetchLocations } from '../api/locations';
import { SafeAreaView } from 'react-native-safe-area-context';
import InternalHeader from '../components/InternalHeader';

function LocationsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [warehouses, setWarehouses] = useState([]);
  const [currentWarehouse, setCurrentWarehouse] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Hide the Locations screen when warehouse heatmap is enabled
  if (settings?.enableWarehouseHeatmap) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Locations" />
        <View style={styles.featureDisabledContainer}>
          <MaterialCommunityIcons name="eye-off" size={64} color="#C7C7CC" />
          <Text style={styles.featureDisabledTitle}>Locations Hidden</Text>
          <Text style={styles.featureDisabledText}>
            Locations are hidden when Warehouse Heatmap is enabled. Disable the heatmap feature to view locations.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const loadData = async () => {
    try {
      const wh = await fetchWarehouses(userToken);
      setWarehouses(wh);
      if (wh.length && !currentWarehouse) {
        setCurrentWarehouse(wh[0].id);
      }
    } catch (err) {
      console.error('Error loading warehouses:', err);
      Alert.alert('Error', 'Failed to load warehouses');
    }
  };

  const loadLocations = async () => {
    if (!currentWarehouse) return;
    try {
      const data = await fetchLocations(userToken, currentWarehouse);
      setLocations(data);
    } catch (err) {
      console.error('Error loading locations:', err);
      Alert.alert('Error', 'Failed to load locations');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadLocations()]);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      if (settings?.hasWarehouses) {
        await loadData();
      }
      setLoading(false);
    };
    loadInitialData();
  }, [userToken, settings]);

  useEffect(() => {
    loadLocations();
  }, [userToken, currentWarehouse]);

  if (!settings?.hasWarehouses) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Locations" />
        <View style={styles.featureDisabledContainer}>
          <MaterialCommunityIcons name="warehouse" size={64} color="#C7C7CC" />
          <Text style={styles.featureDisabledTitle}>Warehouse Feature Disabled</Text>
          <Text style={styles.featureDisabledText}>
            The warehouse feature is currently disabled. Contact your administrator to enable it.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Locations" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading locations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedWarehouse = warehouses.find(w => w.id === currentWarehouse);

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Locations" 
        rightIcons={[
          {
            icon: 'plus',
            color: '#007AFF',
            onPress: () => navigation.navigate('Create Location')
          }
        ]}
      />
      
      {/* Warehouse Selector */}
      <View style={styles.warehouseSelectorContainer}>
        <Text style={styles.sectionTitle}>Warehouse</Text>
        <View style={styles.warehouseCard}>
          <View style={styles.warehouseCardContent}>
            <MaterialCommunityIcons name="warehouse" size={24} color="#007AFF" />
            <View style={styles.warehouseInfo}>
              <Text style={styles.warehouseLabel}>Selected Warehouse</Text>
              <Text style={styles.warehouseName}>
                {selectedWarehouse?.name || 'Select a warehouse'}
              </Text>
            </View>
          </View>
          
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={currentWarehouse}
              onValueChange={setCurrentWarehouse}
              style={styles.picker}
            >
              {warehouses.map(w => (
                <Picker.Item key={w.id} label={w.name} value={w.id} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.addLocationButton} 
          onPress={() => navigation.navigate('Create Location')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#007AFF', '#5856D6']}
            style={styles.addLocationGradient}
          >
            <MaterialCommunityIcons name="plus-circle" size={20} color="white" />
            <Text style={styles.addLocationText}>Add New Location</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Locations List */}
      <View style={styles.locationsContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Storage Locations</Text>
          <Text style={styles.locationCount}>{locations.length} locations</Text>
        </View>
        
        <FlatList
          data={locations}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
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
              <MaterialCommunityIcons name="map-marker-off" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No Locations Found</Text>
              <Text style={styles.emptySubtitle}>
                {currentWarehouse 
                  ? 'This warehouse has no storage locations yet' 
                  : 'Select a warehouse to view its locations'
                }
              </Text>
              {currentWarehouse && (
                <TouchableOpacity 
                  style={styles.emptyActionButton}
                  onPress={() => navigation.navigate('Create Location')}
                >
                  <Text style={styles.emptyActionText}>Add First Location</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => navigation.navigate('Location Detail', { id: item.id })}
              activeOpacity={0.7}
            >
              <View style={styles.locationCard}>
                <View style={styles.locationCardHeader}>
                  <View style={styles.locationIconContainer}>
                    <MaterialCommunityIcons name="map-marker" size={24} color="#007AFF" />
                  </View>
                  <View style={styles.locationCardContent}>
                    <Text style={styles.locationCode}>
                      {item.zone}-{item.shelf}-{item.bin}
                    </Text>
                    <Text style={styles.locationDetails}>
                      Zone {item.zone} • Shelf {item.shelf} • Bin {item.bin}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
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
  
  // Feature Disabled State
  featureDisabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  featureDisabledTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  featureDisabledText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Warehouse Selector
  warehouseSelectorContainer: {
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
    marginBottom: 12,
  },
  warehouseCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  warehouseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warehouseInfo: {
    marginLeft: 12,
    flex: 1,
  },
  warehouseLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  warehouseName: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '600',
    marginTop: 2,
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  picker: {
    height: 50,
  },
  
  // Actions Container
  actionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  addLocationButton: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  addLocationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  addLocationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Locations Container
  locationsContainer: {
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
  locationCount: {
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
  
  // Location Card Styles
  locationCard: {
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
  
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  locationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  locationCardContent: {
    flex: 1,
  },
  
  locationCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  
  locationDetails: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
//  export default withScreenLayout(LocationsScreen, { title: 'Locations' });
export default LocationsScreen;
