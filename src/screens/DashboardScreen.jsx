import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Constants from 'expo-constants';
import { fetchNotifications } from '../api/notifications';
import { useFocusEffect } from '@react-navigation/native';

// Base API URL for data fetches
const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

export default function DashboardScreen({ navigation }) {
  const { user, userToken } = useContext(AuthContext);
  const [activeCount, setActiveCount] = useState(0);
  const [loadingActive, setLoadingActive] = useState(false);
  const role = user?.role;
  const { settings } = useSettings();
  const [recentShipments, setRecentShipments] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [msgUnreadCount, setMsgUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Status mapping for professional display
  const statusColors = {
    CREATED: '#FF9500',
    IN_TRANSIT: '#007AFF',
    DELIVERED: '#34C759',
    CANCELLED: '#FF3B30'
  };

  const statusLabelMap = {
    CREATED: 'Created',
    IN_TRANSIT: 'In Transit',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled'
  };

  const loadDashboardData = async () => {
    if (!userToken || !user.id) return;

    try {
      const response = await fetch(`${API_URL}/api/shipments`, { 
        headers: { Authorization: `Bearer ${userToken}` } 
      });
      
      if (!response.ok) throw new Error('Failed to fetch shipments');
      
      const data = await response.json();
      const myShipments = data.filter(s => s.clientId === user.id);
      
      // Update active count
      const activeShipments = myShipments.filter(s => ['CREATED','IN_TRANSIT'].includes(s.status));
      setActiveCount(activeShipments.length);
      
      // Update recent shipments
      myShipments.sort((a, b) => new Date(b.createdAt || b.shipmentDate) - new Date(a.createdAt || a.shipmentDate));
      setRecentShipments(myShipments.slice(0, 4));
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useEffect(() => {
    if (userToken && user.id) {
      setLoadingRecent(true);
      setLoadingActive(true);
      loadDashboardData().finally(() => {
        setLoadingRecent(false);
        setLoadingActive(false);
      });
    }
  }, [userToken, user.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboardData(),
      loadMsgUnread()
    ]);
    setRefreshing(false);
  };

  const loadMsgUnread = async () => {
    try {
      const data = await fetchNotifications(userToken);
      setMsgUnreadCount(data.filter(n => n.type === 'message' && !n.isRead).length);
    } catch (err) {
      console.error('Error loading message unread count:', err);
    }
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

  if (!settings) {
    return null;
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
          {/* Stats Card */}
          <View style={styles.statsCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
              style={styles.statsCardGradient}
            >
              <View style={styles.statsContent}>
                <View style={styles.statsIconContainer}>
                  <MaterialCommunityIcons name="truck-fast" size={32} color="#667eea" />
                </View>
                <View style={styles.statsTextContainer}>
                  <Text style={styles.statsLabel}>Active Orders</Text>
                  {loadingActive ? (
                    <ActivityIndicator size="small" color="#667eea" />
                  ) : (
                    <Text style={styles.statsNumber}>{activeCount}</Text>
                  )}
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              {['client','admin','dispatcher'].includes(role) && (
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('Create Shipment')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                    style={styles.actionCardGradient}
                  >
                    <MaterialCommunityIcons name="plus-circle" size={32} color="#34C759" />
                    <Text style={styles.actionCardText}>Create{'\n'}Shipment</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {role === 'client' && (
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('My Shipments')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                    style={styles.actionCardGradient}
                  >
                    <MaterialCommunityIcons name="format-list-bulleted" size={32} color="#007AFF" />
                    <Text style={styles.actionCardText}>My{'\n'}Shipments</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {['client','admin','dispatcher'].includes(role) && (
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('Track Shipment')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                    style={styles.actionCardGradient}
                  >
                    <MaterialCommunityIcons name="map-marker-path" size={32} color="#FF9500" />
                    <Text style={styles.actionCardText}>Track{'\n'}Shipment</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Recent Shipments */}
          <View style={styles.recentShipmentsContainer}>
            <Text style={styles.sectionTitle}>Recent Shipments</Text>
            <View style={styles.shipmentsCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                style={styles.shipmentsCardGradient}
              >
                {loadingRecent ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#667eea" />
                    <Text style={styles.loadingText}>Loading shipments...</Text>
                  </View>
                ) : recentShipments.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="package-variant" size={48} color="#8E8E93" />
                    <Text style={styles.emptyText}>No shipments yet</Text>
                    <Text style={styles.emptySubtext}>Create your first shipment to get started</Text>
                  </View>
                ) : (
                  recentShipments.map((shipment, index) => (
                    <TouchableOpacity 
                      key={shipment.id} 
                      style={[styles.shipmentRow, index === recentShipments.length - 1 && styles.lastShipmentRow]}
                      onPress={() => navigation.navigate('Shipment Details', { id: shipment.id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.shipmentInfo}>
                        <Text style={styles.shipmentId}>#{shipment.id}</Text>
                        <Text style={styles.shipmentRoute}>
                          {shipment.pickupCity} → {shipment.deliveryCity}
                        </Text>
                      </View>
                      <View style={styles.shipmentStatus}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColors[shipment.status] || '#8E8E93' }]}>
                          <Text style={styles.statusText}>{statusLabelMap[shipment.status] || shipment.status}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#8E8E93" />
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </LinearGradient>
            </View>
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

  // Stats Card Styles
  statsCard: {
    marginBottom: 24,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  statsCardGradient: {
    borderRadius: 20,
    padding: 24,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  statsTextContainer: {
    flex: 1,
  },
  statsLabel: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 4,
  },
  statsNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1C1C1E',
  },

  // Quick Actions Styles
  quickActionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionCard: {
    width: '30%',
    marginBottom: 12,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  actionCardGradient: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  actionCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },

  // Recent Shipments Styles
  recentShipmentsContainer: {
    marginBottom: 24,
  },
  shipmentsCard: {
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  shipmentsCardGradient: {
    borderRadius: 20,
    padding: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  shipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(142, 142, 147, 0.2)',
  },
  lastShipmentRow: {
    borderBottomWidth: 0,
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
  shipmentRoute: {
    fontSize: 14,
    color: '#8E8E93',
  },
  shipmentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
});
