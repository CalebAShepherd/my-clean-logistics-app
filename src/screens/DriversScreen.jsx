import React, { useEffect, useState, useContext } from 'react';
import { SafeAreaView, View, Text, FlatList, Button, ActivityIndicator, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.0.73:3000';

export default function DriversScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${userToken}` } });
      const data = await res.json();
      setDrivers(data.filter(u => u.role === 'transporter'));
    } catch (e) {
      console.error('fetchDrivers error:', e);
      Alert.alert('Error', 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const deleteDriver = async (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this driver?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/users/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${userToken}` },
            });
            if (!res.ok) throw new Error('Failed to delete');
            setDrivers(prev => prev.filter(d => d.id !== id));
          } catch (e) {
            console.error('deleteDriver error:', e);
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Drivers" />
      <View style={styles.newButtonContainer}>
        <TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate('Create Driver')}>
          <Text style={styles.newButtonText}>+ Add Driver</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={drivers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.username}</Text>
              <Text style={styles.cardSubtitle}>{item.email}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('Create Driver', { driverId: item.id })}>
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteDriver(item.id)}>
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  newButtonContainer: { padding: 16, alignItems: 'flex-end' },
  newButton: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  newButtonText: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardContent: { marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  editButton: { marginRight: 12, backgroundColor: '#007AFF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
  deleteButton: { backgroundColor: '#FF3B30', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
  actionText: { color: '#fff', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
}); 