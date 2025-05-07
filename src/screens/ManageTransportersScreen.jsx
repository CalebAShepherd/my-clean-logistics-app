// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Button, Alert, TextInput, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Platform } from 'react-native';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://192.168.0.73:3000';

function ManageTransportersScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editedUsername, setEditedUsername] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTransporters = async () => {
      try {
        const res = await fetch(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const data = await res.json();
        // filter only transporter role
        setTransporters(data.filter(u => u.role === 'transporter'));
      } catch (e) {
        console.error('Error loading transporters:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchTransporters();
  }, [userToken]);

  const handleDelete = async (id) => {
    setActionLoading(true);
    try {
      await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setTransporters(prev => prev.filter(u => u.id !== id));
    } catch (e) {
      console.error('Error deleting transporter:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async (id) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ email: editedEmail, username: editedUsername, phone: editedPhone }),
      });
      const updated = await res.json();
      setTransporters(prev => prev.map(u => u.id === id ? updated : u));
      setEditingId(null);
    } catch (e) {
      console.error('Error updating transporter:', e);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter transporters by search query
  const filteredTransporters = transporters.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.username.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      (item.phone || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Manage Transporters</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name, email, or phone"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <Button
        title="Add Transporter"
        onPress={() => navigation.navigate('Create Transporter')}
      />
      <FlatList
        data={filteredTransporters}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            {editingId === item.id ? (
              <>
                <TextInput
                  style={styles.input}
                  value={editedUsername}
                  onChangeText={setEditedUsername}
                />
                <TextInput
                  style={styles.input}
                  value={editedEmail}
                  onChangeText={setEditedEmail}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone"
                  value={editedPhone}
                  onChangeText={setEditedPhone}
                />
                <View style={styles.buttonRow}>
                  <Button title="Save" onPress={() => handleSave(item.id)} disabled={actionLoading} />
                  <Button title="Cancel" onPress={() => setEditingId(null)} />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.name}>{item.username}</Text>
                <Text style={styles.email}>{item.email}</Text>
                <Text style={styles.phone}>{item.phone || '-'}</Text>
                <View style={styles.buttonRow}>
                  <Button
                    title="Edit"
                    onPress={() => {
                      setEditingId(item.id);
                      setEditedUsername(item.username);
                      setEditedEmail(item.email);
                      setEditedPhone(item.phone || '');
                    }}
                  />
                  <Button
                    title="Delete"
                    color="red"
                    onPress={() =>
                      Alert.alert(
                        'Confirm Delete',
                        `Are you sure you want to delete ${item.username}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item.id) },
                        ]
                      )
                    }
                    disabled={actionLoading}
                  />
                </View>
              </>
            )}
          </View>
        )}
        ListEmptyComponent={<Text>No transporters found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchInput: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12, borderRadius: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  name: { fontSize: 16, fontWeight: 'bold' },
  email: { fontSize: 14, color: '#555' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phone: { fontSize: 14, color: '#555', marginBottom: 8 },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    padding: 10,
  },
  backText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
}); 
// export default withScreenLayout(ManageTransportersScreen, { title: 'ManageTransporters' });
