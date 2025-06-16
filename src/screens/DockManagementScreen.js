import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { hasDockManagement } from '../utils/featureFlags';
import InternalHeader from '../components/InternalHeader';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

const DockManagementScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [dockDoors, setDockDoors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [activeTab, setActiveTab] = useState('DOORS');

      useEffect(() => {
      if (!hasDockManagement(settings)) {
        Alert.alert(
          'Feature Not Available',
        'Dock management is not enabled for your account.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    loadWarehouses();
  }, [settings]);

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

  const loadData = useCallback(async () => {
    if (!selectedWarehouse) return;

    try {
      setLoading(true);
      const [doorsResponse, appointmentsResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/dock/doors/${selectedWarehouse}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        }),
        fetch(`${API_URL}/dock/appointments?warehouseId=${selectedWarehouse}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        }),
        fetch(`${API_URL}/dock/appointments/stats/${selectedWarehouse}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        })
      ]);

      const doorsData = await doorsResponse.json();
      const appointmentsData = await appointmentsResponse.json();
      const statsData = await statsResponse.json();

      setDockDoors(doorsData);
      setAppointments(appointmentsData.appointments || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dock data:', error);
      Alert.alert('Error', 'Failed to load dock information');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, userToken]);

  useEffect(() => {
    if (selectedWarehouse) {
      loadData();
    }
  }, [selectedWarehouse, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

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
        await loadData();
        Alert.alert('Success', 'Vehicle checked in successfully');
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
        await loadData();
        Alert.alert('Success', 'Vehicle checked out successfully');
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
      AVAILABLE: '#28a745',
      OCCUPIED: '#dc3545',
      MAINTENANCE: '#ffc107',
      SCHEDULED: '#007bff',
      CHECKED_IN: '#17a2b8',
      COMPLETED: '#6c757d'
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

  const renderDockDoorCard = ({ item }) => (
    <TouchableOpacity
      style={styles.dockCard}
      onPress={() => navigation.navigate('DockDoorDetails', { dockId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.dockCardContent}>
        <View style={styles.dockHeader}>
          <View style={styles.dockInfoContainer}>
            <View style={styles.dockIconContainer}>
              <MaterialCommunityIcons 
                name={item.status === 'OCCUPIED' ? 'truck' : 'garage'} 
                size={20} 
                color="#007AFF" 
              />
            </View>
            <View style={styles.dockInfo}>
              <Text style={styles.dockName}>Door {item.doorNumber}</Text>
              <Text style={styles.dockType}>{item.type}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.dockDetails}>
          {item.currentAppointment && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>
                Appointment: {item.currentAppointment.referenceNumber}
              </Text>
            </View>
          )}
          
          {item.carrierName && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="truck-delivery" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>Carrier: {item.carrierName}</Text>
            </View>
          )}
          
          {item.estimatedTime && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>ETA: {formatDate(item.estimatedTime)}</Text>
            </View>
          )}
        </View>

        <View style={styles.dockActions}>
          {item.status === 'AVAILABLE' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#28a745' }]}
              onPress={() => handleCheckIn(item.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="login" size={16} color="white" />
              <Text style={styles.actionButtonText}>Check In</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'OCCUPIED' && (
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
            onPress={() => navigation.navigate('DockDoorDetails', { dockId: item.id })}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="eye" size={16} color="white" />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

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
              <Text style={styles.appointmentRef}>{item.referenceNumber}</Text>
              <Text style={styles.appointmentTime}>{formatDate(item.scheduledTime)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="truck-delivery" size={16} color="#8E8E93" />
            <Text style={styles.detailText}>Carrier: {item.carrierName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="package-variant" size={16} color="#8E8E93" />
            <Text style={styles.detailText}>Type: {item.type}</Text>
          </View>
          
          {item.assignedDoor && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="garage" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>Door: {item.assignedDoor.doorNumber}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Dock Overview</Text>
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalDoors || 0}</Text>
              <Text style={styles.statLabel}>Total Doors</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.availableDoors || 0}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.occupiedDoors || 0}</Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.todayAppointments || 0}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderTabNavigation = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'doors' && styles.tabButtonActive]}
        onPress={() => setActiveTab('doors')}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons 
          name="garage" 
          size={20} 
          color={activeTab === 'doors' ? '#007AFF' : '#8E8E93'} 
        />
        <Text style={[
          styles.tabButtonText,
          activeTab === 'doors' && styles.tabButtonTextActive
        ]}>
          Dock Doors
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'appointments' && styles.tabButtonActive]}
        onPress={() => setActiveTab('appointments')}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons 
          name="calendar-clock" 
          size={20} 
          color={activeTab === 'appointments' ? '#007AFF' : '#8E8E93'} 
        />
        <Text style={[
          styles.tabButtonText,
          activeTab === 'appointments' && styles.tabButtonTextActive
        ]}>
          Appointments
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && (dockDoors.length === 0 && appointments.length === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Dock Management" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading dock data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Dock Management"
        rightIcons={[
          {
            icon: 'refresh',
            color: '#007AFF',
            onPress: () => {
              loadDockDoors();
              loadAppointments();
            }
          }
        ]}
      />

      {renderStatsCard()}
      {renderTabNavigation()}

      <View style={styles.content}>
        {activeTab === 'doors' ? (
          <FlatList
            data={dockDoors}
            renderItem={renderDockDoorCard}
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
                <MaterialCommunityIcons name="garage" size={64} color="#C7C7CC" />
                <Text style={styles.emptyText}>No Dock Doors</Text>
                <Text style={styles.emptySubtext}>
                  Dock doors will appear here when configured
                </Text>
              </View>
            )}
          />
        ) : (
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
                <Text style={styles.emptyText}>No Appointments</Text>
                <Text style={styles.emptySubtext}>
                  Scheduled appointments will appear here
                </Text>
              </View>
            )}
          />
        )}
      </View>
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

  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    backgroundColor: '#F8F9FA',
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  tabButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },

  // Content & List
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  listContainer: {
    paddingBottom: 40,
  },

  // Dock Door Cards
  dockCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  dockCardContent: {
    padding: 16,
  },
  dockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dockInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dockIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dockInfo: {
    flex: 1,
  },
  dockName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  dockType: {
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
  dockDetails: {
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
  dockActions: {
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
  appointmentRef: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  appointmentDetails: {
    gap: 12,
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
});

export default DockManagementScreen; 