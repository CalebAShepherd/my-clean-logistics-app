import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { getCurrentUser } from '../api/users';
import { fetchWarehouseItems } from '../api/warehouseItems';
import { createDamageReport } from '../api/damageReports';
import InternalHeader from '../components/InternalHeader';

// Button
const CustomButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

// Incident types
const incidentTypes = [ { label: 'Damage', value: 'DAMAGE' }, { label: 'Loss', value: 'LOSS' } ];

function CreateDamageReportScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouseId, setWarehouseId] = useState(null);
  const [items, setItems] = useState([]);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState('DAMAGE');
  const [reasonCode, setReasonCode] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser(userToken);
        if (user.warehouseId) {
          setWarehouseId(user.warehouseId);
          const data = await fetchWarehouseItems(userToken, { warehouseId: user.warehouseId });
          setItems(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.cancelled) {
      setPhotos([...photos, result]);
    }
  };

  const onSubmit = async () => {
    if (!itemId || !quantity) {
      Alert.alert('Validation error', 'Item and quantity are required');
      return;
    }
    setLoading(true);
    try {
      await createDamageReport(userToken, { warehouseId, itemId, quantity: parseInt(quantity, 10), description, type, reasonCode }, photos);
      Alert.alert('Logged', 'Incident recorded successfully');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Log Incident" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Item</Text>
          <Picker selectedValue={itemId} onValueChange={setItemId} style={styles.picker}>
            <Picker.Item label="Select item" value="" />
            {items.map(i => <Picker.Item key={i.itemId} label={i.InventoryItem.name} value={i.itemId} />)}
          </Picker>

          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="e.g. 2" />

          <Text style={styles.fieldLabel}>Type</Text>
          <Picker selectedValue={type} onValueChange={setType} style={styles.picker}>
            {incidentTypes.map(t => <Picker.Item key={t.value} label={t.label} value={t.value} />)}
          </Picker>

          <Text style={styles.fieldLabel}>Reason Code</Text>
          <TextInput style={styles.input} value={reasonCode} onChangeText={setReasonCode} placeholder="e.g. Broken seal" />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput style={[styles.input, { height: 80 }]} value={description} onChangeText={setDescription} multiline placeholder="Optional details" />

          <Text style={styles.fieldLabel}>Photos</Text>
          <View style={styles.photoRow}>
            {photos.map((p, idx) => (
              <Image key={idx} source={{ uri: p.uri }} style={styles.photoThumb} />
            ))}
            <TouchableOpacity style={styles.photoAdd} onPress={pickImage}>
              <Text style={styles.photoAddText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          <CustomButton title="Submit Incident" onPress={onSubmit} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  content: { padding: 16 },
  formCard: { backgroundColor: '#fff', borderRadius: 8, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3, marginBottom: 16 },
  fieldLabel: { marginTop: 12, fontSize: 14, color: '#444', fontWeight: '600' },
  picker: { marginTop: 8, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 12, marginTop: 8, backgroundColor: '#fafafa' },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  photoThumb: { width: 60, height: 60, borderRadius: 4, marginRight: 8 },
  photoAdd: { width: 60, height: 60, borderRadius: 4, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  photoAddText: { fontSize: 24, color: '#888' },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 6, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default CreateDamageReportScreen; 