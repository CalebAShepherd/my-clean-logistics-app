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
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

function RouteDetailScreen({ route, navigation }) {
  // Expect either a persisted routeId or a computedRoute preview
  const { routeId, computedRoute, transporterId } = route.params || {};
  const isPreview = !!computedRoute;
  
  if (!route?.params || (!routeId && !isPreview)) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Route Details" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>No route data provided</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
        if (!res.ok) {
          throw new Error('Failed to fetch route details');
        }
        const data = await res.json();
        setRouteData(data);
      } catch (e) {
        console.error('Error fetching route detail:', e);
        Alert.alert('Error', 'Failed to load route details. Please try again.');
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
            'Cancel Route',
            'Are you sure you want to delete this route and return to optimization?',
            [
              { text: 'No', style: 'cancel' },
              {
                text: 'Yes', 
                style: 'destructive', 
                onPress: async () => {
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

  const handleSendOffer = async () => {
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
      Alert.alert('Success', 'Offer sent to transporter successfully!');
    } catch (e) {
      console.error('Error sending offer:', e);
      Alert.alert('Error', 'Failed to send offer. Please try again.');
    } finally {
      setSendingOffer(false);
    }
  };

  const handleReportIssue = () => {
    Alert.alert(
      'Report Issue',
      'What type of issue would you like to report?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Vehicle Problem', onPress: () => console.log('Vehicle issue reported') },
        { text: 'Route Problem', onPress: () => console.log('Route issue reported') },
        { text: 'Other', onPress: () => console.log('Other issue reported') }
      ]
    );
  };

  const handleCancelRoute = () => {
    Alert.alert(
      'Cancel Route',
      'Are you sure you want to cancel this route? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive', 
          onPress: () => {
            Alert.alert('Route Cancelled', 'The route has been cancelled successfully.');
            navigation.goBack();
          }
        }
      ]
    );
  };

  if (loading || !routeData) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Route Details" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading route details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Defensive: get shipments from RouteShipment
  const routeShipments = isPreview
    ? (computedRoute.shipments || []).map(s => ({ Shipment: s }))
    : (Array.isArray(routeData.RouteShipment) ? routeData.RouteShipment : []);

  const totalShipments = routeShipments.length;
  const routeStartTime = new Date(routeData.createdAt);

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title={isPreview ? "Route Preview" : "Route Details"}
        rightIcons={isPreview ? [] : [
          {
            icon: 'information',
            color: '#007AFF',
            onPress: () => Alert.alert('Route Info', 'This route contains detailed shipment and delivery information.')
          }
        ]}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="map-marker-path" size={32} color="#007AFF" />
          </View>
          <Text style={styles.headerTitle}>
            {isPreview ? 'Route Preview' : `Route #${routeId?.substring(0, 8) || 'N/A'}`}
          </Text>
          <Text style={styles.headerSubtitle}>
            {totalShipments} {totalShipments === 1 ? 'delivery' : 'deliveries'} planned
          </Text>
        </View>

        {/* Route Map */}
        <View style={styles.mapCard}>
          <RouteMap shipments={routeShipments} />
        </View>

        {/* Offer Section */}
        {(user?.role === 'dispatcher' || user?.role === 'admin') && !offerSent && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="handshake" size={20} color="#34C759" />
              <Text style={styles.cardTitle}>Send Offer</Text>
            </View>
            
            <Text style={styles.offerDescription}>
              Send this route offer to the assigned transporter for acceptance.
            </Text>
            
            <TouchableOpacity 
              style={[styles.offerButton, sendingOffer && styles.offerButtonDisabled]} 
              onPress={handleSendOffer}
              disabled={sendingOffer}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={sendingOffer ? ['#C7C7CC', '#C7C7CC'] : ['#34C759', '#30D158']}
                style={styles.offerGradient}
              >
                {sendingOffer ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialCommunityIcons name="send" size={20} color="white" />
                )}
                <Text style={styles.offerText}>
                  {sendingOffer ? 'Sending Offer...' : 'Send Offer to Transporter'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Offer Sent Confirmation */}
        {offerSent && (
          <View style={styles.offerSentCard}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#34C759" />
            <Text style={styles.offerSentText}>Offer sent successfully!</Text>
            <Text style={styles.offerSentSubtext}>
              The transporter will receive a notification and can accept or decline this route.
            </Text>
          </View>
        )}

        {/* Route Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="information" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Route Information</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Total Stops</Text>
              <Text style={styles.infoValue}>{totalShipments}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Vehicle</Text>
              <Text style={styles.infoValue}>Truck #42</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Driver</Text>
              <Text style={styles.infoValue}>{routeData.User?.username || 'Unassigned'}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Start Time</Text>
              <Text style={styles.infoValue}>
                {routeStartTime.toLocaleTimeString([], { 
                  hour: 'numeric', 
                  minute: 'numeric', 
                  hour12: true 
                })}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusSection}>
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#007AFF" />
              <Text style={styles.statusText}>
                {isPreview ? 'Preview Mode' : 'Active Route'}
              </Text>
            </View>
          </View>
        </View>

        {/* Shipments List */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="truck-delivery" size={20} color="#FF9500" />
            <Text style={styles.cardTitle}>Delivery Stops</Text>
          </View>
          
          <View style={styles.shipmentsList}>
            {routeShipments.map((rs, index) => {
              const s = rs.Shipment;
              if (!s) return null;
              
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.shipmentItem}
                  onPress={() => navigation.navigate('Shipment Details', { id: s.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.shipmentContent}>
                    <View style={styles.shipmentHeader}>
                      <View style={styles.stopNumber}>
                        <Text style={styles.stopNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.shipmentInfo}>
                        <Text style={styles.shipmentId}>
                          {s.reference || `#${s.id.substring(0,8)}`}
                        </Text>
                        <Text style={styles.shipmentAddress}>
                          {s.deliveryStreet}, {s.deliveryCity}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.reportButton} 
            onPress={handleReportIssue}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF9500" />
            <Text style={styles.reportButtonText}>Report Issue</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancelRoute}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.cancelButtonText}>Cancel Route</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  // Loading/Error States
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
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  
  // Map Card
  mapCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    height: 200,
  },
  
  // Card Styles
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
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
  
  // Offer Section
  offerDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: 20,
  },
  
  offerButton: {
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  offerButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  
  offerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  
  offerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Offer Sent Card
  offerSentCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
  },
  
  offerSentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#15803D',
    marginTop: 8,
    marginBottom: 4,
  },
  
  offerSentSubtext: {
    fontSize: 14,
    color: '#16A34A',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  
  // Status Section
  statusSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 6,
  },
  
  // Shipments List
  shipmentsList: {
    // Container for shipments
  },
  
  shipmentItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  
  shipmentContent: {
    padding: 16,
  },
  
  shipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  stopNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  shipmentInfo: {
    flex: 1,
  },
  
  shipmentId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  
  shipmentAddress: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  
  // Action Container
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  
  reportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FEDE8A',
  },
  
  reportButtonText: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 
// export default withScreenLayout(RouteDetailScreen, { title: 'RouteDetail' });
export default RouteDetailScreen;
