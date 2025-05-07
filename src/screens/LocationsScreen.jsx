// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, Button, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { fetchWarehouses } from '../api/warehouses';
import { fetchLocations } from '../api/locations';

function LocationsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [warehouses, setWarehouses] = useState([]);
  const [currentWarehouse, setCurrentWarehouse] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWarehouses = async () => {
      setLoading(true);
      try {
        const wh = await fetchWarehouses(userToken);
        setWarehouses(wh);
        if (wh.length) setCurrentWarehouse(wh[0].id);
      } catch (err) {
        console.error('Error loading warehouses:', err);
        Alert.alert('Error', 'Failed to load warehouses');
      } finally {
        setLoading(false);
      }
    };
    if (settings?.hasWarehouses) loadWarehouses();
    else setLoading(false);
  }, [userToken, settings]);

  useEffect(() => {
    if (!currentWarehouse) return;
    const loadLocations = async () => {
      setLoading(true);
      try {
        const data = await fetchLocations(userToken, currentWarehouse);
        setLocations(data);
      } catch (err) {
        console.error('Error loading locations:', err);
        Alert.alert('Error', 'Failed to load locations');
      } finally {
        setLoading(false);
      }
    };
    loadLocations();
  }, [userToken, currentWarehouse]);

  if (!settings?.hasWarehouses) {
    return (
      <View style={styles.center}>
        <Text>Warehouse feature is disabled.</Text>
      </View>
    );
  }

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Warehouse</Text>
      <Picker
        selectedValue={currentWarehouse}
        onValueChange={setCurrentWarehouse}
        style={styles.picker}
      >
        {warehouses.map(w => (
          <Picker.Item key={w.id} label={w.name} value={w.id} />
        ))}
      </Picker>
      <Button title="Add Location" onPress={() => navigation.navigate('Create Location')} />
      <FlatList
        data={locations}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('Location Detail', { id: item.id })}>
            <View style={styles.item}>
              <Text>{item.zone} - {item.shelf} - {item.bin}</Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: 'bold', marginBottom: 8 },
  picker: { marginBottom: 16 },
  item: { padding: 12, backgroundColor: '#fff', borderRadius: 6 },
  sep: { height: 1, backgroundColor: '#eee', marginVertical: 4 },
});
//  export default withScreenLayout(LocationsScreen, { title: 'Locations' });
export default LocationsScreen;
