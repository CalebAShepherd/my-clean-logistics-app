// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useContext, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

import { fetchSpaceUsage, fetchWarehouseReports } from '../api/warehouseAnalytics';
import { 
  hasReceivingOperations, 
  canCreateASNs, 
  hasAppointmentScheduling, 
  hasDockManagement, 
  hasPutAwayOperations, 
  hasReceivingQC, 
  hasCrossDocking, 
  hasAdvancedReceiving,
  hasCycleCounting 
} from '../utils/featureFlags';
import { fetchWarehouses } from '../api/warehouses';
import { fetchInboundShipments } from '../api/shipments';
import { fetchNotifications } from '../api/notifications';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import { getApiUrl } from '../utils/apiHost';

function WarehouseAdminDashboardScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const companySettings = settings;
  const [totalItems, setTotalItems] = useState(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [warehouseId, setWarehouseId] = useState(null);
  const [inboundCount, setInboundCount] = useState(0);
  const [loadingInboundCount, setLoadingInboundCount] = useState(false);
  const [outboundCount, setOutboundCount] = useState(0);
  const [loadingOutboundCount, setLoadingOutboundCount] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [msgUnreadCount, setMsgUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setLoadingItems(true);
    fetchSpaceUsage(userToken)
      .then(data => setTotalItems(data.totalQuantity))
      .catch(err => console.error('Error loading total items:', err))
      .finally(() => setLoadingItems(false));
  }, [userToken]);

  useEffect(() => {
    if (!userToken) return;
    fetchWarehouses(userToken)
      .then(list => { if (list.length) setWarehouseId(list[0].id); })
      .catch(err => console.error('Error loading warehouses:', err));
  }, [userToken]);

  useEffect(() => {
    if (!warehouseId) return;
    setLoadingInboundCount(true);
    fetchInboundShipments(userToken, warehouseId, 'IN_TRANSIT')
      .then(list => setInboundCount(list.length))
      .catch(err => console.error('Error loading inbound count:', err))
      .finally(() => setLoadingInboundCount(false));

    setLoadingOutboundCount(true);
    
    const API_URL = getApiUrl();
    fetch(`${API_URL}/api/shipments`, {
      headers: { Authorization: `Bearer ${userToken}` }
    })
      .then(res => res.json())
      .then(data => setOutboundCount(data.filter(s => s.warehouseId === warehouseId).length))
      .catch(err => console.error('Error loading outbound count:', err))
      .finally(() => setLoadingOutboundCount(false));

    // Fetch latest warehouse report
    setLoadingReport(true);
    fetchWarehouseReports(userToken, warehouseId)
      .then(reports => setReport(reports[0] || null))
      .catch(err => console.error('Error loading warehouse reports:', err))
      .finally(() => setLoadingReport(false));
  }, [warehouseId, userToken]);

  useEffect(() => {
    async function loadUnread() {
      try {
        const data = await fetchNotifications(userToken);
        setUnreadCount(data.filter(n => n.type !== 'message' && !n.isRead).length);
      } catch (e) {
        console.error('Error loading unread count:', e);
      }
    }
    if (userToken) loadUnread();
  }, [userToken]);

  const loadMsgUnread = async () => {
    try {
      const data = await fetchNotifications(userToken);
      setMsgUnreadCount(data.filter(n => n.type === 'message' && !n.isRead).length);
    } catch (err) {
      console.error('Error loading message unread count:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        loadMsgUnread(),
        fetchSpaceUsage(userToken).then(data => setTotalItems(data.totalQuantity)),
        warehouseId ? fetchInboundShipments(userToken, warehouseId, 'IN_TRANSIT').then(list => setInboundCount(list.length)) : Promise.resolve(),
        warehouseId ? fetchWarehouseReports(userToken, warehouseId).then(reports => setReport(reports[0] || null)) : Promise.resolve(),
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setRefreshing(false);
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

  if (!settings || !settings.hasWarehouses) return null;

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
              <Text style={styles.headerSubtitle}>Warehouse Operations</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity 
                style={styles.headerIconButton} 
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="bell-outline" size={20} color="white" />
                {unreadCount > 0 && <View style={styles.badge} />}
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
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statCard} 
            onPress={() => navigation.navigate('Scheduled Inbound Shipments')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="download" size={24} color="#667eea" />
              </View>
              <Text style={styles.statLabel}>Inbound Shipments</Text>
              {loadingInboundCount ? (
                <ActivityIndicator size="small" color="#667eea" />
              ) : (
                <Text style={styles.statNumber}>{inboundCount}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard} 
            onPress={() => navigation.navigate('Scheduled Outbound Shipments')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="upload" size={24} color="#667eea" />
              </View>
              <Text style={styles.statLabel}>Outbound Shipments</Text>
              {loadingOutboundCount ? (
                <ActivityIndicator size="small" color="#667eea" />
              ) : (
                <Text style={styles.statNumber}>{outboundCount}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Report Cards */}
        <View style={styles.reportContainer}>
          <View style={styles.reportCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.reportCardGradient}
            >
              <View style={styles.reportHeader}>
                <MaterialCommunityIcons name="chart-line" size={20} color="#667eea" />
                <Text style={styles.reportTitle}>Daily Report</Text>
              </View>
              {loadingReport ? (
                <ActivityIndicator size="small" color="#667eea" style={{ marginTop: 16 }} />
              ) : report ? (
                <View style={styles.reportContent}>
                  <Text style={styles.reportNumber}>{report.totalQuantity}</Text>
                  <Text style={styles.reportSub}>{report.totalSkus} SKUs</Text>
                  <Text style={styles.reportDate}>{new Date(report.reportDate).toLocaleDateString()}</Text>
                </View>
              ) : (
                <Text style={styles.reportEmpty}>No report available</Text>
              )}
            </LinearGradient>
          </View>

          <View style={styles.reportCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.reportCardGradient}
            >
              <View style={styles.reportHeader}>
                <MaterialCommunityIcons name="package-variant" size={20} color="#667eea" />
                <Text style={styles.reportTitle}>Inventory</Text>
              </View>
              {loadingItems ? (
                <ActivityIndicator size="small" color="#667eea" style={{ marginTop: 16 }} />
              ) : (
                <View style={styles.reportContent}>
                  <Text style={styles.reportNumber}>{totalItems ?? '-'}</Text>
                  <Text style={styles.reportSub}>Total Items</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        </View>

        {/* Operations Section */}
        <View style={styles.operationsHeader}>
          <MaterialCommunityIcons name="warehouse" size={24} color="white" />
          <Text style={styles.operationsTitle}>Warehouse Operations</Text>
        </View>
        
        {/* Core Operations */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Core Operations</Text>
          <TouchableOpacity 
            style={styles.operationCard} 
            onPress={() => navigation.navigate('Inventory Management')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.operationCardGradient}
            >
              <MaterialCommunityIcons name="checkbox-multiple-marked-outline" size={28} color="#667eea" />
              <Text style={styles.operationCardText}>Inventory Management</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.operationCard} 
            onPress={() => navigation.navigate('Transfer Stocks')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.operationCardGradient}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={28} color="#667eea" />
              <Text style={styles.operationCardText}>Stock Transfers</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
            </LinearGradient>
          </TouchableOpacity>

          {hasCycleCounting(companySettings) && (
            <TouchableOpacity 
              style={styles.operationCard} 
              onPress={() => navigation.navigate('CycleCountManagement')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                style={styles.operationCardGradient}
              >
                <MaterialCommunityIcons name="clipboard-check-outline" size={28} color="#667eea" />
                <Text style={styles.operationCardText}>Cycle Counting</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.operationCard} 
            onPress={() => navigation.navigate('SKU Attributes')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.operationCardGradient}
            >
              <MaterialCommunityIcons name="tag-multiple-outline" size={28} color="#667eea" />
              <Text style={styles.operationCardText}>SKU Attributes</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Layout & Visualization */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Layout & Visualization</Text>
          <TouchableOpacity 
            style={styles.operationCard} 
            onPress={() => navigation.navigate('SpaceOptimizationDashboard')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.operationCardGradient}
            >
              <MaterialCommunityIcons name="office-building-cog" size={28} color="#667eea" />
              <Text style={styles.operationCardText}>Space Optimization</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.operationCard} 
            onPress={() => navigation.navigate('Warehouse3DView', { warehouseId })}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.operationCardGradient}
            >
              <MaterialCommunityIcons name="cube-scan" size={28} color="#667eea" />
              <Text style={styles.operationCardText}>3D Warehouse Editor</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.operationCard} 
            onPress={() => navigation.navigate('Warehouse2DBuilder', { warehouseId })}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.operationCardGradient}
            >
              <MaterialCommunityIcons name="floor-plan" size={28} color="#667eea" />
              <Text style={styles.operationCardText}>2D Warehouse Builder</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.operationCard} 
            onPress={() => navigation.navigate('Warehouse3DHeatmapView')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.operationCardGradient}
            >
              <MaterialCommunityIcons name="fire" size={28} color="#667eea" />
              <Text style={styles.operationCardText}>Warehouse Heatmap</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
            </LinearGradient>
          </TouchableOpacity>

          {!settings.enableWarehouseHeatmap && (
            <TouchableOpacity 
              style={styles.operationCard} 
              onPress={() => navigation.navigate('Locations')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                style={styles.operationCardGradient}
              >
                <MaterialCommunityIcons name="map-marker-outline" size={28} color="#667eea" />
                <Text style={styles.operationCardText}>Location Management</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Inbound Operations */}
        {(canCreateASNs(companySettings) || hasReceivingOperations(companySettings) || hasPutAwayOperations(companySettings) || hasDockManagement(companySettings) || hasAppointmentScheduling(companySettings) || hasCrossDocking(companySettings)) && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Inbound Operations</Text>
            {canCreateASNs(companySettings) && (
              <TouchableOpacity 
                style={styles.operationCard} 
                onPress={() => navigation.navigate('ASNManagement')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                  style={styles.operationCardGradient}
                >
                  <MaterialCommunityIcons name="file-document-plus-outline" size={28} color="#667eea" />
                  <Text style={styles.operationCardText}>ASN Management</Text>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {hasReceivingOperations(companySettings) && (
              <TouchableOpacity 
                style={styles.operationCard} 
                onPress={() => navigation.navigate('ReceivingManagement')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                  style={styles.operationCardGradient}
                >
                  <MaterialCommunityIcons name="package-down" size={28} color="#667eea" />
                  <Text style={styles.operationCardText}>Receiving Operations</Text>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {hasPutAwayOperations(companySettings) && (
              <TouchableOpacity 
                style={styles.operationCard} 
                onPress={() => navigation.navigate('PutAwayManagement')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                  style={styles.operationCardGradient}
                >
                  <MaterialCommunityIcons name="package-up" size={28} color="#667eea" />
                  <Text style={styles.operationCardText}>Put-Away Tasks</Text>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {hasDockManagement(companySettings) && (
              <TouchableOpacity 
                style={styles.operationCard} 
                onPress={() => navigation.navigate('DockManagement')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                  style={styles.operationCardGradient}
                >
                  <MaterialCommunityIcons name="truck-delivery-outline" size={28} color="#667eea" />
                  <Text style={styles.operationCardText}>Dock Management</Text>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {hasAppointmentScheduling(companySettings) && (
              <TouchableOpacity 
                style={styles.operationCard} 
                onPress={() => navigation.navigate('AppointmentScheduling')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                  style={styles.operationCardGradient}
                >
                  <MaterialCommunityIcons name="calendar-clock" size={28} color="#667eea" />
                  <Text style={styles.operationCardText}>Appointment Scheduling</Text>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {hasCrossDocking(companySettings) && (
              <TouchableOpacity 
                style={styles.operationCard} 
                onPress={() => navigation.navigate('CrossDockManagement')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                  style={styles.operationCardGradient}
                >
                  <MaterialCommunityIcons name="swap-horizontal-circle-outline" size={28} color="#667eea" />
                  <Text style={styles.operationCardText}>Cross-Docking</Text>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Incident Management */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Incident Management</Text>
          <TouchableOpacity 
            style={styles.operationCard} 
            onPress={() => navigation.navigate('Log Incident')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.operationCardGradient}
            >
              <MaterialCommunityIcons name="alert-circle-outline" size={28} color="#667eea" />
              <Text style={styles.operationCardText}>Log Incident</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.operationCard} 
            onPress={() => navigation.navigate('Incident Reports')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.operationCardGradient}
            >
              <MaterialCommunityIcons name="file-document-outline" size={28} color="#667eea" />
              <Text style={styles.operationCardText}>Incident Reports</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Analytics - Full Width */}
        <TouchableOpacity 
          style={styles.analyticsCard} 
          onPress={() => navigation.navigate('Warehouse Analytics')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
            style={styles.analyticsCardGradient}
          >
            <MaterialCommunityIcons name="chart-line" size={24} color="#667eea" />
            <Text style={styles.analyticsText}>Analytics & Reports</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#667eea" />
          </LinearGradient>
        </TouchableOpacity>
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
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  statCardGradient: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  // Report Cards
  reportContainer: {
    
    marginBottom: 24,
    gap: 16,
  },
  reportCard: {
    flex: 1,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  reportCardGradient: {
    borderRadius: 20,
    padding: 20,
    minHeight: 120,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  reportContent: {
    alignItems: 'center',
  },
  reportNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  reportSub: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  reportDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  reportEmpty: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  // Operations Section
  operationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  operationsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginLeft: 12,
  },
  
  // Section Containers
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 16,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  operationCard: {
    width: '100%',
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    marginBottom: 16,
  },
  operationCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    minHeight: 70,
  },
  operationCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 16,
    flex: 1,
    letterSpacing: 0.3,
  },
  analyticsCard: {
    width: '100%',
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    marginTop: 8,
  },
  analyticsCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 22,
    borderRadius: 20,
    minHeight: 70,
  },
  analyticsText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 12,
    flex: 1,
    letterSpacing: 0.3,
  },
}); 
// export default withScreenLayout(WarehouseAdminDashboardScreen, { title: 'WarehouseAdminDashboard' });
export default WarehouseAdminDashboardScreen;
