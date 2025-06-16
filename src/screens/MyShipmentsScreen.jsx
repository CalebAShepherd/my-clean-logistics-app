import React, { useContext, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import InternalHeader from '../components/InternalHeader';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';

const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

// Enhanced status configuration
const STATUS_CONFIG = {
  CREATED: {
    label: 'Processing',
    color: '#FF9500',
    icon: 'clock-outline',
    description: 'Order being prepared'
  },
  ASSIGNED: {
    label: 'Assigned',
    color: '#007AFF',
    icon: 'truck-outline',
    description: 'Carrier assigned'
  },
  IN_TRANSIT: {
    label: 'In Transit',
    color: '#5856D6',
    icon: 'truck-fast',
    description: 'On the way'
  },
  OUT_FOR_DEL: {
    label: 'Out for Delivery',
    color: '#FF9500',
    icon: 'map-marker-path',
    description: 'Final delivery'
  },
  DELIVERED: {
    label: 'Delivered',
    color: '#34C759',
    icon: 'check-circle',
    description: 'Successfully completed'
  }
};

function ShipmentCard({ item, onPress }) {
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.CREATED;
  
  return (
    <TouchableOpacity style={styles.shipmentCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.statusIconContainer, { backgroundColor: `${statusConfig.color}15` }]}>
            <MaterialCommunityIcons 
              name={statusConfig.icon} 
              size={20} 
              color={statusConfig.color} 
            />
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>#{item.reference || item.id.substring(0, 8)}</Text>
            <Text style={styles.orderDate}>
              {new Date(item.shipmentDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
          <Text style={styles.statusText}>{statusConfig.label}</Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routePoint}>
          <View style={styles.routeIconContainer}>
            <MaterialCommunityIcons name="circle" size={12} color="#34C759" />
          </View>
          <View style={styles.routeDetails}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>{item.origin}</Text>
          </View>
        </View>
        
        <View style={styles.routeConnector}>
          <View style={styles.routeLine} />
          <MaterialCommunityIcons name="truck" size={16} color="#8E8E93" />
        </View>
        
        <View style={styles.routePoint}>
          <View style={styles.routeIconContainer}>
            <MaterialCommunityIcons name="map-marker" size={12} color="#FF3B30" />
          </View>
          <View style={styles.routeDetails}>
            <Text style={styles.routeLabel}>Delivery</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>{item.destination}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.shipmentMeta}>
          {item.weight && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="weight" size={14} color="#8E8E93" />
              <Text style={styles.metaText}>{item.weight} lbs</Text>
            </View>
          )}
          {item.serviceCarrier && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="truck-delivery" size={14} color="#8E8E93" />
              <Text style={styles.metaText}>{item.serviceCarrier.name}</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View Details</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function ShipmentList({ status, shipments, onRefresh, userToken, fetching, settings }) {
  const navigation = useNavigation();
  const filtered = shipments.filter(s => s.status === status);
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.CREATED;

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading shipments...</Text>
      </View>
    );
  }

  if (!filtered.length) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name={statusConfig.icon} size={64} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>No {statusConfig.label} Shipments</Text>
        <Text style={styles.emptyMessage}>
          {status === 'CREATED' 
            ? "Your new shipments will appear here once created"
            : status === 'IN_TRANSIT'
            ? "No shipments are currently in transit"
            : "No delivered shipments to display"
          }
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <ShipmentCard
          item={item}
          onPress={() => navigation.navigate('Shipment Details', { id: item.id })}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
      refreshControl={
        <RefreshControl
          refreshing={fetching}
          onRefresh={onRefresh}
          tintColor="#007AFF"
          colors={['#007AFF']}
        />
      }
    />
  );
}

export default function MyShipmentsScreen({ navigation }) {
  const { user, userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [shipments, setShipments] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('CREATED');

  const fetchShipments = async (isRefresh = false) => {
    if (!userToken) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setFetching(true);
    }

    try {
      const res = await fetch(`${API_URL}/api/shipments`, { 
        headers: { Authorization: `Bearer ${userToken}` } 
      });
      const data = await res.json();
      const myShipments = data.filter(s => s.clientId === user.id);
      myShipments.sort((a, b) => new Date(b.shipmentDate) - new Date(a.shipmentDate));
      setShipments(myShipments);
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setFetching(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => fetchShipments(true);

  useEffect(() => { 
    fetchShipments(); 
  }, [userToken, user.id]);

  const getShipmentStats = () => {
    return {
      total: shipments.length,
      processing: shipments.filter(s => s.status === 'CREATED').length,
      inTransit: shipments.filter(s => ['ASSIGNED', 'IN_TRANSIT', 'OUT_FOR_DEL'].includes(s.status)).length,
      delivered: shipments.filter(s => s.status === 'DELIVERED').length,
    };
  };

  const renderTabButton = (status) => {
    const config = STATUS_CONFIG[status];
    const isActive = activeTab === status;
    const count = shipments.filter(s => s.status === status).length;
    
    return (
      <TouchableOpacity
        key={status}
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
        onPress={() => setActiveTab(status)}
        activeOpacity={0.7}
      >
        <View style={styles.tabContent}>
          <View style={styles.tabHeader}>
            <MaterialCommunityIcons 
              name={config.icon} 
              size={18} 
              color={isActive ? config.color : '#8E8E93'} 
            />
            <View style={[styles.tabBadge, { backgroundColor: `${config.color}15` }]}>
              <Text style={[styles.tabBadgeText, { color: config.color }]}>
                {count}
              </Text>
            </View>
          </View>
          <Text style={[styles.tabLabel, isActive && { color: config.color }]}>
            {config.label}
          </Text>
        </View>
        {isActive && (
          <View style={[styles.tabIndicator, { backgroundColor: config.color }]} />
        )}
      </TouchableOpacity>
    );
  };

  if (!settings) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="My Shipments" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = getShipmentStats();

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="My Shipments" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* Visual Header */}
        <View style={styles.headerCard}>
          <LinearGradient
            colors={['#007AFF', '#5856D6']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <MaterialCommunityIcons name="package-variant" size={32} color="white" />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>My Shipments</Text>
                <Text style={styles.headerSubtitle}>Track and manage your orders</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <MaterialCommunityIcons name="chart-box" size={20} color="#007AFF" />
            <Text style={styles.statsTitle}>Shipment Overview</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#5856D6' }]}>{stats.inTransit}</Text>
              <Text style={styles.statLabel}>In Transit</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#34C759' }]}>{stats.delivered}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
          </View>
        </View>

        {/* Enhanced Tab Navigation */}
        <View style={styles.tabSection}>
          <Text style={styles.tabSectionTitle}>Filter by Status</Text>
          <View style={styles.tabContainer}>
            {Object.keys(STATUS_CONFIG).map(renderTabButton)}
          </View>
        </View>

        {/* Shipments List */}
        <View style={styles.shipmentsSection}>
          <Text style={styles.sectionTitle}>
            {STATUS_CONFIG[activeTab].label} Shipments ({shipments.filter(s => s.status === activeTab).length})
          </Text>
          
          <ShipmentList
            status={activeTab}
            shipments={shipments}
            onRefresh={onRefresh}
            userToken={userToken}
            fetching={fetching}
            settings={settings}
          />
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
  
  // Layout
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra space for tab navigation
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
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  
  // Tab Section
  tabSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tabSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tabButton: {
    // flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
    overflow: 'hidden',
    width: '30%',
  },
  tabButtonActive: {
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E5EDFF',
  },
  tabContent: {
    alignItems: 'center',
  },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  
  // Shipments Section
  shipmentsSection: {
    marginHorizontal: 20,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  
  // List Styles
  listContent: {
    paddingBottom: 20,
  },
  cardSeparator: {
    height: 12,
  },
  
  // Shipment Cards
  shipmentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  
  // Route Container
  routeContainer: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeIconContainer: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  routeDetails: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  routeAddress: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 18,
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    marginBottom: 8,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#E1E5E9',
    marginRight: 10,
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
  shipmentMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});