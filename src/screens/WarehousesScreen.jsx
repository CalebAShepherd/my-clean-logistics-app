import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import InternalHeader from '../components/InternalHeader';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.0.73:3000';

export default function WarehousesScreen({ navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const { settings } = useSettings();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  // Fetch list
  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/warehouses`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error('Failed to load warehouses');
      const data = await res.json();
      setWarehouses(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (settings?.hasWarehouses) {
      fetchWarehouses();
    }
  }, [settings, userToken]);

  const handleAdd = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Validation', 'Name and address are required');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/warehouses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ name, address }),
      });
      if (!res.ok) throw new Error('Create failed');
      setName('');
      setAddress('');
      fetchWarehouses();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this warehouse?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/warehouses/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${userToken}` },
              });
              if (res.status !== 204) throw new Error('Delete failed');
              fetchWarehouses();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  if (!settings?.hasWarehouses) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Warehouses feature is disabled.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Warehouses" />
      {user.role === 'dev' && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Warehouse Name"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={address}
            onChangeText={setAddress}
          />
          <Button title="Add Warehouse" onPress={handleAdd} />
        </View>
      )}

      <FlatList
        data={warehouses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.address}>{item.address}</Text>
            {user.role === 'dev' && (
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                style={styles.deleteBtn}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8, borderRadius: 4 },
  item: { padding: 12, backgroundColor: '#fff', borderRadius: 6 },
  title: { fontWeight: 'bold', fontSize: 16 },
  address: { marginTop: 4, color: '#555' },
  deleteBtn: { marginTop: 8, alignSelf: 'flex-start' },
  deleteText: { color: 'red' },
  sep: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
});
