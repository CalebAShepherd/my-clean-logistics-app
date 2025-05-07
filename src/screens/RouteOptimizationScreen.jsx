// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Button, ActivityIndicator, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';

const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

function RouteOptimizationScreen({ navigation }) {
  const flatListRef = useRef(null);
  const { userToken } = useContext(AuthContext);
  const [transporters, setTransporters] = useState([]);
  const [searchTransporter, setSearchTransporter] = useState('');
  const [selectedTransporter, setSelectedTransporter] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [searchShipment, setSearchShipment] = useState('');
  const [selectedShipments, setSelectedShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, shipRes] = await Promise.all([
          fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${userToken}` } }),
          fetch(`${API_URL}/shipments`, { headers: { Authorization: `Bearer ${userToken}` } }),
        ]);
        const users = await usersRes.json();
        const ship = await shipRes.json();
        setTransporters(users.filter(u => u.role === 'transporter'));
        setShipments(ship);
      } catch (e) {
        console.error('Error loading data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userToken]);

  const filteredTransporters = transporters.filter(t =>
    t.username.toLowerCase().includes(searchTransporter.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTransporter.toLowerCase())
  );
  const filteredShipments = shipments.filter(s => {
    const q = searchShipment.toLowerCase();
    return (
      s.id.toLowerCase().includes(q) ||
      s.origin.toLowerCase().includes(q) ||
      s.destination.toLowerCase().includes(q)
    );
  });

  const toggleShipment = (id) => {
    setSelectedShipments(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await fetch(`${API_URL}/routes/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ transporterId: selectedTransporter, shipmentIds: selectedShipments }),
      });
      const data = await res.json();
      navigation.navigate('RouteDetail', { routeId: data.id });
    } catch (e) {
      console.error('Optimize error:', e);
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={80}>
      <FlatList
        ref={flatListRef}
        data={filteredShipments}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={() => (
          <View>
            <Text style={styles.instructions}>First, select the transporter. Then, tap on at least two shipments below to choose which stops to optimize. Finally, press "Optimize Route" to view the best order.</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search transporters..."
              value={searchTransporter}
              onChangeText={setSearchTransporter}
            />
            <Text style={styles.label}>Select Transporter</Text>
            <Picker
              selectedValue={selectedTransporter}
              onValueChange={setSelectedTransporter}
              style={styles.picker}
            >
              <Picker.Item label="-- Select transporter --" value={null} />
              {filteredTransporters.map(t => (
                <Picker.Item key={t.id} label={`${t.username} (${t.email})`} value={t.id} />
              ))}
            </Picker>
            {selectedShipments.length > 0 && (
              <FlatList
                horizontal
                data={selectedShipments.map(id => shipments.find(x => x.id === id))}
                showsHorizontalScrollIndicator={false}
                style={styles.selectedContainer}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.selectedPill} onPress={() => toggleShipment(item.id)}>
                    <Text style={styles.pillText}>#{item.id.substring(0,8)}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TextInput
              style={styles.searchInput}
              placeholder="Search shipments..."
              value={searchShipment}
              onChangeText={setSearchShipment}
              onFocus={() => flatListRef.current?.scrollToOffset({ offset: 50, animated: true })}
            />
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, selectedShipments.includes(item.id) && styles.selectedItem]}
            onPress={() => toggleShipment(item.id)}
          >
            <Text>#{item.id.substring(0,8)} - {item.origin} → {item.destination}</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={() => (
          <View style={styles.footerContainer}>
            
            <Button
              title="Optimize Route"
              onPress={handleOptimize}
              disabled={!selectedTransporter || selectedShipments.length < 2 || optimizing}
            />
            {optimizing && <ActivityIndicator style={styles.center} size="small" />}
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  instructions: { fontSize: 14, marginBottom: 16, color: '#555' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 16, marginBottom: 8 },
  picker: { marginBottom: 16 },
  item: { padding: 8, borderWidth: 1, borderColor: '#ccc', marginBottom: 4, borderRadius: 4 },
  selectedItem: { backgroundColor: '#e0f7fa' },
  searchInput: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8, borderRadius: 4 },
  selectedContainer: { flexDirection: 'row', marginBottom: 8 },
  selectedPill: { backgroundColor: '#2196F3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  pillText: { color: '#fff', fontSize: 12 },
  footerContainer: { padding: 16 },
}); 
// export default withScreenLayout(RouteOptimizationScreen, { title: 'RouteOptimization' });
export default RouteOptimizationScreen;
