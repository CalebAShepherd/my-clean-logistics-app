// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, TouchableOpacity, Button, Alert, ScrollView, Platform } from 'react-native';
import RouteMap from '../components/RouteMap';
import polyline from '@mapbox/polyline';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createOffer } from '../api/offers';
import { createRoute } from '../api/routes';
import InternalHeader from '../components/InternalHeader';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

function RouteDetailScreen({ route, navigation }) {
  // Expect either a persisted routeId or a computedRoute preview
  const { routeId, computedRoute, transporterId } = route.params || {};
  const isPreview = !!computedRoute;
  if (!route?.params || (!routeId && !isPreview)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontWeight: 'bold' }}>
          Error: No route data provided.
        </Text>
      </View>
    );
  }
  const { user, userToken } = useContext(AuthContext);
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [offerSent, setOfferSent] = useState(false);

  // Load either preview data or fetch persisted route
  useEffect(() => {
    if (isPreview) {
      // Use computed preview
      setRouteData({
        ...computedRoute,
        User: { id: transporterId }
      });
      setLoading(false);
      return;
    }
    // Fetch persisted route
    const fetchRoute = async () => {
      try {
        const res = await fetch(`${API_URL}/routes/${routeId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const data = await res.json();
        setRouteData(data);
      } catch (e) {
        console.error('Error fetching route detail:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchRoute();
  }, [routeId, userToken, isPreview]);

  // Prompt to cancel persisted route when navigating back (admin/dispatcher only, before offerSent)
  useEffect(() => {
    if (!isPreview) {
      let unsubscribe;
      if (['admin','dispatcher'].includes(user?.role) && !offerSent) {
        unsubscribe = navigation.addListener('beforeRemove', e => {
          e.preventDefault();
          Alert.alert(
            'Cancel this route?',
            'Are you sure you want to delete this route and return to optimization?',
            [
              { text: 'No', style: 'cancel' },
              {
                text: 'Yes', style: 'destructive', onPress: async () => {
                  try {
                    await fetch(`${API_URL}/routes/${routeId}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${userToken}` },
                    });
                  } catch (err) {
                    console.error('Error deleting route:', err);
                  }
                  navigation.dispatch(e.data.action);
                }
              }
            ]
          );
        });
      }
      return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [navigation, routeId, userToken, user?.role, offerSent, isPreview]);

  if (loading || !routeData) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  // Defensive: get shipments from RouteShipment
  const routeShipments = isPreview
    ? (computedRoute.shipments || []).map(s => ({ Shipment: s }))
    : (Array.isArray(routeData.RouteShipment) ? routeData.RouteShipment : []);

  // Decode polyline if needed for other logic (not used in map)
  const coords = polyline.decode(routeData.geometry).map(pair => ({ latitude: pair[0], longitude: pair[1] }));

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Route Details" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <RouteMap shipments={routeShipments} />

            {(user?.role === 'dispatcher' || user?.role === 'admin') && !offerSent && (
          <View style={styles.offerContainer}>
              <Button
                title={sendingOffer ? 'Sending Offer...' : 'Send Offer'}
                onPress={async () => {
                  setSendingOffer(true);
                  try {
                    let persisted;
                    if (isPreview) {
                      // Persist computed route now
                      persisted = await createRoute(userToken, transporterId, computedRoute.shipments.map(s => s.id));
                    }
                    // Send the actual offer
                    const realRouteId = isPreview ? persisted.id : routeData.id;
                    await createOffer(userToken, realRouteId, routeData.User?.id);
                    setOfferSent(true);
                    // Move to the real route detail if we were previewing
                    if (isPreview) {
                      navigation.replace('RouteDetail', { routeId: realRouteId });
                    }
                    Alert.alert('Success', 'Offer sent to transporter.');
                  } catch (e) {
                    console.error(e);
                    Alert.alert('Error', 'Failed to send offer.');
                  } finally {
                    setSendingOffer(false);
                  }
                }}
                disabled={sendingOffer}
              />
          </View>
        )}
        {offerSent && <Text style={styles.offerSentText}>Offer has been sent.</Text>}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Info</Text>
          <View style={styles.infoRowWrapper}>
            <View style={styles.infoRowContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Stops</Text>
                <Text style={styles.infoValue}>{routeShipments.length}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Assigned Vehicle</Text>
                <Text style={styles.infoValue}>Truck #42</Text>
              </View>
            </View>
          </View>
          <View style={styles.infoRowWrapper}>
            <View style={styles.infoRowContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Driver</Text>
                <Text style={styles.infoValue}>{routeData.User?.username || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Start Time</Text>
                <Text style={styles.infoValue}>
                  {new Date(routeData.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: 'numeric', hour12: true })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipments on Route</Text>
          {routeShipments.map(rs => {
            const s = rs.Shipment;
            if (!s) return null;
            return (
              <TouchableOpacity
                key={s.id}
                style={styles.shipmentItem}
                onPress={() => navigation.navigate('Shipment Details', { id: s.id })}
              >
                <View style={styles.itemCollapsed}>
                  <Text style={styles.itemCollapsedLabel}>
                    {s.reference || `#${s.id.substring(0,8)}`}
                  </Text>
                  <Text style={styles.itemCollapsedValue}>
                    {s.deliveryStreet}, {s.deliveryCity}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.reportButton} onPress={() => { /* handle report */ }}>
            <Text style={styles.reportButtonText}>Report Issue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => { /* handle cancel */ }}>
            <Text style={styles.cancelButtonText}>Cancel Route</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { padding: 16, backgroundColor: '#fff', marginVertical: 8, borderRadius: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  infoRow: { marginBottom: 4, width: '48%' },
  infoRowWrapper: {  },
  infoRowContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontWeight: 'normal', textAlign: 'left' },
  infoValue: { fontWeight: 'bold', textAlign: 'left', fontSize: 18 },
  shipmentItem: { paddingHorizontal: 12, paddingVertical: 0, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemLabel: { fontWeight: 'bold' },
  itemValue: { fontWeight: 'normal' },
  expandedContent: { paddingVertical: 12 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  reportButton: { padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#007bff', backgroundColor: '#fff', alignItems: 'center', flex: 1, marginRight: 8 },
  reportButtonText: { color: '#007bff', fontWeight: 'bold' },
  cancelButton: { backgroundColor: 'red', padding: 12, borderRadius: 6, alignItems: 'center', flex: 1, marginLeft: 8 },
  cancelButtonText: { color: 'white', fontWeight: 'bold' },
  offerContainer: { paddingHorizontal: 16, marginVertical: 8 },
  offerSentText: { textAlign: 'center', color: 'green', marginVertical: 8 },
  scrollContent: { paddingBottom: 20 },
  itemCollapsed: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemCollapsedLabel: { fontWeight: 'bold', fontSize: 16 },
  itemCollapsedValue: { fontSize: 14, color: '#555', marginTop: 4 },
}); 
// export default withScreenLayout(RouteDetailScreen, { title: 'RouteDetail' });
export default RouteDetailScreen;
