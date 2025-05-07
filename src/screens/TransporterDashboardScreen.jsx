import React, { useEffect, useContext, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { listOffers } from '../api/offers';
import { listRoutes } from '../api/routes';

export default function TransporterDashboardScreen({ navigation }) {
  const { user, userToken } = useContext(AuthContext);
  const [offerCount, setOfferCount] = useState(0);
  const [routeCount, setRouteCount] = useState(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Refresh pending offers when focused
  useFocusEffect(
    useCallback(() => {
      listOffers(userToken)
        .then(data => setOfferCount(data.filter(o => o.status === 'pending').length))
        .catch(err => console.error('Error loading offers count:', err));
    }, [userToken])
  );

  // Load total routes for transporter
  useEffect(() => {
    if (!user?.id) return;
    setLoadingRoutes(true);
    listRoutes(userToken, user.id)
      .then(data => setRouteCount(data.length))
      .catch(err => console.error('Error loading routes:', err))
      .finally(() => setLoadingRoutes(false));
  }, [userToken, user?.id]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transport</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <MaterialCommunityIcons name="account-circle" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Offers</Text>
          <Text style={styles.statNumber}>{offerCount}</Text>
          <Text style={styles.statSub}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Routes</Text>
          {loadingRoutes ? (
            <ActivityIndicator size="large" color="#333" />
          ) : (
            <Text style={styles.statNumber}>{routeCount ?? '-'}</Text>
          )}
          <Text style={styles.statSub}>Total</Text>
        </View>
      </View>

      <View style={styles.sectionList}>
        <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Offers')}>
          <MaterialCommunityIcons name="bell" size={24} color="#333" />
          <Text style={styles.listText}>My Offers</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Routes')}>
          <MaterialCommunityIcons name="history" size={24} color="#333" />
          <Text style={styles.listText}>My Routes</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.opsGrid}>
        <TouchableOpacity style={styles.opCard} onPress={() => navigation.navigate('Track Shipment')}>
          <MaterialCommunityIcons name="map" size={28} color="#333" />
          <Text style={styles.opText}>Track Shipment</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.sectionList}>
        <TouchableOpacity style={styles.analyticsRow} onPress={() => navigation.navigate('Analytics')}>
          <MaterialCommunityIcons name="chart-line" size={24} color="#333" />
          <Text style={styles.analyticsText}>Analytics</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#004080', padding: 16, borderBottomEndRadius: 16, borderBottomStartRadius: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', marginHorizontal: 4, borderRadius: 8, padding: 16, alignItems: 'center' },
  statLabel: { fontSize: 16, color: '#666' },
  statNumber: { fontSize: 36, fontWeight: 'bold', marginVertical: 8 },
  statSub: { fontSize: 14, color: '#999' },
  sectionList: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', marginTop: 24 },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  listText: { fontSize: 16, flex: 1, marginLeft: 8 },
  opsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', margin: 16 },
  opCard: { width: '48%', aspectRatio: 1, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 1 },
  opText: { marginTop: 8, fontSize: 14, color: '#333', textAlign: 'center' },
  analyticsRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 8, elevation: 1 },
  analyticsText: { flex: 1, marginLeft: 16, fontSize: 16 },
}); 