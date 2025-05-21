import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, SafeAreaView, TextInput, TouchableOpacity } from 'react-native';
import { Button, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { Platform } from 'react-native';
import InternalHeader from '../components/InternalHeader';
import { fetchWarehouses } from '../api/warehouses';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://192.168.0.73:3000';

export default function AdminUsersScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouses, setWarehouses] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newRole, setNewRole] = useState('');
  const roles = ['admin', 'client', 'dispatcher', 'carrier', 'warehouse_admin'];
  const [searchQuery, setSearchQuery] = useState('');
  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q)
    );
  });

  // Map role keys to display labels
  const roleLabels = {
    admin: 'Admin',
    client: 'Client',
    dispatcher: 'Dispatcher',
    carrier: 'Transporter',
    warehouse_admin: 'Warehouse Admin',
  };

  useEffect(() => {
    if (!userToken) return;
    fetchWarehouses(userToken)
      .then(data => setWarehouses(data))
      .catch(console.error)
      .finally(() => setLoadingWarehouses(false));
  }, [userToken]);

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

  const changeWarehouse = async (id, warehouseId) => {
    try {
      await fetch(`${API_URL}/users/${id}/warehouse`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ warehouseId })
      });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, warehouseId } : u));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Admin Users" />
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by username, email or role"
      />
      {/* Table header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, { flex: 3 }]}>Username</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>Role</Text>
      </View>
      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <View style={{ flex: 3 }}>
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.role, styles[`role_${item.role}`]]}>
                  {roleLabels[item.role] || item.role}
                </Text>
              </View>
            </View>
            <View style={styles.rowFooter}>
              {editingId === item.id ? (
                <>
                  <Picker
                    selectedValue={newRole}
                    style={styles.pickerInline}
                    onValueChange={value => setNewRole(value)}
                  >
                    {roles.map(r => (
                      <Picker.Item key={r} label={roleLabels[r] || r} value={r} />
                    ))}
                  </Picker>
                  <View style={styles.editButtons}>
                    <TouchableOpacity onPress={() => changeRole(item.id, newRole)}>
                      <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingId(null)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <TouchableOpacity onPress={() => {
                  setEditingId(item.id);
                  setNewRole(item.role);
                }}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
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
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  row: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 16
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  email: {
    fontSize: 14,
    color: '#555',
  },
  role: {
    fontSize: 14,
    fontWeight: '500',
  },
  role_admin: { color: '#007AFF' },
  role_client: { color: 'green' },
  role_dispatcher: { color: 'orange' },
  role_carrier: { color: 'purple' },
  role_warehouse_admin: { color: '#003366' },
  editText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowFooter: {
    marginTop: 8,
    alignItems: 'flex-start',
    width: '100%',
  },
  pickerInline: {
    width: '100%',
    // height: 40,
    alignSelf: 'flex-end',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  saveText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 16,
  },
  cancelText: {
    fontSize: 14,
    color: 'gray',
    fontWeight: '500',
  }
});
