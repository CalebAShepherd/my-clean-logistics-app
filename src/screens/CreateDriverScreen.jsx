import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.0.73:3000';

export default function CreateDriverScreen({ route, navigation }) {
  const { userToken } = useContext(AuthContext);
  const { driverId } = route.params || {};
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (driverId) {
      setLoading(true);
      fetch(`${API_URL}/users/${driverId}`, { headers: { Authorization: `Bearer ${userToken}` } })
        .then(res => res.json())
        .then(data => {
          setEmail(data.email);
          setUsername(data.username);
        })
        .catch(e => {
          console.error('fetchDriver error:', e);
          Alert.alert('Error', 'Failed to load driver');
        })
        .finally(() => setLoading(false));
    }
  }, [driverId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = { email, username, role: 'transporter' };
      if (password) payload.password = password;
      const method = driverId ? 'PUT' : 'POST';
      const url = driverId ? `${API_URL}/users/${driverId}` : `${API_URL}/users`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      Alert.alert('Success', `Driver ${driverId ? 'updated' : 'created'}`);
      navigation.goBack();
    } catch (e) {
      console.error('saveDriver error:', e);
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title={driverId ? 'Edit Driver' : 'Add Driver'} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" />
          <Text style={styles.label}>Password {driverId ? '(leave blank to keep)' : ''}</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>Save Driver</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  scroll: { padding: 16 },
  formCard: { backgroundColor: '#fff', borderRadius: 8, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 10, marginTop: 6 },
  button: { backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 6, marginTop: 24, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
}); 