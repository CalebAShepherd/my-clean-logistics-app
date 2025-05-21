import React, { useContext, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import InternalHeader from '../components/InternalHeader';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import Timeline from 'react-native-timeline-flatlist';
import { listRoutes } from '../api/routes';
import { fetchFleetLocations } from '../api/locations';
import MapView, { Marker, Polyline } from 'react-native-maps';
import polyline from '@mapbox/polyline';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.0.73:3000';

const statusLabelMap = { CREATED: 'Processing', ASSIGNED: 'Assigned', IN_TRANSIT: 'In Transit', OUT_FOR_DEL: 'Out for Delivery', DELIVERED: 'Completed' };
const badgeColors = { CREATED: '#999', ASSIGNED: '#0074D9', IN_TRANSIT: '#FFA500', OUT_FOR_DEL: '#f39c12', DELIVERED: '#4CAF50' };

export default function TrackingDetailsScreen({ route, navigation }) {
  const { userToken } = useContext(AuthContext);
  const { id } = route.params;
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignedRoute, setAssignedRoute] = useState(null);
  const [transporterLocation, setTransporterLocation] = useState(null);
  // timeline including Out for Delivery
  const mockProgress = [
    {
      label: 'Shipment Created',
      date: shipment ? new Date(shipment.createdAt).toLocaleString() : '',
      completed: !!shipment,
    },
    {
      label: 'In Transit',
      date:
        shipment && (['IN_TRANSIT', 'OUT_FOR_DEL', 'DELIVERED'].includes(shipment.status))
          ? new Date(shipment.updatedAt).toLocaleString()
          : '',
      completed: shipment && ['IN_TRANSIT', 'OUT_FOR_DEL', 'DELIVERED'].includes(shipment.status),
    },
    {
      label: 'Out for Delivery',
      date:
        shipment && ['OUT_FOR_DEL', 'DELIVERED'].includes(shipment.status)
          ? new Date(shipment.updatedAt).toLocaleString()
          : '',
      completed: shipment && ['OUT_FOR_DEL', 'DELIVERED'].includes(shipment.status),
    },
    {
      label: 'Delivered',
      date:
        shipment
          ? shipment.deliveredAt
            ? new Date(shipment.deliveredAt).toLocaleString()
            : shipment.status === 'DELIVERED'
            ? new Date(shipment.updatedAt).toLocaleString()
            : 'Pending'
          : '',
      completed: shipment && shipment.status === 'DELIVERED',
    },
  ];
  // build data for timeline library
  const timelineData = mockProgress.map(step => ({
    time: step.date || '',
    title: step.label,
    circleColor: step.completed ? '#4CAF50' : '#ccc',
    lineColor: step.completed ? '#4CAF50' : '#ccc',
  }));

  useEffect(() => {
    const fetchShipment = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/shipments/${id}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        if (!res.ok) throw new Error('Failed to load shipment');
        const data = await res.json();
        setShipment(data);
        // fetch the route containing this shipment
        const routes = await listRoutes(userToken);
        const foundRoute = routes.find(r => r.RouteShipment.some(rs => rs.shipmentId === id));
        if (foundRoute) {
          setAssignedRoute(foundRoute);
          // get transporter location from fleet
          const fleet = await fetchFleetLocations(userToken);
          const loc = fleet.find(l => l.userId === foundRoute.transporterId);
          if (loc) setTransporterLocation({ latitude: loc.latitude, longitude: loc.longitude });
        } else {
          setAssignedRoute(null);
          setTransporterLocation(null);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchShipment();
  }, [id, userToken]);

  return (
    <SafeAreaView style={styles.screen}>
      <InternalHeader navigation={navigation} title="Tracking Details" />
      {loading ? (
        <ActivityIndicator style={styles.center} size="large" />
      ) : error ? (
        <View style={styles.center}><Text style={styles.error}>{error}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Order ID</Text>
            <Text style={styles.cardText}>{shipment.reference || shipment.id}</Text>
            <Text style={styles.sectionTitle}>Client</Text>
            <Text style={styles.cardText}>{shipment.client?.username}</Text>
            <Text style={styles.sectionTitle}>Status</Text>
            <Text style={[styles.cardText, styles.status]}>{statusLabelMap[shipment.status]}</Text>
            <Text style={styles.sectionTitle}>ETA</Text>
            <Text style={styles.cardText}>{shipment.deliveredAt ? new Date(shipment.deliveredAt).toLocaleString() : 'Pending'}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Shipment Location</Text>
            {shipment?.status === 'OUT_FOR_DEL' && assignedRoute?.geometry ? (
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: polyline.decode(assignedRoute.geometry)[0][0],
                  longitude: polyline.decode(assignedRoute.geometry)[0][1],
                  latitudeDelta: 0.5,
                  longitudeDelta: 0.5,
                }}
              >
                <Polyline
                  coordinates={polyline.decode(assignedRoute.geometry).map(([lat, lng]) => ({ latitude: lat, longitude: lng }))}
                  strokeColor="#0074D9"
                  strokeWidth={4}
                />
                {transporterLocation && (
                  <Marker
                    coordinate={transporterLocation}
                    title="Transporter"
                    pinColor="#27ae60"
                  />
                )}
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder} />
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Shipment Progress</Text>
            {mockProgress.map((step, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={[styles.timelineDot, step.completed && styles.timelineDotCompleted]} />
                {step.completed && mockProgress[idx + 1]?.completed && <View style={styles.timelineLine} />}
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>{step.label}</Text>
                  <Text style={styles.timelineDate}>{step.date}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f2f2' },
  contentContainer: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  cardText: { fontSize: 16, marginBottom: 12 },
  status: { color: '#FFA500', fontWeight: '700' },
  mapPlaceholder: { height: 200, backgroundColor: '#e0e0e0', borderRadius: 8, marginTop: 8, width: '100%' },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  timelineDot: { zIndex: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ccc', marginTop: 5, marginRight: 20 },
  timelineDotCompleted: { backgroundColor: '#4CAF50' },
  timelineLine: { position: 'absolute', left: 4, top: 15, bottom: -22, width: 2, backgroundColor: '#4CAF50' },
  timelineContainer: { position: 'relative', paddingLeft: 5 },
  timelineSidebar: { position: 'absolute', left: 5, top: 0, bottom: 0, width: 2, backgroundColor: '#ccc' },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  timelineDate: { fontSize: 14, color: '#555' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: 'red', fontWeight: '700' },
  timelineWrapper: { flex: 1, paddingHorizontal: 16 },
  map: { height: 200, borderRadius: 8, marginTop: 8, width: '100%' },
}); 