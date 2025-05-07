// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useContext, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { fetchSpaceUsage } from '../api/warehouseAnalytics';

function WarehouseAdminDashboardScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [totalItems, setTotalItems] = useState(null);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    setLoadingItems(true);
    fetchSpaceUsage(userToken)
      .then(data => setTotalItems(data.totalQuantity))
      .catch(err => console.error('Error loading total items:', err))
      .finally(() => setLoadingItems(false));
  }, [userToken]);

  if (!settings || !settings.hasWarehouses) return null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Warehouse</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <MaterialCommunityIcons name="account-circle" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Inventory</Text>
        {loadingItems ? (
          <ActivityIndicator size="large" color="#333" />
        ) : (
          <Text style={styles.statNumber}>{totalItems ?? '-'}</Text>
        )}
        <Text style={styles.statSub}>Total Items</Text>
      </View>

      <View style={styles.sectionList}>
        <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Inbound Shipments')}>
          <MaterialCommunityIcons name="download-box" size={24} color="#333" />
          <Text style={styles.listText}>Inbound Shipments</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Outbound Shipments')}>
          <MaterialCommunityIcons name="upload" size={24} color="#333" />
          <Text style={styles.listText}>Outbound Shipments</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Warehouse Operations</Text>
      <View style={styles.opsGrid}>
        <TouchableOpacity style={styles.opCard} onPress={() => navigation.navigate('Inventory Management')}>
          <MaterialCommunityIcons name="checkbox-multiple-marked-outline" size={28} color="#333" />
          <Text style={styles.opText}>Manage Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.opCard} onPress={() => navigation.navigate('Locations')}>
          <MaterialCommunityIcons name="map-marker-outline" size={28} color="#333" />
          <Text style={styles.opText}>Locations</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.opCard} onPress={() => navigation.navigate('Transfer Orders')}>
          <MaterialCommunityIcons name="swap-horizontal" size={28} color="#333" />
          <Text style={styles.opText}>Transfer Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.opCard} onPress={() => navigation.navigate('Cycle Counts')}>
          <MaterialCommunityIcons name="file-document-outline" size={28} color="#333" />
          <Text style={styles.opText}>Cycle Counts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.analyticsRow} onPress={() => navigation.navigate('Warehouse Analytics')}>
          <MaterialCommunityIcons name="chart-line" size={24} color="#333" />
          <Text style={styles.analyticsText}>Analytics</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} />
        </TouchableOpacity>
      </View>

      
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
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
}); 
// export default withScreenLayout(WarehouseAdminDashboardScreen, { title: 'WarehouseAdminDashboard' });
