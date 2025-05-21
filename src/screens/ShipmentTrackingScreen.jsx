import React, { useContext, useEffect, useState } from 'react';
import { SafeAreaView, FlatList, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import InternalHeader from '../components/InternalHeader';
import Constants from 'expo-constants';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.0.73:3000';

const statusLabelMap = { CREATED: 'Processing', IN_TRANSIT: 'In Transit', DELIVERED: 'Completed' };
const badgeColors = { CREATED: '#999', IN_TRANSIT: '#FFA500', DELIVERED: '#4CAF50' };

export default function ShipmentTrackingScreen({ navigation }) {
  const { user, userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [shipments, setShipments] = useState([]);
  const [fetching, setFetching] = useState(false);

  const fetchShipments = () => {
    if (!userToken) return;
    setFetching(true);
    fetch(`${API_URL}/api/shipments`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
      .then(res => res.json())
      .then(data => {
        const my = data.filter(s => s.clientId === user.id);
        my.sort((a, b) => new Date(a.shipmentDate) - new Date(b.shipmentDate));
        setShipments(my);
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  };

  useEffect(fetchShipments, [userToken, user.id]);

  if (!settings) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <InternalHeader navigation={navigation} title="Choose a Shipment to Track" />
      {fetching ? (
        <ActivityIndicator style={styles.center} size="large" />
      ) : (
        <FlatList
          data={shipments}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Tracking Details', { id: item.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>
                  Order ID {item.reference || item.id.substring(0, 8)}
                </Text>
                <View style={[styles.badge, { backgroundColor: badgeColors[item.status] || '#999' }]}>  
                  <Text style={styles.badgeText}>{statusLabelMap[item.status]}</Text>
                </View>
              </View>
              <View style={styles.addressSection}>
                <Text style={styles.addressLabel}>Pickup</Text>
                <Text style={styles.addressText}>{item.origin}</Text>
                <Text style={styles.addressLabel}>Delivery</Text>
                <Text style={styles.addressText}>{item.destination}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 12, backgroundColor: '#fff', marginVertical: 4, marginHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: 'bold' },
  badge: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  addressSection: { marginTop: 8 },
  addressLabel: { fontWeight: 'bold' },
  addressText: { marginTop: 4, flexWrap: 'wrap' },
});