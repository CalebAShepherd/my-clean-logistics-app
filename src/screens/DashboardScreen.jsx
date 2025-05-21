import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Constants from 'expo-constants';

// Base API URL for data fetches
const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

export default function DashboardScreen({ navigation }) {
  const { user, userToken } = useContext(AuthContext);
  const [activeCount, setActiveCount] = useState(0);
  const [loadingActive, setLoadingActive] = useState(false);
  const role = user?.role;
  const { settings } = useSettings();
  const [recentShipments, setRecentShipments] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const statusLabelMap = { CREATED: 'Processing', IN_TRANSIT: 'In Transit', DELIVERED: 'Completed' };
  const statusColors = { CREATED: '#007AFF', IN_TRANSIT: '#FFA500', DELIVERED: '#4CAF50' };

  useEffect(() => {
    setLoadingRecent(true);
    fetch(`${API_URL}/api/shipments`, { headers: { Authorization: `Bearer ${userToken}` } })
      .then(res => res.json())
      .then(data => {
        const myShipments = data.filter(s => s.clientId === user.id);
        myShipments.sort((a, b) => new Date(a.shipmentDate) - new Date(b.shipmentDate));
        setRecentShipments(myShipments.slice(0, 4));
      })
      .catch(console.error)
      .finally(() => setLoadingRecent(false));
  }, [userToken, user.id]);

  // Fetch count of active (processing or in-transit) orders for this client
  useEffect(() => {
    setLoadingActive(true);
    fetch(`${API_URL}/api/shipments`, { headers: { Authorization: `Bearer ${userToken}` } })
      .then(res => res.json())
      .then(data => {
        const myActive = data.filter(s => s.clientId === user.id && ['CREATED','IN_TRANSIT'].includes(s.status));
        setActiveCount(myActive.length);
      })
      .catch(console.error)
      .finally(() => setLoadingActive(false));
  }, [userToken, user.id]);

  if (!settings) {
    return null;
  }
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ marginRight: 12 }} onPress={() => navigation.navigate('Notifications')}>
            <MaterialCommunityIcons name="bell-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <MaterialCommunityIcons name="account-circle" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Active Orders section */}
        <View style={styles.activeCardContainer}>
          <View style={styles.activeCard}>
            <MaterialCommunityIcons name="truck" size={40} color="#007AFF" style={styles.activeIcon} />
            {loadingActive ? (
              <ActivityIndicator />
            ) : (
              <View>
                <Text style={styles.activeLabel}>Active Orders</Text>
                <Text style={styles.activeCount}>{activeCount}</Text>
              </View>
        )}
          </View>
        </View>
        <View style={styles.grid}>
        {['client','admin','dispatcher'].includes(role) && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Create Shipment')}
          >
              <MaterialCommunityIcons style={styles.cardIcon} name="plus-box" size={40} />
            <Text style={styles.cardText}>Create Shipment</Text>
          </TouchableOpacity>
        )}
        {role === 'client' && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('My Shipments')}
          >
              <MaterialCommunityIcons style={styles.cardIcon} name="format-list-bulleted" size={40} />
            <Text style={styles.cardText}>My Shipments</Text>
          </TouchableOpacity>
        )}
        {['client','admin','dispatcher'].includes(role) && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Track Shipment')}
          >
              <MaterialCommunityIcons style={styles.cardIcon} name="map" size={40} />
            <Text style={styles.cardText}>Track Shipment</Text>
          </TouchableOpacity>
        )}
        </View>
        <Text style={styles.sectionTitle}>Recent Shipments</Text>
        <View style={styles.table}>
          <View style={styles.tableRowHeader}>
            <Text style={styles.tableHeaderCell}>Order ID</Text>
            <Text style={styles.tableHeaderCell}>Status</Text>
            <Text style={styles.tableHeaderCell}>ETA</Text>
          </View>
          {loadingRecent ? (
            <ActivityIndicator style={styles.center} size="large" />
          ) : recentShipments.map(s => (
            <TouchableOpacity key={s.id} onPress={() => navigation.navigate('Shipment Details', { id: s.id })}>
              <View style={styles.tableRow}>
                <Text style={styles.tableCellID}>{s.id}</Text>
                <View style={[styles.badgeTable, { backgroundColor: statusColors[s.status] || '#ccc' }]}>
                  <Text style={styles.badgeTableText}>{statusLabelMap[s.status] || s.status}</Text>
                </View>
                <Text style={styles.tableCell}>{s.eta ? new Date(s.eta).toLocaleString() : '-'}</Text>
              </View>
        </TouchableOpacity>
          ))}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activeCardContainer: { marginBottom: 16 },
  activeCard: { 
    flexDirection: 'row', 
    backgroundColor: '#EAF4FF', 
    paddingHorizontal: 16, 
    paddingVertical: 24, 
    borderRadius: 8, 
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center' 
  },
  activeIcon: { marginRight: 12 },
  activeLabel: { fontSize: 16, fontWeight: 'bold' },
  activeCount: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#004080', padding: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row', width: 80, justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 16 },
  table: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, overflow: 'hidden' },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#eee' },
  tableHeaderCell: { flex: 1, padding: 8, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#ccc', alignItems: 'center', paddingVertical: 8 },
  tableCellID: { flex: 1, paddingHorizontal: 8 },
  badgeTable: { padding: 4, borderRadius: 4, marginHorizontal: 8 },
  badgeTableText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  tableCell: { flex: 1, paddingHorizontal: 8 },
  card: {
    width: '32%',
    height: 120,
    backgroundColor: '#ffffff',
    shadowRadius: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    padding: '6',
  },
  cardIcon: { color: '#007AFF' },
  cardText: {
    marginTop: 8,
    textAlign: 'center',
    fontWeight: 'bold'
  },
});
