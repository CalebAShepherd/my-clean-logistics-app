import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Button, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { Platform } from 'react-native';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://192.168.0.73:3000';

export default function AdminUsersScreen() {
  const { userToken } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newRole, setNewRole] = useState('');

  const roles = ['admin', 'client', 'dispatcher', 'carrier', 'warehouse_admin'];

  useEffect(() => {
    fetch(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const deleteUser = async (id) => {
    try {
      await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const changeRole = async (id, role) => {
    try {
      await fetch(`${API_URL}/users/${id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ role }),
      });
      setUsers(prev =>
        prev.map(u => (u.id === id ? { ...u, role } : u))
      );
      setEditingId(null);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.text}>
              {item.username} ({item.email})
            </Text>
            {editingId !== item.id ? (
              <Button title="Edit" onPress={() => {
                setEditingId(item.id);
                setNewRole(item.role);
              }} />
            ) : (
              <>
                <Picker
                  selectedValue={newRole}
                  style={styles.picker}
                  onValueChange={value => setNewRole(value)}
                >
                  {roles.map(r => (
                    <Picker.Item key={r} label={r} value={r} />
                  ))}
                </Picker>
                <View style={styles.buttonRow}>
                  <Button title="Save" onPress={() => changeRole(item.id, newRole)} />
                  <Button
                    style={styles.deleteButton}
                    title="Delete"
                    color="red"
                    onPress={() =>
                      Alert.alert(
                        'Confirm Delete',
                        `Remove user ${item.username}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteUser(item.id) }
                        ]
                      )
                    }
                  />
                  <Button title="Cancel" onPress={() => setEditingId(null)} />
                </View>
              </>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16 
},
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
},
  item: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  text: { 
    fontSize: 16, 
    marginBottom: 8 
},
  picker: { 
    // height: 40, 
},
  buttonRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginVertical: 8 
},
  deleteButton: { 
    // marginTop: 8 
},
});
