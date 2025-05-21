// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useContext, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { fetchCompletedCount, fetchOnTimeLate } from '../api/analytics';
import MapView, { Marker } from 'react-native-maps';
import { fetchFleetLocations } from '../api/locations';
import { fetchRecentShipments } from '../api/shipments';
import { SafeAreaView } from 'react-native';

function DispatcherDashboardScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [completedCount, setCompletedCount] = useState(null);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [onTimeLate, setOnTimeLate] = useState(null);
  const [loadingOnTimeLate, setLoadingOnTimeLate] = useState(false);
  const [fleetLocations, setFleetLocations] = useState([]);
  const [loadingFleet, setLoadingFleet] = useState(true);
  const [recentShipments, setRecentShipments] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    setLoadingCompleted(true);
    fetchCompletedCount(userToken)
      .then(data => setCompletedCount(data.count))
      .catch(err => console.error('Error loading completed count:', err))
      .finally(() => setLoadingCompleted(false));

    setLoadingOnTimeLate(true);
    fetchOnTimeLate(userToken)
      .then(data => setOnTimeLate(data))
      .catch(err => console.error('Error loading on-time stats:', err))
      .finally(() => setLoadingOnTimeLate(false));

    // Initial fetch
    setLoadingFleet(true);
    fetchFleetLocations(userToken)
      .then(data => setFleetLocations(data))
      .catch(err => console.error('Error loading fleet locations:', err))
      .finally(() => setLoadingFleet(false));

    // Fetch recent shipments
    setLoadingRecent(true);
    fetchRecentShipments(userToken)
      .then(data => setRecentShipments(data))
      .catch(err => console.error('Error loading recent shipments:', err))
      .finally(() => setLoadingRecent(false));

    // Poll every 30 seconds
    const intervalId = setInterval(() => {
      fetchFleetLocations(userToken)
        .then(data => setFleetLocations(data))
        .catch(err => console.error('Error loading fleet locations:', err));
    }, 30000);
    return () => clearInterval(intervalId);
  }, [userToken]);

  // Calculate map region to fit all markers
  let mapRegion = {
    latitude: 37.0902, // Default to USA center
    longitude: -95.7129,
    latitudeDelta: 20,
    longitudeDelta: 20,
  };
  if (fleetLocations.length > 0) {
    const lats = fleetLocations.map(l => l.latitude);
    const lngs = fleetLocations.map(l => l.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    mapRegion = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.1, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.1, (maxLng - minLng) * 1.5),
    };
  }

  if (!settings) {
    return <ActivityIndicator style={styles.center} size="large" />;
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
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Completed</Text>
            {loadingCompleted ? (
              <ActivityIndicator size="large" color="#333" />
            ) : (
              <Text style={styles.statNumber}>{completedCount ?? '-'}</Text>
            )}
            <Text style={styles.statSub}>Shipments</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>On-Time</Text>
            {loadingOnTimeLate ? (
              <ActivityIndicator size="large" color="#333" />
            ) : (
              <Text style={styles.statNumber}>
                {onTimeLate ? Math.round((onTimeLate.onTime / (onTimeLate.onTime + onTimeLate.late)) * 100) + '%' : '-'}
              </Text>
            )}
            <Text style={styles.statSub}>Rate</Text>
          </View>
        </View>

        <View style={styles.sectionList}>
          <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Shipments')}>
            <MaterialCommunityIcons name="package-variant" size={24} color="#333" />
            <Text style={styles.listText}>View Shipments</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} />
          </TouchableOpacity>
          {settings.ownTransporters && (
            <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Transport Management')}>
              <MaterialCommunityIcons name="truck" size={24} color="#333" />
              <Text style={styles.listText}>Transport Management</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Analytics')}>
            <MaterialCommunityIcons name="chart-line" size={24} color="#333" />
            <Text style={styles.analyticsText}>Analytics</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} />
          </TouchableOpacity>
        </View>

        {/* Live Fleet Location Map */}
        {settings.ownTransporters && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Live Fleet Location</Text>
            {loadingFleet ? (
              <ActivityIndicator style={{ marginVertical: 32 }} size="large" />
            ) : fleetLocations.length === 0 ? (
              <View style={styles.mapPlaceholder}><Text>No fleet locations available.</Text></View>
            ) : (
              <MapView
                style={styles.map}
                initialRegion={mapRegion}
                region={mapRegion}
                showsUserLocation={false}
                showsMyLocationButton={false}
                pointerEvents="none"
              >
                {fleetLocations.map(loc => (
                  <Marker
                    key={loc.userId}
                    coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                    title={loc.User?.username || 'Transporter'}
                    description={loc.User?.email || ''}
                    pinColor="#0074D9"
                  />
                ))}
              </MapView>
            )}
          </View>
        )}

        {/* Recent Shipments Table */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Shipments</Text>
          {loadingRecent ? (
            <ActivityIndicator style={{ marginVertical: 32 }} size="large" />
          ) : recentShipments.length === 0 ? (
            <View style={styles.tablePlaceholder}><Text>No recent shipments.</Text></View>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableRowHeader}>
              <Text style={[styles.tableHeader]}>Client</Text>
                <Text style={[styles.tableHeader]}>Status</Text>
                <Text style={[styles.tableHeader]}>ETA</Text>
              </View>
              {recentShipments.map(s => (
                <TouchableOpacity key={s.id} onPress={() => navigation.navigate('Shipment Details', { id: s.id })}>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>{s.client}</Text>
                    <Text style={[styles.tableCell, s.status === 'IN_TRANSIT' ? styles.inTransit : null]}>{s.status.replace('_', ' ')}</Text>
                    <Text style={styles.tableCell}>{s.eta ? new Date(s.eta).toLocaleString() : '-'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#004080', 
    padding: 16, 
    borderBottomEndRadius: 16, 
    borderBottomStartRadius: 16 
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginHorizontal: 16, 
    marginTop: 16,
    marginBottom: 16
  },
  statCard: { 
    flex: 1, 
    backgroundColor: '#fff', 
    marginHorizontal: 4, 
    borderRadius: 8, 
    padding: 16, 
    alignItems: 'center' 
  },
  statLabel: { 
    fontSize: 16, 
    color: '#666' 
  },
  statNumber: { 
    fontSize: 36, 
    fontWeight: 'bold', 
    marginVertical: 8 
  },
  statSub: { 
    fontSize: 14, 
    color: '#999' 
  },
  sectionList: { 
    marginHorizontal: 16 
  },
  listItem: { 
    flexDirection: 'row', 
    
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee', 
    backgroundColor: '#fff', 
    paddingHorizontal: 16 
  },
  listText: { 
    fontSize: 16, 
    marginLeft: 8 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  analyticsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#eee', 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    width: '100%' 
  },
  analyticsText: { 
    fontSize: 16, 
    marginLeft: 8 
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  map: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  mapPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  table: {
    width: '100%',
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    // backgroundColor: '#f9f9f9',
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
    borderRightWidth: 1,
    borderRightColor: '#eee'
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    minHeight: 80,
    backgroundColor: 'fff',
  },
  tableHeader: {
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
    textAlign: 'center'
  },
  inTransit: {
    color: 'green',
    fontWeight: 'bold',
  },
  tablePlaceholder: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 
export default DispatcherDashboardScreen;
