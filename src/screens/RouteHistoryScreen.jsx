//import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';

const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

function RouteHistoryScreen({ navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const url = user.role === 'transporter'
          ? `${API_URL}/routes?transporterId=${user.id}`
          : `${API_URL}/routes`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${userToken}` } });
        const data = await res.json();
        setRoutes(data);
      } catch (e) {
        console.error('Error loading routes:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, [userToken]);

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={routes}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('RouteDetail', { routeId: item.id })}
          >
            <Text style={styles.title}>Route on {new Date(item.createdAt).toLocaleString()}</Text>
            <Text>Stops: {item.shipments.length}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>No routes found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#ccc' },
  title: { fontWeight: 'bold', marginBottom: 4 },
}); 
//  export default withScreenLayout(RouteHistoryScreen, { title: 'RouteHistory' });
