import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert, TouchableOpacity, Switch, Linking, Image, Platform } from 'react-native';
import { ActivityIndicator, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Constants from 'expo-constants';
import { Picker } from '@react-native-picker/picker';
import { TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InternalHeader from '../components/InternalHeader';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Use emulator-friendly host on Android for static image fetching
const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : (Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000');

export default function ShipmentDetailScreen({ route, navigation }) {
  // Ensure route params exist
  if (!route || !route.params || !route.params.id) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No shipment selected.</Text>
      </View>
    );
  }
  const { userToken, user } = useContext(AuthContext);
  const { id } = route.params;
  const { settings } = useSettings();

  // Map statuses to display labels and colors
  const statusLabelMap = { CREATED: 'Processing', ASSIGNED: 'Assigned', IN_TRANSIT: 'In Transit', OUT_FOR_DEL: 'Out for Delivery', DELIVERED: 'Completed' };
  const badgeColors = { CREATED: '#999', ASSIGNED: '#0074D9', IN_TRANSIT: '#FFA500', OUT_FOR_DEL: '#f39c12', DELIVERED: '#4CAF50' };
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [carriers, setCarriers] = useState([]);
  const [selectedCarrier, setSelectedCarrier] = useState(shipment?.serviceCarrier?.id || '');
  const [assigning, setAssigning] = useState(false);
  const [trackingInput, setTrackingInput] = useState(shipment?.trackingNumber || '');
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  // Local picked file for preview before upload
  const [pickedDoc, setPickedDoc] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('BOL');
  const [showUpload, setShowUpload] = useState(false);
  const [quoteCarrier, setQuoteCarrier] = useState('FEDEX');
  const [quotes, setQuotes] = useState(null);

  useEffect(() => {
    const fetchShipment = async () => {
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
      } catch (e) {
        console.error('fetchShipment error:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchShipment();
  }, [id, userToken]);

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
      Alert.alert('Success', 'Shipment updated');
      setEditMode(false);
      // Reload shipment
      const updated = await res.json();
      setShipment(updated);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const bookShipment = async () => {
    try {
      const res = await fetch(`${API_URL}/shipments/${id}/book`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Booking failed');
      }
      Alert.alert('Success', 'Shipment booked with carrier');
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
      Alert.alert('Success', 'Carrier assigned');
      setAssigning(false);
      // Refresh shipment details
      setShipment(prev => ({ ...prev, serviceCarrier: carriers.find(c => c.id === selectedCarrier), trackingNumber: trackingInput }));
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
      Alert.alert('Success', 'Status updated');
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
            Alert.alert('Deleted', 'Shipment deleted');
            // Optionally navigate back
            if (typeof route?.params?.onDelete === 'function') route.params.onDelete();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  // Add client cancellation confirmation
  const handleCancelShipment = async () => {
    Alert.alert(
      'Cancel Shipment',
      'Are you sure you want to cancel this shipment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/shipments/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${userToken}` },
              });
              if (!res.ok) throw new Error('Failed to cancel shipment');
              Alert.alert('Cancelled', 'Shipment cancelled');
              if (typeof route?.params?.onDelete === 'function') route.params.onDelete();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  // Pick a document for preview
  const handlePickDoc = async () => {
    try {
      console.log('handlePickDoc triggered');
      const result = await DocumentPicker.getDocumentAsync();
      console.log('DocumentPicker result:', result);
      // Support different result shapes
      let asset = null;
      if (result.type === 'success') {
        asset = result;
      } else if (result.assets?.length > 0 && result.canceled === false) {
        asset = result.assets[0];
      }
      if (asset) {
        console.log('DocumentPicker asset:', asset);
        setPickedDoc(asset);
      } else {
        console.log('DocumentPicker canceled or no assets:', result);
      }
    } catch (e) {
      console.log('handlePickDoc error', e);
      Alert.alert('Error picking document', e.message);
    }
  };

  // Upload the picked document
  const handleUploadDoc = async () => {
    if (!pickedDoc) {
      Alert.alert('No file selected', 'Please choose a file first');
      return;
    }
    console.log('handleUploadDoc triggered for asset:', pickedDoc);
    try {
      const asset = pickedDoc;
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' });
      formData.append('type', selectedDocType);
      const res = await fetch(`${API_URL}/api/shipments/${id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: formData,
      });
      const json = await res.json().catch(() => null);
      console.log('handleUploadDoc response status:', res.status, 'body:', json);
      if (!res.ok) throw new Error('Upload failed: ' + JSON.stringify(json));
      const newDoc = json;
      setShipment(prev => ({ ...prev, documents: [...prev.documents, newDoc] }));
    } catch (e) {
      console.log('handleUploadDoc error', e);
      Alert.alert('Error', e.message);
    }
  };

  // Delete a document
  const handleDeleteDoc = async (docId) => {
    try {
      const res = await fetch(`${API_URL}/api/documents/${docId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${userToken}` } });
      if (!res.ok) throw new Error('Failed to delete document');
      setShipment(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== docId) }));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Fetch rate quotes for client
  const handleGetRates = async () => {
    try {
      const res = await fetch(`${API_URL}/api/shipments/rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          serviceCarrierCode: quoteCarrier,
          shipmentId: id,
          weight: shipment.weight,
          length: shipment.length,
          width: shipment.width,
          height: shipment.height,
          origin: { street: shipment.pickupStreet, city: shipment.pickupCity, state: shipment.pickupState, zip: shipment.pickupZip },
          destination: { street: shipment.deliveryStreet, city: shipment.deliveryCity, state: shipment.deliveryState, zip: shipment.deliveryZip }
        }),
      });
      const data = await res.json();
      setQuotes(data);
    } catch (e) {
      Alert.alert('Error fetching rates', e.message);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <InternalHeader navigation={navigation} title="Shipment Details" />
      {loading && <ActivityIndicator style={styles.center} size="large" />}
      {error && (
        <View style={styles.container}>
          <Text style={styles.text}>Error: {error}</Text>
        </View>
      )}
      {!loading && !error && shipment && (
        <View style={styles.screen}>
          {/* Edit mode toggle */}
          {['admin','dispatcher','client'].includes(user?.role) && !editMode && (
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
          {/* Save/Cancel actions */}
          {editMode && (
            <View style={styles.editActions}>
              <Button title="Save" onPress={handleEditSubmit} />
              <Button title="Cancel" onPress={() => setEditMode(false)} />
            </View>
          )}
          <ScrollView contentContainerStyle={styles.contentContainer}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Shipment Info</Text>
              <View style={styles.rowDetail}>
                <Text style={styles.labelDetail}>Order ID</Text>
                <Text style={styles.valueDetail}>{shipment.reference || shipment.id}</Text>
              </View>
              <View style={styles.rowDetail}>
                <Text style={styles.labelDetail}>Client</Text>
                <Text style={styles.valueDetail}>{shipment.client?.username}</Text>
              </View>
              <View style={styles.rowDetail}>
                <Text style={styles.labelDetail}>Pickup Address</Text>
                <Text style={styles.valueDetail}>{`${shipment.pickupStreet}, ${shipment.pickupCity}, ${shipment.pickupState} ${shipment.pickupZip}`}</Text>
              </View>
              <View style={styles.rowDetail}>
                <Text style={styles.labelDetail}>Delivery Address</Text>
                <Text style={styles.valueDetail}>{`${shipment.deliveryStreet}, ${shipment.deliveryCity}, ${shipment.deliveryState} ${shipment.deliveryZip}`}</Text>
              </View>
              <View style={styles.rowDetail}>
                <Text style={styles.labelDetail}>Weight</Text>
                <Text style={styles.valueDetail}>{shipment.weight} lbs</Text>
              </View>
              <View style={styles.rowDetail}>
                <Text style={styles.labelDetail}>Dimensions</Text>
                <Text style={styles.valueDetail}>{`${shipment.length} x ${shipment.width} x ${shipment.height} ft`}</Text>
              </View>
              <View style={styles.rowDetail}>
                <Text style={styles.labelDetail}>Pallet Count</Text>
                <Text style={styles.valueDetail}>{shipment.palletCount}</Text>
              </View>
              <View style={styles.rowDetail}>
                <Text style={styles.labelDetail}>Pickup Date</Text>
                <Text style={styles.valueDetail}>{new Date(shipment.shipmentDate).toLocaleString()}</Text>
              </View>
              {shipment.deliveredAt && (
                <View style={styles.rowDetail}>
                  <Text style={styles.labelDetail}>Delivery Date</Text>
                  <Text style={styles.valueDetail}>{new Date(shipment.deliveredAt).toLocaleString()}</Text>
                </View>
              )}
              <View style={styles.rowDetail}>
                <Text style={styles.labelDetail}>Status</Text>
                <View style={[styles.badgeDetail, { backgroundColor: badgeColors[shipment.status] || '#999' }]}>
                  <Text style={styles.badgeDetailText}>{statusLabelMap[shipment.status]}</Text>
                </View>
              </View>
              <View style={styles.rowDetail}>
                <Text style={styles.labelDetail}>Assigned Carrier</Text>
                <Text style={styles.valueDetail}>{shipment.serviceCarrier?.name || 'Not Assigned'}</Text>
              </View>
              {/* Hazmat status */}
              <View style={styles.rowDetail}>
                <Text style={styles.labelDetail}>Hazardous Material</Text>
                {editMode ? (
                  <Switch
                    value={form.hazmat}
                    onValueChange={val => handleEditChange('hazmat', val)}
                  />
                ) : (
                  <Text style={styles.valueDetail}>{shipment.hazmat ? 'Yes' : 'No'}</Text>
                )}
              </View>
            </View>

            {/* Before Documents Section, add Rate Quotes for clients */}
            {user.role === 'client' && settings.useThirdPartyCarriers && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Rate Quotes</Text>
                <Picker selectedValue={quoteCarrier} onValueChange={setQuoteCarrier} style={styles.picker}>
                  {['FEDEX','DHL','UPS','USPS','XPO','RL','ODFL','ESTES','TFORCE'].map(code => (
                    <Picker.Item key={code} label={code} value={code} />
                  ))}
                </Picker>
                <Button title="Get Rate Quotes" onPress={handleGetRates} />
                {quotes && (
                  <View style={styles.quotesContainer}>
                    {/* Header row */}
                    <View style={[styles.quoteRow, styles.quoteHeaderRow]}>
                      <Text style={[styles.quoteCarrier, styles.quoteHeader]}>Carrier</Text>
                      <Text style={[styles.quoteRate, styles.quoteHeader]}>Rate</Text>
                      <Text style={[styles.quoteEta, styles.quoteHeader]}>ETA</Text>
                    </View>
                    {/* Data rows */}
                    {quotes.map((q, idx) => (
                      <View key={idx} style={styles.quoteRow}>
                        <Text style={styles.quoteCarrier}>{q.carrier}</Text>
                        <Text style={styles.quoteRate}>${q.rate.toFixed(2)} {q.currency}</Text>
                        <Text style={styles.quoteEta}>{q.estimatedDelivery}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Documents Section */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Documents</Text>
              {user.role === 'transporter' && !showUpload && (
                <Button title="Upload" onPress={() => setShowUpload(true)} />
              )}
              {(shipment.documents || []).map(doc => {
                const filename = doc.url.split('/').pop();
                const ext = filename.split('.').pop().toLowerCase();
                const isImage = ['png','jpg','jpeg','gif'].includes(ext);
                let previewElement;
                if (isImage) {
                  previewElement = <Image source={{ uri: API_URL + doc.url }} style={styles.docThumbnail} />;
                } else if (ext === 'pdf') {
                  previewElement = <MaterialCommunityIcons name="file-pdf-box" size={40} color="#E74C3C" style={styles.docThumbnail} />;
                } else {
                  previewElement = <MaterialCommunityIcons name="file" size={40} color="#555" style={styles.docThumbnail} />;
                }
                return (
                  <View key={doc.id} style={styles.documentRow}>
                    {/* Preview and Download button stack */}
                    <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                      {previewElement}
                      <TouchableOpacity onPress={() => Linking.openURL(API_URL + doc.url)} style={{ marginTop: 4 }}>
                        <Text style={{ color: '#007AFF' }}>Download</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Filename and optional delete in second column */}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      {/* <Text style={styles.labelDetail}>{doc.type}</Text> */}
                      <Text style={styles.valueDetail} numberOfLines={1} ellipsizeMode="tail">{filename}</Text>
                      {editMode && (
                        <TouchableOpacity onPress={() => handleDeleteDoc(doc.id)} style={{ marginTop: 4 }}>
                          <Text style={{ color: 'red' }}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
              {/* Persisting preview after upload/save */}
              {pickedDoc && (
                <View style={styles.documentRow}>
                  {['png','jpg','jpeg','gif'].includes(pickedDoc.name.split('.').pop().toLowerCase()) ? (
                    <Image source={{ uri: pickedDoc.uri }} style={styles.docThumbnail} />
                  ) : (
                    <MaterialCommunityIcons name="file" size={40} color="#555" style={styles.docThumbnail} />
                  )}
                  <Text style={styles.valueDetail} numberOfLines={1}>{pickedDoc.name}</Text>
                </View>
              )}
              {(editMode || showUpload) && (
                <>
                  <Text style={styles.labelDetail}>Upload Document</Text>
                  <Picker selectedValue={selectedDocType} onValueChange={setSelectedDocType} style={styles.picker}>
                    {['BOL','ID','LABEL','OTHER'].map(t => <Picker.Item key={t} label={t} value={t} />)}
                  </Picker>
                  <Button title="Choose File" onPress={handlePickDoc} />
                  <Button title="Upload Document" onPress={handleUploadDoc} disabled={!pickedDoc} />
                  {showUpload && (
                    <Button title="Cancel" onPress={() => { setShowUpload(false); setPickedDoc(null); }} />
                  )}
                </>
              )}
            </View>
            {(user?.role === 'admin' || user?.role === 'dispatcher') && (
              <>
                <View style={styles.actionContainer}>
                  <TouchableOpacity style={[styles.button, styles.buttonDelete]} onPress={handleDelete}>
                    <Text style={styles.buttonTextPrimary}>Delete Shipment</Text>
                  </TouchableOpacity>
                  {assigning ? (
                    <>
                      <Text style={styles.label}>Select Carrier:</Text>
                      <Picker selectedValue={selectedCarrier} onValueChange={setSelectedCarrier} style={styles.picker}>
                        {carriers.map(c => <Picker.Item key={c.id} label={`${c.name} (${c.code})`} value={c.id} />)}
                      </Picker>
                      {settings.enableTrackingInput && (
                        <TextInput style={styles.input} placeholder="Tracking Number" value={trackingInput} onChangeText={setTrackingInput} />
                      )}
                      <View style={styles.row}>
                        <Button title="Save" onPress={assignCarrier} />
                        <Button title="Cancel" onPress={() => setAssigning(false)} />
                      </View>
                    </>
                  ) : (
                    <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={() => setAssigning(true)}>
                      <Text style={styles.buttonTextPrimary}>Assign Carrier</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.button, styles.buttonPrimary, !shipment.serviceCarrier?.id && styles.buttonDisabled]}
                    onPress={bookShipment}
                    disabled={!shipment.serviceCarrier?.id}
                  >
                    <Text style={[styles.buttonTextPrimary, !shipment.serviceCarrier?.id && styles.buttonTextDisabled]}>Book Shipment</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.sectionTitle}>Update Status</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.buttonProcessing, shipment.status === 'CREATED' && styles.buttonDisabled]}
                    onPress={() => updateStatus('CREATED')}
                    disabled={shipment.status === 'CREATED'}
                  >
                    <Text style={[styles.buttonTextProcessing, shipment.status === 'CREATED' && styles.buttonTextDisabled]}>Processing</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.buttonInTransit, shipment.status === 'IN_TRANSIT' && styles.buttonDisabled]}
                    onPress={() => updateStatus('IN_TRANSIT')}
                    disabled={shipment.status === 'IN_TRANSIT'}
                  >
                    <Text style={[styles.buttonTextDefault, shipment.status === 'IN_TRANSIT' && styles.buttonTextDisabled]}>In Transit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.buttonOutForDelivery, shipment.status === 'OUT_FOR_DEL' && styles.buttonDisabled]}
                    onPress={() => updateStatus('OUT_FOR_DEL')}
                    disabled={shipment.status === 'OUT_FOR_DEL'}
                  >
                    <Text style={[styles.buttonTextDefault, shipment.status === 'OUT_FOR_DEL' && styles.buttonTextDisabled]}>Out for Delivery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.buttonCompleted, shipment.status === 'DELIVERED' && styles.buttonDisabled]}
                    onPress={() => updateStatus('DELIVERED')}
                    disabled={shipment.status === 'DELIVERED'}
                  >
                    <Text style={[styles.buttonTextDefault, shipment.status === 'DELIVERED' && styles.buttonTextDisabled]}>Completed</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {user?.role === 'client' && (
              <View style={styles.actionContainer}>
                <TouchableOpacity style={[styles.button, styles.buttonDelete]} onPress={handleCancelShipment}>
                  <Text style={styles.buttonTextPrimary}>Cancel Shipment</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Shipment History */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>History</Text>
              {shipment.shipmentUpdates?.length > 0 ? (
                shipment.shipmentUpdates.map(update => (
                  <View key={update.id} style={styles.rowDetail}>
                    <Text style={styles.labelDetail}>{new Date(update.createdAt).toLocaleString()}</Text>
                    <Text style={styles.valueDetail}>{statusLabelMap[update.status]}</Text>
                    {update.notes ? <Text style={styles.noteText}>{update.notes}</Text> : null}
                  </View>
                ))
              ) : (
                <Text style={styles.valueDetail}>No history available.</Text>
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 80 },
  container: { padding: 16, paddingBottom: 80 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text:      { fontSize: 18 },
  title:     { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  picker:    { width: '100%', marginVertical: 8 },
  input:     { borderWidth: 1, borderColor: '#ccc', padding: 8, marginVertical: 8, borderRadius: 4 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8, flexWrap: 'wrap' },
  label:     { marginTop: 16, fontWeight: 'bold' },
  error:     { color: 'red', marginTop: 8 },
  card:      { padding: 16, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  rowDetail: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  labelDetail: { width: '42%', fontWeight: 'bold' },
  valueDetail: { flex: 1, flexWrap: 'wrap' },
  badgeDetail: { padding: 4, borderWidth: 1, borderColor: '#ccc', borderRadius: 4 },
  badgeDetailText: { fontWeight: 'bold' },
  actionContainer: { marginVertical: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: 'center', marginHorizontal: 4 },
  buttonPrimary: { backgroundColor: '#007AFF' },
  buttonDelete: { backgroundColor: '#FF3B30' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonTextPrimary: { color: '#fff', fontWeight: '600' },
  buttonTextDisabled: { color: '#666' },
  buttonProcessing: {  width: '47%', marginBottom: 12, paddingVertical: 12, borderRadius: 6, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', marginHorizontal: 4, backgroundColor: '#f0f0f0' },
  buttonInTransit: {  width: '47%', marginBottom: 12, paddingVertical: 12, borderRadius: 6, alignItems: 'center', marginHorizontal: 4, backgroundColor: '#FFA500' },
  buttonOutForDelivery: {  width: '47%', marginBottom: 12, paddingVertical: 12, borderRadius: 6, alignItems: 'center', marginHorizontal: 4, backgroundColor: '#f39c12' },
  buttonCompleted: {  width: '47%', marginBottom: 12, paddingVertical: 12, borderRadius: 6, alignItems: 'center', marginHorizontal: 4, backgroundColor: '#4CAF50' },
  buttonTextProcessing: { color: '#000', fontWeight: '600' },
  buttonTextDefault: { color: '#fff', fontWeight: '600' },
  editBtn: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, alignItems: 'center', marginHorizontal: 4 },
  editBtnText: { color: '#007AFF', fontWeight: '600' },
  editActions: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  documentsSection: { marginVertical: 16 },
  documentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 },
  docThumbnail: { width: 60, height: 60, marginRight: 8, borderRadius: 4 },
  noteText: { fontStyle: 'italic', color: '#555', marginLeft: 8 },
  quotesContainer: { marginTop: 8 },
  quoteRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
  quoteCarrier: { flex: 1, fontWeight: 'bold' },
  quoteRate: { flex: 1, textAlign: 'left' },
  quoteEta: { flex: 1, textAlign: 'left', color: '#555' },
  quoteHeaderRow: { borderBottomWidth: 2, Color: '#ccc', paddingVertical: 8 },
  quoteHeader: { fontWeight: '600', fontSize: 14 },
});