import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TextInput, Button } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import Constants from 'expo-constants';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.0.73:3000';
  

export default function ShipmentTrackingScreen() {
  const { userToken } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trackingInput, setTrackingInput] = useState('');

  console.log(userToken)

  const fetchTracking = async () => {
    try {
      setLoading(true);
      setError(null);
      // Call generic tracking endpoint by tracking number
      const res = await fetch(`${API_URL}/track?trackingNumber=${encodeURIComponent(trackingInput)}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch tracking');
      const data = await res.json();
      setEvents(data.tracking || data.events || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Enter tracking number"
        value={trackingInput}
        onChangeText={setTrackingInput}
      />
      <Button title="Track" onPress={fetchTracking} />
      {loading ? (
        <ActivityIndicator style={styles.center} size="large" />
      ) : error ? (
        <View style={styles.container}>
          <Text style={styles.error}>Error: {error}</Text>
        </View>
      ) : !events.length ? (
        <View style={styles.container}>
          <Text style={styles.text}>No tracking events available.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Tracking Events</Text>
          {events.map((evt, idx) => (
            <View key={idx} style={styles.event}>
              <Text style={styles.eventTime}>{new Date(evt.timestamp).toLocaleString()}</Text>
              <Text style={styles.eventDesc}>{evt.status || evt.description || JSON.stringify(evt)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  event: { marginBottom: 12, borderBottomWidth: 1, borderColor: '#ccc', paddingBottom: 8 },
  eventTime: { fontSize: 14, color: '#555' },
  eventDesc: { fontSize: 16 },
  text: { fontSize: 18 },
  error: { fontSize: 18, color: 'red' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginVertical: 8, borderRadius: 4 },
});