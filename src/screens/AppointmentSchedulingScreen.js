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
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { hasAppointmentScheduling } from '../utils/featureFlags';
import InternalHeader from '../components/InternalHeader';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL = `http://${localhost}:3000`;

const AppointmentSchedulingScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dockDoors, setDockDoors] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [asns, setASNs] = useState([]);
  const [newAppointment, setNewAppointment] = useState({
    asnId: '',
    supplierId: '',
    dockDoorId: '',
    carrierName: '',
    driverName: '',
    driverPhone: '',
    scheduledDate: '',
    scheduledTimeSlot: '',
    appointmentType: 'RECEIVING',
    priority: 1,
    specialRequirements: '',
    equipment: '',
    notes: ''
  });

  useEffect(() => {
    if (!hasAppointmentScheduling(settings)) {
      Alert.alert(
        'Feature Not Available',
        'Appointment scheduling is not enabled for your account.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    if (userToken) {
      loadWarehouses();
    }
  }, [settings, userToken]);

  const loadWarehouses = async () => {
    if (!userToken) {
      console.log('No user token available');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/warehouses`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setWarehouses(data);
      if (data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(data[0].id);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
      Alert.alert('Error', 'Failed to load warehouses');
    }
  };

  const loadAppointments = useCallback(async () => {
    if (!selectedWarehouse || !userToken) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        warehouseId: selectedWarehouse,
        ...(filterStatus !== 'ALL' && { status: filterStatus })
      });

      const [appointmentsResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/dock/appointments?${params}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        }),
        fetch(`${API_URL}/dock/appointments/stats/${selectedWarehouse}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        })
      ]);

      if (!appointmentsResponse.ok) {
        throw new Error(`Appointments API error: ${appointmentsResponse.status}`);
      }
      if (!statsResponse.ok) {
        throw new Error(`Stats API error: ${statsResponse.status}`);
      }

      const appointmentsData = await appointmentsResponse.json();
      const statsData = await statsResponse.json();

      setAppointments(appointmentsData.appointments || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, filterStatus, userToken]);

  const loadFormData = async () => {
    if (!selectedWarehouse) return;

    try {
      const [doorsResponse, suppliersResponse, asnsResponse] = await Promise.all([
        fetch(`${API_URL}/dock/doors/${selectedWarehouse}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        }),
        fetch(`${API_URL}/suppliers`, {
          headers: { Authorization: `Bearer ${userToken}` }
        }),
        fetch(`${API_URL}/asns?warehouseId=${selectedWarehouse}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        })
      ]);

      const doorsData = await doorsResponse.json();
      const suppliersData = await suppliersResponse.json();
      const asnsData = await asnsResponse.json();

      setDockDoors(doorsData);
      setSuppliers(suppliersData);
      setASNs(asnsData.asns || []);
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  useEffect(() => {
    if (selectedWarehouse) {
      loadAppointments();
    }
  }, [selectedWarehouse, filterStatus, loadAppointments]);

  useEffect(() => {
    if (showCreateModal && selectedWarehouse) {
      loadFormData();
    }
  }, [showCreateModal, selectedWarehouse]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  }, [loadAppointments]);

  const handleCreateAppointment = async () => {
    try {
      const response = await fetch(`${API_URL}/dock/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
          ...newAppointment,
          warehouseId: selectedWarehouse,
          scheduledDate: new Date(newAppointment.scheduledDate).toISOString(),
          priority: parseInt(newAppointment.priority)
        })
      });

      if (response.ok) {
        await loadAppointments();
        setShowCreateModal(false);
        setNewAppointment({
          asnId: '',
          supplierId: '',
          dockDoorId: '',
          carrierName: '',
          driverName: '',
          driverPhone: '',
          scheduledDate: '',
          scheduledTimeSlot: '',
          appointmentType: 'RECEIVING',
          priority: 1,
          specialRequirements: '',
          equipment: '',
          notes: ''
        });
        Alert.alert('Success', 'Appointment created successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', 'Failed to create appointment');
    }
  };

  const handleCheckIn = async (appointmentId) => {
    try {
      const response = await fetch(`${API_URL}/dock/appointments/${appointmentId}/checkin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        }
      });

      if (response.ok) {
        await loadAppointments();
        Alert.alert('Success', 'Appointment checked in successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to check in');
      }
    } catch (error) {
      console.error('Error checking in:', error);
      Alert.alert('Error', 'Failed to check in');
    }
  };

  const handleCheckOut = async (appointmentId) => {
    try {
      const response = await fetch(`${API_URL}/dock/appointments/${appointmentId}/checkout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        }
      });

      if (response.ok) {
        await loadAppointments();
        Alert.alert('Success', 'Appointment checked out successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to check out');
      }
    } catch (error) {
      console.error('Error checking out:', error);
      Alert.alert('Error', 'Failed to check out');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      SCHEDULED: '#007bff',
      CONFIRMED: '#28a745',
      CHECKED_IN: '#17a2b8',
      IN_PROGRESS: '#ffc107',
      COMPLETED: '#6c757d',
      CANCELLED: '#dc3545',
      NO_SHOW: '#dc3545'
    };
    return colors[status] || '#666';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAppointmentCard = ({ item }) => (
    <TouchableOpacity
      style={styles.appointmentCard}
      onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.appointmentCardContent}>
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentInfoContainer}>
            <View style={styles.appointmentIconContainer}>
              <MaterialCommunityIcons name="calendar-check" size={20} color="#007AFF" />
            </View>
            <View style={styles.appointmentInfo}>
              <Text style={styles.appointmentNumber}>{item.appointmentNumber}</Text>
              <Text style={styles.appointmentTime}>{formatDateTime(item.scheduledDate)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.appointmentDetails}>
          {item.carrierName && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="truck-delivery" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>Carrier: {item.carrierName}</Text>
            </View>
          )}
          
          {item.driverName && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>Driver: {item.driverName}</Text>
            </View>
          )}
          
          {item.dockDoor && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="garage" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>Door: {item.dockDoor.doorNumber}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#8E8E93" />
            <Text style={styles.detailText}>Time Slot: {item.scheduledTimeSlot}</Text>
          </View>
        </View>

        <View style={styles.appointmentActions}>
          {item.status === 'SCHEDULED' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#28a745' }]}
              onPress={() => handleCheckIn(item.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="login" size={16} color="white" />
              <Text style={styles.actionButtonText}>Check In</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'CHECKED_IN' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#dc3545' }]}
              onPress={() => handleCheckOut(item.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="logout" size={16} color="white" />
              <Text style={styles.actionButtonText}>Check Out</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#007bff' }]}
            onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.id })}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="eye" size={16} color="white" />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Appointment Overview</Text>
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.todayAppointments || 0}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.scheduledAppointments || 0}</Text>
              <Text style={styles.statLabel}>Scheduled</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.checkedInAppointments || 0}</Text>
              <Text style={styles.statLabel}>Checked In</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.completedAppointments || 0}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
        {['ALL', 'SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
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

  if (loading && appointments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Appointments" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Appointments"
        rightIcons={[
          {
            icon: 'refresh',
            color: '#007AFF',
            onPress: () => loadAppointments()
          }
        ]}
      />

      {renderStatsCard()}
      {renderFilterButtons()}

      <View style={styles.content}>
        <FlatList
          data={appointments}
          renderItem={renderAppointmentCard}
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
              <MaterialCommunityIcons name="calendar-clock" size={64} color="#C7C7CC" />
              <Text style={styles.emptyText}>No Appointments Found</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to schedule your first appointment
              </Text>
            </View>
          )}
        />
      </View>

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>

      {/* Create Appointment Modal */}
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
            <Text style={styles.modalTitle}>Schedule Appointment</Text>
            <TouchableOpacity onPress={handleCreateAppointment}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Appointment Type *</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity style={styles.pickerButton}>
                    <Text style={styles.pickerText}>{newAppointment.appointmentType}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Scheduled Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newAppointment.scheduledDate}
                  onChangeText={(text) => setNewAppointment({...newAppointment, scheduledDate: text})}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Time Slot *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newAppointment.scheduledTimeSlot}
                  onChangeText={(text) => setNewAppointment({...newAppointment, scheduledTimeSlot: text})}
                  placeholder="08:00-10:00"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Carrier Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={newAppointment.carrierName}
                  onChangeText={(text) => setNewAppointment({...newAppointment, carrierName: text})}
                  placeholder="Enter carrier name"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Driver Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={newAppointment.driverName}
                  onChangeText={(text) => setNewAppointment({...newAppointment, driverName: text})}
                  placeholder="Enter driver name"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Driver Phone</Text>
                <TextInput
                  style={styles.formInput}
                  value={newAppointment.driverPhone}
                  onChangeText={(text) => setNewAppointment({...newAppointment, driverPhone: text})}
                  placeholder="Enter phone number"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Special Requirements</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={newAppointment.specialRequirements}
                  onChangeText={(text) => setNewAppointment({...newAppointment, specialRequirements: text})}
                  placeholder="Enter any special requirements"
                  placeholderTextColor="#8E8E93"
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={newAppointment.notes}
                  onChangeText={(text) => setNewAppointment({...newAppointment, notes: text})}
                  placeholder="Enter additional notes"
                  placeholderTextColor="#8E8E93"
                  multiline
                />
              </View>
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

  // Appointment Cards
  appointmentCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  appointmentCardContent: {
    padding: 16,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appointmentInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appointmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
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
  appointmentDetails: {
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
  appointmentActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F8F9FA',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    backgroundColor: 'white',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  pickerText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
});

export default AppointmentSchedulingScreen; 