import React, { useEffect, useContext, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from 'react-native';
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

export default function TransporterDashboardScreen({ navigation }) {
  const { user, userToken } = useContext(AuthContext);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentStopShipmentId, setCurrentStopShipmentId] = useState(null);
  const [myRoutes, setMyRoutes] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

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
    if (!user?.id) return;
    (async () => {
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
    })();
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

  if (isRestoring) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={[styles.screen]}>
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

      <ScrollView contentContainerStyle={[styles.container]}>
        {/* Assigned Route Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assigned Route</Text>
          {!selectedRouteId ? (
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Routes', { onSelectRoute: (routeId) => setSelectedRouteId(routeId), selectedRouteId })}>
                <Text style={styles.primaryButtonText}>Select Route</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={{ marginBottom: 12 }}>
                {stops.map((stop, idx) => {
                  let color = '#222', iconColor = '#222', fontWeight = 'normal';
                  if (stop.status === 'SKIPPED') { color = '#c0392b'; iconColor = '#c0392b'; }
                  else if (stop.status === 'COMPLETED') { color = '#bbb'; iconColor = '#bbb'; }
                  else if (idx === currentStopIdx) { color = '#0074D9'; iconColor = '#0074D9'; fontWeight = 'bold'; }
                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <FontAwesome5 name={stop.type === 'pickup' ? 'arrow-circle-up' : 'arrow-circle-down'} size={18} color={iconColor} style={{ marginRight: 8 }} />
                      <Text style={{ flex: 1, color, fontWeight }}>{stop.label}</Text>
                      <Text style={{ color, fontWeight, marginLeft: 8 }}>{stop.eta ? new Date(stop.eta).toLocaleString() : '-'}</Text>
                      {idx === currentStopIdx && stop.status === 'PENDING' && routeStarted && (
                        <TouchableOpacity style={{ marginLeft: 8, backgroundColor: '#e74c3c', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }} onPress={() => handleSkip(stop)}>
                          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Skip</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="truck" size={18} color="#0074D9" />
                <Text style={styles.truckText}>Truck #42</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
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
                >
                  <Text style={styles.primaryButtonText}>{actionText}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Current Route: Table stacked above map */}
        {selectedRouteId && currentRoute && (
          <View style={styles.card}>
            <TouchableOpacity
              onPress={() => currentRoute?.id && navigation.navigate('RouteDetail', { routeId: currentRoute.id })}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}
            >
              <Text style={styles.cardTitle}>Current Route</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#0074D9" />
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
            <View style={{ height: 180, backgroundColor: '#e6f0fa', borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
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
                  <Polyline coordinates={uniqueRoutePoints} strokeColor="#0074D9" strokeWidth={4} />
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
                <MaterialCommunityIcons name="map" size={48} color="#0074D9" />
              )}
            </View>
          </View>
        )}

        {/* My Routes: City-to-city summary, no status column */}
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Routes', {
              onSelectRoute: (routeId) => setSelectedRouteId(routeId),
              selectedRouteId,
              routeStarted,
            })}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}
          >
            <Text style={styles.cardTitle}>My Routes</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#0074D9" />
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
        </View>

        {/* My Offers: pending offers for transporter */}
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Offers')}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}
          >
            <Text style={styles.cardTitle}>My Offers</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#0074D9" />
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#004080', padding: 16, borderBottomEndRadius: 16, borderBottomStartRadius: 16 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  container: { padding: 16, paddingBottom: 0 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 18, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  statusBadgeInProgress: { backgroundColor: '#1abc9c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginRight: 8 },
  statusBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  routeStop: { fontSize: 15, marginBottom: 2 },
  dot: { color: '#004080', fontWeight: 'bold' },
  time: { color: '#888', fontSize: 13 },
  truckText: { marginLeft: 4, color: '#0074D9', fontWeight: 'bold' },
  outlineButton: { borderWidth: 1, borderColor: '#0074D9', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18, marginRight: 8 },
  outlineButtonText: { color: '#0074D9', fontWeight: 'bold' },
  primaryButton: { backgroundColor: '#0074D9', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18 },
  primaryButtonText: { color: '#fff', fontWeight: 'bold' },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#f0f0f0', paddingVertical: 6, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  tableHeader: { fontWeight: 'bold', fontSize: 14, flex: 1, textAlign: 'center' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 6 },
  tableCell: { flex: 1, textAlign: 'center', fontSize: 13 },
  statusGreen: { color: '#27ae60', fontWeight: 'bold' },
  statusOrange: { color: '#e67e22', fontWeight: 'bold' },
  statusBlue: { color: '#0074D9', fontWeight: 'bold' },
}); 