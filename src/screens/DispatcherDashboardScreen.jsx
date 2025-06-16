// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useContext, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { fetchCompletedCount, fetchOnTimeLate } from '../api/analytics';
import MapView, { Marker } from 'react-native-maps';
import { fetchFleetLocations } from '../api/locations';
import { fetchRecentShipments } from '../api/shipments';
import { SafeAreaView } from 'react-native';
import { fetchNotifications } from '../api/notifications';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';

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
  const [msgUnreadCount, setMsgUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

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

  const loadMsgUnread = async () => {
    try {
      const data = await fetchNotifications(userToken);
      setMsgUnreadCount(data.filter(n => n.type === 'message' && !n.isRead).length);
    } catch (err) {
      console.error('Error loading message unread count:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        loadMsgUnread(),
        fetchCompletedCount(userToken).then(data => setCompletedCount(data.count)),
        fetchOnTimeLate(userToken).then(data => setOnTimeLate(data)),
        fetchFleetLocations(userToken).then(data => setFleetLocations(data)),
        fetchRecentShipments(userToken).then(data => setRecentShipments(data)),
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (userToken) loadMsgUnread();
  }, [userToken]);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (userToken) loadMsgUnread();
    }, [userToken])
  );

  // Poll for updates every 5 seconds when screen is focused
  useEffect(() => {
    if (!userToken) return;
    
    const interval = setInterval(() => {
      loadMsgUnread();
    }, 5000);

    return () => clearInterval(interval);
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
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Modern Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Dashboard</Text>
              <Text style={styles.headerSubtitle}>Dispatch Operations</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity 
                style={styles.headerIconButton} 
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="bell-outline" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerIconButton} 
                onPress={() => navigation.navigate('Conversations')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="message-outline" size={20} color="white" />
                {msgUnreadCount > 0 && <View style={styles.badge} />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="account-circle" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="white"
              colors={['#667eea']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#667eea" />
              </View>
              <Text style={styles.statLabel}>Completed</Text>
              {loadingCompleted ? (
                <ActivityIndicator size="small" color="#667eea" />
              ) : (
                <Text style={styles.statNumber}>{completedCount ?? '-'}</Text>
              )}
              <Text style={styles.statSub}>Shipments</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.statCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="clock-check" size={24} color="#667eea" />
              </View>
              <Text style={styles.statLabel}>On-Time</Text>
              {loadingOnTimeLate ? (
                <ActivityIndicator size="small" color="#667eea" />
              ) : (
                <Text style={styles.statNumber}>
                  {onTimeLate ? Math.round((onTimeLate.onTime / (onTimeLate.onTime + onTimeLate.late)) * 100) + '%' : '-'}
                </Text>
              )}
              <Text style={styles.statSub}>Rate</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('Shipments')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.actionCardGradient}
            >
              <MaterialCommunityIcons name="package-variant" size={24} color="#667eea" />
              <Text style={styles.actionText}>View Shipments</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#667eea" />
            </LinearGradient>
          </TouchableOpacity>
          
          {settings.ownTransporters && (
            <TouchableOpacity 
              style={styles.actionCard} 
              onPress={() => navigation.navigate('Transport Management')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                style={styles.actionCardGradient}
              >
                <MaterialCommunityIcons name="truck" size={24} color="#667eea" />
                <Text style={styles.actionText}>Transport Management</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#667eea" />
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('Analytics')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.actionCardGradient}
            >
              <MaterialCommunityIcons name="chart-line" size={24} color="#667eea" />
              <Text style={styles.actionText}>Analytics</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#667eea" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Live Fleet Location Map */}
        {settings.ownTransporters && (
          <View style={styles.mapContainer}>
            <Text style={styles.sectionTitle}>Fleet Locations</Text>
            <View style={styles.mapCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                style={styles.mapCardGradient}
              >
                {loadingFleet ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#667eea" />
                    <Text style={styles.loadingText}>Loading fleet locations...</Text>
                  </View>
                ) : (
                  <MapView
                    style={styles.map}
                    region={mapRegion}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    showsTraffic={false}
                  >
                    {fleetLocations.map((location, index) => (
                      <Marker
                        key={index}
                        coordinate={{
                          latitude: location.latitude,
                          longitude: location.longitude,
                        }}
                        title={`Vehicle ${location.transporterId}`}
                        description={`Last updated: ${new Date(location.updatedAt).toLocaleTimeString()}`}
                      >
                        <View style={styles.markerContainer}>
                          <MaterialCommunityIcons name="truck" size={20} color="white" />
                        </View>
                      </Marker>
                    ))}
                  </MapView>
                )}
              </LinearGradient>
            </View>
          </View>
        )}

        {/* Recent Shipments Table */}
        <View style={styles.card}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="history" size={20} color="#667eea" />
              <Text style={styles.cardTitle}>Recent Shipments</Text>
            </View>
          {loadingRecent ? (
            <ActivityIndicator style={{ marginVertical: 32 }} size="small" color="#667eea" />
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
          </LinearGradient>
        </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  
  // Header Styles
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    position: 'relative',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },

  // ScrollView Styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 80,
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  statCardGradient: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statSub: {
    fontSize: 12,
    color: '#8E8E93',
  },

  // Quick Actions
  quickActionsContainer: {
    marginBottom: 24,
  },
  actionCard: {
    borderRadius: 20,
    marginBottom: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  actionCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 16,
    flex: 1,
  },

  // Card Styles
  card: {
    borderRadius: 20,
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },

  // Map Styles
  map: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginTop: 8,
  },
  mapPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  // Table Styles
  table: {
    width: '100%',
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingVertical: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: '#1C1C1E',
  },
  tableHeader: {
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
    color: '#667eea',
  },
  inTransit: {
    color: '#34C759',
    fontWeight: '600',
  },
  tablePlaceholder: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  mapCard: {
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  mapCardGradient: {
    borderRadius: 20,
    padding: 20,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
}); 
export default DispatcherDashboardScreen;
