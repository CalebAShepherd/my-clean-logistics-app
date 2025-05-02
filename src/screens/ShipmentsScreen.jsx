import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Platform, Button, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigation } from '@react-navigation/native';


const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://192.168.0.73:3000';

function ShipmentList({ status, shipments, onRefresh, userToken, fetching }) {
  const navigation = useNavigation();
  // Normalize and filter; log each comparison
  const filtered = shipments.filter(s => {
    const itemStatus = s.status.trim().toUpperCase();
    
    return itemStatus === status;
  });

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/shipments/${id}/status`, {
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
          <View style={styles.item}>
            <Text style={styles.title}>Reference No. {item.reference || item.id}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Pickup: {item.origin}</Text>
            <Text>Destination: {item.destination}</Text>
            <Text>Pickup Contact: {item.pickupName} ({item.pickupPhone}, {item.pickupEmail})</Text>
            <Text>Delivery Contact: {item.deliveryName} ({item.deliveryPhone}, {item.deliveryEmail})</Text>
            <Text>Carrier: {item.serviceCarrier?.name || '(unassigned)'}</Text>
            <Text>Tracking #: {item.trackingNumber || '-'}</Text>
            <Text>Weight: {item.weight} lbs</Text>
            <Text>Dimensions: {item.length}×{item.width}×{item.height} ft</Text>
            <Text>Quantity: {item.quantity}</Text>
            <Text>Date: {new Date(item.shipmentDate).toLocaleString()}</Text>
            {item.specialInstructions ? <Text>Notes: {item.specialInstructions}</Text> : null}
            {item.insurance && <Text>Insurance Requested</Text>}
            {(settings.ownTransporters || settings.useThirdPartyCarriers) && (
              <View style={styles.buttonRow}>
                <Button
                  title="Processing"
                  onPress={() => updateStatus(item.id, 'CREATED')}
                />
                <Button
                  title="In Transit"
                  onPress={() => updateStatus(item.id, 'IN_TRANSIT')}
                />
                <Button
                  title="Delivered"
                  onPress={() => updateStatus(item.id, 'DELIVERED')}
                />
              </View>
            )}
            <Button
              title="View Details"
              onPress={() => navigation.navigate('Shipment Details', { id: item.id })}
            />
          </View>
        )}
      />
    </View>
  );
}

export default function ShipmentsScreen() {
  const { userToken, user, loading } = useContext(AuthContext);
  const { settings } = useSettings();
  const [index, setIndex] = useState(0);
  const [shipments, setShipments] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [activeTab, setActiveTab] = useState('CREATED');

  const fetchAllShipments = () => {
    if (!userToken) return;
    setFetching(true);
    fetch(`${API_URL}/shipments`, {
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
    <>
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
      />
    </>
  );
}

const styles = StyleSheet.create({
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
});