import React, { useEffect, useContext, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { fetchInTransitCount, fetchOnTimeLate } from '../api/analytics';
import MapView, { Marker } from 'react-native-maps';
import { fetchFleetLocations } from '../api/locations';
import { fetchRecentShipments } from '../api/shipments';
import { SafeAreaView } from 'react-native';
import { fetchNotifications } from '../api/notifications';
import { useFocusEffect } from '@react-navigation/native';

function AdminDashboardScreen({ navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const { settings } = useSettings();
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [msgUnreadCount, setMsgUnreadCount] = useState(0);
  const [inTransitCount, setInTransitCount] = useState(null);
  const [loadingInTransit, setLoadingInTransit] = useState(false);
  const [onTimeLate, setOnTimeLate] = useState(null);
  const [loadingOnTimeLate, setLoadingOnTimeLate] = useState(false);
  const [fleetLocations, setFleetLocations] = useState([]);
  const [loadingFleet, setLoadingFleet] = useState(true);
  const [recentShipments, setRecentShipments] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    if (!userToken) return;

    try {
      const [transitData, onTimeData, fleetData, shipmentsData] = await Promise.allSettled([
        fetchInTransitCount(userToken),
        fetchOnTimeLate(userToken),
        fetchFleetLocations(userToken),
        fetchRecentShipments(userToken)
      ]);

      if (transitData.status === 'fulfilled') {
        setInTransitCount(transitData.value.total);
      } else {
        console.error('Error loading in-transit count:', transitData.reason);
      }

      if (onTimeData.status === 'fulfilled') {
        setOnTimeLate(onTimeData.value);
      } else {
        console.error('Error loading on-time stats:', onTimeData.reason);
      }

      if (fleetData.status === 'fulfilled') {
        setFleetLocations(fleetData.value);
      } else {
        console.error('Error loading fleet locations:', fleetData.reason);
      }

      if (shipmentsData.status === 'fulfilled') {
        setRecentShipments(shipmentsData.value);
      } else {
        console.error('Error loading recent shipments:', shipmentsData.reason);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useEffect(() => {
    if (userToken) {
      setLoadingInTransit(true);
      setLoadingOnTimeLate(true);
      setLoadingFleet(true);
      setLoadingRecent(true);
      
      loadDashboardData().finally(() => {
        setLoadingInTransit(false);
        setLoadingOnTimeLate(false);
        setLoadingFleet(false);
        setLoadingRecent(false);
      });

      // Poll fleet locations every 30 seconds
      const intervalId = setInterval(() => {
        fetchFleetLocations(userToken)
          .then(data => setFleetLocations(data))
          .catch(err => console.error('Error loading fleet locations:', err));
      }, 30000);
      
      return () => clearInterval(intervalId);
    }
  }, [userToken]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboardData(),
      loadUnread()
    ]);
    setRefreshing(false);
  };

  const loadUnread = async () => {
    try {
      const data = await fetchNotifications(userToken);
      setNotifUnreadCount(data.filter(n => n.type !== 'message' && !n.isRead).length);
      setMsgUnreadCount(data.filter(n => n.type === 'message' && !n.isRead).length);
    } catch (err) {
      console.error('Error loading unread counts:', err);
    }
  };

  // Initial load
  useEffect(() => {
    if (userToken) loadUnread();
  }, [userToken]);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (userToken) loadUnread();
    }, [userToken])
  );

  // Poll for updates every 5 seconds when screen is focused
  useEffect(() => {
    if (!userToken) return;
    
    const interval = setInterval(() => {
      loadUnread();
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
              <Text style={styles.headerSubtitle}>Administrator</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity 
                style={styles.headerIconButton} 
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="bell-outline" size={20} color="white" />
                {notifUnreadCount > 0 && <View style={styles.badge} />}
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
                style={styles.headerIconButton} 
                onPress={() => navigation.navigate('Announcements')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="bullhorn-outline" size={20} color="white" />
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
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                style={styles.statCardGradient}
              >
                <View style={styles.statContent}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="truck-fast" size={28} color="#007AFF" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>In Transit</Text>
                    {loadingInTransit ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <Text style={styles.statNumber}>{inTransitCount ?? '-'}</Text>
                    )}
                    <Text style={styles.statSub}>Shipments</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                style={styles.statCardGradient}
              >
                <View style={styles.statContent}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="clock-check" size={28} color="#34C759" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>On-Time</Text>
                    {loadingOnTimeLate ? (
                      <ActivityIndicator size="small" color="#34C759" />
                    ) : (
                      <Text style={styles.statNumber}>
                        {onTimeLate ? Math.round((onTimeLate.onTime / (onTimeLate.onTime + onTimeLate.late)) * 100) + '%' : '-'}
                      </Text>
                    )}
                    <Text style={styles.statSub}>Rate</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Fleet Map */}
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

          {/* Management Actions */}
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>Management</Text>
            <View style={styles.actionsCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                style={styles.actionsCardGradient}
              >
                <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Shipments')} activeOpacity={0.7}>
                  <View style={styles.actionIconContainer}>
                    <MaterialCommunityIcons name="package-variant" size={24} color="#007AFF" />
                  </View>
                  <Text style={styles.actionText}>View Shipments</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#8E8E93" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('User Management')} activeOpacity={0.7}>
                  <View style={styles.actionIconContainer}>
                    <MaterialCommunityIcons name="account-group" size={24} color="#34C759" />
                  </View>
                  <Text style={styles.actionText}>Manage Users</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#8E8E93" />
                </TouchableOpacity>

                {settings.useThirdPartyCarriers && (
                  <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Carrier Management')} activeOpacity={0.7}>
                    <View style={styles.actionIconContainer}>
                      <MaterialCommunityIcons name="truck" size={24} color="#FF9500" />
                    </View>
                    <Text style={styles.actionText}>Manage Carriers</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                )}

                {settings.ownTransporters && (
                  <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Transport Management')} activeOpacity={0.7}>
                    <View style={styles.actionIconContainer}>
                      <MaterialCommunityIcons name="truck-delivery" size={24} color="#8E2DE2" />
                    </View>
                    <Text style={styles.actionText}>Transport Management</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Analytics')} activeOpacity={0.7}>
                  <View style={styles.actionIconContainer}>
                    <MaterialCommunityIcons name="chart-line" size={24} color="#FF3B30" />
                  </View>
                  <Text style={styles.actionText}>Analytics</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#8E8E93" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionItem, styles.lastActionItem]} onPress={() => navigation.navigate('Company Settings')} activeOpacity={0.7}>
                  <View style={styles.actionIconContainer}>
                    <MaterialCommunityIcons name="office-building-cog" size={24} color="#5856D6" />
                  </View>
                  <Text style={styles.actionText}>Company Settings</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
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
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
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
  },
  statContent: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTextContainer: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  statSub: {
    fontSize: 12,
    color: '#8E8E93',
  },

  // Section Title
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },

  // Map Container
  mapContainer: {
    marginBottom: 24,
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
  map: {
    width: '100%',
    height: 200,
    borderRadius: 16,
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

  // Actions Container
  actionsContainer: {
    marginBottom: 24,
  },
  actionsCard: {
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  actionsCardGradient: {
    borderRadius: 20,
    padding: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(142, 142, 147, 0.2)',
  },
  lastActionItem: {
    borderBottomWidth: 0,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
}); 
export default AdminDashboardScreen;
