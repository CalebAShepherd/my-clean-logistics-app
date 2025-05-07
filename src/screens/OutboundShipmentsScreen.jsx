// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { fetchWarehouses } from '../api/warehouses';
import { fetchInventoryItems } from '../api/inventoryItems';
import { logOutboundShipment } from '../api/outboundShipments';

function OutboundShipmentsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouses, setWarehouses] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState([{ itemId: '', quantity: '' }]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const wh = await fetchWarehouses(userToken);
        setWarehouses(wh);
        const items = await fetchInventoryItems(userToken);
        setInventoryItems(items);
        if (wh.length) setWarehouseId(wh[0].id);
      } catch (err) {
        console.error('Error loading data:', err);
        Alert.alert('Error', 'Failed to load warehouses or items');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addLine = () => setLines([...lines, { itemId: '', quantity: '' }]);
  const updateLine = (index, key, value) => {
    const updated = [...lines];
    updated[index][key] = value;
    setLines(updated);
  };

  const onSubmit = async () => {
    const items = lines.map(l => ({ itemId: l.itemId, quantity: Number(l.quantity) }));
    if (!warehouseId || items.some(i => !i.itemId || !i.quantity)) {
      Alert.alert('Validation', 'Please select warehouse and all item lines');
      return;
    }
    setLoading(true);
    try {
      await logOutboundShipment(userToken, { warehouseId, items, notes });
      Alert.alert('Success', 'Outbound shipment logged');
      navigation.goBack();
    } catch (err) {
      console.error('Error logging outbound:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Warehouse</Text>
      <Picker
        selectedValue={warehouseId}
        onValueChange={setWarehouseId}
        style={styles.picker}
      >
        {warehouses.map(w => <Picker.Item key={w.id} label={w.name} value={w.id} />)}
      </Picker>

      <Text style={styles.section}>Items</Text>
      {lines.map((line, idx) => (
        <View key={idx} style={styles.line}>
          <Picker
            selectedValue={line.itemId}
            onValueChange={val => updateLine(idx, 'itemId', val)}
            style={styles.pickerSmall}
          >
            <Picker.Item label="Select item" value="" />
            {inventoryItems.map(item => (
              <Picker.Item key={item.id} label={item.name} value={item.id} />
            ))}
          </Picker>
          <TextInput
            style={styles.inputSmall}
            keyboardType="numeric"
            placeholder="Qty"
            value={line.quantity.toString()}
            onChangeText={val => updateLine(idx, 'quantity', val)}
          />
        </View>
      ))}
      <Button title="Add Item" onPress={addLine} />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={styles.input}
        placeholder="Optional notes"
        value={notes}
        onChangeText={setNotes}
      />

      <Button title="Submit" onPress={onSubmit} disabled={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: 'bold', marginTop: 12 },
  section: { fontWeight: 'bold', marginTop: 16, fontSize: 16 },
  picker: { marginVertical: 8 },
  pickerSmall: { flex: 1, marginVertical: 4 },
  line: { flexDirection: 'row', alignItems: 'center' },
  inputSmall: { flex: 1, borderWidth: 1, borderColor: '#ccc', marginLeft: 8, padding: 6, borderRadius: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginVertical: 8, borderRadius: 4 },
}); 
// export default withScreenLayout(OutboundShipmentsScreen, { title: 'OutboundShipments' });
