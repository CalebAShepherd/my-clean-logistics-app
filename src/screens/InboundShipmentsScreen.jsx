// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, ScrollView, Alert, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { fetchWarehouses } from '../api/warehouses';
import { fetchInventoryItems } from '../api/inventoryItems';
import { logInboundShipment } from '../api/inboundShipments';
import { fetchInboundShipments } from '../api/shipments';
import InternalHeader from '../components/InternalHeader';

function InboundShipmentsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouses, setWarehouses] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState([{ itemId: '', quantity: '' }]);
  const [notes, setNotes] = useState('');
  const [inboundShipments, setInboundShipments] = useState([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('');

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

  // Fetch inbound shipments when warehouseId changes
  useEffect(() => {
    if (!warehouseId) return;
    setLoading(true);
    fetchInboundShipments(userToken, warehouseId, 'IN_TRANSIT')
      .then(setInboundShipments)
      .catch(err => {
        console.error('Error fetching inbound shipments:', err);
        setInboundShipments([]);
      })
      .finally(() => setLoading(false));
  }, [warehouseId]);

  // Auto-fill item/quantity when a shipment is selected
  useEffect(() => {
    if (!selectedShipmentId) return;
    const shipment = inboundShipments.find(s => s.id === selectedShipmentId);
    if (shipment) {
      setLines([{ itemId: shipment.itemId || '', quantity: shipment.quantity?.toString() || '' }]);
    }
  }, [selectedShipmentId]);

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
      await logInboundShipment(userToken, { warehouseId, items, notes });
      Alert.alert('Success', 'Inbound shipment logged');
      navigation.goBack();
    } catch (err) {
      console.error('Error logging inbound:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <InternalHeader navigation={navigation} title="Inbound Shipments" />
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Warehouse</Text>
      <Picker
        selectedValue={warehouseId}
        onValueChange={val => {
          setWarehouseId(val);
          setSelectedShipmentId('');
          setLines([{ itemId: '', quantity: '' }]);
        }}
        style={styles.picker}
      >
        {warehouses.map(w => <Picker.Item key={w.id} label={w.name} value={w.id} />)}
      </Picker>

      <Text style={styles.label}>Inbound Shipments (On the Way)</Text>
      <Picker
        selectedValue={selectedShipmentId}
        onValueChange={val => setSelectedShipmentId(val)}
        style={styles.picker}
      >
        <Picker.Item label="Select inbound shipment (optional)" value="" />
        {inboundShipments.map(s => (
          <Picker.Item key={s.id} label={`Ref: ${s.reference || s.id} | Qty: ${s.quantity}`} value={s.id} />
        ))}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 16,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  label: { 
    fontWeight: 'bold', 
    marginTop: 12,
    fontSize: 24
  },
  section: { 
    fontWeight: 'bold', 
    marginTop: 16, 
    fontSize: 24
  },
  picker: { 
    marginVertical: 8 
  },
  pickerSmall: { 
    flex: 1, 
    marginVertical: 4 
  },
  line: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  inputSmall: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#ccc', 
    marginLeft: 8, 
    padding: 6, 
    borderRadius: 4 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    padding: 8, 
    marginVertical: 8, 
    borderRadius: 4 
  },
}); 
// export default withScreenLayout(InboundShipmentsScreen, { title: 'InboundShipments' });
export default InboundShipmentsScreen;
