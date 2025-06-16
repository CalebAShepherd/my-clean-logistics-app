import React, { useEffect, useContext, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { listOffers } from '../api/offers';
import { listRoutes, getRoute, completeRouteStop, skipRouteStop } from '../api/routes';
import * as Location from 'expo-location';
import { updateTransporterLocation } from '../api/locations';
import MapView from 'react-native-maps';
import { Marker, Polyline } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native';
import { updateShipmentStatus } from '../api/shipments';
import { fetchNotifications } from '../api/notifications';

export default function TransporterDashboardScreen({ navigation }) {
  const { user, userToken } = useContext(AuthContext);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentStopShipmentId, setCurrentStopShipmentId] = useState(null);
  const [myRoutes, setMyRoutes] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [msgUnreadCount, setMsgUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);

  // Mock state for stops
  const [routeStarted, setRouteStarted] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  const prevRouteIdRef = useRef();
  const didRestoreRef = useRef(false);

  // Helper: get stop status and current stop index
  const stops = currentRoute && currentRoute.RouteShipment
    ? currentRoute.RouteShipment.map((rs, idx) => {
        const s = rs.Shipment;
        const eta = currentRoute.etas?.[idx] || null;
        return {
          type: idx === 0 ? 'pickup' : 'delivery',
          label: `${s.pickupCity}, ${s.pickupState} → ${s.deliveryCity}, ${s.deliveryState}`,
          eta,
          status: rs.status,
          routeId: rs.routeId,
          shipmentId: rs.shipmentId,
        };
      })
    : [];
  const currentStopIdx = currentStopShipmentId
    ? stops.findIndex(stop => stop.shipmentId === currentStopShipmentId && stop.status === 'PENDING')
    : stops.findIndex(stop => stop.status === 'PENDING');
  const currentStop = stops[currentStopIdx];

  // Button text logic
  let actionText = 'Route Not Started';
  if (routeStarted) {
    const stop = stops[currentStopIdx];
    if (currentStopIdx === stops.length - 1 && stop?.status === 'COMPLETED') {
      actionText = 'Route Completed';
    } else if (stop?.type === 'pickup') {
      actionText = 'Pickup Completed';
    } else if (stop?.type === 'delivery') {
      actionText = 'Drop-Off Completed';
    }
  }
  // View Details/Start Route button logic
  const detailsText = routeStarted ? 'View Details' : 'Start Route';

  // Load upcoming routes sorted by pickup date
  useEffect(() => {
    if (userToken && user?.id) {
      loadUpcomingRoutes();
      loadOffers();
    }
  }, [userToken, user?.id]);

  // Background location sharing for transporters
  useEffect(() => {
    let intervalId;
    if (user?.role === 'transporter' && userToken && user.id) {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission not granted');
          return;
        }
        // Immediately send location, then start interval
        const sendLocation = async () => {
          try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            await updateTransporterLocation(userToken, user.id, loc.coords.latitude, loc.coords.longitude);
          } catch (e) {
            console.warn('Error sending location:', e);
          }
        };
        sendLocation();
        intervalId = setInterval(sendLocation, 60000); // every 60 seconds
      })();
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user?.role, userToken, user?.id]);

  // When a route is selected, set it as currentRoute
  useEffect(() => {
    if (!selectedRouteId) {
      setCurrentRoute(null);
      return;
    }
    setLoadingRoutes(true);
    listRoutes(userToken, user.id)
      .then(routes => {
        const found = routes.find(r => r.id === selectedRouteId);
        setCurrentRoute(found || null);
      })
      .catch(err => console.error('Error loading route:', err))
      .finally(() => setLoadingRoutes(false));
  }, [selectedRouteId, userToken, user?.id]);

  // Fetch current location for map marker
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (isMounted) setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch {}
    })();
    return () => { isMounted = false; };
  }, []);

  // Load persisted state on mount
  useEffect(() => {
    (async () => {
      try {
        const savedRouteId = await AsyncStorage.getItem('selectedRouteId');
        const savedStarted = await AsyncStorage.getItem('routeStarted');
        const savedStopId = await AsyncStorage.getItem('currentStopShipmentId');
        console.log('[AsyncStorage] Loaded selectedRouteId:', savedRouteId);
        console.log('[AsyncStorage] Loaded routeStarted:', savedStarted);
        console.log('[AsyncStorage] Loaded currentStopShipmentId:', savedStopId);
        if (savedRouteId) setSelectedRouteId(savedRouteId);
        if (savedStarted) setRouteStarted(savedStarted === 'true');
        if (savedStopId) setCurrentStopShipmentId(savedStopId);
      } catch (e) {
        console.log('[AsyncStorage] Error loading:', e);
      }
      setIsRestoring(false);
      didRestoreRef.current = true;
    })();
  }, []);

  // Persist selectedRouteId (after restoration)
  useEffect(() => {
    if (isRestoring) return;
    AsyncStorage.setItem('selectedRouteId', selectedRouteId || '');
  }, [selectedRouteId, isRestoring]);

  // Persist routeStarted (after restoration)
  useEffect(() => {
    if (isRestoring) return;
    console.log('[Effect] routeStarted changed:', routeStarted);
    AsyncStorage.setItem('routeStarted', routeStarted ? 'true' : '');
  }, [routeStarted, isRestoring]);

  // Persist currentStopShipmentId (after restoration)
  useEffect(() => {
    if (isRestoring) return;
    AsyncStorage.setItem('currentStopShipmentId', currentStopShipmentId || '');
  }, [currentStopShipmentId, isRestoring]);

  // When route is started or a stop is completed/skipped, update currentStopShipmentId
  useEffect(() => {
    if (routeStarted && stops.length > 0) {
      const idx = stops.findIndex(stop => stop.status === 'PENDING');
      if (idx !== -1) setCurrentStopShipmentId(stops[idx].shipmentId);
      else setCurrentStopShipmentId(null); // No more pending stops
    }
  }, [routeStarted, stops]);

  // Only reset routeStarted and currentStopShipmentId if the user selects a new route (not on initial load)
  useEffect(() => {
    if (
      didRestoreRef.current &&
      prevRouteIdRef.current !== undefined &&
      selectedRouteId &&
      selectedRouteId !== prevRouteIdRef.current
    ) {
      console.log('[Effect] Resetting routeStarted and currentStopShipmentId due to route change:', prevRouteIdRef.current, '->', selectedRouteId);
      setRouteStarted(false);
      setCurrentStopShipmentId(null);
      AsyncStorage.setItem('routeStarted', '');
      AsyncStorage.setItem('currentStopShipmentId', '');
    }
    if (!isRestoring) prevRouteIdRef.current = selectedRouteId;
  }, [selectedRouteId, isRestoring]);

  // Clear restored completed routes automatically
  useEffect(() => {
    if (isRestoring) return;
    if (!currentRoute) return;
    const allDone = currentRoute.RouteShipment.every(rs => rs.status !== 'PENDING');
    if (allDone) {
      console.log('[Effect] Assigning next route automatically after restored completion');
      (async () => {
        try {
          const routes = await listRoutes(userToken, user.id);
          // Filter for routes with pending stops
          const incomplete = routes.filter(r => r.RouteShipment?.some(rs => rs.status === 'PENDING'));
          // Sort by earliest shipment date
          const sorted = incomplete.sort((a, b) =>
            new Date(a.RouteShipment[0].Shipment.shipmentDate) - new Date(b.RouteShipment[0].Shipment.shipmentDate)
          );
          const nextRoute = sorted.find(r => r.id !== currentRoute.id);
          if (nextRoute) {
            setSelectedRouteId(nextRoute.id);
            setRouteStarted(false);
            setCurrentStopShipmentId(null);
          } else {
            setSelectedRouteId(null);
            setRouteStarted(false);
            setCurrentStopShipmentId(null);
            setCurrentRoute(null);
          }
        } catch (e) {
          console.error('Error auto-assigning next route:', e);
        }
      })();
    }
  }, [isRestoring, currentRoute, userToken, user?.id]);

  const handleSkip = async (stop) => {
    try {
      await skipRouteStop(userToken, selectedRouteId, stop.shipmentId);
      // Fetch updated route
      const updatedRoute = await getRoute(userToken, selectedRouteId);
      setCurrentRoute(updatedRoute);
      // Determine next pending stop
      const nextPending = updatedRoute.RouteShipment.find(rs => rs.status === 'PENDING');
      if (nextPending) {
        setCurrentStopShipmentId(nextPending.shipmentId);
      } else {
        // All stops complete: assign next available route automatically
        const routes = await listRoutes(userToken, user.id);
        const upcoming = routes
          .filter(r => r.RouteShipment?.length > 0)
          .filter(r => new Date(r.RouteShipment[0].Shipment.shipmentDate) >= new Date())
          .sort((a, b) => new Date(a.RouteShipment[0].Shipment.shipmentDate) - new Date(b.RouteShipment[0].Shipment.shipmentDate));
        const nextRoute = upcoming.find(r => r.id !== selectedRouteId);
        if (nextRoute) {
          setSelectedRouteId(nextRoute.id);
          setRouteStarted(false);
          setCurrentStopShipmentId(null);
        } else {
          setSelectedRouteId(null);
          setRouteStarted(false);
          setCurrentStopShipmentId(null);
          setCurrentRoute(null);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to skip stop.');
    }
  };

  const handleComplete = async (stop) => {
    try {
      await completeRouteStop(userToken, selectedRouteId, stop.shipmentId);
      // Update shipment status to DELIVERED
      try {
        await updateShipmentStatus(userToken, stop.shipmentId, 'DELIVERED');
      } catch (err) {
        console.error('Error updating shipment to DELIVERED:', err);
      }
      // Fetch updated route
      const updatedRoute = await getRoute(userToken, selectedRouteId);
      setCurrentRoute(updatedRoute);
      // Determine next pending stop
      const nextPending = updatedRoute.RouteShipment.find(rs => rs.status === 'PENDING');
      if (nextPending) {
        setCurrentStopShipmentId(nextPending.shipmentId);
      } else {
        // All stops complete: assign next available route automatically
        const routes = await listRoutes(userToken, user.id);
        const upcoming = routes
          .filter(r => r.RouteShipment?.length > 0)
          .filter(r => new Date(r.RouteShipment[0].Shipment.shipmentDate) >= new Date())
          .sort((a, b) => new Date(a.RouteShipment[0].Shipment.shipmentDate) - new Date(b.RouteShipment[0].Shipment.shipmentDate));
        const nextRoute = upcoming.find(r => r.id !== selectedRouteId);
        if (nextRoute) {
          setSelectedRouteId(nextRoute.id);
          setRouteStarted(false);
          setCurrentStopShipmentId(null);
        } else {
          setSelectedRouteId(null);
          setRouteStarted(false);
          setCurrentStopShipmentId(null);
          setCurrentRoute(null);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to complete stop.');
    }
  };

  const remainingStops = stops.filter(stop => stop.status === 'PENDING');
  let remainingRouteCoords = [];
  if (currentRoute && currentRoute.geometry) {
    try {
      remainingRouteCoords = polyline.decode(currentRoute.geometry).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
    } catch {}
  }

  // Static city-to-coords lookup for demo/testing
  const cityCoords = {
    'Los Angeles, CA': { latitude: 34.0522, longitude: -118.2437 },
    'San Francisco, CA': { latitude: 37.7749, longitude: -122.4194 },
    'Fresno, CA': { latitude: 36.7378, longitude: -119.7871 },
    'Sacramento, CA': { latitude: 38.5816, longitude: -121.4944 },
    'Bakersfield, CA': { latitude: 35.3733, longitude: -119.0187 },
    'Oakland, CA': { latitude: 37.8044, longitude: -122.2711 },
    'Upland, CA': { latitude: 34.0975, longitude: -117.6484 },
    'Rancho Cucamonga, CA': { latitude: 34.1064, longitude: -117.5931 },
    // Add more as needed
  };

  // For remaining stops, get pickup and dropoff coords
  const routePoints = remainingStops.flatMap(stop => {
    const [pickup, dropoff] = stop.label.split('→').map(s => s.trim());
    const pickupCoords = cityCoords[pickup] || null;
    const dropoffCoords = cityCoords[dropoff] || null;
    // Only add if valid
    return [pickupCoords, dropoffCoords].filter(Boolean);
  });

  // Remove consecutive duplicates
  const uniqueRoutePoints = routePoints.filter((pt, idx, arr) => idx === 0 || !(pt.latitude === arr[idx-1].latitude && pt.longitude === arr[idx-1].longitude));

  // Temporary useEffect for debugging
  useEffect(() => {
    (async () => {
      const routeStarted = await AsyncStorage.getItem('routeStarted');
      const selectedRouteId = await AsyncStorage.getItem('selectedRouteId');
      const currentStopShipmentId = await AsyncStorage.getItem('currentStopShipmentId');
      console.log('[DEBUG] routeStarted:', routeStarted);
      console.log('[DEBUG] selectedRouteId:', selectedRouteId);
      console.log('[DEBUG] currentStopShipmentId:', currentStopShipmentId);
    })();
  }, []);

  const loadMsgUnread = async () => {
    try {
      const data = await fetchNotifications(userToken);
      setMsgUnreadCount(data.filter(n => n.type === 'message' && !n.isRead).length);
    } catch (err) {
      console.error('Error loading message unread count:', err);
    }
  };

  const loadOffers = async () => {
    if (!userToken || !user?.id) return;
    setLoadingOffers(true);
    try {
      const offerData = await listOffers(userToken, user.id);
      setOffers(offerData || []);
    } catch (err) {
      console.error('Error loading offers:', err);
    } finally {
      setLoadingOffers(false);
    }
  };

  const loadUpcomingRoutes = async () => {
    if (!user?.id) return;
    try {
      const routes = await listRoutes(userToken, user.id);
      const upcoming = routes
        .filter(r => r.RouteShipment?.length > 0)
        .filter(r => new Date(r.RouteShipment[0].Shipment.shipmentDate) >= new Date())
        .sort((a, b) => new Date(a.RouteShipment[0].Shipment.shipmentDate) - new Date(b.RouteShipment[0].Shipment.shipmentDate))
        .slice(0, 4)
        .map(r => ({
          id: r.id,
          summary: `${r.RouteShipment[0].Shipment.pickupCity}, ${r.RouteShipment[0].Shipment.pickupState} → ${r.RouteShipment[r.RouteShipment.length - 1].Shipment.deliveryCity}, ${r.RouteShipment[r.RouteShipment.length - 1].Shipment.deliveryState}`,
          date: new Date(r.RouteShipment[0].Shipment.shipmentDate).toLocaleDateString(),
        }));
      setMyRoutes(upcoming);
    } catch (e) {
      console.error('Error loading upcoming routes:', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadMsgUnread(),
      loadOffers(),
      loadUpcomingRoutes()
    ]);
    setRefreshing(false);
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

  if (isRestoring) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
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
              <Text style={styles.headerSubtitle}>Welcome back, {user?.username}</Text>
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
                  {/* Assigned Route Card */}
          <View style={styles.card}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.cardGradient}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <MaterialCommunityIcons name="truck" size={20} color="#667eea" style={{ marginRight: 8 }} />
                 <Text style={styles.cardTitle}>Assigned Route</Text>
               </View>
          {!selectedRouteId ? (
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={() => navigation.navigate('Routes', { onSelectRoute: (routeId) => setSelectedRouteId(routeId), selectedRouteId })}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonText}>Select Route</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={{ marginBottom: 12 }}>
                {stops.map((stop, idx) => {
                  let color = '#1C1C1E', iconColor = '#667eea', fontWeight = '500';
                  if (stop.status === 'SKIPPED') { color = '#FF3B30'; iconColor = '#FF3B30'; fontWeight = '600'; }
                  else if (stop.status === 'COMPLETED') { color = '#8E8E93'; iconColor = '#8E8E93'; fontWeight = '400'; }
                  else if (idx === currentStopIdx) { color = '#667eea'; iconColor = '#667eea'; fontWeight = '600'; }
                  return (
                    <View key={idx} style={styles.routeStopRow}>
                      <FontAwesome5 
                        name={stop.type === 'pickup' ? 'arrow-circle-up' : 'arrow-circle-down'} 
                        size={20} 
                        color={iconColor} 
                        style={{ marginRight: 12 }} 
                      />
                      <Text style={{ flex: 1, color, fontWeight, fontSize: 15 }}>{stop.label}</Text>
                      <Text style={{ color, fontWeight, marginLeft: 12, fontSize: 13 }}>
                        {stop.eta ? new Date(stop.eta).toLocaleString() : '-'}
                      </Text>
                      {idx === currentStopIdx && stop.status === 'PENDING' && routeStarted && (
                        <TouchableOpacity style={styles.skipButton} onPress={() => handleSkip(stop)}>
                          <Text style={styles.skipButtonText}>Skip</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={styles.truckInfo}>
                <MaterialCommunityIcons name="truck" size={20} color="#667eea" />
                <Text style={styles.truckText}>Truck #42</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity style={styles.outlineButton} onPress={() => {
                  if (!routeStarted) {
                    setRouteStarted(true);
                    AsyncStorage.setItem('routeStarted', 'true');
                    // Update shipments: warehouse-bound → IN_TRANSIT; destination-bound → OUT_FOR_DEL
                    currentRoute?.RouteShipment.forEach(rs => {
                      const toStatus = rs.Shipment.warehouseId ? 'IN_TRANSIT' : 'OUT_FOR_DEL';
                      updateShipmentStatus(userToken, rs.shipmentId, toStatus)
                        .catch(e => console.error('Failed to set shipment status', e));
                    });
                  } else {
                    navigation.navigate('RouteDetail', { routeId: selectedRouteId });
                  }
                }}>
                  <Text style={styles.outlineButtonText}>{detailsText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { opacity: routeStarted ? 1 : 0.5 }]}
                  disabled={!routeStarted}
                  onPress={() => handleComplete(currentStop)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.primaryButtonGradient}
                  >
                    <Text style={styles.primaryButtonText}>{actionText}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
            </LinearGradient>
          </View>

        {/* Current Route: Table stacked above map */}
        {selectedRouteId && currentRoute && (
          <View style={styles.card}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.cardGradient}
            >
              <TouchableOpacity
                onPress={() => currentRoute?.id && navigation.navigate('RouteDetail', { routeId: currentRoute.id })}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}
                activeOpacity={0.7}
              >
                                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <MaterialCommunityIcons name="map-marker-path" size={20} color="#667eea" style={{ marginRight: 8 }} />
                   <Text style={styles.cardTitle}>Current Route</Text>
                 </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#667eea" />
              </TouchableOpacity>
            <View style={{ marginBottom: 10 }}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableHeader, { flex: 1 }]}>Pickup</Text>
                <Text style={[styles.tableHeader, { flex: 1 }]}>Drop-Off</Text>
                <Text style={[styles.tableHeader, { flex: 1 }]}>ETA</Text>
              </View>
              {remainingStops.map((row, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{row.label.split('→')[0].trim()}</Text>
                  <Text style={styles.tableCell}>{row.label.split('→')[1].trim()}</Text>
                  <Text style={styles.tableCell}>{row.eta ? new Date(row.eta).toLocaleString() : '-'}</Text>
                </View>
              ))}
              {remainingStops.length === 0 && (
                <View style={styles.tableRow}><Text style={styles.tableCell}>No remaining stops</Text></View>
              )}
            </View>
            <View style={{ height: 200, backgroundColor: 'rgba(102, 126, 234, 0.1)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginTop: 8 }}>
              {uniqueRoutePoints.length > 1 ? (
                <MapView
                  style={{ flex: 1, width: '100%' }}
                  initialRegion={{
                    latitude: uniqueRoutePoints[0].latitude,
                    longitude: uniqueRoutePoints[0].longitude,
                    latitudeDelta: 2,
                    longitudeDelta: 2,
                  }}
                >
                  <Polyline coordinates={uniqueRoutePoints} strokeColor="#667eea" strokeWidth={4} />
                  {uniqueRoutePoints.map((coord, idx) => (
                    <Marker key={idx} coordinate={coord} />
                  ))}
                  {currentLocation && (
                    <Marker
                      coordinate={currentLocation}
                      title="My Location"
                      pinColor="#27ae60"
                    />
                  )}
                </MapView>
              ) : (
                                  <MaterialCommunityIcons name="map" size={48} color="#667eea" />
              )}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* My Routes: City-to-city summary, no status column */}
        <View style={styles.card}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
            style={styles.cardGradient}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate('Routes', {
                onSelectRoute: (routeId) => setSelectedRouteId(routeId),
                selectedRouteId,
                routeStarted,
              })}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}
              activeOpacity={0.7}
            >
                             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <MaterialCommunityIcons name="road-variant" size={20} color="#667eea" style={{ marginRight: 8 }} />
                 <Text style={styles.cardTitle}>My Routes</Text>
               </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#667eea" />
            </TouchableOpacity>
          <View style={styles.tableRowHeader}>
            <Text style={[styles.tableHeader, { flex: 2 }]}>Route</Text>
            <Text style={[styles.tableHeader, { flex: 1 }]}>Date</Text>
          </View>
          {myRoutes.map((route, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{route.summary}</Text>
              <Text style={styles.tableCell}>{route.date}</Text>
            </View>
          ))}
          </LinearGradient>
        </View>

        {/* My Offers: pending offers for transporter */}
        <View style={styles.card}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
            style={styles.cardGradient}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate('Offers')}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <MaterialCommunityIcons name="clipboard-text" size={20} color="#667eea" style={{ marginRight: 8 }} />
                 <Text style={styles.cardTitle}>My Offers</Text>
               </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#667eea" />
            </TouchableOpacity>
          <View style={styles.tableRowHeader}>
            <Text style={[styles.tableHeader, { flex: 2 }]}>Route</Text>
            <Text style={[styles.tableHeader, { flex: 1 }]}>Date</Text>
          </View>
          {offers.length > 0 ? (
            offers.map((offer, idx) => (
              <View key={offer.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}> 
                  {`${offer.Route.RouteShipment[0]?.Shipment.pickupCity}, ${offer.Route.RouteShipment[0]?.Shipment.pickupState} → ${offer.Route.RouteShipment[offer.Route.RouteShipment.length - 1]?.Shipment.deliveryCity}, ${offer.Route.RouteShipment[offer.Route.RouteShipment.length - 1]?.Shipment.deliveryState}`}
                </Text>
                <Text style={styles.tableCell}>
                  {new Date(offer.Route.RouteShipment[0]?.Shipment.shipmentDate).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>No pending offers</Text>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 0,
  },
  statusBadgeInProgress: { backgroundColor: '#1abc9c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginRight: 8 },
  statusBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  routeStop: { fontSize: 15, marginBottom: 2 },
  dot: { color: '#004080', fontWeight: 'bold' },
  time: { color: '#888', fontSize: 13 },
  truckText: {
    marginLeft: 8,
    color: '#667eea',
    fontWeight: '600',
    fontSize: 16,
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 4,
    backgroundColor: 'rgba(102, 126, 234, 0.1)'
  },
  outlineButtonText: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  primaryButtonGradient: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingVertical: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  tableHeader: {
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
    color: '#667eea',
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
  statusGreen: { color: '#34C759', fontWeight: '600' },
  statusOrange: { color: '#FF9500', fontWeight: '600' },
  statusBlue: { color: '#667eea', fontWeight: '600' },
  
  // Route Status Styles
  routeStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  skipButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 12,
  },
  skipButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  truckInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  truckText: {
    marginLeft: 8,
    color: '#667eea',
    fontWeight: '600',
    fontSize: 16,
  },
}); 