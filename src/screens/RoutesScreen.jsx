// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { listRoutes } from '../api/routes';

function RoutesScreen({ navigation, route }) {
  const { userToken, user } = useContext(AuthContext);
  // For transporters, default to their own routes if no explicit param provided
  let transporterId = route?.params?.transporterId;
  if (!transporterId && user?.role === 'transporter') {
    transporterId = user.id;
  }
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const data = await listRoutes(userToken, transporterId);
        setRoutes(data);
      } catch (e) {
        console.error('Error loading routes:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, [userToken, transporterId]);

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

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
            <Text style={styles.title}>{new Date(item.createdAt).toLocaleString()}</Text>
            <Text style={styles.subtitle}>Transporter: {item.transporter.username}</Text>
            <Text style={styles.subtitle}>Stops: {item.shipments.length}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: { padding: 12, backgroundColor: '#fff', borderRadius: 6, elevation: 2 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#555' },
  separator: { height: 12 },
}); 
// export default withScreenLayout(RoutesScreen, { title: 'Routes' });
export default RoutesScreen;
