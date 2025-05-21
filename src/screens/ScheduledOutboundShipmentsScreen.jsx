import React, { useEffect, useState, useContext } from 'react';
import { SafeAreaView, FlatList, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import InternalHeader from '../components/InternalHeader';
import { AuthContext } from '../context/AuthContext';
import { fetchWarehouses } from '../api/warehouses';
import Constants from 'expo-constants';

const statusLabelMap = { CREATED: 'Processing', ASSIGNED: 'Assigned', IN_TRANSIT: 'In Transit', OUT_FOR_DEL: 'Out for Delivery', DELIVERED: 'Completed' };
const badgeColors = { CREATED: '#999', ASSIGNED: '#0074D9', IN_TRANSIT: '#FFA500', OUT_FOR_DEL: '#f39c12', DELIVERED: '#4CAF50' };

export default function ScheduledOutboundShipmentsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouseId, setWarehouseId] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Determine API base URL
  const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
  const API_URL =
    Constants.manifest?.extra?.apiUrl ||
    Constants.expoConfig?.extra?.apiUrl ||
    `http://${localhost}:3000`;

  // Get first warehouse for this admin
  useEffect(() => {
    if (!userToken) return;
    fetchWarehouses(userToken)
      .then(list => { if (list.length) setWarehouseId(list[0].id); })
      .catch(console.error);
  }, [userToken]);

  // Fetch shipments when warehouseId is set
  useEffect(() => {
    if (!userToken || !warehouseId) return;
    setLoading(true);
    fetch(`${API_URL}/api/shipments`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter(s => s.warehouseId === warehouseId && ['CREATED','ASSIGNED'].includes(s.status));
        setShipments(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userToken, warehouseId]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Shipment Details', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>
          Order ID {item.reference || item.id.substring(0,8)}
        </Text>
        <View style={[styles.badge, { backgroundColor: badgeColors[item.status] || '#999' }]}> 
          <Text style={styles.badgeText}>
            {statusLabelMap[item.status] || item.status}
          </Text>
        </View>
      </View>
      <View style={styles.addressSection}>
        <Text style={styles.addressLabel}>Pickup</Text>
        <Text style={styles.addressText}>{item.origin}</Text>
        <Text style={styles.addressLabel}>Delivery</Text>
        <Text style={styles.addressText}>{item.destination}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <InternalHeader navigation={navigation} title="Scheduled Outbound Shipments" />
      <FlatList
        data={shipments}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={() => (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No outbound shipments</Text>
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { padding: 16, textAlign: 'center' },
  card: { padding: 12, backgroundColor: '#fff', marginVertical: 4, marginHorizontal: 16, borderRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: 'bold' },
  badge: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  addressSection: { marginTop: 8 },
  addressLabel: { fontWeight: 'bold' },
  addressText: { marginTop: 4 },
}); 