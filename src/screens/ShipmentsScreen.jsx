import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Platform, Alert, TouchableOpacity, SafeAreaView, TextInput } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigation } from '@react-navigation/native';
import InternalHeader from '../components/InternalHeader';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';


const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://192.168.0.73:3000';

function ShipmentList({ status, shipments, onRefresh, userToken, fetching, settings, searchQuery }) {
  const navigation = useNavigation();
  // Map statuses to display labels and colors
  const statusLabelMap = { CREATED: 'Processing', ASSIGNED: 'Assigned', IN_TRANSIT: 'In Transit', OUT_FOR_DEL: 'Out for Delivery', DELIVERED: 'Completed' };
  const badgeColors = { CREATED: '#999', ASSIGNED: '#0074D9', IN_TRANSIT: '#FFA500', OUT_FOR_DEL: '#f39c12', DELIVERED: '#4CAF50' };
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

  if (fetching) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        style={{ flex: 1 }}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        data={filtered}
        keyExtractor={item => item.id}
        ListEmptyComponent={() => (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No shipments</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Shipment Details', { id: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>
                Order ID {item.reference || item.id.substring(0,8)}
              </Text>
              <View style={[styles.badge, { backgroundColor: badgeColors[item.status] || '#999' }]}> 
                <Text style={styles.badgeText}>
                  {statusLabelMap[item.status] || item.status}
                </Text>
              </View>
            </View>
            {/* Company/client name */}
            <Text style={styles.companyName}>{item.client?.username}</Text>
            <View style={styles.addressSection}>
              <Text style={styles.addressLabel}>Pickup</Text>
              <Text style={styles.addressText}>{item.origin}</Text>
              <Text style={styles.addressLabel}>Delivery</Text>
              <Text style={styles.addressText}>{item.destination}</Text>
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
  const [index, setIndex] = useState(0);
  const [shipments, setShipments] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [activeTab, setActiveTab] = useState('CREATED');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAllShipments = () => {
    if (!userToken) return;
    setFetching(true);
    fetch(`${API_URL}/api/shipments`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
      .then(res => res.json())
      .then(data => setShipments(data))
      .catch(console.error)
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    fetchAllShipments();
  }, [userToken]);

  // Refetch all shipments whenever the ShipmentsScreen gains focus
  React.useEffect(() => {
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
    return <ActivityIndicator style={styles.center} size="large" />;
  }
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Access Denied</Text>
      </View>
    );
  }
  // Only allow admin or dispatcher
  if (!['admin', 'dispatcher'].includes(user.role)) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Access Denied</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <InternalHeader navigation={navigation} title="Shipments" />
      <TextInput
        style={styles.searchInput}
        placeholder="Search shipments..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <View style={styles.tabHeader}>
        {[
          ['CREATED', 'Processing'],
          ['IN_TRANSIT', 'In Transit'],
          ['DELIVERED', 'Completed']
        ].map(([status, label]) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.tabButton,
              activeTab === status && styles.tabButtonActive
            ]}
            onPress={() => setActiveTab(status)}
          >
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
      {/* Sticky export button above footer navigation */}
      <TouchableOpacity
        style={styles.stickyExportButton}
        onPress={() => Alert.alert(
          'Export As',
          null,
          [
            { text: 'CSV', onPress: () => handleExport('csv') },
            { text: 'PDF', onPress: () => handleExport('pdf') },
            { text: 'Cancel', style: 'cancel' },
          ]
        )}
      >
        <Text style={styles.stickyExportText}>Export</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stickyExportButton: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  stickyExportText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  searchInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  text: { fontSize: 18 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { padding: 16, textAlign: 'center' },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    marginVertical: 4,
    borderRadius: 6,
  },
  title: { fontWeight: 'bold', marginBottom: 4 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: '0',
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderColor: '#000',
  },
  tabLabel: {
    fontSize: 14,
    color: 'gray',
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  card: {
    padding: 12,
    // borderBottomWidth: 1,
    // borderColor: '#ccc',
    backgroundColor: '#fff',
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  addressSection: {
    marginTop: 8,
  },
  addressLabel: {
    fontWeight: 'bold',
  },
  addressText: {
    marginTop: 4,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 8,
  },
});