import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Platform, Alert, TouchableOpacity, SafeAreaView, TextInput, RefreshControl } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import InternalHeader from '../components/InternalHeader';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getApiUrl } from '../utils/apiHost';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : getApiUrl();

function ShipmentList({ status, shipments, onRefresh, userToken, fetching, settings, searchQuery }) {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  
  // Map statuses to display labels and colors
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

  // Normalize and filter by status
  let filtered = shipments.filter(s => {
    const itemStatus = s.status.trim().toUpperCase();
    // ASSIGNED shipments in Processing tab (CREATED); OUT_FOR_DEL in In Transit tab
    if (status === 'CREATED') {
      return itemStatus === 'CREATED' || itemStatus === 'ASSIGNED';
    }
    if (status === 'IN_TRANSIT') {
      return itemStatus === 'IN_TRANSIT' || itemStatus === 'OUT_FOR_DEL';
    }
    return itemStatus === status;
  });

  // Filter by search query
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(s => (
      (s.reference || s.id).toLowerCase().includes(q) ||
      s.client?.username?.toLowerCase().includes(q) ||
      s.origin.toLowerCase().includes(q) ||
      s.destination.toLowerCase().includes(q)
    ));
  }

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/shipments/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onRefreshList = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  if (fetching && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading shipments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefreshList}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="truck-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Shipments Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search criteria' : 'No shipments match the current filter'}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.shipmentCard}
            onPress={() => navigation.navigate('Shipment Details', { id: item.id })}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={styles.orderInfo}>
                <Text style={styles.orderId}>
                  #{item.reference || item.id.substring(0,8)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: badgeColors[item.status] || '#8E8E93' }]}> 
                  <Text style={styles.statusText}>
                    {statusLabelMap[item.status] || item.status}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Company/client name */}
            <Text style={styles.clientName}>{item.client?.username}</Text>
            
            <View style={styles.routeContainer}>
              <View style={styles.locationRow}>
                <MaterialCommunityIcons name="circle" size={12} color="#34C759" />
                <View style={styles.locationContent}>
                  <Text style={styles.locationLabel}>Pickup</Text>
                  <Text style={styles.locationText}>{item.origin}</Text>
                </View>
              </View>
              
              <View style={styles.routeLine} />
              
              <View style={styles.locationRow}>
                <MaterialCommunityIcons name="map-marker" size={12} color="#FF3B30" />
                <View style={styles.locationContent}>
                  <Text style={styles.locationLabel}>Delivery</Text>
                  <Text style={styles.locationText}>{item.destination}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

export default function ShipmentsScreen({ navigation }) {
  const { userToken, user, loading } = useContext(AuthContext);
  const { settings } = useSettings();
  const [shipments, setShipments] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [activeTab, setActiveTab] = useState('CREATED');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAllShipments = async () => {
    if (!userToken) return;
    setFetching(true);
    try {
      const res = await fetch(`${API_URL}/api/shipments`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      setShipments(data);
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchAllShipments();
  }, [userToken]);

  // Export shipments as CSV or PDF
  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      params.append('status', activeTab);
      if (searchQuery) params.append('search', searchQuery);
      const now = Date.now();
      const fileExt = format === 'pdf' ? 'pdf' : 'csv';
      const fileUri = FileSystem.documentDirectory + `shipments-${now}.${fileExt}`;
      const downloadRes = await FileSystem.downloadAsync(
        `${API_URL}/api/shipments/export?${params.toString()}`,
        fileUri,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      await Sharing.shareAsync(downloadRes.uri);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading || !settings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <MaterialCommunityIcons name="lock" size={64} color="#C7C7CC" />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>You don't have permission to view this screen</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Only allow admin or dispatcher
  if (!['admin', 'dispatcher'].includes(user.role)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <MaterialCommunityIcons name="lock" size={64} color="#C7C7CC" />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>You don't have permission to view this screen</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Shipments" 
        rightIcons={[
          {
            icon: 'download',
            color: '#007AFF',
            onPress: () => Alert.alert(
              'Export Shipments',
              'Choose export format:',
              [
                { text: 'CSV', onPress: () => handleExport('csv') },
                { text: 'PDF', onPress: () => handleExport('pdf') },
                { text: 'Cancel', style: 'cancel' },
              ]
            )
          }
        ]}
      />
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID, client, or location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Header */}
      <View style={styles.tabContainer}>
        {[
          ['CREATED', 'Processing', 'clock-outline'],
          ['IN_TRANSIT', 'In Transit', 'truck-fast'],
          ['DELIVERED', 'Completed', 'check-circle-outline']
        ].map(([status, label, icon]) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.tabButton,
              activeTab === status && styles.tabButtonActive
            ]}
            onPress={() => setActiveTab(status)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name={icon} 
              size={18} 
              color={activeTab === status ? '#007AFF' : '#8E8E93'} 
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === status && styles.tabLabelActive
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ShipmentList
        status={activeTab}
        shipments={shipments}
        onRefresh={fetchAllShipments}
        userToken={userToken}
        fetching={fetching}
        settings={settings}
        searchQuery={searchQuery}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  
  // Loading States
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
  
  // Access Denied
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  
  // Search Container
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 8,
  },
  
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#007AFF',
  },
  tabLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginLeft: 6,
  },
  tabLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  
  // List Styles
  listContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  
  // Shipment Card Styles
  shipmentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
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
  
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  
  // Route Container
  routeContainer: {
    paddingLeft: 8,
  },
  
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  
  locationContent: {
    marginLeft: 12,
    flex: 1,
  },
  
  locationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  
  locationText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 18,
  },
  
  routeLine: {
    width: 1,
    height: 16,
    backgroundColor: '#E1E5E9',
    marginLeft: 6,
    marginBottom: 8,
  },
});