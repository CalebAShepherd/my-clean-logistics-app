// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { Platform } from 'react-native';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://192.168.0.73:3000';

function AssignTransportersScreen() {
  const { userToken } = useContext(AuthContext);
  const [shipments, setShipments] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('unassigned');
  const [selectedTransporters, setSelectedTransporters] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shipRes, userRes] = await Promise.all([
          fetch(`${API_URL}/shipments`, { headers: { Authorization: `Bearer ${userToken}` } }),
          fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${userToken}` } }),
        ]);
        const shipmentsData = await shipRes.json();
        setShipments(shipmentsData);
        const usersData = await userRes.json();
        setTransporters(usersData.filter(u => u.role === 'transporter'));
      } catch (e) {
        console.error('Error loading data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userToken]);

  const unassignedShipments = shipments.filter(s => !s.transporter);
  const assignedShipments = shipments.filter(s => s.transporter);

  const assign = async (shipmentId, transporterId) => {
    try {
      const res = await fetch(`${API_URL}/shipments/${shipmentId}/assign-transporter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ transporterId }),
      });
      if (!res.ok) throw new Error('Failed to assign');
      const updated = await res.json();
      setShipments(prev => prev.map(s => s.id === shipmentId ? updated : s));
    } catch (e) {
      console.error('Assign error:', e);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'unassigned' && styles.activeTab]}
          onPress={() => setSelectedTab('unassigned')}
        >
          <Text style={styles.tabText}>Unassigned</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'assigned' && styles.activeTab]}
          onPress={() => setSelectedTab('assigned')}
        >
          <Text style={styles.tabText}>Assigned</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={selectedTab === 'unassigned' ? unassignedShipments : assignedShipments}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>Shipment: {item.id.substring(0, 8)}</Text>
            <Text>From: {item.origin}</Text>
            <Text>To: {item.destination}</Text>
            <Text>Status: {item.status}</Text>
            {selectedTab === 'unassigned' ? (
              <>
                <Picker
                  selectedValue={selectedTransporters[item.id] || null}
                  onValueChange={val => setSelectedTransporters(prev => ({ ...prev, [item.id]: val }))}
                  style={styles.picker}
                >
                  <Picker.Item label="Select transporter..." value={null} />
                  {transporters.map(t => (
                    <Picker.Item
                      key={t.id}
                      label={`${t.username} (${t.email})`}
                      value={t.id}
                    />
                  ))}
                </Picker>
                <Button
                  title="Assign"
                  onPress={() => assign(item.id, selectedTransporters[item.id])}
                  disabled={!selectedTransporters[item.id]}
                />
              </>
            ) : (
              <Button
                title="Unassign"
                onPress={() => assign(item.id, null)}
              />
            )}
          </View>
        )}
        ListEmptyComponent={<Text>No shipments to display.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  tabContainer: { flexDirection: 'row', marginBottom: 12 },
  tab: { flex: 1, padding: 8, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderColor: '#000' },
  tabText: { fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
  },
  title: { fontWeight: 'bold', marginBottom: 4 },
  picker: { marginTop: 8, marginBottom: 8 },
}); 
// export default withScreenLayout(AssignTransportersScreen, { title: 'AssignTransporters' });
