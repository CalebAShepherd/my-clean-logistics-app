// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { fetchWarehouses } from '../api/warehouses';
import { createLocation } from '../api/locations';

function CreateLocationScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [zone, setZone] = useState('');
  const [shelf, setShelf] = useState('');
  const [bin, setBin] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const wh = await fetchWarehouses(userToken);
        setWarehouses(wh);
        if (wh.length) setWarehouseId(wh[0].id);
      } catch (err) {
        console.error('Error loading warehouses:', err);
        Alert.alert('Error', 'Failed to load warehouses');
      } finally {
        setLoading(false);
      }
    };
    loadWarehouses();
  }, [userToken]);

  const onSave = async () => {
    if (!warehouseId || !zone.trim() || !shelf.trim() || !bin.trim()) {
      Alert.alert('Validation', 'All fields are required');
      return;
    }
    try {
      await createLocation(userToken, { warehouseId, zone, shelf, bin });
      Alert.alert('Success', 'Location created');
      navigation.goBack();
    } catch (err) {
      console.error('Create location error:', err);
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Warehouse</Text>
      <Picker
        selectedValue={warehouseId}
        onValueChange={setWarehouseId}
        style={styles.picker}
      >
        {warehouses.map((w) => (
          <Picker.Item key={w.id} label={w.name} value={w.id} />
        ))}
      </Picker>
      <Text style={styles.label}>Zone</Text>
      <TextInput style={styles.input} value={zone} onChangeText={setZone} />
      <Text style={styles.label}>Shelf</Text>
      <TextInput style={styles.input} value={shelf} onChangeText={setShelf} />
      <Text style={styles.label}>Bin</Text>
      <TextInput style={styles.input} value={bin} onChangeText={setBin} />
      <Button title="Save" onPress={onSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: 'bold', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 4, marginTop: 4 },
  picker: { marginVertical: 8 },
}); 
// export default withScreenLayout(CreateLocationScreen, { title: 'CreateLocation' });
export default CreateLocationScreen;
