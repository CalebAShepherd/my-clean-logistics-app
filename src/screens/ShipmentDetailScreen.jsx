import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Switch, Linking, Image, Platform, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Constants from 'expo-constants';
import { Picker } from '@react-native-picker/picker';
import { TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InternalHeader from '../components/InternalHeader';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Use emulator-friendly host on Android for static image fetching
const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : (Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000');

const statusLabelMap = { 
  CREATED: 'Processing', 
  ASSIGNED: 'Assigned', 
  IN_TRANSIT: 'In Transit', 
  OUT_FOR_DEL: 'Out for Delivery', 
  DELIVERED: 'Completed' 
};

const badgeColors = { 
  CREATED: '#FF9500', 
  ASSIGNED: '#007AFF', 
  IN_TRANSIT: '#5856D6', 
  OUT_FOR_DEL: '#FF9500', 
  DELIVERED: '#34C759' 
};

export default function ShipmentDetailScreen({ route, navigation }) {
  // Ensure route params exist
  if (!route || !route.params || !route.params.id) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Shipment Details" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>No Shipment Selected</Text>
          <Text style={styles.errorMessage}>Please select a shipment to view its details.</Text>
      </View>
      </SafeAreaView>
    );
  }

  const { userToken, user } = useContext(AuthContext);
  const { id } = route.params;
  const { settings } = useSettings();

  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [carriers, setCarriers] = useState([]);
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [trackingInput, setTrackingInput] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  
  // Document management
  const [pickedDoc, setPickedDoc] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('BOL');
  const [showUpload, setShowUpload] = useState(false);
  const [quoteCarrier, setQuoteCarrier] = useState('FEDEX');
  const [quotes, setQuotes] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [downloadingDocs, setDownloadingDocs] = useState(new Set());

  const fetchShipmentData = async () => {
      try {
        setLoading(true);
        console.log('fetchShipment for ID:', id);
        console.log(`Requesting: ${API_URL}/api/shipments/${id}`);
        const res = await fetch(`${API_URL}/api/shipments/${id}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        console.log('fetch response status:', res.status);
        if (!res.ok) throw new Error('Failed to load shipment');
        const data = await res.json();
        console.log('fetchShipment received data:', data);
        setShipment(data);
      setSelectedCarrier(data.serviceCarrier?.id || '');
      setTrackingInput(data.trackingNumber || '');
      
      // Fetch documents for this shipment
      await fetchDocuments();
      } catch (e) {
        console.error('fetchShipment error:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/shipments/${id}/documents`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      
      if (res.ok) {
        const docs = await res.json();
        setDocuments(docs || []);
      } else {
        // If the endpoint doesn't exist or returns an error, just set empty array
        setDocuments([]);
      }
    } catch (e) {
      console.error('fetchDocuments error:', e);
      // Don't fail silently, but also don't crash the app
      setDocuments([]);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPickedDoc(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadDocument = async () => {
    if (!pickedDoc) {
      Alert.alert('Error', 'Please select a document first');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      
      // Backend expects field name 'file', not 'document'
      formData.append('file', {
        uri: pickedDoc.uri,
        type: pickedDoc.mimeType,
        name: pickedDoc.name,
      });
      formData.append('type', selectedDocType);

      const res = await fetch(`${API_URL}/api/shipments/${id}/documents`, {
        method: 'POST',
        headers: {
          // Don't set Content-Type header manually for FormData
          Authorization: `Bearer ${userToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const responseText = await res.text();
        throw new Error(`Upload failed: ${res.status} - ${responseText}`);
      }
      
      Alert.alert('Success', 'Document uploaded successfully');
      setPickedDoc(null);
      setShowUpload(false);
      await fetchDocuments();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (doc) => {
    try {
      // Construct full URL - doc.url is relative like "/uploads/filename.pdf"
      let documentUrl = null;
      if (doc.url) {
        // If URL starts with /, it's a relative path - prepend API_URL
        documentUrl = doc.url.startsWith('/') ? `${API_URL}${doc.url}` : doc.url;
      } else if (doc.filePath) {
        documentUrl = doc.filePath.startsWith('/') ? `${API_URL}${doc.filePath}` : doc.filePath;
      }
      
      if (!documentUrl) {
        Alert.alert('Error', 'Document URL not available');
        return;
      }

      // Add document to downloading set
      setDownloadingDocs(prev => new Set(prev).add(doc.id));

      // Extract filename from URL or use a default
      const filename = doc.originalName || doc.name || (doc.url ? doc.url.split('/').pop() : 'document.pdf');
      const fileUri = FileSystem.documentDirectory + filename;

      // Create download resumable for better error handling
      const downloadResumable = FileSystem.createDownloadResumable(
        documentUrl,
        fileUri
      );

      const { uri } = await downloadResumable.downloadAsync();

      // Use sharing to let user save to their preferred location
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
          dialogTitle: 'Save Document',
          UTI: filename.toLowerCase().endsWith('.pdf') ? 'com.adobe.pdf' : 'public.data'
        });
      } else {
        Alert.alert('Success', `Document downloaded successfully to: ${filename}`);
      }
    } catch (e) {
      Alert.alert('Download Failed', `Failed to download document: ${e.message}`);
    } finally {
      // Remove document from downloading set
      setDownloadingDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
    }
  };

  const viewDocument = async (doc) => {
    try {
      // Construct full URL - doc.url is relative like "/uploads/filename.pdf"
      let documentUrl = null;
      if (doc.url) {
        // If URL starts with /, it's a relative path - prepend API_URL
        documentUrl = doc.url.startsWith('/') ? `${API_URL}${doc.url}` : doc.url;
      } else if (doc.filePath) {
        documentUrl = doc.filePath.startsWith('/') ? `${API_URL}${doc.filePath}` : doc.filePath;
      }
      
      if (documentUrl) {
        await Linking.openURL(documentUrl);
      } else {
        Alert.alert('Error', 'Document URL not available');
      }
    } catch (e) {
      Alert.alert('Error', `Failed to view document: ${e.message}`);
    }
  };

  const deleteDocument = async (documentId) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/documents/${documentId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${userToken}` },
              });
              if (!res.ok) throw new Error('Failed to delete document');
              Alert.alert('Success', 'Document deleted successfully');
              await fetchDocuments();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShipmentData();
    setRefreshing(false);
  };

  // Load carriers for assignment
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'dispatcher') {
      const loadCarriers = async () => {
        try {
          const res = await fetch(`${API_URL}/carriers`, {
            headers: { Authorization: `Bearer ${userToken}` },
          });
          if (!res.ok) throw new Error('Failed to load carriers');
          const data = await res.json();
          setCarriers(data);
        } catch (e) {
          console.error('loadCarriers error:', e);
        }
      };
      loadCarriers();
    }
  }, [userToken, user]);

  useEffect(() => {
    fetchShipmentData();
  }, [id, userToken]);

  useEffect(() => {
    if (shipment) {
      setForm({
        description: shipment.description || '',
        weight: shipment.weight?.toString() || '',
        pickupName: shipment.pickupName || '',
        pickupPhone: shipment.pickupPhone || '',
        pickupEmail: shipment.pickupEmail || '',
        deliveryName: shipment.deliveryName || '',
        deliveryPhone: shipment.deliveryPhone || '',
        deliveryEmail: shipment.deliveryEmail || '',
        shipmentDate: shipment.shipmentDate ? new Date(shipment.shipmentDate) : new Date(),
        length: shipment.length?.toString() || '',
        width: shipment.width?.toString() || '',
        height: shipment.height?.toString() || '',
        quantity: shipment.quantity?.toString() || '',
        specialInstructions: shipment.specialInstructions || '',
        insurance: !!shipment.insurance,
        hazmat: !!shipment.hazmat,
        reference: shipment.reference || '',
        pickupStreet: shipment.pickupStreet || '',
        pickupCity: shipment.pickupCity || '',
        pickupState: shipment.pickupState || '',
        pickupZip: shipment.pickupZip || '',
        deliveryStreet: shipment.deliveryStreet || '',
        deliveryCity: shipment.deliveryCity || '',
        deliveryState: shipment.deliveryState || '',
        deliveryZip: shipment.deliveryZip || '',
      });
    }
  }, [shipment]);

  const handleEditChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleEditSubmit = async () => {
    try {
      const patch = { ...form };
      patch.weight = parseFloat(form.weight);
      patch.length = parseFloat(form.length);
      patch.width = parseFloat(form.width);
      patch.height = parseFloat(form.height);
      patch.quantity = parseInt(form.quantity, 10);
      patch.insurance = !!form.insurance;
      patch.shipmentDate = form.shipmentDate instanceof Date ? form.shipmentDate.toISOString() : form.shipmentDate;
      
      const res = await fetch(`${API_URL}/api/shipments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Failed to update shipment');
      Alert.alert('Success', 'Shipment updated successfully');
      setEditMode(false);
      // Reload shipment
      const updated = await res.json();
      setShipment(updated);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const assignCarrier = async () => {
    try {
      const res = await fetch(`${API_URL}/shipments/${id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          carrierId: selectedCarrier,
          trackingNumber: trackingInput,
        }),
      });
      if (!res.ok) throw new Error('Assignment failed');
      Alert.alert('Success', 'Carrier assigned successfully');
      setAssigning(false);
      // Refresh shipment details
      setShipment(prev => ({ 
        ...prev, 
        serviceCarrier: carriers.find(c => c.id === selectedCarrier), 
        trackingNumber: trackingInput 
      }));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Update shipment status
  const updateStatus = async (newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/shipments/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      const updated = await res.json();
      setShipment(updated);
      Alert.alert('Success', 'Status updated successfully');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Delete Shipment', 'Are you sure you want to delete this shipment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/api/shipments/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${userToken}` },
            });
            if (!res.ok) throw new Error('Failed to delete shipment');
            Alert.alert('Deleted', 'Shipment deleted successfully');
            if (typeof route?.params?.onDelete === 'function') route.params.onDelete();
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Shipment Details" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading shipment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Shipment Details" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Unable to Load Shipment</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchShipmentData}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canEdit = user?.role === 'admin' || user?.role === 'dispatcher' || user?.id === shipment?.clientId;
  const canManageCarrier = user?.role === 'admin' || user?.role === 'dispatcher';

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Shipment Details" />
      
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Visual Header */}
        <View style={styles.headerCard}>
          <LinearGradient
            colors={['#007AFF', '#5856D6']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <MaterialCommunityIcons name="package-variant-closed" size={32} color="white" />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Shipment Details</Text>
                <Text style={styles.headerSubtitle}>#{shipment.reference || shipment.id.substring(0, 8)}</Text>
        </View>
            </View>
          </LinearGradient>
        </View>

        {/* Status Overview Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Current Status</Text>
          </View>
          
          <View style={styles.statusOverview}>
            <View style={[styles.statusBadge, { backgroundColor: badgeColors[shipment.status] }]}>
              <Text style={styles.statusText}>{statusLabelMap[shipment.status]}</Text>
            </View>
            
            <View style={styles.statusDetails}>
              <Text style={styles.statusLabel}>Last Updated</Text>
              <Text style={styles.statusDate}>
                {new Date(shipment.updatedAt).toLocaleString()}
              </Text>
            </View>
          </View>
          
          {canManageCarrier && shipment.status !== 'DELIVERED' && (
            <View style={styles.statusActions}>
              <Text style={styles.actionsLabel}>Update Status:</Text>
              <View style={styles.statusButtons}>
                {shipment.status === 'CREATED' && (
                  <TouchableOpacity 
                    style={[styles.statusButton, { backgroundColor: '#007AFF' }]}
                    onPress={() => updateStatus('ASSIGNED')}
                  >
                    <Text style={styles.statusButtonText}>Mark Assigned</Text>
                  </TouchableOpacity>
                )}
                {shipment.status === 'ASSIGNED' && (
                  <TouchableOpacity 
                    style={[styles.statusButton, { backgroundColor: '#5856D6' }]}
                    onPress={() => updateStatus('IN_TRANSIT')}
                  >
                    <Text style={styles.statusButtonText}>In Transit</Text>
            </TouchableOpacity>
          )}
                {shipment.status === 'IN_TRANSIT' && (
                  <TouchableOpacity 
                    style={[styles.statusButton, { backgroundColor: '#FF9500' }]}
                    onPress={() => updateStatus('OUT_FOR_DEL')}
                  >
                    <Text style={styles.statusButtonText}>Out for Delivery</Text>
                  </TouchableOpacity>
                )}
                {shipment.status === 'OUT_FOR_DEL' && (
                  <TouchableOpacity 
                    style={[styles.statusButton, { backgroundColor: '#34C759' }]}
                    onPress={() => updateStatus('DELIVERED')}
                  >
                    <Text style={styles.statusButtonText}>Mark Delivered</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Shipment Information */}
            <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="information" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Shipment Information</Text>
            {canEdit && (
              <TouchableOpacity onPress={() => setEditMode(!editMode)}>
                <MaterialCommunityIcons 
                  name={editMode ? "close" : "pencil"} 
                  size={20} 
                  color={editMode ? "#FF3B30" : "#007AFF"} 
                />
              </TouchableOpacity>
            )}
              </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Description</Text>
              {editMode ? (
                <TextInput
                  style={styles.editInput}
                  value={form.description}
                  onChangeText={text => handleEditChange('description', text)}
                  placeholder="Enter description"
                />
              ) : (
                <Text style={styles.infoValue}>{shipment.description || 'No description'}</Text>
              )}
              </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Weight</Text>
                <Text style={styles.infoValue}>{shipment.weight || 'N/A'} lbs</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Quantity</Text>
                <Text style={styles.infoValue}>{shipment.quantity || 'N/A'}</Text>
              </View>
              </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Dimensions</Text>
                <Text style={styles.infoValue}>
                  {shipment.length && shipment.width && shipment.height
                    ? `${shipment.length}" × ${shipment.width}" × ${shipment.height}"`
                    : 'Not specified'}
                </Text>
              </View>
              </View>
            
            {(shipment.insurance || shipment.hazmat) && (
              <View style={styles.flagsContainer}>
                {shipment.insurance && (
                  <View style={styles.flag}>
                    <MaterialCommunityIcons name="shield-check" size={12} color="#34C759" />
                    <Text style={styles.flagText}>Insured</Text>
              </View>
                )}
                {shipment.hazmat && (
                  <View style={[styles.flag, { backgroundColor: '#FF3B30' }]}>
                    <MaterialCommunityIcons name="alert" size={12} color="white" />
                    <Text style={[styles.flagText, { color: 'white' }]}>Hazmat</Text>
                </View>
              )}
                </View>
            )}
              </View>
          
          {editMode && (
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.saveButton} onPress={handleEditSubmit}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditMode(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              </View>
          )}
            </View>

        {/* Route Information */}
              <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="map-marker-path" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Route Details</Text>
                    </View>
          
          <View style={styles.routeContainer}>
            <View style={styles.routeSection}>
              <View style={styles.routeHeader}>
                <MaterialCommunityIcons name="circle" size={12} color="#34C759" />
                <Text style={styles.routeLabel}>Pickup Location</Text>
                      </View>
              <Text style={styles.routeAddress}>{shipment.origin}</Text>
              {shipment.pickupName && (
                <View style={styles.contactInfo}>
                  <MaterialCommunityIcons name="account" size={14} color="#8E8E93" />
                  <Text style={styles.contactText}>{shipment.pickupName}</Text>
                  </View>
                )}
              {shipment.pickupPhone && (
                <View style={styles.contactInfo}>
                  <MaterialCommunityIcons name="phone" size={14} color="#8E8E93" />
                  <Text style={styles.contactText}>{shipment.pickupPhone}</Text>
              </View>
            )}
            </View>
            
            <View style={styles.routeConnector}>
              <View style={styles.routeLine} />
              <MaterialCommunityIcons name="truck" size={16} color="#007AFF" />
            </View>
            
            <View style={styles.routeSection}>
              <View style={styles.routeHeader}>
                <MaterialCommunityIcons name="map-marker" size={12} color="#FF3B30" />
                <Text style={styles.routeLabel}>Delivery Location</Text>
              </View>
              <Text style={styles.routeAddress}>{shipment.destination}</Text>
              {shipment.deliveryName && (
                <View style={styles.contactInfo}>
                  <MaterialCommunityIcons name="account" size={14} color="#8E8E93" />
                  <Text style={styles.contactText}>{shipment.deliveryName}</Text>
                </View>
              )}
              {shipment.deliveryPhone && (
                <View style={styles.contactInfo}>
                  <MaterialCommunityIcons name="phone" size={14} color="#8E8E93" />
                  <Text style={styles.contactText}>{shipment.deliveryPhone}</Text>
                    </View>
                      )}
                    </View>
                  </View>
        </View>

        {/* Carrier Management */}
        {canManageCarrier && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="truck-delivery" size={20} color="#007AFF" />
              <Text style={styles.cardTitle}>Carrier Management</Text>
            </View>
            
            {shipment.serviceCarrier ? (
              <View style={styles.carrierInfo}>
                <View style={styles.carrierDetails}>
                  <Text style={styles.carrierName}>{shipment.serviceCarrier.name}</Text>
                  <Text style={styles.carrierContact}>{shipment.serviceCarrier.email}</Text>
                  {shipment.trackingNumber && (
                    <View style={styles.trackingContainer}>
                      <MaterialCommunityIcons name="barcode-scan" size={16} color="#8E8E93" />
                      <Text style={styles.trackingNumber}>{shipment.trackingNumber}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.noCarrier}>
                <MaterialCommunityIcons name="truck-outline" size={32} color="#C7C7CC" />
                <Text style={styles.noCarrierText}>No carrier assigned</Text>
                </View>
              )}
            
            <View style={styles.carrierActions}>
              <TouchableOpacity 
                style={styles.assignButton}
                onPress={() => setAssigning(!assigning)}
              >
                <LinearGradient
                  colors={['#007AFF', '#5856D6']}
                  style={styles.assignButtonGradient}
                >
                  <MaterialCommunityIcons name="plus" size={16} color="white" />
                  <Text style={styles.assignButtonText}>
                    {shipment.serviceCarrier ? 'Update Carrier' : 'Assign Carrier'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            {assigning && (
              <View style={styles.assignmentForm}>
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Select Carrier</Text>
                  <Picker
                    selectedValue={selectedCarrier}
                    onValueChange={setSelectedCarrier}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select a carrier" value="" />
                    {carriers.map(c => (
                      <Picker.Item key={c.id} label={c.name} value={c.id} />
                    ))}
                  </Picker>
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Tracking Number (Optional)</Text>
                  <TextInput
                    style={styles.trackingInput}
                    value={trackingInput}
                    onChangeText={setTrackingInput}
                    placeholder="Enter tracking number"
                  />
                </View>
                
                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.confirmButton} onPress={assignCarrier}>
                    <Text style={styles.confirmButtonText}>Confirm Assignment</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelAssignButton} onPress={() => setAssigning(false)}>
                    <Text style={styles.cancelAssignText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Special Instructions */}
        {shipment.specialInstructions && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="note-text" size={20} color="#007AFF" />
              <Text style={styles.cardTitle}>Special Instructions</Text>
            </View>
            <Text style={styles.instructionsText}>{shipment.specialInstructions}</Text>
          </View>
        )}

        {/* BOL Documents */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="file-document" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Documents</Text>
            {canEdit && (
              <TouchableOpacity onPress={() => setShowUpload(!showUpload)}>
                <MaterialCommunityIcons 
                  name={showUpload ? "close" : "plus"} 
                  size={20} 
                  color={showUpload ? "#FF3B30" : "#007AFF"} 
                />
                  </TouchableOpacity>
            )}
                      </View>
          
          {/* Upload Section */}
          {showUpload && canEdit && (
            <View style={styles.uploadSection}>
              <View style={styles.uploadHeader}>
                <MaterialCommunityIcons name="cloud-upload" size={24} color="#007AFF" />
                <Text style={styles.uploadTitle}>Upload BOL Document</Text>
              </View>
              
              <View style={styles.docTypeContainer}>
                <Text style={styles.docTypeLabel}>Document Type</Text>
                <Picker
                  selectedValue={selectedDocType}
                  onValueChange={setSelectedDocType}
                  style={styles.docTypePicker}
                >
                  <Picker.Item label="Bill of Lading (BOL)" value="BOL" />
                  <Picker.Item label="Proof of Delivery" value="POD" />
                  <Picker.Item label="Invoice" value="INVOICE" />
                  <Picker.Item label="Other" value="OTHER" />
                </Picker>
              </View>
              
              {pickedDoc && (
                <View style={styles.selectedDoc}>
                  <MaterialCommunityIcons name="file-check" size={20} color="#34C759" />
                  <Text style={styles.selectedDocName}>{pickedDoc.name}</Text>
                  <TouchableOpacity onPress={() => setPickedDoc(null)}>
                    <MaterialCommunityIcons name="close-circle" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.uploadActions}>
                <TouchableOpacity style={styles.pickButton} onPress={pickDocument}>
                  <LinearGradient
                    colors={['#007AFF', '#5856D6']}
                    style={styles.pickButtonGradient}
                  >
                    <MaterialCommunityIcons name="file-plus" size={16} color="white" />
                    <Text style={styles.pickButtonText}>Select Document</Text>
                  </LinearGradient>
                  </TouchableOpacity>
                
                {pickedDoc && (
                  <TouchableOpacity
                    style={styles.uploadButton} 
                    onPress={uploadDocument}
                    disabled={uploading}
                  >
                    <LinearGradient
                      colors={['#34C759', '#30D158']}
                      style={styles.uploadButtonGradient}
                    >
                      {uploading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <MaterialCommunityIcons name="cloud-upload" size={16} color="white" />
                      )}
                      <Text style={styles.uploadButtonText}>
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          
          {/* Documents List */}
          {documents.length > 0 ? (
            <View style={styles.documentsList}>
              {documents.map((doc, index) => (
                <View key={doc.id || index} style={styles.documentCard}>
                  <View style={styles.documentHeader}>
                    <View style={styles.docIconContainer}>
                      <MaterialCommunityIcons 
                        name={doc.type === 'BOL' ? 'file-document' : doc.type === 'POD' ? 'file-check' : doc.type === 'INVOICE' ? 'receipt' : 'file'} 
                        size={28} 
                        color="#007AFF" 
                      />
                    </View>
                    
                    <View style={styles.docMainInfo}>
                      <Text style={styles.docName} numberOfLines={1}>
                        {doc.originalName || doc.name || (doc.url ? doc.url.split('/').pop() : 'Unknown Document')}
                      </Text>
                      <View style={styles.docMetaRow}>
                        <View style={styles.docTypeBadge}>
                          <Text style={styles.docTypeText}>{doc.type}</Text>
                        </View>
                        <Text style={styles.docDate}>
                          {new Date(doc.createdAt || doc.uploadedAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.documentActions}>
                  <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => downloadDocument(doc)}
                      disabled={downloadingDocs.has(doc.id)}
                    >
                      {downloadingDocs.has(doc.id) ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                      ) : (
                        <MaterialCommunityIcons name="download" size={18} color="#007AFF" />
                      )}
                      <Text style={styles.actionButtonText}>
                        {downloadingDocs.has(doc.id) ? 'Downloading...' : 'Download'}
                      </Text>
                  </TouchableOpacity>
                    
                  <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => viewDocument(doc)}
                  >
                      <MaterialCommunityIcons name="eye" size={18} color="#007AFF" />
                      <Text style={styles.actionButtonText}>View</Text>
                  </TouchableOpacity>
                    
                    {canEdit && (
                  <TouchableOpacity
                        style={[styles.actionButton, styles.deleteAction]}
                        onPress={() => deleteDocument(doc.id)}
                  >
                        <MaterialCommunityIcons name="delete" size={18} color="#FF3B30" />
                        <Text style={[styles.actionButtonText, styles.deleteActionText]}>Delete</Text>
                  </TouchableOpacity>
            )}
              </View>
                  </View>
              ))}
            </View>
          ) : (
            <View style={styles.noDocuments}>
              <MaterialCommunityIcons name="file-outline" size={32} color="#C7C7CC" />
              <Text style={styles.noDocumentsText}>No documents uploaded</Text>
              <Text style={styles.noDocumentsSubtext}>Upload BOL and other documents for this shipment</Text>
            </View>
              )}
            </View>

        {/* Action Buttons */}
        {canEdit && (
          <View style={styles.actionCard}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <MaterialCommunityIcons name="delete" size={18} color="white" />
              <Text style={styles.deleteButtonText}>Delete Shipment</Text>
            </TouchableOpacity>
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  // Loading & Error States
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  
  // Layout
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 80,
  },
  
  // Visual Header
  headerCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  headerGradient: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Cards
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
    flex: 1,
  },
  
  // Status Overview
  statusOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  statusDetails: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  statusDate: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  
  // Status Actions
  statusActions: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 16,
  },
  actionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  
  // Information Grid
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  
  // Edit Mode
  editInput: {
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1C1C1E',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  
  // Flags
  flagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  flagText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#34C759',
    marginLeft: 4,
  },
  
  // Route Container
  routeContainer: {
    gap: 16,
  },
  routeSection: {
    flex: 1,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  routeConnector: {
    alignItems: 'flex-start',
    paddingVertical: 0,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E1E5E9',
    marginBottom: 8,
    marginLeft: 4,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 6,
  },
  
  // Carrier Management
  carrierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  carrierDetails: {
    flex: 1,
  },
  carrierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  carrierContact: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  trackingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingNumber: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  noCarrier: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noCarrierText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  
  // Carrier Actions
  carrierActions: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 16,
  },
  assignButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  assignButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  assignButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Assignment Form
  assignmentForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  picker: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  trackingInput: {
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C1C1E',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  cancelAssignButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelAssignText: {
    color: 'white',
    fontWeight: '600',
  },
  
  // Special Instructions
  instructionsText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  
  // BOL Documents
  uploadSection: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    borderRadius: 8,
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  docTypeContainer: {
    marginBottom: 16,
  },
  docTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  docTypePicker: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
     selectedDoc: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#F0F9FF',
     borderRadius: 8,
     padding: 12,
     marginBottom: 16,
   },
   selectedDocName: {
     fontSize: 14,
     fontWeight: '500',
     color: '#1C1C1E',
     marginLeft: 8,
     flex: 1,
   },
     uploadActions: {
     flexDirection: 'row',
     gap: 12,
   },
   pickButton: {
     flex: 1,
     borderRadius: 8,
     overflow: 'hidden',
   },
   pickButtonGradient: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     paddingVertical: 12,
     paddingHorizontal: 16,
   },
   pickButtonText: {
     color: 'white',
     fontWeight: '600',
     marginLeft: 6,
   },
   uploadButton: {
     flex: 1,
     borderRadius: 8,
     overflow: 'hidden',
   },
   uploadButtonGradient: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     paddingVertical: 12,
     paddingHorizontal: 16,
   },
   uploadButtonText: {
     color: 'white',
     fontWeight: '600',
     marginLeft: 6,
   },
     documentsList: {
     marginTop: 16,
     gap: 12,
   },
   documentCard: {
     backgroundColor: '#FAFAFA',
     borderRadius: 12,
     padding: 16,
     borderWidth: 1,
     borderColor: '#F2F2F7',
   },
   documentHeader: {
     flexDirection: 'row',
     alignItems: 'flex-start',
     marginBottom: 12,
   },
   docIconContainer: {
     width: 48,
     height: 48,
     borderRadius: 24,
     backgroundColor: '#F0F9FF',
     alignItems: 'center',
     justifyContent: 'center',
     marginRight: 12,
   },
   docMainInfo: {
     flex: 1,
     paddingTop: 2,
   },
   docName: {
     fontSize: 16,
     fontWeight: '600',
     color: '#1C1C1E',
     marginBottom: 6,
   },
   docMetaRow: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 8,
   },
   docTypeBadge: {
     backgroundColor: '#007AFF',
     paddingHorizontal: 8,
     paddingVertical: 3,
     borderRadius: 6,
   },
   docTypeText: {
     fontSize: 11,
     fontWeight: '600',
     color: 'white',
   },
   docDate: {
     fontSize: 12,
     color: '#8E8E93',
     fontWeight: '500',
   },
   documentActions: {
     flexDirection: 'row',
     justifyContent: 'flex-start',
     gap: 12,
     paddingTop: 8,
     borderTopWidth: 1,
     borderTopColor: '#F2F2F7',
   },
   actionButton: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 12,
     paddingVertical: 8,
     borderRadius: 8,
     backgroundColor: '#F0F9FF',
   },
   actionButtonText: {
     fontSize: 12,
     fontWeight: '600',
     color: '#007AFF',
     marginLeft: 4,
   },
   deleteAction: {
     backgroundColor: '#FFF0F0',
   },
   deleteActionText: {
     color: '#FF3B30',
   },
  noDocuments: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDocumentsText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
     noDocumentsSubtext: {
     fontSize: 12,
     color: '#8E8E93',
     marginTop: 4,
   },
   
   // Action Card
  actionCard: {
    marginTop: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
});