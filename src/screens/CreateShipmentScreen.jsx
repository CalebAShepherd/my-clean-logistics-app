import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, ScrollView, Switch, KeyboardAvoidingView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native';
import InternalHeader from '../components/InternalHeader';
import { useSettings } from '../context/SettingsContext';
import { getApiUrl } from '../utils/apiHost';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : getApiUrl();

export default function CreateShipmentScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  
  // Basic Information
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');
  const [reference, setReference] = useState('');

  // Pickup Information
  const [pickupName, setPickupName] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [pickupEmail, setPickupEmail] = useState('');
  const [pickupStreet, setPickupStreet] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupState, setPickupState] = useState('');
  const [pickupZip, setPickupZip] = useState('');
  
  // Delivery Information
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');
  const [deliveryZip, setDeliveryZip] = useState('');
  
  // Package Details
  const [quantity, setQuantity] = useState('');
  const [palletCount, setPalletCount] = useState('');
  const [lengthFt, setLengthFt] = useState('');
  const [widthFt, setWidthFt] = useState('');
  const [heightFt, setHeightFt] = useState('');
  
  // Additional Options
  const [dateTime, setDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [insurance, setInsurance] = useState(false);
  const [hazmat, setHazmat] = useState(false);
  
  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // Pickup validation
    if (!pickupName.trim()) newErrors.pickupName = 'Pickup contact name is required';
    if (!pickupPhone.trim()) newErrors.pickupPhone = 'Pickup phone is required';
    if (!pickupEmail.trim()) newErrors.pickupEmail = 'Pickup email is required';
    if (!pickupStreet.trim()) newErrors.pickupStreet = 'Pickup street is required';
    if (!pickupCity.trim()) newErrors.pickupCity = 'Pickup city is required';
    if (!pickupState.trim()) newErrors.pickupState = 'Pickup state is required';
    if (!pickupZip.trim()) newErrors.pickupZip = 'Pickup ZIP is required';
    
    // Delivery validation
    if (!deliveryName.trim()) newErrors.deliveryName = 'Delivery contact name is required';
    if (!deliveryPhone.trim()) newErrors.deliveryPhone = 'Delivery phone is required';
    if (!deliveryEmail.trim()) newErrors.deliveryEmail = 'Delivery email is required';
    if (!deliveryStreet.trim()) newErrors.deliveryStreet = 'Delivery street is required';
    if (!deliveryCity.trim()) newErrors.deliveryCity = 'Delivery city is required';
    if (!deliveryState.trim()) newErrors.deliveryState = 'Delivery state is required';
    if (!deliveryZip.trim()) newErrors.deliveryZip = 'Delivery ZIP is required';
    
    // Package validation
    if (!weight.trim()) newErrors.weight = 'Weight is required';
    if (!quantity.trim()) newErrors.quantity = 'Quantity is required';
    if (!palletCount.trim()) newErrors.palletCount = 'Pallet count is required';
    if (!lengthFt.trim()) newErrors.lengthFt = 'Length is required';
    if (!widthFt.trim()) newErrors.widthFt = 'Width is required';
    if (!heightFt.trim()) newErrors.heightFt = 'Height is required';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (pickupEmail.trim() && !emailRegex.test(pickupEmail.trim())) {
      newErrors.pickupEmail = 'Invalid pickup email format';
    }
    if (deliveryEmail.trim() && !emailRegex.test(deliveryEmail.trim())) {
      newErrors.deliveryEmail = 'Invalid delivery email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  const resetForm = () => {
    setDescription('');
    setWeight('');
    setReference('');
    setPickupName('');
    setPickupPhone('');
    setPickupEmail('');
    setPickupStreet('');
    setPickupCity('');
    setPickupState('');
    setPickupZip('');
    setDeliveryName('');
    setDeliveryPhone('');
    setDeliveryEmail('');
    setDeliveryStreet('');
    setDeliveryCity('');
    setDeliveryState('');
    setDeliveryZip('');
    setQuantity('');
    setPalletCount('');
    setLengthFt('');
    setWidthFt('');
    setHeightFt('');
    setSpecialInstructions('');
    setInsurance(false);
    setHazmat(false);
    setDateTime(new Date());
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors below and try again.');
      return;
    }
    
    setSubmitting(true);
    
    try {
    if (settings.enableAddressValidation) {
        await validateAddresses();
      }
      
      const res = await fetch(`${API_URL}/api/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          description: description.trim(),
          weight: parseFloat(weight),
          hazmat,
          pickup: { 
            name: pickupName.trim(), 
            phone: pickupPhone.trim(), 
            email: pickupEmail.trim() 
          },
          delivery: { 
            name: deliveryName.trim(), 
            phone: deliveryPhone.trim(), 
            email: deliveryEmail.trim() 
          },
          shipmentDate: settings.enablePickups ? dateTime.toISOString() : new Date().toISOString(),
          dimensions: {
            length: parseFloat(lengthFt),
            width: parseFloat(widthFt),
            height: parseFloat(heightFt),
          },
          palletCount: parseInt(palletCount, 10),
          quantity: parseInt(quantity, 10),
          specialInstructions: specialInstructions.trim(),
          insurance,
          reference: reference.trim(),
          pickupStreet: pickupStreet.trim(),
          pickupCity: pickupCity.trim(),
          pickupState: pickupState.trim(),
          pickupZip: pickupZip.trim(),
          deliveryStreet: deliveryStreet.trim(),
          deliveryCity: deliveryCity.trim(),
          deliveryState: deliveryState.trim(),
          deliveryZip: deliveryZip.trim(),
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to create shipment');
      }
      
      Alert.alert(
        'Success',
        'Shipment request submitted successfully!',
        [
          {
            text: 'Create Another',
            onPress: resetForm
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (e) {
      console.error('Error creating shipment:', e);
      if (e.message.includes('Invalid address')) {
        Alert.alert('Address Validation Error', e.message);
      } else {
        Alert.alert('Error', e.message || 'Failed to create shipment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const clearField = (fieldName) => {
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="New Shipment Request" />
      
    <KeyboardAvoidingView
        style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="truck-delivery" size={32} color="#007AFF" />
            </View>
            <Text style={styles.headerTitle}>Create Shipment Request</Text>
            <Text style={styles.headerSubtitle}>Fill in the details for your new shipment</Text>
          </View>

          {/* Basic Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="information" size={20} color="#007AFF" />
              <Text style={styles.cardTitle}>Basic Information</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Reference Number</Text>
      <TextInput
        style={styles.input}
                value={reference}
                onChangeText={setReference}
                placeholder="Optional reference number"
                placeholderTextColor="#8E8E93"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
                placeholder="Describe the shipment contents"
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Pickup Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="map-marker-up" size={20} color="#34C759" />
              <Text style={styles.cardTitle}>Pickup Information</Text>
            </View>
            
            <Text style={styles.sectionSubtitle}>Contact Details</Text>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>
                  Contact Name <Text style={styles.required}>*</Text>
                </Text>
      <TextInput
                  style={[styles.input, errors.pickupName && styles.inputError]}
        value={pickupName}
                  onChangeText={(text) => {
                    setPickupName(text);
                    clearField('pickupName');
                  }}
                  placeholder="Full name"
                  placeholderTextColor="#8E8E93"
                />
                {errors.pickupName && <Text style={styles.errorText}>{errors.pickupName}</Text>}
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>
                  Phone <Text style={styles.required}>*</Text>
                </Text>
      <TextInput
                  style={[styles.input, errors.pickupPhone && styles.inputError]}
        value={pickupPhone}
                  onChangeText={(text) => {
                    setPickupPhone(text);
                    clearField('pickupPhone');
                  }}
                  placeholder="Phone number"
                  placeholderTextColor="#8E8E93"
        keyboardType="phone-pad"
      />
                {errors.pickupPhone && <Text style={styles.errorText}>{errors.pickupPhone}</Text>}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Email <Text style={styles.required}>*</Text>
              </Text>
      <TextInput
                style={[styles.input, errors.pickupEmail && styles.inputError]}
        value={pickupEmail}
                onChangeText={(text) => {
                  setPickupEmail(text);
                  clearField('pickupEmail');
                }}
                placeholder="email@example.com"
                placeholderTextColor="#8E8E93"
        keyboardType="email-address"
                autoCapitalize="none"
      />
              {errors.pickupEmail && <Text style={styles.errorText}>{errors.pickupEmail}</Text>}
            </View>
            
            <Text style={styles.sectionSubtitle}>Address</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Street Address <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.pickupStreet && styles.inputError]}
                value={pickupStreet}
                onChangeText={(text) => {
                  setPickupStreet(text);
                  clearField('pickupStreet');
                }}
                placeholder="Street address"
                placeholderTextColor="#8E8E93"
              />
              {errors.pickupStreet && <Text style={styles.errorText}>{errors.pickupStreet}</Text>}
            </View>
            
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 2, marginRight: 8 }]}>
                <Text style={styles.label}>
                  City <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.pickupCity && styles.inputError]}
                  value={pickupCity}
                  onChangeText={(text) => {
                    setPickupCity(text);
                    clearField('pickupCity');
                  }}
                  placeholder="City"
                  placeholderTextColor="#8E8E93"
                />
                {errors.pickupCity && <Text style={styles.errorText}>{errors.pickupCity}</Text>}
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginHorizontal: 4 }]}>
                <Text style={styles.label}>
                  State <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.pickupState && styles.inputError]}
                  value={pickupState}
                  onChangeText={(text) => {
                    setPickupState(text);
                    clearField('pickupState');
                  }}
                  placeholder="ST"
                  placeholderTextColor="#8E8E93"
                  maxLength={2}
                  autoCapitalize="characters"
                />
                {errors.pickupState && <Text style={styles.errorText}>{errors.pickupState}</Text>}
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>
                  ZIP <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.pickupZip && styles.inputError]}
                  value={pickupZip}
                  onChangeText={(text) => {
                    setPickupZip(text);
                    clearField('pickupZip');
                  }}
                  placeholder="12345"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                  maxLength={5}
                />
                {errors.pickupZip && <Text style={styles.errorText}>{errors.pickupZip}</Text>}
              </View>
            </View>
          </View>

          {/* Delivery Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="map-marker-down" size={20} color="#FF9500" />
              <Text style={styles.cardTitle}>Delivery Information</Text>
            </View>
            
            <Text style={styles.sectionSubtitle}>Contact Details</Text>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>
                  Contact Name <Text style={styles.required}>*</Text>
                </Text>
      <TextInput
                  style={[styles.input, errors.deliveryName && styles.inputError]}
        value={deliveryName}
                  onChangeText={(text) => {
                    setDeliveryName(text);
                    clearField('deliveryName');
                  }}
                  placeholder="Full name"
                  placeholderTextColor="#8E8E93"
                />
                {errors.deliveryName && <Text style={styles.errorText}>{errors.deliveryName}</Text>}
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>
                  Phone <Text style={styles.required}>*</Text>
                </Text>
      <TextInput
                  style={[styles.input, errors.deliveryPhone && styles.inputError]}
        value={deliveryPhone}
                  onChangeText={(text) => {
                    setDeliveryPhone(text);
                    clearField('deliveryPhone');
                  }}
                  placeholder="Phone number"
                  placeholderTextColor="#8E8E93"
        keyboardType="phone-pad"
      />
                {errors.deliveryPhone && <Text style={styles.errorText}>{errors.deliveryPhone}</Text>}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Email <Text style={styles.required}>*</Text>
              </Text>
      <TextInput
                style={[styles.input, errors.deliveryEmail && styles.inputError]}
        value={deliveryEmail}
                onChangeText={(text) => {
                  setDeliveryEmail(text);
                  clearField('deliveryEmail');
                }}
                placeholder="email@example.com"
                placeholderTextColor="#8E8E93"
        keyboardType="email-address"
                autoCapitalize="none"
      />
              {errors.deliveryEmail && <Text style={styles.errorText}>{errors.deliveryEmail}</Text>}
            </View>
            
            <Text style={styles.sectionSubtitle}>Address</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Street Address <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.deliveryStreet && styles.inputError]}
                value={deliveryStreet}
                onChangeText={(text) => {
                  setDeliveryStreet(text);
                  clearField('deliveryStreet');
                }}
                placeholder="Street address"
                placeholderTextColor="#8E8E93"
              />
              {errors.deliveryStreet && <Text style={styles.errorText}>{errors.deliveryStreet}</Text>}
            </View>
            
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 2, marginRight: 8 }]}>
                <Text style={styles.label}>
                  City <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.deliveryCity && styles.inputError]}
                  value={deliveryCity}
                  onChangeText={(text) => {
                    setDeliveryCity(text);
                    clearField('deliveryCity');
                  }}
                  placeholder="City"
                  placeholderTextColor="#8E8E93"
                />
                {errors.deliveryCity && <Text style={styles.errorText}>{errors.deliveryCity}</Text>}
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginHorizontal: 4 }]}>
                <Text style={styles.label}>
                  State <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.deliveryState && styles.inputError]}
                  value={deliveryState}
                  onChangeText={(text) => {
                    setDeliveryState(text);
                    clearField('deliveryState');
                  }}
                  placeholder="ST"
                  placeholderTextColor="#8E8E93"
                  maxLength={2}
                  autoCapitalize="characters"
                />
                {errors.deliveryState && <Text style={styles.errorText}>{errors.deliveryState}</Text>}
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>
                  ZIP <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.deliveryZip && styles.inputError]}
                  value={deliveryZip}
                  onChangeText={(text) => {
                    setDeliveryZip(text);
                    clearField('deliveryZip');
                  }}
                  placeholder="12345"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                  maxLength={5}
                />
                {errors.deliveryZip && <Text style={styles.errorText}>{errors.deliveryZip}</Text>}
              </View>
            </View>
          </View>

          {/* Package Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="package-variant" size={20} color="#5856D6" />
              <Text style={styles.cardTitle}>Package Details</Text>
            </View>
            
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>
                  Weight (lbs) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.weight && styles.inputError]}
                  value={weight}
                  onChangeText={(text) => {
                    setWeight(text);
                    clearField('weight');
                  }}
                  placeholder="0.0"
                  placeholderTextColor="#8E8E93"
                  keyboardType="decimal-pad"
                />
                {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginHorizontal: 4 }]}>
                <Text style={styles.label}>
                  Quantity <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.quantity && styles.inputError]}
                  value={quantity}
                  onChangeText={(text) => {
                    setQuantity(text);
                    clearField('quantity');
                  }}
                  placeholder="0"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                />
                {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>
                  Pallets <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.palletCount && styles.inputError]}
                  value={palletCount}
                  onChangeText={(text) => {
                    setPalletCount(text);
                    clearField('palletCount');
                  }}
                  placeholder="0"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                />
                {errors.palletCount && <Text style={styles.errorText}>{errors.palletCount}</Text>}
              </View>
            </View>
            
            <Text style={styles.sectionSubtitle}>Dimensions (feet)</Text>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>
                  Length <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.lengthFt && styles.inputError]}
                  value={lengthFt}
                  onChangeText={(text) => {
                    setLengthFt(text);
                    clearField('lengthFt');
                  }}
                  placeholder="0.0"
                  placeholderTextColor="#8E8E93"
                  keyboardType="decimal-pad"
                />
                {errors.lengthFt && <Text style={styles.errorText}>{errors.lengthFt}</Text>}
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginHorizontal: 4 }]}>
                <Text style={styles.label}>
                  Width <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.widthFt && styles.inputError]}
                  value={widthFt}
                  onChangeText={(text) => {
                    setWidthFt(text);
                    clearField('widthFt');
                  }}
                  placeholder="0.0"
                  placeholderTextColor="#8E8E93"
                  keyboardType="decimal-pad"
                />
                {errors.widthFt && <Text style={styles.errorText}>{errors.widthFt}</Text>}
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>
                  Height <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.heightFt && styles.inputError]}
                  value={heightFt}
                  onChangeText={(text) => {
                    setHeightFt(text);
                    clearField('heightFt');
                  }}
                  placeholder="0.0"
                  placeholderTextColor="#8E8E93"
                  keyboardType="decimal-pad"
                />
                {errors.heightFt && <Text style={styles.errorText}>{errors.heightFt}</Text>}
              </View>
            </View>
          </View>

          {/* Additional Options Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="cog" size={20} color="#FF9500" />
              <Text style={styles.cardTitle}>Additional Options</Text>
            </View>
            
      {settings.enablePickups && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Pickup Date & Time</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="calendar" size={20} color="#007AFF" />
                  <Text style={styles.dateText}>
                    {dateTime.toLocaleDateString()} at {dateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#C7C7CC" />
                </TouchableOpacity>
                
          {showDatePicker && (
            <DateTimePicker
              value={dateTime}
              mode="datetime"
              display="default"
              onChange={onChangeDateTime}
                    minimumDate={new Date()}
                  />
                )}
              </View>
            )}
            
            <View style={styles.formGroup}>
      <Text style={styles.label}>Special Instructions</Text>
      <TextInput
                style={[styles.input, styles.textArea]}
        value={specialInstructions}
        onChangeText={setSpecialInstructions}
                placeholder="Any special handling instructions..."
                placeholderTextColor="#8E8E93"
        multiline
                numberOfLines={3}
                textAlignVertical="top"
      />
            </View>
            
            <View style={styles.switchRow}>
              <View style={styles.switchItem}>
                <View style={styles.switchContent}>
                  <MaterialCommunityIcons name="shield-check" size={20} color="#34C759" />
                  <View style={styles.switchText}>
                    <Text style={styles.switchLabel}>Insurance</Text>
                    <Text style={styles.switchDescription}>Add insurance coverage</Text>
                  </View>
                </View>
                <Switch
                  value={insurance}
                  onValueChange={setInsurance}
                  trackColor={{ false: '#E1E5E9', true: '#34C759' }}
                  thumbColor={insurance ? 'white' : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.switchItem}>
                <View style={styles.switchContent}>
                  <MaterialCommunityIcons name="hazard-lights" size={20} color="#FF9500" />
                  <View style={styles.switchText}>
                    <Text style={styles.switchLabel}>Hazardous Materials</Text>
                    <Text style={styles.switchDescription}>Contains hazmat items</Text>
      </View>
      </View>
                <Switch
                  value={hazmat}
                  onValueChange={setHazmat}
                  trackColor={{ false: '#E1E5E9', true: '#FF9500' }}
                  thumbColor={hazmat ? 'white' : '#f4f3f4'}
                />
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={submitting ? ['#C7C7CC', '#C7C7CC'] : ['#007AFF', '#5856D6']}
                style={styles.submitGradient}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialCommunityIcons name="send" size={20} color="white" />
                )}
                <Text style={styles.submitText}>
                  {submitting ? 'Submitting Request...' : 'Submit Shipment Request'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
    </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  keyboardView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  
  // Card Styles
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    marginTop: 8,
  },
  
  // Form Styles
  formGroup: {
    marginBottom: 16,
  },
  
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  
  required: {
    color: '#FF3B30',
  },
  
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1C1C1E',
  },
  
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  
  textArea: {
    height: 80,
  },
  
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    marginLeft: 4,
  },
  
  // Date Picker
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 8,
  },
  
  // Switch Styles
  switchRow: {
    gap: 16,
  },
  
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  
  switchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  switchText: {
    marginLeft: 12,
    flex: 1,
  },
  
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  
  switchDescription: {
    fontSize: 12,
    color: '#8E8E93',
  },
  
  // Action Container
  actionContainer: {
    marginTop: 20,
  },
  
  submitButton: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  submitButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  cancelButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  
  cancelText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
});