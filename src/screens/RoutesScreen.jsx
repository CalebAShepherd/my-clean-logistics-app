// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';
import { listRoutes } from '../api/routes';
import { SafeAreaView } from 'react-native-safe-area-context';

function RoutesScreen({ navigation, route }) {
  const { userToken, user } = useContext(AuthContext);
  // For transporters, default to their own routes if no explicit param provided
  let transporterId = route?.params?.transporterId;
  if (!transporterId && user?.role === 'transporter') {
    transporterId = user.id;
  }
  const [routes, setRoutes] = useState([]);
  // Active tab: 'pending' or 'past'
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const onSelectRoute = route?.params?.onSelectRoute;
  const routeStarted = route?.params?.routeStarted;
  const selectedRouteId = route?.params?.selectedRouteId;

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

  // Filter routes based on active tab
  const filteredRoutes = routes.filter(item =>
    activeTab === 'pending'
      ? item.RouteShipment.some(rs => rs.status === 'PENDING')
      : !item.RouteShipment.some(rs => rs.status === 'PENDING')
  );

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Routes" />
      {/* Tab header for pending and past routes */}
      <View style={styles.tabHeader}>
        {[
          ['pending', 'Pending'],
          ['past', 'Past']
        ].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tabButton, activeTab === key && styles.tabButtonActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[styles.tabLabel, activeTab === key && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filteredRoutes}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isSelected = item.id === selectedRouteId;
          const isStarted = routeStarted && isSelected;
          const label = isStarted ? 'In Progress' : (isSelected ? 'Selected' : 'Select Route');
          // Disable selection if a route has already started or this one is selected
          const disabled = routeStarted || isSelected;
          return (
            <View style={styles.item}>
              <TouchableOpacity
                onPress={() => navigation.navigate('RouteDetail', { routeId: item.id })}
              >
                <Text style={styles.title}>{new Date(item.createdAt).toLocaleString()}</Text>
                <Text style={styles.subtitle}>Transporter: {item.User?.username || 'N/A'}</Text>
                <Text style={styles.subtitle}>Stops: {item.RouteShipment?.length ?? 0}</Text>
              </TouchableOpacity>
              {onSelectRoute ? (
                <TouchableOpacity
                  style={{
                    marginTop: 8,
                    backgroundColor: disabled ? '#ccc' : '#0074D9',
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 18,
                    alignSelf: 'flex-start',
                    opacity: disabled ? 0.6 : 1,
                  }}
                  disabled={disabled}
                  onPress={() => {
                    if (!disabled) {
                      Alert.alert(
                        'Begin this route?',
                        'Are you sure you want to begin this route?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Begin', style: 'default', onPress: () => {
                            onSelectRoute(item.id);
                            navigation.goBack();
                          } }
                        ]
                      );
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{label}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: { padding: 12, backgroundColor: '#fff', borderRadius: 6, elevation: 2, marginHorizontal: 16 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#555' },
  separator: { height: 12 },
  // Tabs styling
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
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
// export default withScreenLayout(RoutesScreen, { title: 'Routes' });
export default RoutesScreen;
