import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { getCurrentUser } from '../api/users';
import { fetchWarehouseItems } from '../api/warehouseItems';
import { createDamageReport } from '../api/damageReports';
import InternalHeader from '../components/InternalHeader';

// Incident types with descriptions
const incidentTypes = [
  { label: 'Damage', value: 'DAMAGE', icon: 'package-variant-remove', color: '#FF3B30' },
  { label: 'Loss', value: 'LOSS', icon: 'package-variant-closed-remove', color: '#FF9500' },
  { label: 'Theft', value: 'THEFT', icon: 'shield-alert', color: '#8E8E93' },
  { label: 'Defective', value: 'DEFECTIVE', icon: 'alert-circle', color: '#5856D6' }
];

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
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser(userToken);
        if (user.warehouseId) {
          setWarehouseId(user.warehouseId);
          const data = await fetchWarehouseItems(userToken, { warehouseId: user.warehouseId });
          setItems(data);
          if (data.length > 0) {
            setItemId(data[0].itemId);
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        Alert.alert('Error', 'Failed to load warehouse items. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!itemId) {
      newErrors.item = 'Please select an item';
    }
    if (!quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) <= 0) {
      newErrors.quantity = 'Quantity must be a positive number';
    }
    if (!type) {
      newErrors.type = 'Please select incident type';
    }
    if (!reasonCode.trim()) {
      newErrors.reasonCode = 'Reason code is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets?.[0]) {
        setPhotos([...photos, result.assets[0]]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removePhoto = (indexToRemove) => {
    setPhotos(photos.filter((_, index) => index !== indexToRemove));
  };

  const onSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors below and try again.');
      return;
    }
    
    setSubmitting(true);
    try {
      await createDamageReport(
        userToken, 
        { 
          warehouseId, 
          itemId, 
          quantity: parseInt(quantity, 10), 
          description: description.trim(), 
          type, 
          reasonCode: reasonCode.trim() 
        }, 
        photos
      );
      
      Alert.alert(
        'Success',
        'Incident report submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err) {
      console.error('Error submitting report:', err);
      Alert.alert('Error', err.message || 'Failed to submit incident report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Log Incident" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading warehouse data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedItem = items.find(item => item.itemId === itemId);
  const selectedType = incidentTypes.find(t => t.value === type);

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Log Incident" />
      
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
              <MaterialCommunityIcons name="alert-circle" size={32} color="#FF3B30" />
            </View>
            <Text style={styles.headerTitle}>Report Incident</Text>
            <Text style={styles.headerSubtitle}>Document damage, loss, or other incidents</Text>
          </View>

          {/* Incident Type Selection */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="clipboard-list" size={20} color="#FF3B30" />
              <Text style={styles.cardTitle}>Incident Type</Text>
            </View>
            
            <View style={styles.typeGrid}>
              {incidentTypes.map((incidentType) => (
                <TouchableOpacity
                  key={incidentType.value}
                  style={[
                    styles.typeCard,
                    type === incidentType.value && styles.typeCardSelected,
                    { borderColor: incidentType.color }
                  ]}
                  onPress={() => {
                    setType(incidentType.value);
                    if (errors.type) setErrors(prev => ({ ...prev, type: null }));
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons 
                    name={incidentType.icon} 
                    size={24} 
                    color={type === incidentType.value ? 'white' : incidentType.color} 
                  />
                  <Text style={[
                    styles.typeText,
                    type === incidentType.value && styles.typeTextSelected
                  ]}>
                    {incidentType.label}
                  </Text>
                  {type === incidentType.value && (
                    <LinearGradient
                      colors={[incidentType.color, `${incidentType.color}CC`]}
                      style={styles.typeOverlay}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
          </View>

          {/* Item Selection */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="package-variant" size={20} color="#007AFF" />
              <Text style={styles.cardTitle}>Affected Item</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Item <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.pickerContainer, errors.item && styles.inputError]}>
                <Picker
                  selectedValue={itemId}
                  onValueChange={(value) => {
                    setItemId(value);
                    if (errors.item) setErrors(prev => ({ ...prev, item: null }));
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select item" value="" />
                  {items.map(i => (
                    <Picker.Item 
                      key={i.itemId} 
                      label={`${i.InventoryItem.name} (${i.InventoryItem.sku})`} 
                      value={i.itemId} 
                    />
                  ))}
                </Picker>
              </View>
              {errors.item && <Text style={styles.errorText}>{errors.item}</Text>}
              
              {selectedItem && (
                <View style={styles.itemInfo}>
                  <MaterialCommunityIcons name="information" size={16} color="#007AFF" />
                  <Text style={styles.itemInfoText}>
                    Available: {selectedItem.quantity} {selectedItem.InventoryItem.unit}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Affected Quantity <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.quantity && styles.inputError]}
                value={quantity}
                onChangeText={(text) => {
                  setQuantity(text);
                  if (errors.quantity) setErrors(prev => ({ ...prev, quantity: null }));
                }}
                keyboardType="numeric"
                placeholder="Enter quantity"
                placeholderTextColor="#8E8E93"
              />
              {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
            </View>
          </View>

          {/* Incident Details */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="text-box" size={20} color="#34C759" />
              <Text style={styles.cardTitle}>Incident Details</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Reason Code <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.reasonCode && styles.inputError]}
                value={reasonCode}
                onChangeText={(text) => {
                  setReasonCode(text);
                  if (errors.reasonCode) setErrors(prev => ({ ...prev, reasonCode: null }));
                }}
                placeholder="e.g. Broken seal, Water damage, Missing package"
                placeholderTextColor="#8E8E93"
              />
              {errors.reasonCode && <Text style={styles.errorText}>{errors.reasonCode}</Text>}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholder="Provide additional details about the incident..."
                placeholderTextColor="#8E8E93"
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Photo Evidence */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="camera" size={20} color="#5856D6" />
              <Text style={styles.cardTitle}>Photo Evidence</Text>
            </View>
            
            <Text style={styles.sectionDescription}>
              Add photos to document the incident (optional but recommended)
            </Text>
            
            <View style={styles.photosContainer}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="close-circle" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {photos.length < 5 && (
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={pickImage}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="camera-plus" size={32} color="#5856D6" />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {photos.length >= 5 && (
              <Text style={styles.photoLimitText}>Maximum 5 photos allowed</Text>
            )}
          </View>

          {/* Submit Actions */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
              onPress={onSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={submitting ? ['#C7C7CC', '#C7C7CC'] : ['#FF3B30', '#FF6B6B']}
                style={styles.submitGradient}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialCommunityIcons name="send" size={20} color="white" />
                )}
                <Text style={styles.submitText}>
                  {submitting ? 'Submitting...' : 'Submit Report'}
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
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
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
    backgroundColor: '#FFF5F5',
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
    lineHeight: 22,
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
  
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: 20,
  },
  
  // Incident Type Selection
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  typeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E1E5E9',
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  
  typeCardSelected: {
    backgroundColor: '#1C1C1E',
  },
  
  typeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 8,
    textAlign: 'center',
  },
  
  typeTextSelected: {
    color: 'white',
    zIndex: 1,
  },
  
  // Form Styles
  formGroup: {
    marginBottom: 20,
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
    height: 100,
  },
  
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    marginLeft: 4,
  },
  
  // Picker Styles
  pickerContainer: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  picker: {
    height: 50,
    color: '#1C1C1E',
  },
  
  // Item Info
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  
  itemInfoText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 6,
  },
  
  // Photos Section
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  photoContainer: {
    position: 'relative',
  },
  
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#5856D6',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  addPhotoText: {
    fontSize: 12,
    color: '#5856D6',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  
  photoLimitText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Action Container
  actionContainer: {
    marginTop: 20,
  },
  
  submitButton: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#FF3B30',
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

export default CreateDamageReportScreen; 