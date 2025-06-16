import React, { useEffect, useState, useContext } from 'react';
import { 
  SafeAreaView, 
  FlatList, 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Platform,
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import InternalHeader from '../components/InternalHeader';
import { AuthContext } from '../context/AuthContext';
import { fetchWarehouses } from '../api/warehouses';
import Constants from 'expo-constants';

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
  IN_TRANSIT: '#AF52DE', 
  OUT_FOR_DEL: '#34C759', 
  DELIVERED: '#00D4AA' 
};

const STATUS_ICONS = {
  CREATED: 'clock-outline',
  ASSIGNED: 'account-check',
  IN_TRANSIT: 'truck-fast',
  OUT_FOR_DEL: 'package-variant-closed',
  DELIVERED: 'check-circle'
};

export default function ScheduledOutboundShipmentsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouseId, setWarehouseId] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Determine API base URL
  const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
  const API_URL =
    Constants.manifest?.extra?.apiUrl ||
    Constants.expoConfig?.extra?.apiUrl ||
    `http://${localhost}:3000`;

  // Get first warehouse for this admin
  useEffect(() => {
    if (!userToken) return;
    fetchWarehouses(userToken)
      .then(list => { if (list.length) setWarehouseId(list[0].id); })
      .catch(err => {
        console.error('Warehouse fetch error:', err);
        Alert.alert('Error', 'Failed to load warehouse information');
      });
  }, [userToken]);

  // Fetch shipments when warehouseId is set
  const fetchShipments = async (isRefresh = false) => {
    if (!userToken || !warehouseId) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const response = await fetch(`${API_URL}/api/shipments`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      const filtered = data.filter(s => 
        s.warehouseId === warehouseId && 
        ['CREATED', 'ASSIGNED'].includes(s.status)
      );
      setShipments(filtered);
    } catch (error) {
      console.error('Shipments fetch error:', error);
      Alert.alert('Error', 'Failed to load shipments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [userToken, warehouseId]);

  const getStatusStats = () => {
    const stats = {
      CREATED: shipments.filter(s => s.status === 'CREATED').length,
      ASSIGNED: shipments.filter(s => s.status === 'ASSIGNED').length,
    };
    return stats;
  };

  const renderShipmentCard = ({ item }) => {
    const statusColor = badgeColors[item.status] || '#8E8E93';
    const statusIcon = STATUS_ICONS[item.status] || 'help-circle';
    
    return (
      <TouchableOpacity
        style={styles.shipmentCard}
        onPress={() => navigation.navigate('Shipment Details', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>
              Order #{item.reference || item.id.substring(0, 8).toUpperCase()}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
              <MaterialCommunityIcons 
                name={statusIcon} 
                size={12} 
                color={statusColor} 
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabelMap[item.status] || item.status}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
        </View>

        <View style={styles.routeSection}>
          <View style={styles.locationRow}>
            <View style={styles.locationIndicator}>
              <MaterialCommunityIcons name="circle" size={12} color="#34C759" />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Pickup Location</Text>
              <Text style={styles.locationText} numberOfLines={2}>
                {item.origin || 'Not specified'}
              </Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.locationRow}>
            <View style={styles.locationIndicator}>
              <MaterialCommunityIcons name="circle" size={12} color="#FF3B30" />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Delivery Location</Text>
              <Text style={styles.locationText} numberOfLines={2}>
                {item.destination || 'Not specified'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.metricContainer}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#8E8E93" />
            <Text style={styles.metricText}>
              Created {new Date(item.createdAt || Date.now()).toLocaleDateString()}
            </Text>
          </View>
          {item.assignedTo && (
            <View style={styles.metricContainer}>
              <MaterialCommunityIcons name="account" size={16} color="#8E8E93" />
              <Text style={styles.metricText}>Assigned</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="truck-delivery-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No Outbound Shipments</Text>
      <Text style={styles.emptyText}>
        Currently no scheduled outbound shipments for this warehouse
      </Text>
      <TouchableOpacity 
        style={styles.emptyActionButton}
        onPress={() => navigation.navigate('Create Shipment')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#007AFF', '#0056CC']}
          style={styles.emptyActionGradient}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.emptyActionText}>Create Shipment</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Outbound Shipments" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading shipments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = getStatusStats();

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Scheduled Outbound Shipments" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchShipments(true)} />
        }
      >
        {/* Visual Header */}
        <View style={styles.visualHeader}>
          <View style={styles.headerIconContainer}>
            <MaterialCommunityIcons name="truck-delivery" size={48} color="#007AFF" />
          </View>
          <Text style={styles.headerTitle}>Outbound Shipments</Text>
          <Text style={styles.headerSubtitle}>
            Track and manage scheduled outbound deliveries
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{shipments.length}</Text>
            <Text style={styles.statLabel}>Total Shipments</Text>
            <MaterialCommunityIcons name="package-variant" size={24} color="#007AFF" />
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.CREATED}</Text>
            <Text style={styles.statLabel}>Processing</Text>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9500" />
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.ASSIGNED}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
            <MaterialCommunityIcons name="account-check" size={24} color="#34C759" />
          </View>
        </View>

        {/* Shipments List */}
        <View style={styles.shipmentsSection}>
          <Text style={styles.sectionTitle}>
            Active Shipments ({shipments.length})
          </Text>
          
          {shipments.length > 0 ? (
            <FlatList
              data={shipments}
              keyExtractor={item => item.id}
              renderItem={renderShipmentCard}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            />
          ) : (
            renderEmptyState()
          )}
        </View>

        {/* Quick Actions */}
        {shipments.length > 0 && (
          <View style={styles.quickActionsCard}>
            <View style={styles.quickActionsHeader}>
              <MaterialCommunityIcons name="flash" size={20} color="#FF9500" />
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Create Shipment')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#34C759', '#28A745']}
                style={styles.quickActionGradient}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                <Text style={styles.quickActionText}>New Shipment</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F2F2F7' 
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },

  // Visual Header
  visualHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Shipments Section
  shipmentsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },

  // Shipment Cards
  shipmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Route Section
  routeSection: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIndicator: {
    width: 20,
    alignItems: 'center',
    paddingTop: 2,
  },
  locationDetails: {
    flex: 1,
    marginLeft: 8,
  },
  locationLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    marginBottom: 12,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#E5E5EA',
    marginLeft: 9,
    marginVertical: 4,
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  metricContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Quick Actions Card
  quickActionsCard: {
    backgroundColor: '#FFF8E8',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  quickActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  quickActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Misc
  itemSeparator: {
    height: 8,
  },
}); 