import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Button, Alert, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import Constants from 'expo-constants';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.0.73:3000';


// Component to render shipments list filtered by status
function ShipmentList({ shipments, status, userToken, onRefresh }) {
  const filtered = shipments.filter(s => s.status === status);
  if (!filtered.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No shipments</Text>
      </View>
    );
  }
  return (
    <FlatList
      data={filtered}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text style={styles.id}>ID: {item.id}</Text>
          <Text>Status: {item.status}</Text>
          <Text>Origin: {item.origin}</Text>
          <Text>Destination: {item.destination}</Text>
          <Text>Pickup: {item.pickupName} ({item.pickupPhone}, {item.pickupEmail})</Text>
          <Text>Delivery: {item.deliveryName} ({item.deliveryPhone}, {item.deliveryEmail})</Text>
          <Text>Shipment Date: {new Date(item.shipmentDate).toLocaleString()}</Text>
          <Text>Description: {item.description || '-'}</Text>
          <Text>Weight: {item.weight} lbs</Text>
          <Text>Dimensions: {item.length}×{item.width}×{item.height} ft</Text>
          <Text>Quantity: {item.quantity}</Text>
          <Text>Reference: {item.reference || '-'}</Text>
          {item.specialInstructions ? <Text>Notes: {item.specialInstructions}</Text> : null}
          <Text>Insurance: {item.insurance ? 'Yes' : 'No'}</Text>
          <Text>Carrier: {item.serviceCarrier?.name || '(unassigned)'}</Text>
          <Text>Tracking #: {item.trackingNumber || '-'}</Text>
          <Text>Created: {new Date(item.createdAt).toLocaleDateString()}</Text>
          <Button
            title="Cancel Shipment"
            color="red"
            onPress={() =>
              Alert.alert(
                'Confirm Cancel',
                'Are you sure you want to cancel this shipment?',
                [
                  { text: 'No', style: 'cancel' },
                  {
                    text: 'Yes',
                    onPress: async () => {
                      try {
                        const res = await fetch(
                          `${API_URL}/shipments/${item.id}/status`,
                          {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${userToken}`,
                            },
                            body: JSON.stringify({ status: 'CANCELLED' }),
                          }
                        );
                        if (!res.ok) throw new Error('Cancel failed');
                        onRefresh();
                      } catch (e) {
                        Alert.alert('Error', e.message);
                      }
                    },
                  },
                ]
              )
            }
          />
        </View>
      )}
    />
  );
}

export default function MyShipmentsScreen() {
  const { userToken, user } = useContext(AuthContext);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('CREATED');

  const fetchMyShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error('Failed to load shipments');
      const data = await res.json();
      const my = data.filter(s => s.clientId === user.id);
      setShipments(my);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyShipments();
  }, [userToken, user]);

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {error}</Text>
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
        shipments={shipments}
        status={activeTab}
        userToken={userToken}
        onRefresh={fetchMyShipments}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18 },
  error: { fontSize: 18, color: 'red' },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    margin: 8,
    borderRadius: 6,
  },
  id: { fontWeight: 'bold' },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderColor: '#ccc',
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
    color: '#555',
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    fontWeight: '600',
    color: '#000',
    textTransform: 'uppercase',
  },
});