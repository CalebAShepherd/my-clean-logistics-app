import React, { useContext, useEffect, useState } from 'react';
import { SafeAreaView, FlatList, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import InternalHeader from '../components/InternalHeader';
import Constants from 'expo-constants';
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

const statusIcons = {
  CREATED: 'package-variant',
  ASSIGNED: 'truck',
  IN_TRANSIT: 'truck-fast',
  OUT_FOR_DEL: 'truck-delivery',
  DELIVERED: 'check-circle'
};

export default function ShipmentTrackingScreen({ navigation }) {
  const { user, userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchShipments = async () => {
    if (!userToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shipments`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      const myShipments = data.filter(s => s.clientId === user.id);
      myShipments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setShipments(myShipments);
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShipments();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchShipments();
  }, [userToken, user.id]);

  if (!settings) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Shipment Tracking" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusProgress = (status) => {
    const statuses = ['CREATED', 'ASSIGNED', 'IN_TRANSIT', 'OUT_FOR_DEL', 'DELIVERED'];
    const currentIndex = statuses.indexOf(status);
    return currentIndex >= 0 ? (currentIndex + 1) / statuses.length : 0;
  };

  const getNextStep = (status) => {
    switch (status) {
      case 'CREATED':
        return 'Awaiting transporter assignment';
      case 'ASSIGNED':
        return 'Preparing for pickup';
      case 'IN_TRANSIT':
        return 'En route to destination';
      case 'OUT_FOR_DEL':
        return 'Out for final delivery';
      case 'DELIVERED':
        return 'Successfully delivered';
      default:
        return 'Processing your shipment';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Shipment Tracking" />
      
      {/* Visual Header */}
      <View style={styles.headerCard}>
        <LinearGradient
          colors={['#007AFF', '#5856D6']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <MaterialCommunityIcons name="radar" size={32} color="white" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Track Your Shipments</Text>
              <Text style={styles.headerSubtitle}>Monitor all your deliveries in real-time</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <MaterialCommunityIcons name="chart-line" size={20} color="#007AFF" />
          <Text style={styles.statsTitle}>Your Shipments</Text>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{shipments.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {shipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'OUT_FOR_DEL').length}
            </Text>
            <Text style={styles.statLabel}>In Transit</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {shipments.filter(s => s.status === 'DELIVERED').length}
            </Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {shipments.filter(s => s.status === 'CREATED' || s.status === 'ASSIGNED').length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your shipments...</Text>
        </View>
      ) : (
        <FlatList
          data={shipments}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="package-variant-closed" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No Shipments Found</Text>
              <Text style={styles.emptySubtitle}>
                You haven't created any shipments yet. Start by creating your first shipment.
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const progress = getStatusProgress(item.status);
            const nextStep = getNextStep(item.status);
            
            return (
              <TouchableOpacity
                style={styles.shipmentCard}
                onPress={() => navigation.navigate('Tracking Details', { id: item.id })}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>
                      #{item.reference || item.id.substring(0, 8)}
                    </Text>
                    <Text style={styles.orderDate}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <View style={[styles.statusBadge, { backgroundColor: badgeColors[item.status] }]}>
                    <MaterialCommunityIcons 
                      name={statusIcons[item.status]} 
                      size={12} 
                      color="white" 
                      style={styles.statusIcon}
                    />
                    <Text style={styles.statusText}>
                      {statusLabelMap[item.status]}
                    </Text>
                  </View>
                </View>
                
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill, 
                      { width: `${progress * 100}%`, backgroundColor: badgeColors[item.status] }
                    ]} />
                  </View>
                  <Text style={styles.progressText}>{Math.round(progress * 100)}% Complete</Text>
                </View>
                
                {/* Next Step */}
                <View style={styles.nextStepContainer}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#8E8E93" />
                  <Text style={styles.nextStepText}>{nextStep}</Text>
                </View>
                
                {/* Route Information */}
                <View style={styles.routeContainer}>
                  <View style={styles.routeSection}>
                    <View style={styles.routePoint}>
                      <MaterialCommunityIcons name="circle" size={8} color="#34C759" />
                      <Text style={styles.routeLabel}>From</Text>
                    </View>
                    <Text style={styles.routeAddress} numberOfLines={2}>
                      {item.origin}
                    </Text>
                  </View>
                  
                  <View style={styles.routeArrow}>
                    <MaterialCommunityIcons name="arrow-right" size={16} color="#8E8E93" />
                  </View>
                  
                  <View style={styles.routeSection}>
                    <View style={styles.routePoint}>
                      <MaterialCommunityIcons name="map-marker" size={8} color="#FF3B30" />
                      <Text style={styles.routeLabel}>To</Text>
                    </View>
                    <Text style={styles.routeAddress} numberOfLines={2}>
                      {item.destination}
                    </Text>
                  </View>
                </View>
                
                {/* Action Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.trackingInfo}>
                    {item.trackingNumber && (
                      <View style={styles.trackingNumberContainer}>
                        <MaterialCommunityIcons name="barcode-scan" size={12} color="#8E8E93" />
                        <Text style={styles.trackingNumber}>{item.trackingNumber}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.actionContainer}>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#007AFF" />
                    <Text style={styles.actionText}>Track</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  // Loading State
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
  
  // Visual Header
  headerCard: {
    marginHorizontal: 20,
    marginTop: 16,
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
  
  // Stats Card
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Shipment Cards
  shipmentCard: {
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
  
  // Card Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  
  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  
  // Progress Bar
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E1E5E9',
    borderRadius: 2,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  // Next Step
  nextStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  nextStepText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  
  // Route Container
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  routeSection: {
    flex: 1,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  routeAddress: {
    fontSize: 13,
    color: '#1C1C1E',
    fontWeight: '500',
    lineHeight: 18,
  },
  routeArrow: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  
  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  trackingInfo: {
    flex: 1,
  },
  trackingNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingNumber: {
    fontSize: 11,
    color: '#8E8E93',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
  },
});