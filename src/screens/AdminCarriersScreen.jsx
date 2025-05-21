import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView } from 'react-native';
import { View, Text, FlatList, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import Constants from 'expo-constants';
import InternalHeader from '../components/InternalHeader';
// Read API URL from expo config or fallback
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.0.73:3000';

export default function AdminCarriersScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiSecret, setNewApiSecret] = useState('');

  const fetchCarriers = async () => {
    console.log('AdminCarriersScreen fetchCarriers:', { API_URL, userToken });
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/carriers`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      console.log('fetch /carriers response status:', res.status);
      const data = await res.json();
      console.log('fetch /carriers data:', data);
      setCarriers(data);
    } catch (e) {
      console.error('fetchCarriers error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCarriers(); }, []);

  const saveApiKey = async (id) => {
    try {
      const res = await fetch(`${API_URL}/carriers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ apiKey, apiSecret: newApiSecret }),
      });
      if (!res.ok) throw new Error('Failed to update');
      Alert.alert('Success', 'API key updated');
      setEditing(null);
      setApiKey('');
      fetchCarriers();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const createCarrier = async () => {
    console.log('createCarrier payload:', { name: newName, code: newCode, apiKey: newApiKey, apiSecret: newApiSecret });
    if (!newName || !newCode) {
      Alert.alert('Error', 'Name and code are required');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/carriers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ name: newName, code: newCode, apiKey: newApiKey, apiSecret: newApiSecret }),
      });
      console.log('createCarrier response status:', res.status);
      if (!res.ok) throw new Error('Failed to create carrier');
      Alert.alert('Success', 'Carrier created');
      setNewName(''); setNewCode(''); setNewApiKey('');
      fetchCarriers();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const deleteCarrier = async (id) => {
    console.log('deleteCarrier id:', id);
    try {
      const res = await fetch(`${API_URL}/carriers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      console.log('deleteCarrier response status:', res.status);
      if (!res.ok) throw new Error('Failed to delete carrier');
      Alert.alert('Success', 'Carrier deleted');
      fetchCarriers();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Admin Carriers" />
      <FlatList
        data={carriers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>{item.name} ({item.code})</Text>
            <Text>API Key: {item.apiKey || '(none)'}</Text>
            {editing === item.id ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="API Key"
                  value={apiKey}
                  onChangeText={setApiKey}
                />
                <TextInput
                  style={styles.input}
                  placeholder="API Secret (optional)"
                  value={newApiSecret}
                  onChangeText={setNewApiSecret}
                />
                <View style={styles.row}>
                  <Button title="Save" onPress={() => saveApiKey(item.id)} />
                  <Button title="Cancel" onPress={() => { setEditing(null); setApiKey(''); }} />
                </View>
              </>
            ) : (
              <Button title="Edit API Key" onPress={() => { setEditing(item.id); setApiKey(item.apiKey || ''); }} />
            )}
            <Button title="Delete" color="red" onPress={() => deleteCarrier(item.id)} />
          </View>
        )}
      />
      <View style={styles.newContainer}>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={newName}
          onChangeText={setNewName}
        />
        <TextInput
          style={styles.input}
          placeholder="Code"
          value={newCode}
          onChangeText={setNewCode}
        />
        <TextInput
          style={styles.input}
          placeholder="API Key (optional)"
          value={newApiKey}
          onChangeText={setNewApiKey}
        />
        <TextInput
          style={styles.input}
          placeholder="API Secret (optional)"
          value={newApiSecret}
          onChangeText={setNewApiSecret}
        />
        <Button title="Create Carrier" onPress={createCarrier} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#ccc' },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginVertical: 8, borderRadius: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  newContainer: {
    marginBottom: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
});