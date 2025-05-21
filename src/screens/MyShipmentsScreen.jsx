import React, { useContext, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import InternalHeader from '../components/InternalHeader';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';

const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

function ShipmentList({ status, shipments, onRefresh, userToken, fetching, settings }) {
  const navigation = useNavigation();
  // Map statuses to display labels and colors
  const statusLabelMap = { CREATED: 'Processing', IN_TRANSIT: 'In Transit', DELIVERED: 'Completed' };
  const badgeColors = { CREATED: '#999', IN_TRANSIT: '#FFA500', DELIVERED: '#4CAF50' };
  const filtered = shipments.filter(s => s.status === status);

  if (fetching) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }
  if (!filtered.length) {
    return (
      <View style={styles.center}>
        <Text>No shipments</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={item => item.id}
      contentContainerStyle={{ paddingBottom: 80 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Shipment Details', { id: item.id })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.orderId}>Order ID {item.reference || item.id.substring(0,8)}</Text>
            <View style={[styles.badge, { backgroundColor: badgeColors[item.status] || '#999' }]}> 
              <Text style={styles.badgeText}>{statusLabelMap[item.status]}</Text>
            </View>
          </View>
          {/* Company name not needed for client, but keeping layout */}
          {/* <Text style={styles.companyName}>{item.client?.username}</Text> */}
          <View style={styles.addressSection}>
            <Text style={styles.addressLabel}>Pickup</Text>
            <Text style={styles.addressText}>{item.origin}</Text>
            <Text style={styles.addressLabel}>Delivery</Text>
            <Text style={styles.addressText}>{item.destination}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

export default function MyShipmentsScreen({ navigation }) {
  const { user, userToken, navigation: nav } = useContext(AuthContext);
  const { settings } = useSettings();
  const [shipments, setShipments] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [activeTab, setActiveTab] = useState('CREATED');

  const fetchShipments = () => {
    if (!userToken) return;
    setFetching(true);
    fetch(`${API_URL}/api/shipments`, { headers: { Authorization: `Bearer ${userToken}` } })
      .then(res => res.json())
      .then(data => {
        const my = data.filter(s => s.clientId === user.id);
        my.sort((a,b) => new Date(a.shipmentDate) - new Date(b.shipmentDate));
        setShipments(my);
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  };

  useEffect(() => { fetchShipments(); }, [userToken, user.id]);

  if (!settings) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <InternalHeader navigation={navigation} title="My Shipments" />
      <View style={styles.tabHeader}>
        {[
          ['CREATED','Processing'],
          ['IN_TRANSIT','In Transit'],
          ['DELIVERED','Completed']
        ].map(([status,label]) => (
          <TouchableOpacity
            key={status}
            style={[styles.tabButton, activeTab===status && styles.tabButtonActive]}
            onPress={() => setActiveTab(status)}
          >
            <Text style={[styles.tabLabel, activeTab===status && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ShipmentList
        status={activeTab}
        shipments={shipments}
        onRefresh={fetchShipments}
        userToken={userToken}
        fetching={fetching}
        settings={settings}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabHeader: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#ccc' },
  tabButton: { paddingHorizontal: 12, paddingVertical: 16 },
  tabButtonActive: { borderBottomWidth: 2, borderColor: '#000' },
  tabLabel: { fontSize: 14, color: 'gray', textTransform: 'uppercase' },
  tabLabelActive: { fontSize: 14, color: '#000', fontWeight: '600', textTransform: 'uppercase' },
  card: { padding: 12, backgroundColor: '#fff', marginVertical: 4, marginHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: 'bold' },
  badge: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  addressSection: { marginTop: 8 },
  addressLabel: { fontWeight: 'bold' },
  addressText: { marginTop: 4, flexWrap: 'wrap' },
});