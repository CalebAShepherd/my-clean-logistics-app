import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL = `http://${localhost}:3000`;

const AppointmentDetailsScreen = ({ navigation, route }) => {
  const { appointmentId } = route.params;
  const { userToken } = useContext(AuthContext);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userToken && appointmentId) {
      loadAppointmentDetails();
    }
  }, [userToken, appointmentId]);

  const loadAppointmentDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/dock/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAppointment(data);
    } catch (error) {
      console.error('Error loading appointment details:', error);
      Alert.alert('Error', 'Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointmentDetails();
    setRefreshing(false);
  };

  const handleCheckIn = async () => {
    try {
      const response = await fetch(`${API_URL}/dock/appointments/${appointmentId}/checkin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        }
      });

      if (response.ok) {
        await loadAppointmentDetails();
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

  const handleCheckOut = async () => {
    try {
      const response = await fetch(`${API_URL}/dock/appointments/${appointmentId}/checkout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        }
      });

      if (response.ok) {
        await loadAppointmentDetails();
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

  const handleCancel = () => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/dock/appointments/${appointmentId}/cancel`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${userToken}`
                },
                body: JSON.stringify({ reason: 'Cancelled by warehouse admin' })
              });

              if (response.ok) {
                await loadAppointmentDetails();
                Alert.alert('Success', 'Appointment cancelled successfully');
              } else {
                const error = await response.json();
                Alert.alert('Error', error.error || 'Failed to cancel appointment');
              }
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          }
        }
      ]
    );
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
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderDetailSection = (title, children, icon) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name={icon} size={20} color="#007AFF" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderDetailRow = (label, value, icon) => (
    <View style={styles.detailRow}>
      {icon && <MaterialCommunityIcons name={icon} size={16} color="#8E8E93" />}
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value || 'N/A'}</Text>
    </View>
  );

  const renderActionButtons = () => {
    if (!appointment) return null;

    const actions = [];

    if (appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED') {
      actions.push(
        <TouchableOpacity
          key="checkin"
          style={[styles.actionButton, { backgroundColor: '#28a745' }]}
          onPress={handleCheckIn}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="login" size={18} color="white" />
          <Text style={styles.actionButtonText}>Check In</Text>
        </TouchableOpacity>
      );

      actions.push(
        <TouchableOpacity
          key="cancel"
          style={[styles.actionButton, { backgroundColor: '#dc3545' }]}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="cancel" size={18} color="white" />
          <Text style={styles.actionButtonText}>Cancel</Text>
        </TouchableOpacity>
      );
    }

    if (appointment.status === 'CHECKED_IN' || appointment.status === 'IN_PROGRESS') {
      actions.push(
        <TouchableOpacity
          key="checkout"
          style={[styles.actionButton, { backgroundColor: '#17a2b8' }]}
          onPress={handleCheckOut}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="logout" size={18} color="white" />
          <Text style={styles.actionButtonText}>Check Out</Text>
        </TouchableOpacity>
      );
    }

    return actions.length > 0 ? (
      <View style={styles.actionsContainer}>
        <Text style={styles.actionsTitle}>Actions</Text>
        <View style={styles.actionButtonsContainer}>
          {actions}
        </View>
      </View>
    ) : null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Appointment Details" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading appointment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Appointment Details" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#dc3545" />
          <Text style={styles.errorText}>Appointment not found</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadAppointmentDetails}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Appointment Details" />
      
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.appointmentHeader}>
            <View style={styles.appointmentIconContainer}>
              <MaterialCommunityIcons name="calendar-check" size={32} color="#007AFF" />
            </View>
            <View style={styles.appointmentHeaderInfo}>
              <Text style={styles.appointmentNumber}>{appointment.appointmentNumber}</Text>
              <Text style={styles.appointmentType}>{appointment.appointmentType}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
              <Text style={styles.statusText}>{appointment.status}</Text>
            </View>
          </View>
        </View>

        {/* Scheduling Information */}
        {renderDetailSection('Scheduling Information', (
          <>
            {renderDetailRow('Scheduled Date', formatDate(appointment.scheduledDate), 'calendar')}
            {renderDetailRow('Time Slot', appointment.scheduledTimeSlot, 'clock')}
            {renderDetailRow('Duration', `${appointment.duration} minutes`, 'timer')}
            {renderDetailRow('Priority', appointment.priority, 'priority-high')}
            {appointment.warehouse && renderDetailRow('Warehouse', appointment.warehouse.name, 'warehouse')}
          </>
        ), 'calendar-clock')}

        {/* Transportation Details */}
        {renderDetailSection('Transportation Details', (
          <>
            {renderDetailRow('Carrier', appointment.carrierName, 'truck')}
            {renderDetailRow('Driver Name', appointment.driverName, 'account')}
            {renderDetailRow('Driver Phone', appointment.driverPhone, 'phone')}
            {appointment.equipment && renderDetailRow('Equipment', appointment.equipment, 'tools')}
          </>
        ), 'truck-delivery')}

        {/* Dock Information */}
        {appointment.dockDoor && renderDetailSection('Dock Information', (
          <>
            {renderDetailRow('Door Number', appointment.dockDoor.doorNumber, 'garage')}
            {renderDetailRow('Door Status', appointment.dockDoor.status, 'information')}
            {appointment.dockDoor.equipment && renderDetailRow('Door Equipment', appointment.dockDoor.equipment, 'tools')}
            {appointment.dockDoor.maxTrailerSize && renderDetailRow('Max Trailer Size', appointment.dockDoor.maxTrailerSize, 'truck')}
            {appointment.dockDoor.isTemperatureControlled && renderDetailRow('Temperature Controlled', 'Yes', 'thermometer')}
          </>
        ), 'garage')}

        {/* Supplier & ASN Information */}
        {(appointment.supplier || appointment.asn) && renderDetailSection('Supplier & ASN Information', (
          <>
            {appointment.supplier && renderDetailRow('Supplier', appointment.supplier.name, 'factory')}
            {appointment.asn && renderDetailRow('ASN Number', appointment.asn.asnNumber, 'file-document')}
            {appointment.asn?.supplier && renderDetailRow('ASN Supplier', appointment.asn.supplier.name, 'factory')}
          </>
        ), 'factory')}

        {/* Check-in/out Information */}
        {(appointment.checkedInAt || appointment.checkedOutAt || appointment.actualDuration) && renderDetailSection('Check-in/out Information', (
          <>
            {appointment.checkedInAt && renderDetailRow('Checked In At', formatDateTime(appointment.checkedInAt), 'login')}
            {appointment.checkedOutAt && renderDetailRow('Checked Out At', formatDateTime(appointment.checkedOutAt), 'logout')}
            {appointment.actualDuration && renderDetailRow('Actual Duration', `${appointment.actualDuration} minutes`, 'timer')}
          </>
        ), 'clipboard-check')}

        {/* Special Requirements & Notes */}
        {(appointment.specialRequirements || appointment.notes) && renderDetailSection('Additional Information', (
          <>
            {appointment.specialRequirements && (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Special Requirements:</Text>
                <Text style={styles.detailValue}>{appointment.specialRequirements}</Text>
              </View>
            )}
            {appointment.notes && (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Notes:</Text>
                <Text style={styles.detailValue}>{appointment.notes}</Text>
              </View>
            )}
          </>
        ), 'note-text')}

        {/* Action Buttons */}
        {renderActionButtons()}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  scrollContainer: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
    fontWeight: '600'
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  headerSection: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  appointmentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  appointmentHeaderInfo: {
    flex: 1
  },
  appointmentNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 4
  },
  appointmentType: {
    fontSize: 16,
    color: '#8E8E93'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start'
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 8
  },
  sectionContent: {
    gap: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
    minWidth: 120,
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 14,
    color: '#1D1D1F',
    flex: 1,
    marginLeft: 8,
    fontWeight: '400'
  },
  detailBlock: {
    paddingVertical: 8
  },
  actionsContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 16
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center'
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6
  },
  bottomPadding: {
    height: 32
  }
});

export default AppointmentDetailsScreen; 