// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useContext, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { fetchSpaceUsage, fetchWarehouseReports } from '../api/warehouseAnalytics';
import { fetchWarehouses } from '../api/warehouses';
import { fetchInboundShipments } from '../api/shipments';
import { fetchNotifications } from '../api/notifications';
import Constants from 'expo-constants';

function WarehouseAdminDashboardScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
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
    const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
    const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || `http://${localhost}:3000`;
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
        setUnreadCount(data.filter(n => !n.isRead).length);
      } catch (e) {
        console.error('Error loading unread count:', e);
      }
    }
    if (userToken) loadUnread();
  }, [userToken]);

  if (!settings || !settings.hasWarehouses) return null;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Warehouse</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ marginRight: 12 }} onPress={() => navigation.navigate('Notifications')}>
            <View style={{ position: 'relative' }}>
              <MaterialCommunityIcons name="bell-outline" size={26} color="#fff" />
              {unreadCount > 0 && <View style={styles.badge} />}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginRight: 12 }} onPress={() => navigation.navigate('Settings')}>
            <MaterialCommunityIcons name="account-circle" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topCounters}>
          <TouchableOpacity style={styles.counterCard} onPress={() => navigation.navigate('Scheduled Inbound Shipments')}>
            <Text style={styles.counterLabel}>Inbound Shipments</Text>
            {loadingInboundCount ? (
              <ActivityIndicator size="small" color="#333" />
            ) : (
              <Text style={styles.counterNumber}>{inboundCount}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.counterCard} onPress={() => navigation.navigate('Scheduled Outbound Shipments')}>
            <Text style={styles.counterLabel}>Outbound Shipments</Text>
            {loadingOutboundCount ? (
              <ActivityIndicator size="small" color="#333" />
            ) : (
              <Text style={styles.counterNumber}>{outboundCount}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionList}>
          <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Scheduled Inbound Shipments')}>
            <MaterialCommunityIcons name="download-box" size={24} color="#333" />
            <Text style={styles.listText}>Inbound Shipments</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Scheduled Outbound Shipments')}>
            <MaterialCommunityIcons name="upload" size={24} color="#333" />
            <Text style={styles.listText}>Outbound Shipments</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} />
          </TouchableOpacity>
        </View>

        {/* Latest Warehouse Report */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Daily Report</Text>
          {loadingReport ? (
            <ActivityIndicator size="large" color="#333" />
          ) : report ? (
            <>
              <Text style={styles.statNumber}>{report.totalQuantity}</Text>
              <Text style={styles.statSub}>{report.totalSkus} SKUs</Text>
              <Text style={styles.statSub}>{new Date(report.reportDate).toLocaleDateString()}</Text>
            </>
          ) : (
            <Text style={styles.statSub}>No report available</Text>
          )}
        </View>
        {/* Current Inventory */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Inventory</Text>
          {loadingItems ? (
            <ActivityIndicator size="large" color="#333" />
          ) : (
            <Text style={styles.statNumber}>{totalItems ?? '-'}</Text>
          )}
          <Text style={styles.statSub}>Total Items</Text>
        </View>

        <Text style={styles.sectionTitle}>Warehouse Operations</Text>
        <View style={styles.opsGrid}>
          <TouchableOpacity style={styles.opCard} onPress={() => navigation.navigate('Inventory Management')}>
            <MaterialCommunityIcons name="checkbox-multiple-marked-outline" size={28} color="#333" />
            <Text style={styles.opText}>Manage Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.opCard} onPress={() => navigation.navigate('Warehouse3DView')}>
            <MaterialCommunityIcons name="cube-scan" size={28} color="#333" />
            <Text style={styles.opText}>3D Warehouse View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.opCard} onPress={() => navigation.navigate('Warehouse3DHeatmapView')}>
            <MaterialCommunityIcons name="fire" size={28} color="#333" />
            <Text style={styles.opText}>3D Warehouse Heatmap</Text>
          </TouchableOpacity>
          {settings.enableWarehouseHeatmap && (
            <TouchableOpacity style={styles.opCard} onPress={() => navigation.navigate('Locations')}>
              <MaterialCommunityIcons name="map-marker-outline" size={28} color="#333" />
              <Text style={styles.opText}>Locations</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.opCard} onPress={() => navigation.navigate('SKU Attributes')}>
            <MaterialCommunityIcons name="tag-multiple-outline" size={28} color="#333" />
            <Text style={styles.opText}>SKU Attributes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.opCard} onPress={() => navigation.navigate('Transfer Stocks')}>
            <MaterialCommunityIcons name="swap-horizontal" size={28} color="#333" />
            <Text style={styles.opText}>Transfer Stocks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.opCard} onPress={() => navigation.navigate('Log Incident')}>
            <MaterialCommunityIcons name="alert-circle-outline" size={28} color="#333" />
            <Text style={styles.opText}>Log Incident</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.opCard} onPress={() => navigation.navigate('Incident Reports')}>
            <MaterialCommunityIcons name="file-document-outline" size={28} color="#333" />
            <Text style={styles.opText}>Incident Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.analyticsRow} onPress={() => navigation.navigate('Warehouse Analytics')}>
            <MaterialCommunityIcons name="chart-line" size={24} color="#333" />
            <Text style={styles.analyticsText}>Analytics</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#004080', 
    padding: 16,
    borderBottomEndRadius: 16,
    borderBottomStartRadius: 16
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  topCounters: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    marginHorizontal: 16,
  },
  counterCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  counterLabel: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  counterNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statCard: { 
    backgroundColor: '#fff', 
    margin: 16, 
    borderRadius: 8, 
    padding: 16, 
    alignItems: 'center' 
  },
  statLabel: { 
    fontSize: 16, 
    color: '#666' 
  },
  statNumber: { 
    fontSize: 36, 
    fontWeight: 'bold', 
    marginVertical: 8 
  },
  statSub: { 
    fontSize: 14, 
    color: '#999' 
  },
  sectionList: { 
    marginHorizontal: 16 
  },
  listItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    paddingHorizontal: 16
  },
  listText: { 
    fontSize: 16, 
    marginLeft: 8 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginHorizontal: 16, 
    marginTop: 24 
  },
  opsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    margin: 16 
  },
  opCard: { 
    width: '48%', 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: 16, 
    alignItems: 'center', 
    marginBottom: 16 
  },
  opText: { 
    marginTop: 8, 
    fontSize: 14, 
    color: '#333' 
  },
  analyticsRow: { 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#eee' ,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%'
  },
  analyticsText: { 
    fontSize: 16, 
    marginLeft: 8 
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
  },
}); 
// export default withScreenLayout(WarehouseAdminDashboardScreen, { title: 'WarehouseAdminDashboard' });
export default WarehouseAdminDashboardScreen;
