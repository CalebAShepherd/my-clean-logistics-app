// import withScreenLayout from '../components/withScreenLayout';
import React, { useState, useContext } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, ActivityIndicator, Text, SafeAreaView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Platform } from 'react-native';
import InternalHeader from '../components/InternalHeader';
import { getApiUrl } from '../utils/apiHost';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : getApiUrl();

function CreateTransporterScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!email || !username || !password) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    setLoading(true);
    try {
      // Create user via signup
      let res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Signup failed');
      }
      const newUser = await res.json();
      // Assign transporter role
      res = await fetch(`${API_URL}/users/${newUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ role: 'transporter' }),
      });
      if (!res.ok) {
        const err2 = await res.text();
        throw new Error(err2 || 'Role assignment failed');
      }
      Alert.alert('Success', 'Transporter created');
      navigation.goBack();
    } catch (e) {
      console.error('Create transporter error:', e);
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Create Transporter" />
      <Text style={styles.title}>Create Transporter</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        autoCapitalize="none"
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        autoCapitalize="none"
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Create" onPress={handleCreate} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 20, marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', marginBottom: 12, padding: 8, borderRadius: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
//export default withScreenLayout(CreateTransporterScreen, { title: 'CreateTransporter' });
export default CreateTransporterScreen;
