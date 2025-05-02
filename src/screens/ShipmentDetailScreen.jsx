import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { ActivityIndicator, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import Constants from 'expo-constants';
import { Picker } from '@react-native-picker/picker';
import { TextInput } from 'react-native';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.0.73:3000';

export default function ShipmentDetailScreen({ route }) {
  // Ensure route params exist
  if (!route || !route.params || !route.params.id) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No shipment selected.</Text>
      </View>
    );
  }
  const { userToken } = useContext(AuthContext);
  const { id } = route.params;

  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [carriers, setCarriers] = useState([]);
  const [selectedCarrier, setSelectedCarrier] = useState(shipment?.serviceCarrier?.id || '');
  const [assigning, setAssigning] = useState(false);
  const [trackingInput, setTrackingInput] = useState(shipment?.trackingNumber || '');

  useEffect(() => {
    const fetchShipment = async () => {
      try {
        setLoading(true);
        console.log('fetchShipment for ID:', id);
        console.log(`Requesting: ${API_URL}/shipments/${id}`);
        const res = await fetch(`${API_URL}/shipments/${id}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        console.log('fetch response status:', res.status);
        if (!res.ok) throw new Error('Failed to load shipment');
        const data = await res.json();
        console.log('fetchShipment received data:', data);
        setShipment(data);
      } catch (e) {
        console.error('fetchShipment error:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchShipment();
  }, [id, userToken]);

  // Load carriers for assignment
  useEffect(() => {
    const loadCarriers = async () => {
      try {
        const res = await fetch(`${API_URL}/carriers`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        if (!res.ok) throw new Error('Failed to load carriers');
        const data = await res.json();
        setCarriers(data);
      } catch (e) {
        console.error('loadCarriers error:', e);
      }
    };
    loadCarriers();
  }, [userToken]);

  const bookShipment = async () => {
    try {
      const res = await fetch(`${API_URL}/shipments/${id}/book`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Booking failed');
      }
      Alert.alert('Success', 'Shipment booked with carrier');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const assignCarrier = async () => {
    try {
      const res = await fetch(`${API_URL}/shipments/${id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          carrierId: selectedCarrier,
          trackingNumber: trackingInput,
        }),
      });
      if (!res.ok) throw new Error('Assignment failed');
      Alert.alert('Success', 'Carrier assigned');
      setAssigning(false);
      // Refresh shipment details
      setShipment(prev => ({ ...prev, serviceCarrier: carriers.find(c => c.id === selectedCarrier), trackingNumber: trackingInput }));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <>
      {loading && <ActivityIndicator style={styles.center} size="large" />}
      {error && (
        <View style={styles.container}>
          <Text style={styles.text}>Error: {error}</Text>
        </View>
      )}
      {!loading && !error && shipment && (
        <View style={styles.screen}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.contentContainer}
          >
            <Text style={styles.title}>Shipment Details</Text>
            <Text>ID: {shipment.id}</Text>
            <Text>Status: {shipment.status}</Text>
            <Text>Origin: {shipment.origin}</Text>
            <Text>Destination: {shipment.destination}</Text>
            <Text>Pickup: {shipment.pickupName} ({shipment.pickupPhone}, {shipment.pickupEmail})</Text>
            <Text>Delivery: {shipment.deliveryName} ({shipment.deliveryPhone}, {shipment.deliveryEmail})</Text>
            <Text>Weight: {shipment.weight} lbs</Text>
            <Text>Dimensions: {shipment.length}×{shipment.width}×{shipment.height} ft</Text>
            <Text>Quantity: {shipment.quantity}</Text>
            <Text>Date: {new Date(shipment.shipmentDate).toLocaleString()}</Text>
            <Text>Description: {shipment.description || '-'}</Text>
            <Text>Reference: {shipment.reference || '-'}</Text>
            {shipment.specialInstructions ? <Text>Notes: {shipment.specialInstructions}</Text> : null}
            <Text>Insurance: {shipment.insurance ? 'Yes' : 'No'}</Text>
            <Text>Carrier: {shipment.serviceCarrier?.name || '(unassigned)'}</Text>
            <Text>Tracking #: {shipment.trackingNumber || '-'}</Text>
            {assigning ? (
              <>
                <Text style={styles.label}>Select Carrier:</Text>
                <Picker
                  selectedValue={selectedCarrier}
                  onValueChange={setSelectedCarrier}
                  style={styles.picker}
                >
                  {carriers.map(c => (
                    <Picker.Item key={c.id} label={`${c.name} (${c.code})`} value={c.id} />
                  ))}
                </Picker>
                <TextInput
                  style={styles.input}
                  placeholder="Tracking Number"
                  value={trackingInput}
                  onChangeText={setTrackingInput}
                />
                <View style={styles.row}>
                  <Button title="Save" onPress={assignCarrier} />
                  <Button title="Cancel" onPress={() => setAssigning(false)} />
                </View>
              </>
            ) : (
              <Button title="Assign Carrier" onPress={() => setAssigning(true)} />
            )}
            { /* Book Shipment button */ }
            <Button
              title="Book Shipment"
              onPress={bookShipment}
              disabled={!shipment.serviceCarrier?.id}
            />
            {!shipment.serviceCarrier?.id && (
              <Text style={styles.error}>Assign a carrier before booking.</Text>
            )}
          </ScrollView>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 80 },
  container: { padding: 16, paddingBottom: 80 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text:      { fontSize: 18 },
  title:     { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  picker:    { width: '100%', marginVertical: 8 },
  input:     { borderWidth: 1, borderColor: '#ccc', padding: 8, marginVertical: 8, borderRadius: 4 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  label:     { marginTop: 16, fontWeight: 'bold' },
  error:     { color: 'red', marginTop: 8 },
});