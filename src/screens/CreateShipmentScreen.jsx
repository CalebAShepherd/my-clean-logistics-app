

import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform, ScrollView, Switch, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from '../context/AuthContext';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://192.168.0.73:3000';

export default function CreateShipmentScreen() {
  const { userToken } = useContext(AuthContext);
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
  const [lengthFt, setLengthFt] = useState('');
  const [widthFt, setWidthFt] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [insurance, setInsurance] = useState(false);
  const [reference, setReference] = useState('');

  const onChangeDateTime = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateTime(selectedDate);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    const requiredFields = [
      [origin, 'Origin Address'],
      [destination, 'Destination Address'],
      [weight, 'Weight'],
      [pickupName, 'Pickup Name'],
      [pickupPhone, 'Pickup Phone'],
      [pickupEmail, 'Pickup Email'],
      [deliveryName, 'Delivery Name'],
      [deliveryPhone, 'Delivery Phone'],
      [deliveryEmail, 'Delivery Email'],
      [quantity, 'Quantity'],
      [lengthFt, 'Length'],
      [widthFt, 'Width'],
      [heightFt, 'Height'],
      // Reference / PO # is now optional
    ];
    for (let [value, label] of requiredFields) {
      if (!value || (typeof value === 'string' && !value.trim())) {
        Alert.alert('Error', `${label} is required.`);
        return;
      }
    }
    try {
      const res = await fetch(`${API_URL}/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          origin,
          destination,
          description,
          weight: parseFloat(weight),
          pickup: { name: pickupName, phone: pickupPhone, email: pickupEmail },
          delivery: { name: deliveryName, phone: deliveryPhone, email: deliveryEmail },
          shipmentDate: dateTime.toISOString(),
          dimensions: {
            length: parseFloat(lengthFt),
            width: parseFloat(widthFt),
            height: parseFloat(heightFt),
          },
          quantity: parseInt(quantity, 10),
          specialInstructions,
          insurance,
          reference,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to create shipment');
      }
      Alert.alert('Success', 'Shipment request submitted for approval.');
      setOrigin('');
      setDestination('');
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
      setLengthFt('');
      setWidthFt('');
      setHeightFt('');
      setSpecialInstructions('');
      setInsurance(false);
      setReference('');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>New Shipment Request</Text>
      <TextInput
        style={styles.input}
        placeholder="Origin Address *"
        value={origin}
        onChangeText={setOrigin}
      />
      <TextInput
        style={styles.input}
        placeholder="Destination Address *"
        value={destination}
        onChangeText={setDestination}
      />
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
      <TextInput
        style={styles.input}
        placeholder="Reference / PO # (optional)"
        value={reference}
        onChangeText={setReference}
      />
      <Button title="Submit Request" onPress={handleSubmit} />
    </ScrollView>
    </KeyboardAvoidingView>
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