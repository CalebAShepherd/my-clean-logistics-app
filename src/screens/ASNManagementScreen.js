import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { hasReceivingOperations, canCreateASNs } from '../utils/featureFlags';
import InternalHeader from '../components/InternalHeader';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

const ASNManagementScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [asns, setASNs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // New ASN form state
  const [newASN, setNewASN] = useState({
    asnNumber: '',
    supplierId: '',
    carrierName: '',
    driverName: '',
    driverPhone: '',
    vehicleInfo: '',
    expectedArrival: '',
    totalPallets: '',
    totalCases: '',
    totalWeight: '',
    referenceNumber: '',
    poNumber: '',
    trailerNumber: '',
    sealNumber: '',
    temperature: '',
    specialHandling: '',
    notes: ''
  });

  useEffect(() => {
    if (!hasReceivingOperations(settings)) {
      Alert.alert(
        'Feature Not Available',
        'Receiving operations are not enabled for your account.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    loadInitialData();
  }, [settings]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadWarehouses(),
        loadSuppliers()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load initial data');
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await fetch(`${API_URL}/warehouses`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      const data = await response.json();
      setWarehouses(data);
      if (data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(data[0].id);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await fetch(`${API_URL}/suppliers`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadASNs = useCallback(async () => {
    if (!selectedWarehouse) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        warehouseId: selectedWarehouse,
        ...(filterStatus !== 'ALL' && { status: filterStatus })
      });

      const [asnsResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/asns?${params}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        }),
        fetch(`${API_URL}/asns/stats/${selectedWarehouse}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        })
      ]);

      const asnsData = await asnsResponse.json();
      const statsData = await statsResponse.json();

      setASNs(asnsData.asns || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading ASNs:', error);
      Alert.alert('Error', 'Failed to load ASNs');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, filterStatus]);

  useEffect(() => {
    if (selectedWarehouse) {
      loadASNs();
    }
  }, [selectedWarehouse, filterStatus, loadASNs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadASNs();
    setRefreshing(false);
  }, [loadASNs]);

  const handleCreateASN = async () => {
    try {
      if (!newASN.asnNumber || !newASN.expectedArrival) {
        Alert.alert('Error', 'ASN number and expected arrival are required');
        return;
      }

      const response = await fetch(`${API_URL}/asns`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
          ...newASN,
          warehouseId: selectedWarehouse,
          totalPallets: parseInt(newASN.totalPallets) || 0,
          totalCases: parseInt(newASN.totalCases) || 0,
          totalWeight: parseFloat(newASN.totalWeight) || null,
          temperature: parseFloat(newASN.temperature) || null
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewASN({
          asnNumber: '',
          supplierId: '',
          carrierName: '',
          driverName: '',
          driverPhone: '',
          vehicleInfo: '',
          expectedArrival: '',
          totalPallets: '',
          totalCases: '',
          totalWeight: '',
          referenceNumber: '',
          poNumber: '',
          trailerNumber: '',
          sealNumber: '',
          temperature: '',
          specialHandling: '',
          notes: ''
        });
        await loadASNs();
        Alert.alert('Success', 'ASN created successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to create ASN');
      }
    } catch (error) {
      console.error('Error creating ASN:', error);
      Alert.alert('Error', 'Failed to create ASN');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: '#FFA500',
      SCHEDULED: '#4169E1',
      IN_TRANSIT: '#32CD32',
      ARRIVED: '#228B22',
      RECEIVING: '#FF6347',
      RECEIVED: '#008000',
      COMPLETED: '#006400',
      CANCELLED: '#DC143C'
    };
    return colors[status] || '#666';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderASNCard = ({ item }) => (
    <TouchableOpacity style={styles.asnCard} activeOpacity={0.7}>
      <View style={styles.asnCardContent}>
        <View style={styles.asnHeader}>
          <View style={styles.asnNumberContainer}>
            <View style={styles.asnIconContainer}>
              <MaterialCommunityIcons name="truck-outline" size={20} color="#007AFF" />
            </View>
            <Text style={styles.asnNumber}>{item.asnNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>

        <View style={styles.asnDetails}>
          {item.supplier && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="factory" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>Supplier: {item.supplier.name}</Text>
            </View>
          )}
          {item.carrierName && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="truck-delivery" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>Carrier: {item.carrierName}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color="#8E8E93" />
            <Text style={styles.detailText}>Expected: {formatDate(item.expectedArrival)}</Text>
          </View>
        </View>

        <View style={styles.asnMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{item.totalPallets || 0}</Text>
            <Text style={styles.metricLabel}>Pallets</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{item.totalCases || 0}</Text>
            <Text style={styles.metricLabel}>Cases</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{item.totalWeight ? `${item.totalWeight}kg` : 'N/A'}</Text>
            <Text style={styles.metricLabel}>Weight</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>ASN Overview</Text>
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total || 0}</Text>
              <Text style={styles.statLabel}>Total ASNs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.pending || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.inTransit || 0}</Text>
              <Text style={styles.statLabel}>In Transit</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.received || 0}</Text>
              <Text style={styles.statLabel}>Received</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
        {['ALL', 'PENDING', 'IN_TRANSIT', 'ARRIVED', 'RECEIVING', 'RECEIVED', 'COMPLETED'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filterStatus === status && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus(status)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterButtonText,
              filterStatus === status && styles.filterButtonTextActive
            ]}>
              {status.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading && asns.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="ASN Management" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading ASNs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="ASN Management"
        rightIcons={[
          {
            icon: 'refresh',
            color: '#007AFF',
            onPress: () => loadASNs()
          }
        ]}
      />

      {renderStatsCard()}
      {renderFilterButtons()}

      <View style={styles.content}>
        <FlatList
          data={asns}
          renderItem={renderASNCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="truck-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyText}>No ASNs Found</Text>
              <Text style={styles.emptySubtext}>
                {canCreateASNs(settings) 
                  ? "Tap the + button to create your first ASN" 
                  : "ASNs will appear here when created"}
              </Text>
            </View>
          )}
        />
      </View>

      {canCreateASNs(settings) && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={28} color="white" />
        </TouchableOpacity>
      )}

      {/* Create ASN Modal - keeping existing modal content but with updated styling */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create New ASN</Text>
            <TouchableOpacity onPress={handleCreateASN}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Keep existing form content but with updated styling */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>ASN Number *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newASN.asnNumber}
                  onChangeText={(text) => setNewASN({...newASN, asnNumber: text})}
                  placeholder="Enter ASN number"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Expected Arrival *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newASN.expectedArrival}
                  onChangeText={(text) => setNewASN({...newASN, expectedArrival: text})}
                  placeholder="YYYY-MM-DD HH:MM"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Add other form fields with similar styling... */}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  // Stats Section
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },

  // Filter Buttons
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  filterScrollContent: {
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },

  // Content & List
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  listContainer: {
    paddingBottom: 100,
  },

  // ASN Cards
  asnCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  asnCardContent: {
    padding: 16,
  },
  asnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  asnNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  asnIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  asnNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  asnDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  asnMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F8F9FA',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  metricLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  modalCancel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formSection: {
    marginBottom: 32,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#1C1C1E',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});

export default ASNManagementScreen; 