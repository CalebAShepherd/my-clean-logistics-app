import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform, ScrollView, Switch, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native';
import InternalHeader from '../components/InternalHeader';
import { useSettings } from '../context/SettingsContext';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://192.168.0.73:3000';

export default function CreateShipmentScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');

  const [pickupName, setPickupName] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [pickupEmail, setPickupEmail] = useState('');
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [dateTime, setDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [palletCount, setPalletCount] = useState('');
  const [lengthFt, setLengthFt] = useState('');
  const [widthFt, setWidthFt] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [insurance, setInsurance] = useState(false);
  const [hazmat, setHazmat] = useState(false);
  const [reference, setReference] = useState('');

  const [pickupStreet, setPickupStreet] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupState, setPickupState] = useState('');
  const [pickupZip, setPickupZip] = useState('');
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');
  const [deliveryZip, setDeliveryZip] = useState('');

  const onChangeDateTime = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateTime(selectedDate);
    }
  };

  const validateAddresses = async () => {
    if (!settings.googleApiKey) throw new Error('Google API Key not configured');
    const geocode = async (address) => {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${settings.googleApiKey}`
      );
      const data = await res.json();
      if (data.status !== 'OK' || !data.results.length) {
        throw new Error(`Invalid address: ${address}`);
      }
      return data.results[0];
    };
    await geocode(`${pickupStreet}, ${pickupCity}, ${pickupState} ${pickupZip}`);
    await geocode(`${deliveryStreet}, ${deliveryCity}, ${deliveryState} ${deliveryZip}`);
  };

  const handleSubmit = async () => {
    if (settings.enableAddressValidation) {
      try {
        await validateAddresses();
      } catch (e) {
        Alert.alert('Address Validation Error', e.message);
        return;
      }
    }
    // Validate required fields
    const requiredFields = [
      [pickupStreet, 'Pickup Street'],
      [pickupCity, 'Pickup City'],
      [pickupState, 'Pickup State'],
      [pickupZip, 'Pickup Zip'],
      [deliveryStreet, 'Delivery Street'],
      [deliveryCity, 'Delivery City'],
      [deliveryState, 'Delivery State'],
      [deliveryZip, 'Delivery Zip'],
      [weight, 'Weight'],
      [pickupName, 'Pickup Name'],
      [pickupPhone, 'Pickup Phone'],
      [pickupEmail, 'Pickup Email'],
      [deliveryName, 'Delivery Name'],
      [deliveryPhone, 'Delivery Phone'],
      [deliveryEmail, 'Delivery Email'],
      [quantity, 'Quantity'],
      [palletCount, 'Pallet Count'],
      [lengthFt, 'Length'],
      [widthFt, 'Width'],
      [heightFt, 'Height'],
    ];
    for (let [value, label] of requiredFields) {
      if (!value || (typeof value === 'string' && !value.trim())) {
        Alert.alert('Error', `${label} is required.`);
        return;
      }
    }
    try {
      const res = await fetch(`${API_URL}/api/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          description,
          weight: parseFloat(weight),
          hazmat,
          pickup: { name: pickupName, phone: pickupPhone, email: pickupEmail },
          delivery: { name: deliveryName, phone: deliveryPhone, email: deliveryEmail },
          shipmentDate: settings.enablePickups ? dateTime.toISOString() : new Date().toISOString(),
          dimensions: {
            length: parseFloat(lengthFt),
            width: parseFloat(widthFt),
            height: parseFloat(heightFt),
          },
          palletCount: parseInt(palletCount, 10),
          quantity: parseInt(quantity, 10),
          specialInstructions,
          insurance,
          reference,
          pickupStreet,
          pickupCity,
          pickupState,
          pickupZip,
          deliveryStreet,
          deliveryCity,
          deliveryState,
          deliveryZip,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to create shipment');
      }
      Alert.alert('Success', 'Shipment request submitted for approval.');
      setDescription('');
      setWeight('');
      setPickupName('');
      setPickupPhone('');
      setPickupEmail('');
      setDeliveryName('');
      setDeliveryPhone('');
      setDeliveryEmail('');
      setDateTime(new Date());
      setQuantity('');
      setPalletCount('');
      setLengthFt('');
      setWidthFt('');
      setHeightFt('');
      setSpecialInstructions('');
      setInsurance(false);
      setHazmat(false);
      setReference('');
      setPickupStreet('');
      setPickupCity('');
      setPickupState('');
      setPickupZip('');
      setDeliveryStreet('');
      setDeliveryCity('');
      setDeliveryState('');
      setDeliveryZip('');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <InternalHeader navigation={navigation} title="New Shipment Request" />
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>New Shipment Request</Text>
      <Text style={styles.label}>Pickup Address</Text>
      <TextInput style={styles.input} placeholder="Pickup Street *" value={pickupStreet} onChangeText={setPickupStreet} />
      <TextInput style={styles.input} placeholder="Pickup City *" value={pickupCity} onChangeText={setPickupCity} />
      <TextInput style={styles.input} placeholder="Pickup State *" value={pickupState} onChangeText={setPickupState} />
      <TextInput style={styles.input} placeholder="Pickup Zip *" value={pickupZip} onChangeText={setPickupZip} keyboardType="numeric" />
      <Text style={styles.label}>Delivery Address</Text>
      <TextInput style={styles.input} placeholder="Delivery Street *" value={deliveryStreet} onChangeText={setDeliveryStreet} />
      <TextInput style={styles.input} placeholder="Delivery City *" value={deliveryCity} onChangeText={setDeliveryCity} />
      <TextInput style={styles.input} placeholder="Delivery State *" value={deliveryState} onChangeText={setDeliveryState} />
      <TextInput style={styles.input} placeholder="Delivery Zip *" value={deliveryZip} onChangeText={setDeliveryZip} keyboardType="numeric" />
      <TextInput
        style={styles.input}
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
      />
      <TextInput
        style={styles.input}
        placeholder="Weight (lbs) *"
        value={weight}
        onChangeText={setWeight}
        keyboardType="numeric"
      />
      <Text style={styles.label}>Pickup Contact</Text>
      <TextInput
        style={styles.input}
        placeholder="Pickup Name *"
        value={pickupName}
        onChangeText={setPickupName}
      />
      <TextInput
        style={styles.input}
        placeholder="Pickup Phone *"
        value={pickupPhone}
        onChangeText={setPickupPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Pickup Email *"
        value={pickupEmail}
        onChangeText={setPickupEmail}
        keyboardType="email-address"
      />
      <Text style={styles.label}>Delivery Contact</Text>
      <TextInput
        style={styles.input}
        placeholder="Delivery Name *"
        value={deliveryName}
        onChangeText={setDeliveryName}
      />
      <TextInput
        style={styles.input}
        placeholder="Delivery Phone *"
        value={deliveryPhone}
        onChangeText={setDeliveryPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Delivery Email *"
        value={deliveryEmail}
        onChangeText={setDeliveryEmail}
        keyboardType="email-address"
      />
      {/* Pickup Scheduling */}
      {settings.enablePickups && (
        <>
          <Button title="Select Date & Time" onPress={() => setShowDatePicker(true)} />
          <Text style={{ marginBottom: 8, marginTop: 4, textAlign: 'center' }}>
            {dateTime ? dateTime.toLocaleString() : ''}
          </Text>
          {showDatePicker && (
            <DateTimePicker
              value={dateTime}
              mode="datetime"
              display="default"
              onChange={onChangeDateTime}
            />
          )}
        </>
      )}
      <Text style={styles.label}>Dimensions (ft)</Text>
      <TextInput
        style={styles.input}
        placeholder="Length (ft) *"
        value={lengthFt}
        onChangeText={setLengthFt}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Width (ft) *"
        value={widthFt}
        onChangeText={setWidthFt}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Height (ft) *"
        value={heightFt}
        onChangeText={setHeightFt}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Pallet Count *"
        value={palletCount}
        onChangeText={setPalletCount}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Quantity *"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />
      <Text style={styles.label}>Special Instructions</Text>
      <TextInput
        style={[styles.input, { minHeight: 60 }]}
        placeholder="Special Instructions (Optional)"
        value={specialInstructions}
        onChangeText={setSpecialInstructions}
        multiline
      />
      <View style={styles.row}>
        <Text style={{ flex: 1 }}>Insurance</Text>
        <Switch value={insurance} onValueChange={setInsurance} />
      </View>
      <View style={styles.row}>
        <Text style={{ flex: 1 }}>Hazardous Material</Text>
        <Switch value={hazmat} onValueChange={setHazmat} />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Reference / PO # (optional)"
        value={reference}
        onChangeText={setReference}
      />
      <Button title="Submit Request" onPress={handleSubmit} />
    </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
  },
  label: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 12,
    borderRadius: 4,
  },
});