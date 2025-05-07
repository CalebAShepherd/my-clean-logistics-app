// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, Button, Alert, FlatList } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import { createOffer } from '../api/offers';

const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

function RouteDetailScreen({ route }) {
  const { routeId } = route.params;
  const { user, userToken } = useContext(AuthContext);
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [offerSent, setOfferSent] = useState(false);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const res = await fetch(`${API_URL}/routes/${routeId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const data = await res.json();
        setRouteData(data);
      } catch (e) {
        console.error('Error fetching route detail:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchRoute();
  }, [routeId]);

  if (loading || !routeData) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  // Decode polyline to {latitude, longitude} array
  const coords = polyline.decode(routeData.geometry).map(pair => ({ latitude: pair[0], longitude: pair[1] }));
  const initialRegion = {
    ...coords[0],
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <FlatList
      style={styles.container}
      data={routeData.shipments}
      keyExtractor={rs => rs.shipment.id}
      ListHeaderComponent={() => (
        <View>
          <MapView style={styles.map} initialRegion={initialRegion}>
            <Polyline coordinates={coords} strokeWidth={4} strokeColor="blue" />
          </MapView>
          {(user?.role === 'dispatcher' || user?.role === 'admin') && !offerSent && (
            <Button
              title={sendingOffer ? 'Sending Offer...' : 'Send Offer'}
              onPress={async () => {
                setSendingOffer(true);
                try {
                  await createOffer(userToken, routeData.id, routeData.transporter.id);
                  setOfferSent(true);
                  Alert.alert('Success', 'Offer sent to transporter.');
                } catch (e) {
                  console.error(e);
                  Alert.alert('Error', 'Failed to send offer.');
                } finally {
                  setSendingOffer(false);
                }
              }}
              disabled={sendingOffer}
            />
          )}
          {offerSent && <Text style={styles.subtitle}>Offer has been sent.</Text>}
          <Text style={styles.title}>Stops:</Text>
        </View>
      )}
      renderItem={({ item, index }) => {
        const s = item.shipment;
        return (
          <View style={styles.shipmentCard}>
            <Text style={styles.shipmentTitle}>{index + 1}. #{s.id.substring(0,8)}</Text>
            <Text>Origin: {s.origin}</Text>
            <Text>Destination: {s.destination}</Text>
            <Text>Status: {s.status}</Text>
            <Text>Pickup: {s.pickupName} ({s.pickupPhone})</Text>
            <Text>Delivery: {s.deliveryName} ({s.deliveryPhone})</Text>
            <Text>Weight: {s.weight}</Text>
            <Text>Quantity: {s.quantity}</Text>
            {s.description ? <Text>Description: {s.description}</Text> : null}
          </View>
        );
      }}
      ListFooterComponent={() => <View style={{ height: 16 }} />} // padding at bottom
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.5 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { marginTop: 16, fontSize: 16, fontWeight: 'bold', color: 'green', textAlign: 'center' },
  shipmentCard: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 },
  shipmentTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
}); 
// export default withScreenLayout(RouteDetailScreen, { title: 'RouteDetail' });
