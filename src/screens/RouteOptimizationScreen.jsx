// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Button, ActivityIndicator, StyleSheet, TextInput, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { fetchWarehouses } from '../api/warehouses';
import { listRoutes } from '../api/routes';
import { useIsFocused } from '@react-navigation/native';
import InternalHeader from '../components/InternalHeader';

const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

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
  const [optimizing, setOptimizing] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };
    if (userToken && isFocused) {
      setLoading(true);
      fetchData();
    }
  }, [userToken, isFocused]);

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
    // Now include all shipments with a warehouse selection, even 'none'
    const toAssign = Object.entries(shipmentWarehouseMap).filter(([shipmentId, warehouseId]) => warehouseId !== undefined);
    if (toAssign.length === 0) return;
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
      const shipRes = await fetch(`${API_URL}/api/shipments`, { headers: { Authorization: `Bearer ${userToken}` } });
      const ship = await shipRes.json();
      setShipments(ship);
      alert('Shipments assigned to warehouses!');
    } catch (e) {
      console.error('Error assigning shipments:', e);
      alert('Error assigning shipments.');
    } finally {
      setAssigning(false);
    }
  };

  // Route optimization: use warehouse address if assigned
  const handleOptimize = async () => {
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
      const computedRoute = await res.json();
      // Navigate to detail screen with computed route data
      navigation.navigate('RouteDetail', { computedRoute, transporterId: selectedTransporter });
    } catch (e) {
      console.error('Optimize error:', e);
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Route Optimization" />
    <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={80}>
      <FlatList
        ref={flatListRef}
        data={filteredShipments}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={() => (
          <View>
            <Text style={styles.instructions}>For each shipment, select if it is going to a warehouse. You can assign multiple shipments at once. When optimizing a route, if a warehouse is selected, its address will be used as the delivery address.</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search transporters..."
              value={searchTransporter}
              onChangeText={setSearchTransporter}
            />
            <Text style={styles.label}>Select Transporter</Text>
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
            <TextInput
              style={styles.searchInput}
              placeholder="Search shipments..."
              value={searchShipment}
              onChangeText={setSearchShipment}
              onFocus={() => flatListRef.current?.scrollToOffset({ offset: 50, animated: true })}
            />
            {settings.hasWarehouses && (
              <Button
                title={assigning ? 'Assigning...' : 'Assign to Warehouse'}
                onPress={handleAssignToWarehouse}
                disabled={assigning}
              />
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[
            styles.shipmentCard,
            selectedShipments.includes(item.id) && styles.selectedCard
          ]}>
            <TouchableOpacity onPress={() => toggleShipment(item.id)}>
              <Text style={styles.shipmentTitle}>
                #{item.id.substring(0,8)} - {item.origin} → {item.destination}
              </Text>
              {(item.warehouseId && (shipmentWarehouseMap[item.id] === undefined || shipmentWarehouseMap[item.id] !== 'none')) ? (
                <View style={styles.badgeAssigned}>
                  <Text style={styles.badgeText}>Assigned to warehouse</Text>
                </View>
              ) : (
                <View style={styles.badgeUnassigned}>
                  <Text style={styles.badgeText}>Not assigned</Text>
                </View>
              )}
            </TouchableOpacity>
            {settings.hasWarehouses && (
              <>
                <Text style={styles.dropdownLabel}>Is this shipment going to a warehouse?</Text>
                <Picker
                  selectedValue={shipmentWarehouseMap[item.id] || item.warehouseId || 'none'}
                  onValueChange={val => handleWarehouseChange(item.id, val)}
                  style={styles.picker}
                >
                  <Picker.Item label="No" value="none" />
                  {warehouses.map(w => (
                    <Picker.Item key={w.id} label={w.name} value={w.id} />
                  ))}
                </Picker>
              </>
            )}
          </View>
        )}
        ListFooterComponent={() => (
          <View style={styles.footerContainer}>
            <Button
              title="Optimize Route"
              onPress={handleOptimize}
              disabled={!selectedTransporter || selectedShipments.length < 1 || optimizing}
            />
            {optimizing && <ActivityIndicator style={styles.center} size="small" />}
          </View>
        )}
      />
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  instructions: { 
    fontSize: 16, 
    marginBottom: 20, 
    color: '#333',
    fontWeight: '600',
    textAlign: 'center'
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  label: { 
    fontSize: 18, 
    marginBottom: 8, 
    fontWeight: 'bold',
    color: '#222'
  },
  shipmentCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedCard: {
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  shipmentTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
    color: '#222',
  },
  badgeAssigned: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeUnassigned: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
  },
  dropdownLabel: {
    marginTop: 8,
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  picker: {
    height: 'auto',
    marginTop: 4,
    marginBottom: 8,
  },
  searchInput: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    padding: 8, 
    marginBottom: 12, 
    borderRadius: 4 
  },
  footerContainer: { 
    padding: 16 
  },
}); 
// export default withScreenLayout(RouteOptimizationScreen, { title: 'RouteOptimization' });
export default RouteOptimizationScreen;
