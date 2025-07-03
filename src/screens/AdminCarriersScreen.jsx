import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView } from 'react-native';
import { View, Text, FlatList, TextInput, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import Constants from 'expo-constants';
import InternalHeader from '../components/InternalHeader';
import { getApiUrl } from '../utils/apiHost';

// Read API URL from expo config or fallback
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  getApiUrl();

export default function AdminCarriersScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiSecret, setNewApiSecret] = useState('');

  const fetchCarriers = async () => {
    try {
      const res = await fetch(`${API_URL}/carriers`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      setCarriers(data);
    } catch (e) {
      console.error('fetchCarriers error:', e);
      Alert.alert('Error', 'Failed to load carriers');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCarriers();
    setRefreshing(false);
  };

  useEffect(() => { fetchCarriers(); }, []);

  const saveApiKey = async (id) => {
    try {
      const res = await fetch(`${API_URL}/carriers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ apiKey, apiSecret: newApiSecret }),
      });
      if (!res.ok) throw new Error('Failed to update');
      Alert.alert('Success', 'API credentials updated successfully');
      setEditing(null);
      setApiKey('');
      setNewApiSecret('');
      fetchCarriers();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const createCarrier = async () => {
    if (!newName.trim() || !newCode.trim()) {
      Alert.alert('Error', 'Name and code are required');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/carriers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ 
          name: newName.trim(), 
          code: newCode.trim().toUpperCase(), 
          apiKey: newApiKey.trim() || null, 
          apiSecret: newApiSecret.trim() || null 
        }),
      });
      if (!res.ok) throw new Error('Failed to create carrier');
      Alert.alert('Success', 'Carrier created successfully');
      setNewName(''); 
      setNewCode(''); 
      setNewApiKey('');
      setNewApiSecret('');
      setShowCreateForm(false);
      fetchCarriers();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const deleteCarrier = async (id, name) => {
    Alert.alert(
      'Delete Carrier',
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/carriers/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${userToken}` },
              });
              if (!res.ok) throw new Error('Failed to delete carrier');
              Alert.alert('Success', 'Carrier deleted successfully');
              fetchCarriers();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const renderCarrierCard = ({ item }) => (
    <View style={styles.carrierCard}>
      <View style={styles.carrierHeader}>
        <View style={styles.carrierIconContainer}>
          <MaterialCommunityIcons name="truck-delivery" size={28} color="#007AFF" />
        </View>
        
        <View style={styles.carrierMainInfo}>
          <Text style={styles.carrierName}>{item.name}</Text>
          <View style={styles.carrierCodeBadge}>
            <Text style={styles.carrierCodeText}>{item.code}</Text>
          </View>
        </View>
        
        <View style={styles.carrierStatus}>
          <View style={[styles.statusIndicator, { backgroundColor: item.apiKey ? '#34C759' : '#FF9500' }]} />
          <Text style={styles.statusText}>
            {item.apiKey ? 'Configured' : 'Setup Required'}
          </Text>
        </View>
      </View>

      <View style={styles.carrierDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="key" size={16} color="#8E8E93" />
          <Text style={styles.detailLabel}>API Key:</Text>
          <Text style={styles.detailValue}>
            {item.apiKey ? '••••••••' + item.apiKey.slice(-4) : 'Not configured'}
          </Text>
        </View>
        
        {item.apiSecret && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="shield-key" size={16} color="#8E8E93" />
            <Text style={styles.detailLabel}>API Secret:</Text>
            <Text style={styles.detailValue}>••••••••</Text>
          </View>
        )}
      </View>

      {editing === item.id ? (
        <View style={styles.editForm}>
          <View style={styles.editHeader}>
            <MaterialCommunityIcons name="pencil" size={20} color="#007AFF" />
            <Text style={styles.editTitle}>Edit API Credentials</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>API Key</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter API key"
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>API Secret (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter API secret"
              value={newApiSecret}
              onChangeText={setNewApiSecret}
              autoCapitalize="none"
              secureTextEntry
            />
          </View>
          
          <View style={styles.editActions}>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={() => saveApiKey(item.id)}
            >
              <LinearGradient
                colors={['#34C759', '#30D158']}
                style={styles.saveButtonGradient}
              >
                <MaterialCommunityIcons name="check" size={16} color="white" />
                <Text style={styles.saveButtonText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => {
                setEditing(null);
                setApiKey('');
                setNewApiSecret('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.carrierActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setEditing(item.id);
              setApiKey(item.apiKey || '');
              setNewApiSecret('');
            }}
          >
            <MaterialCommunityIcons name="pencil" size={16} color="#007AFF" />
            <Text style={styles.actionButtonText}>Edit Credentials</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteActionButton]}
            onPress={() => deleteCarrier(item.id, item.name)}
          >
            <MaterialCommunityIcons name="delete" size={16} color="#FF3B30" />
            <Text style={[styles.actionButtonText, styles.deleteActionText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Carriers Management" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading carriers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Carriers Management" />
      
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
              <MaterialCommunityIcons name="truck-delivery" size={32} color="white" />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Carriers Management</Text>
                <Text style={styles.headerSubtitle}>Manage shipping carriers and API integrations</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <MaterialCommunityIcons name="chart-box" size={20} color="#007AFF" />
            <Text style={styles.statsTitle}>Overview</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{carriers.length}</Text>
              <Text style={styles.statLabel}>Total Carriers</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{carriers.filter(c => c.apiKey).length}</Text>
              <Text style={styles.statLabel}>Configured</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{carriers.filter(c => !c.apiKey).length}</Text>
              <Text style={styles.statLabel}>Setup Required</Text>
            </View>
          </View>
        </View>

        {/* Add Carrier Button */}
        <View style={styles.addCarrierSection}>
          <TouchableOpacity 
            style={styles.addCarrierButton}
            onPress={() => setShowCreateForm(!showCreateForm)}
          >
            <LinearGradient
              colors={['#007AFF', '#5856D6']}
              style={styles.addCarrierGradient}
            >
              <MaterialCommunityIcons 
                name={showCreateForm ? "close" : "plus"} 
                size={20} 
                color="white" 
              />
              <Text style={styles.addCarrierText}>
                {showCreateForm ? 'Cancel' : 'Add New Carrier'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Create Carrier Form */}
        {showCreateForm && (
          <View style={styles.createForm}>
            <View style={styles.createHeader}>
              <MaterialCommunityIcons name="plus-circle" size={24} color="#007AFF" />
              <Text style={styles.createTitle}>Add New Carrier</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Carrier Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., FedEx, UPS, DHL"
                value={newName}
                onChangeText={setNewName}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Carrier Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., FEDEX, UPS, DHL"
                value={newCode}
                onChangeText={(text) => setNewCode(text.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>API Key (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter API key for integration"
                value={newApiKey}
                onChangeText={setNewApiKey}
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>API Secret (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter API secret"
                value={newApiSecret}
                onChangeText={setNewApiSecret}
                autoCapitalize="none"
                secureTextEntry
              />
            </View>
            
            <TouchableOpacity style={styles.createButton} onPress={createCarrier}>
              <LinearGradient
                colors={['#34C759', '#30D158']}
                style={styles.createButtonGradient}
              >
                <MaterialCommunityIcons name="check" size={18} color="white" />
                <Text style={styles.createButtonText}>Create Carrier</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Carriers List */}
        <View style={styles.carriersSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="format-list-bulleted" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Carriers ({carriers.length})</Text>
          </View>
          
          {carriers.length > 0 ? (
            <FlatList
              data={carriers}
              keyExtractor={item => item.id}
              renderItem={renderCarrierCard}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="truck-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No Carriers Found</Text>
              <Text style={styles.emptyMessage}>Add your first carrier to get started with shipping integrations</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
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
  
  // Stats Card
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  
  // Add Carrier Section
  addCarrierSection: {
    marginBottom: 20,
  },
  addCarrierButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addCarrierGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  addCarrierText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  
  // Create Form
  createForm: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  createHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  createTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 12,
  },
  
  // Input Styles
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
    backgroundColor: '#FAFAFA',
  },
  
  // Create Button
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  
  // Carriers Section
  carriersSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  
  // Carrier Cards
  carrierCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardSeparator: {
    height: 12,
  },
  carrierHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  carrierIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  carrierMainInfo: {
    flex: 1,
    paddingTop: 2,
  },
  carrierName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  carrierCodeBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  carrierCodeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  carrierStatus: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  // Carrier Details
  carrierDetails: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
    marginRight: 8,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1C1C1E',
    flex: 1,
  },
  
  // Edit Form
  editForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  editTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  
  // Carrier Actions
  carrierActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 4,
  },
  deleteActionButton: {
    backgroundColor: '#FFF0F0',
  },
  deleteActionText: {
    color: '#FF3B30',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});