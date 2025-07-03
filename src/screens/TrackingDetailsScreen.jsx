import React, { useContext, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import InternalHeader from '../components/InternalHeader';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import { listRoutes } from '../api/routes';
import { fetchFleetLocations } from '../api/locations';
import MapView, { Marker, Polyline } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import { getApiUrl } from '../utils/apiHost';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  getApiUrl();

const statusLabelMap = { 
  CREATED: 'Processing', 
  ASSIGNED: 'Assigned', 
  IN_TRANSIT: 'In Transit', 
  OUT_FOR_DEL: 'Out for Delivery', 
  DELIVERED: 'Completed' 
};

const badgeColors = { 
  CREATED: '#FF9500', 
  ASSIGNED: '#007AFF', 
  IN_TRANSIT: '#5856D6', 
  OUT_FOR_DEL: '#FF9500', 
  DELIVERED: '#34C759' 
};

export default function TrackingDetailsScreen({ route, navigation }) {
  const { userToken } = useContext(AuthContext);
  const { id } = route.params;
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [assignedRoute, setAssignedRoute] = useState(null);
  const [transporterLocation, setTransporterLocation] = useState(null);

  // Enhanced timeline with proper status progression
  const createTimelineData = (shipmentData) => {
    if (!shipmentData) return [];
    
    const timeline = [
      {
        id: 'created',
        label: 'Shipment Created',
        icon: 'package-variant',
        date: new Date(shipmentData.createdAt).toLocaleString(),
        completed: true,
        description: 'Your shipment has been created and is being processed'
      },
      {
        id: 'assigned',
        label: 'Transporter Assigned',
        icon: 'truck',
        date: ['ASSIGNED', 'IN_TRANSIT', 'OUT_FOR_DEL', 'DELIVERED'].includes(shipmentData.status) 
          ? new Date(shipmentData.updatedAt).toLocaleString() 
          : null,
        completed: ['ASSIGNED', 'IN_TRANSIT', 'OUT_FOR_DEL', 'DELIVERED'].includes(shipmentData.status),
        description: 'A transporter has been assigned to your shipment'
      },
      {
        id: 'in_transit',
        label: 'In Transit',
        icon: 'truck-fast',
        date: ['IN_TRANSIT', 'OUT_FOR_DEL', 'DELIVERED'].includes(shipmentData.status)
          ? new Date(shipmentData.updatedAt).toLocaleString()
          : null,
        completed: ['IN_TRANSIT', 'OUT_FOR_DEL', 'DELIVERED'].includes(shipmentData.status),
        description: 'Your shipment is on its way to the destination'
      },
      {
        id: 'out_for_delivery',
        label: 'Out for Delivery',
        icon: 'truck-delivery',
        date: ['OUT_FOR_DEL', 'DELIVERED'].includes(shipmentData.status)
          ? new Date(shipmentData.updatedAt).toLocaleString()
          : null,
        completed: ['OUT_FOR_DEL', 'DELIVERED'].includes(shipmentData.status),
        description: 'Your shipment is out for final delivery'
      },
      {
        id: 'delivered',
        label: 'Delivered',
        icon: 'check-circle',
        date: shipmentData.status === 'DELIVERED'
          ? (shipmentData.deliveredAt 
              ? new Date(shipmentData.deliveredAt).toLocaleString()
              : new Date(shipmentData.updatedAt).toLocaleString())
          : null,
        completed: shipmentData.status === 'DELIVERED',
        description: 'Your shipment has been successfully delivered'
      }
    ];
    
    return timeline;
  };

  const fetchShipmentData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/shipments/${id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error('Failed to load shipment');
      const data = await res.json();
      setShipment(data);
      
      // Fetch the route containing this shipment
      const routes = await listRoutes(userToken);
      const foundRoute = routes.find(r => r.RouteShipment.some(rs => rs.shipmentId === id));
      if (foundRoute) {
        setAssignedRoute(foundRoute);
        // Get transporter location from fleet
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

  useEffect(() => {
    fetchShipmentData();
  }, [id, userToken]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShipmentData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Tracking Details" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading tracking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Tracking Details" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Unable to Load Tracking</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const timelineData = createTimelineData(shipment);
  const currentStatusIndex = timelineData.findIndex(item => item.completed);
  const currentStatus = shipment?.status || 'CREATED';

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Tracking Details" />
      
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Visual Header */}
        <View style={styles.headerCard}>
          <LinearGradient
            colors={['#007AFF', '#5856D6']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <MaterialCommunityIcons name="map-marker-path" size={32} color="white" />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Track Your Shipment</Text>
                <Text style={styles.headerSubtitle}>Real-time delivery tracking</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Shipment Overview Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="package-variant" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Shipment Overview</Text>
          </View>
          
          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Order ID</Text>
              <Text style={styles.overviewValue}>#{shipment.reference || shipment.id.substring(0, 8)}</Text>
            </View>
            
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Client</Text>
              <Text style={styles.overviewValue}>{shipment.client?.username || 'N/A'}</Text>
            </View>
            
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Current Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: badgeColors[currentStatus] }]}>
                <Text style={styles.statusText}>{statusLabelMap[currentStatus]}</Text>
              </View>
            </View>
            
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Estimated Delivery</Text>
              <Text style={styles.overviewValue}>
                {shipment.deliveredAt 
                  ? new Date(shipment.deliveredAt).toLocaleDateString()
                  : 'Calculating...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Route Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="map-marker-distance" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Route Details</Text>
          </View>
          
          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View style={styles.routeIcon}>
                <MaterialCommunityIcons name="circle" size={12} color="#34C759" />
              </View>
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>Pickup Location</Text>
                <Text style={styles.routeAddress}>{shipment.origin}</Text>
              </View>
            </View>
            
            <View style={styles.routeLine} />
            
            <View style={styles.routePoint}>
              <View style={styles.routeIcon}>
                <MaterialCommunityIcons name="map-marker" size={12} color="#FF3B30" />
              </View>
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>Delivery Location</Text>
                <Text style={styles.routeAddress}>{shipment.destination}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Live Tracking Map */}
        {shipment?.status === 'OUT_FOR_DEL' && assignedRoute?.geometry && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="map" size={20} color="#007AFF" />
              <Text style={styles.cardTitle}>Live Tracking</Text>
            </View>
            
            <View style={styles.mapContainer}>
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
                  coordinates={polyline.decode(assignedRoute.geometry).map(([lat, lng]) => ({ 
                    latitude: lat, 
                    longitude: lng 
                  }))}
                  strokeColor="#007AFF"
                  strokeWidth={4}
                />
                {transporterLocation && (
                  <Marker
                    coordinate={transporterLocation}
                    title="Delivery Vehicle"
                    description="Current location"
                  >
                    <View style={styles.markerContainer}>
                      <MaterialCommunityIcons name="truck" size={24} color="#007AFF" />
                    </View>
                  </Marker>
                )}
              </MapView>
            </View>
          </View>
        )}

        {/* Shipment Timeline */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="timeline" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Shipment Progress</Text>
          </View>
          
          <View style={styles.timelineContainer}>
            {timelineData.map((item, index) => (
              <View key={item.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    item.completed && styles.timelineDotCompleted
                  ]}>
                    <MaterialCommunityIcons 
                      name={item.icon} 
                      size={16} 
                      color={item.completed ? "white" : "#C7C7CC"} 
                    />
                  </View>
                  {index < timelineData.length - 1 && (
                    <View style={[
                      styles.timelineConnector,
                      item.completed && timelineData[index + 1]?.completed && styles.timelineConnectorCompleted
                    ]} />
                  )}
                </View>
                
                <View style={styles.timelineRight}>
                  <Text style={[
                    styles.timelineLabel,
                    item.completed && styles.timelineLabelCompleted
                  ]}>
                    {item.label}
                  </Text>
                  <Text style={styles.timelineDescription}>{item.description}</Text>
                  {item.date && (
                    <Text style={styles.timelineDate}>{item.date}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Tracking Information */}
        {shipment.trackingNumber && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="barcode-scan" size={20} color="#007AFF" />
              <Text style={styles.cardTitle}>Tracking Information</Text>
            </View>
            
            <View style={styles.trackingInfo}>
              <Text style={styles.trackingLabel}>Tracking Number</Text>
              <Text style={styles.trackingNumber}>{shipment.trackingNumber}</Text>
              <Text style={styles.trackingNote}>
                Use this number to track your shipment on the carrier's website
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  
  // Layout
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 80,
  },
  
  // Visual Header
  headerCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  headerGradient: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Cards
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  
  // Overview Grid
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  overviewItem: {
    flex: 1,
    minWidth: '45%',
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  
  // Status Badge
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  
  // Route Visualization
  routeContainer: {
    paddingLeft: 8,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeIcon: {
    width: 20,
    alignItems: 'center',
    marginTop: 2,
  },
  routeContent: {
    marginLeft: 12,
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E1E5E9',
    marginLeft: 6,
    marginVertical: 8,
  },
  
  // Map
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    height: 200,
    width: '100%',
  },
  markerContainer: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  
  // Timeline
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E1E5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: '#34C759',
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#E1E5E9',
    marginTop: 0,
  },
  timelineConnectorCompleted: {
    backgroundColor: '#34C759',
  },
  timelineRight: {
    flex: 1,
    paddingTop: 4,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  timelineLabelCompleted: {
    color: '#1C1C1E',
  },
  timelineDescription: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400',
    paddingBottom: 20,
  },
  
  // Tracking Info
  trackingInfo: {
    alignItems: 'center',
  },
  trackingLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  trackingNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 8,
  },
  trackingNote: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
}); 