import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Static city-to-coords lookup for map
const cityCoords = {
  'Los Angeles, CA': { latitude: 34.0522, longitude: -118.2437 },
  'San Francisco, CA': { latitude: 37.7749, longitude: -122.4194 },
  'Fresno, CA': { latitude: 36.7378, longitude: -119.7871 },
  'Sacramento, CA': { latitude: 38.5816, longitude: -121.4944 },
  'Bakersfield, CA': { latitude: 35.3733, longitude: -119.0187 },
  'Oakland, CA': { latitude: 37.8044, longitude: -122.2711 },
  'Upland, CA': { latitude: 34.0975, longitude: -117.6484 },
  'Rancho Cucamonga, CA': { latitude: 34.1064, longitude: -117.5931 },
  // Add more as needed
};

export default function RouteMap({ shipments }) {
  // Build city labels for each stop
  const stops = shipments.map(rs => {
    const s = rs.Shipment;
    return {
      pickup: `${s.pickupCity}, ${s.pickupState}`,
      dropoff: `${s.deliveryCity}, ${s.deliveryState}`,
    };
  });
  // Map stops to coordinates
  const routePoints = stops.flatMap(stop => {
    const pickupCoords = cityCoords[stop.pickup] || null;
    const dropoffCoords = cityCoords[stop.dropoff] || null;
    return [pickupCoords, dropoffCoords].filter(Boolean);
  });
  // Remove consecutive duplicates
  const uniqueRoutePoints = routePoints.filter((pt, idx, arr) => idx === 0 || !(pt.latitude === arr[idx-1].latitude && pt.longitude === arr[idx-1].longitude));

  if (uniqueRoutePoints.length > 1) {
    return (
      <View style={styles.mapContainer}>
        <MapView
          style={styles.mapInner}
          initialRegion={{
            latitude: uniqueRoutePoints[0].latitude,
            longitude: uniqueRoutePoints[0].longitude,
            latitudeDelta: 2,
            longitudeDelta: 2,
          }}
        >
          <Polyline coordinates={uniqueRoutePoints} strokeWidth={4} strokeColor="#0074D9" />
          {uniqueRoutePoints.map((coord, idx) => (
            <Marker key={idx} coordinate={coord} />
          ))}
        </MapView>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <MaterialCommunityIcons name="map" size={48} color="#0074D9" />
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: Dimensions.get('window').height * 0.3,
    backgroundColor: '#e6f0fa',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  mapInner: {
    flex: 1,
    width: '100%',
  },
}); 