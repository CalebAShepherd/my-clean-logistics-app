// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, KeyboardAvoidingView, Platform, SafeAreaView, RefreshControl, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { fetchWarehouses } from '../api/warehouses';
import { listRoutes } from '../api/routes';
import { useIsFocused } from '@react-navigation/native';
import InternalHeader from '../components/InternalHeader';
import { getApiUrl } from '../utils/apiHost';

const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || getApiUrl();

function RouteOptimizationScreen({ navigation }) {
  const flatListRef = useRef(null);
  const { userToken } = useContext(AuthContext);
  const isFocused = useIsFocused();
  const { settings } = useSettings();
  const [warehouses, setWarehouses] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [searchTransporter, setSearchTransporter] = useState('');
  const [selectedTransporter, setSelectedTransporter] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [searchShipment, setSearchShipment] = useState('');
  const [selectedShipments, setSelectedShipments] = useState([]);
  const [shipmentWarehouseMap, setShipmentWarehouseMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch users, shipments, warehouses, and routes
      const usersP = fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${userToken}` } }).then(res => res.json());
      const shipmentsP = fetch(`${API_URL}/api/shipments`, { headers: { Authorization: `Bearer ${userToken}` } }).then(res => res.json());
      const warehousesP = fetchWarehouses(userToken);
      const routesP = listRoutes(userToken);
      const [users, allShipments, whs, routes] = await Promise.all([usersP, shipmentsP, warehousesP, routesP]);
      
      // Determine shipments already assigned to routes
      const assignedIds = new Set();
      routes.forEach(route => {
        (route.RouteShipment || []).forEach(rs => assignedIds.add(rs.shipmentId));
      });
      
      // Filter out assigned shipments
      const unassignedShipments = allShipments.filter(s => !assignedIds.has(s.id));
      
      setTransporters(users.filter(u => u.role === 'transporter'));
      setShipments(unassignedShipments);
      setWarehouses(whs);
    } catch (e) {
      console.error('Error loading data:', e);
      Alert.alert('Error', 'Failed to load route optimization data');
    }
  };

  useEffect(() => {
    if (userToken && isFocused) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }
  }, [userToken, isFocused]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Filter shipments: show all, but allow search
  const filteredShipments = shipments.filter(s =>
    s.id.toLowerCase().includes(searchShipment.toLowerCase()) ||
    s.origin.toLowerCase().includes(searchShipment.toLowerCase()) ||
    s.destination.toLowerCase().includes(searchShipment.toLowerCase())
  );

  const filteredTransporters = transporters.filter(t =>
    t.username.toLowerCase().includes(searchTransporter.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTransporter.toLowerCase())
  );

  const toggleShipment = (id) => {
    setSelectedShipments(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Handle warehouse selection per shipment
  const handleWarehouseChange = (shipmentId, warehouseId) => {
    setShipmentWarehouseMap(prev => ({ ...prev, [shipmentId]: warehouseId }));
  };

  // Assign selected shipments to their selected warehouses
  const handleAssignToWarehouse = async () => {
    const toAssign = Object.entries(shipmentWarehouseMap).filter(([shipmentId, warehouseId]) => warehouseId !== undefined);
    if (toAssign.length === 0) {
      Alert.alert('No Assignments', 'Please select warehouses for shipments first');
      return;
    }
    
    setAssigning(true);
    try {
      await Promise.all(toAssign.map(async ([shipmentId, warehouseId]) => {
        await fetch(`${API_URL}/api/shipments/${shipmentId}/assign-warehouse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({ warehouseId: warehouseId === 'none' ? null : warehouseId }),
        });
      }));
      
      // Refresh shipments list
      await fetchData();
      Alert.alert('Success', 'Shipments assigned to warehouses successfully');
    } catch (e) {
      console.error('Error assigning shipments:', e);
      Alert.alert('Error', 'Failed to assign shipments to warehouses');
    } finally {
      setAssigning(false);
    }
  };

  // Route optimization: use warehouse address if assigned
  const handleOptimize = async () => {
    if (!selectedTransporter) {
      Alert.alert('No Transporter', 'Please select a transporter first');
      return;
    }
    
    if (selectedShipments.length === 0) {
      Alert.alert('No Shipments', 'Please select shipments to optimize');
      return;
    }
    
    setOptimizing(true);
    try {
      // Prepare shipment IDs and any delivery overrides
      const selected = selectedShipments.map(id => {
        const warehouseId = shipmentWarehouseMap[id];
        if (warehouseId && warehouseId !== 'none') {
          const warehouse = warehouses.find(w => w.id === warehouseId);
          return { id, deliveryAddress: warehouse ? warehouse.address : undefined };
        } else {
          const shipment = shipments.find(s => s.id === id);
          return { id, deliveryAddress: shipment ? shipment.destination : undefined };
        }
      });
      
      const shipmentIds = selected.map(s => s.id);
      const deliveryOverrides = {};
      selected.forEach(s => {
        if (s.deliveryAddress) deliveryOverrides[s.id] = s.deliveryAddress;
      });
      
      // Compute optimized route without persisting
      const res = await fetch(`${API_URL}/routes/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          transporterId: selectedTransporter,
          shipmentIds,
          deliveryOverrides,
          persist: false
        }),
      });
      
      if (!res.ok) {
        throw new Error('Route optimization failed');
      }
      
      const computedRoute = await res.json();
      // Navigate to detail screen with computed route data
      navigation.navigate('RouteDetail', { computedRoute, transporterId: selectedTransporter });
    } catch (e) {
      console.error('Optimize error:', e);
      Alert.alert('Error', 'Failed to optimize route');
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Route Optimization" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading optimization data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedTransporterData = transporters.find(t => t.id === selectedTransporter);

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Route Optimization" />
      
      <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={80}>
        {/* Visual Header */}
        <View style={styles.headerCard}>
          <LinearGradient
            colors={['#007AFF', '#5856D6']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <MaterialCommunityIcons name="map-search" size={32} color="white" />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Route Optimization</Text>
                <Text style={styles.headerSubtitle}>Optimize delivery routes for efficiency</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <FlatList
          ref={flatListRef}
          data={filteredShipments}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
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
          ListHeaderComponent={() => (
            <View style={styles.headerContainer}>
              {/* Instructions Card */}
              <View style={styles.instructionsCard}>
                <View style={styles.instructionsHeader}>
                  <MaterialCommunityIcons name="information" size={20} color="#007AFF" />
                  <Text style={styles.instructionsTitle}>How It Works</Text>
                </View>
                <Text style={styles.instructionsText}>
                  1. Select a transporter from the list below{'\n'}
                  2. Choose shipments to include in the route{'\n'}
                  3. Optionally assign shipments to warehouses{'\n'}
                  4. Optimize the route for maximum efficiency
                </Text>
              </View>

              {/* Transporter Selection */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="account-tie" size={20} color="#007AFF" />
                  <Text style={styles.cardTitle}>Select Transporter</Text>
                </View>
                
                <View style={styles.searchContainer}>
                  <MaterialCommunityIcons name="magnify" size={20} color="#8E8E93" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search transporters..."
                    value={searchTransporter}
                    onChangeText={setSearchTransporter}
                    placeholderTextColor="#8E8E93"
                  />
                  {searchTransporter.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchTransporter('')} style={styles.clearButton}>
                      <MaterialCommunityIcons name="close-circle" size={20} color="#8E8E93" />
                    </TouchableOpacity>
                  )}
                </View>
                
                {selectedTransporterData && (
                  <View style={styles.selectedTransporterCard}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#34C759" />
                    <View style={styles.selectedTransporterInfo}>
                      <Text style={styles.selectedTransporterName}>{selectedTransporterData.username}</Text>
                      <Text style={styles.selectedTransporterEmail}>{selectedTransporterData.email}</Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedTransporter}
                    onValueChange={setSelectedTransporter}
                    style={styles.picker}
                  >
                    <Picker.Item label="-- Select transporter --" value={null} />
                    {filteredTransporters.map(t => (
                      <Picker.Item key={t.id} label={`${t.username} (${t.email})`} value={t.id} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Shipments Search */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="package-variant-closed" size={20} color="#007AFF" />
                  <Text style={styles.cardTitle}>Available Shipments</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{filteredShipments.length}</Text>
                  </View>
                </View>
                
                <View style={styles.searchContainer}>
                  <MaterialCommunityIcons name="magnify" size={20} color="#8E8E93" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search shipments..."
                    value={searchShipment}
                    onChangeText={setSearchShipment}
                    onFocus={() => flatListRef.current?.scrollToOffset({ offset: 50, animated: true })}
                    placeholderTextColor="#8E8E93"
                  />
                  {searchShipment.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchShipment('')} style={styles.clearButton}>
                      <MaterialCommunityIcons name="close-circle" size={20} color="#8E8E93" />
                    </TouchableOpacity>
                  )}
                </View>
                
                {selectedShipments.length > 0 && (
                  <View style={styles.selectionSummary}>
                    <MaterialCommunityIcons name="checkbox-marked-circle" size={16} color="#34C759" />
                    <Text style={styles.selectionText}>
                      {selectedShipments.length} shipment{selectedShipments.length > 1 ? 's' : ''} selected
                    </Text>
                  </View>
                )}
              </View>

              {/* Warehouse Assignment Actions */}
              {settings.hasWarehouses && (
                <View style={styles.actionCard}>
                  <TouchableOpacity 
                    style={[styles.actionButton, assigning && styles.actionButtonDisabled]}
                    onPress={handleAssignToWarehouse}
                    disabled={assigning}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={assigning ? ['#8E8E93', '#8E8E93'] : ['#34C759', '#30B855']}
                      style={styles.actionButtonGradient}
                    >
                      <MaterialCommunityIcons 
                        name={assigning ? "loading" : "warehouse"} 
                        size={18} 
                        color="white" 
                      />
                      <Text style={styles.actionButtonText}>
                        {assigning ? 'Assigning...' : 'Assign to Warehouses'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.shipmentCard,
                selectedShipments.includes(item.id) && styles.selectedShipmentCard
              ]}
              onPress={() => toggleShipment(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.shipmentHeader}>
                <View style={styles.shipmentInfo}>
                  <Text style={styles.shipmentId}>#{item.id.substring(0,8)}</Text>
                  <View style={styles.shipmentRoute}>
                    <MaterialCommunityIcons name="circle" size={8} color="#34C759" />
                    <Text style={styles.routeText}>{item.origin}</Text>
                    <MaterialCommunityIcons name="arrow-right" size={16} color="#8E8E93" />
                    <Text style={styles.routeText}>{item.destination}</Text>
                    <MaterialCommunityIcons name="map-marker" size={8} color="#FF3B30" />
                  </View>
                </View>
                
                <View style={styles.selectionIndicator}>
                  {selectedShipments.includes(item.id) ? (
                    <MaterialCommunityIcons name="checkbox-marked-circle" size={24} color="#34C759" />
                  ) : (
                    <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={24} color="#C7C7CC" />
                  )}
                </View>
              </View>
              
              {/* Warehouse Assignment Status */}
              <View style={styles.shipmentStatus}>
                {(item.warehouseId && (shipmentWarehouseMap[item.id] === undefined || shipmentWarehouseMap[item.id] !== 'none')) ? (
                  <View style={styles.statusBadge}>
                    <MaterialCommunityIcons name="warehouse" size={12} color="#34C759" />
                    <Text style={styles.statusText}>Assigned to warehouse</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.statusBadgeWarning]}>
                    <MaterialCommunityIcons name="map-marker-outline" size={12} color="#FF9500" />
                    <Text style={[styles.statusText, styles.statusTextWarning]}>Direct delivery</Text>
                  </View>
                )}
              </View>
              
              {/* Warehouse Selection */}
              {settings.hasWarehouses && (
                <View style={styles.warehouseSelection}>
                  <Text style={styles.warehouseLabel}>Delivery destination:</Text>
                  <View style={styles.warehousePickerContainer}>
                    <Picker
                      selectedValue={shipmentWarehouseMap[item.id] || item.warehouseId || 'none'}
                      onValueChange={val => handleWarehouseChange(item.id, val)}
                      style={styles.warehousePicker}
                    >
                      <Picker.Item label="Direct to customer" value="none" />
                      {warehouses.map(w => (
                        <Picker.Item key={w.id} label={w.name} value={w.id} />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="truck-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No Shipments Available</Text>
              <Text style={styles.emptySubtitle}>
                {searchShipment 
                  ? 'Try adjusting your search criteria' 
                  : 'All shipments are already assigned to routes'}
              </Text>
            </View>
          )}
          ListFooterComponent={() => (
            <View style={styles.footerContainer}>
              <TouchableOpacity
                style={[styles.optimizeButton, (!selectedTransporter || selectedShipments.length === 0 || optimizing) && styles.optimizeButtonDisabled]}
                onPress={handleOptimize}
                disabled={!selectedTransporter || selectedShipments.length === 0 || optimizing}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={(!selectedTransporter || selectedShipments.length === 0 || optimizing) 
                    ? ['#8E8E93', '#8E8E93'] 
                    : ['#007AFF', '#5856D6']}
                  style={styles.optimizeButtonGradient}
                >
                  <MaterialCommunityIcons 
                    name={optimizing ? "loading" : "map-search"} 
                    size={20} 
                    color="white" 
                  />
                  <Text style={styles.optimizeButtonText}>
                    {optimizing ? 'Optimizing Route...' : 'Optimize Route'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        />
      </KeyboardAvoidingView>
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
  
  // Visual Header
  headerCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  headerGradient: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Layout
  listContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    paddingHorizontal: 20,
  },
  
  // Instructions Card
  instructionsCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 18,
  },
  
  // Cards
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
    flex: 1,
  },
  
  // Badge
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  
  // Search Container
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
  },
  clearButton: {
    padding: 4,
  },
  
  // Selected Transporter
  selectedTransporterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  selectedTransporterInfo: {
    marginLeft: 12,
    flex: 1,
  },
  selectedTransporterName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  selectedTransporterEmail: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  
  // Picker
  pickerContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    color: '#1C1C1E',
  },
  
  // Selection Summary
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  selectionText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
    marginLeft: 6,
  },
  
  // Action Card
  actionCard: {
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Shipment Cards
  shipmentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedShipmentCard: {
    borderColor: '#007AFF',
    backgroundColor: '#F8FAFF',
  },
  shipmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shipmentInfo: {
    flex: 1,
  },
  shipmentId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  shipmentRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  routeText: {
    fontSize: 12,
    color: '#8E8E93',
    marginHorizontal: 6,
    maxWidth: 100,
  },
  selectionIndicator: {
    marginLeft: 12,
  },
  
  // Status Badge
  shipmentStatus: {
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  statusBadgeWarning: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFECB3',
  },
  statusText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '500',
    marginLeft: 4,
  },
  statusTextWarning: {
    color: '#FF9500',
  },
  
  // Warehouse Selection
  warehouseSelection: {
    marginTop: 8,
  },
  warehouseLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  warehousePickerContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  warehousePicker: {
    color: '#1C1C1E',
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Footer
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  optimizeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  optimizeButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  optimizeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  optimizeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
});
// export default withScreenLayout(RouteOptimizationScreen, { title: 'RouteOptimization' });
export default RouteOptimizationScreen;
