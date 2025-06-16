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
  RefreshControl,
  FlatList
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL = `http://${localhost}:3000`;

const DockDoorDetailsScreen = ({ navigation, route }) => {
  const { dockId } = route.params;
  const { userToken } = useContext(AuthContext);
  const [dockDoor, setDockDoor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (userToken && dockId) {
      loadDockDoorDetails();
    }
  }, [userToken, dockId]);

  const loadDockDoorDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/dock/door/${dockId}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Dock Door Data:', JSON.stringify(data, null, 2));
      setDockDoor(data);
    } catch (error) {
      console.error('Error loading dock door details:', error);
      Alert.alert('Error', 'Failed to load dock door details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDockDoorDetails();
    setRefreshing(false);
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const response = await fetch(`${API_URL}/dock/doors/${dockId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await loadDockDoorDetails();
        Alert.alert('Success', 'Dock door status updated successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      AVAILABLE: '#28a745',
      OCCUPIED: '#dc3545',
      SCHEDULED: '#007bff',
      MAINTENANCE: '#ffc107',
      OUT_OF_SERVICE: '#6c757d'
    };
    return colors[status] || '#666';
  };

  const getDoorTypeIcon = (type) => {
    const icons = {
      RECEIVING: 'truck-delivery-outline',
      SHIPPING: 'truck-delivery',
      CROSS_DOCK: 'swap-horizontal',
      MAINTENANCE: 'tools'
    };
    return icons[type] || 'garage';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const renderStatusActions = () => {
    if (!dockDoor) return null;

    const actions = [];
    const currentStatus = dockDoor.status;

    if (currentStatus === 'AVAILABLE') {
      actions.push(
        <TouchableOpacity
          key="maintenance"
          style={[styles.actionButton, { backgroundColor: '#ffc107' }]}
          onPress={() => handleStatusUpdate('MAINTENANCE')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="tools" size={18} color="white" />
          <Text style={styles.actionButtonText}>Set Maintenance</Text>
        </TouchableOpacity>
      );

      actions.push(
        <TouchableOpacity
          key="out-of-service"
          style={[styles.actionButton, { backgroundColor: '#6c757d' }]}
          onPress={() => handleStatusUpdate('OUT_OF_SERVICE')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="close-circle" size={18} color="white" />
          <Text style={styles.actionButtonText}>Out of Service</Text>
        </TouchableOpacity>
      );
    }

    if (currentStatus === 'MAINTENANCE') {
      actions.push(
        <TouchableOpacity
          key="available"
          style={[styles.actionButton, { backgroundColor: '#28a745' }]}
          onPress={() => handleStatusUpdate('AVAILABLE')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="check-circle" size={18} color="white" />
          <Text style={styles.actionButtonText}>Set Available</Text>
        </TouchableOpacity>
      );
    }

    if (currentStatus === 'OUT_OF_SERVICE') {
      actions.push(
        <TouchableOpacity
          key="available"
          style={[styles.actionButton, { backgroundColor: '#28a745' }]}
          onPress={() => handleStatusUpdate('AVAILABLE')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="check-circle" size={18} color="white" />
          <Text style={styles.actionButtonText}>Set Available</Text>
        </TouchableOpacity>
      );
    }

    return actions.length > 0 ? (
      <View style={styles.actionsContainer}>
        <Text style={styles.actionsTitle}>Status Actions</Text>
        <View style={styles.actionButtonsContainer}>
          {actions}
        </View>
      </View>
    ) : null;
  };

  const renderAppointmentItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.listItemContent}>
        <View style={styles.listItemHeader}>
          <MaterialCommunityIcons name="calendar-check" size={20} color="#007AFF" />
          <Text style={styles.listItemTitle}>{item.appointmentNumber}</Text>
          <View style={[styles.listItemStatus, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.listItemStatusText}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.listItemDetails}>
          <Text style={styles.listItemSubtitle}>
            {formatDateTime(item.scheduledDate)} • {item.scheduledTimeSlot}
          </Text>
          {item.supplier && (
            <Text style={styles.listItemInfo}>Supplier: {item.supplier.name}</Text>
          )}
          {item.carrierName && (
            <Text style={styles.listItemInfo}>Carrier: {item.carrierName}</Text>
          )}
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  const renderReceiptItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listItem}
      activeOpacity={0.7}
    >
      <View style={styles.listItemContent}>
        <View style={styles.listItemHeader}>
          <MaterialCommunityIcons name="receipt" size={20} color="#007AFF" />
          <Text style={styles.listItemTitle}>{item.receiptNumber}</Text>
          <View style={[styles.listItemStatus, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.listItemStatusText}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.listItemDetails}>
          <Text style={styles.listItemSubtitle}>
            {formatDateTime(item.createdAt)}
          </Text>
          {item.asn && (
            <Text style={styles.listItemInfo}>ASN: {item.asn.asnNumber}</Text>
          )}
          {item.receiver && (
            <Text style={styles.listItemInfo}>Receiver: {item.receiver.username}</Text>
          )}
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  const renderTabNavigation = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
        onPress={() => setActiveTab('overview')}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.tabButtonText,
          activeTab === 'overview' && styles.tabButtonTextActive
        ]}>
          Overview
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'appointments' && styles.tabButtonActive]}
        onPress={() => setActiveTab('appointments')}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.tabButtonText,
          activeTab === 'appointments' && styles.tabButtonTextActive
        ]}>
          Appointments ({(dockDoor?.appointments && Array.isArray(dockDoor.appointments)) ? dockDoor.appointments.length : 0})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'receipts' && styles.tabButtonActive]}
        onPress={() => setActiveTab('receipts')}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.tabButtonText,
          activeTab === 'receipts' && styles.tabButtonTextActive
        ]}>
          Receipts ({(dockDoor?.receipts && Array.isArray(dockDoor.receipts)) ? dockDoor.receipts.length : 0})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTabContent = () => {
    if (!dockDoor) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <ScrollView 
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {/* Basic Information */}
            {renderDetailSection('Basic Information', (
              <>
                {renderDetailRow('Door Number', dockDoor.doorNumber, 'garage')}
                {renderDetailRow('Type', dockDoor.doorType, getDoorTypeIcon(dockDoor.doorType))}
                {renderDetailRow('Warehouse', dockDoor.warehouse?.name, 'warehouse')}
                {renderDetailRow('Status', dockDoor.status, 'information')}
              </>
            ), 'information')}

            {/* Technical Specifications */}
            {renderDetailSection('Technical Specifications', (
              <>
                {renderDetailRow('Equipment', dockDoor.equipment, 'tools')}
                {renderDetailRow('Max Trailer Size', dockDoor.maxTrailerSize, 'truck')}
                {renderDetailRow('Height Restriction', dockDoor.heightRestriction ? `${dockDoor.heightRestriction} ft` : null, 'ruler')}
                {renderDetailRow('Temperature Controlled', dockDoor.isTemperatureControlled ? 'Yes' : 'No', 'thermometer')}
              </>
            ), 'cog')}

            {/* Additional Information */}
            {dockDoor.notes && renderDetailSection('Notes', (
              <View style={styles.detailBlock}>
                <Text style={styles.detailValue}>{dockDoor.notes}</Text>
              </View>
            ), 'note-text')}

            {/* Status Actions */}
            {renderStatusActions()}

            <View style={styles.bottomPadding} />
          </ScrollView>
        );

      case 'appointments':
        return (
          <FlatList
            data={dockDoor.appointments || []}
            renderItem={renderAppointmentItem}
            keyExtractor={(item) => item.id}
            style={styles.tabContent}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="calendar-blank" size={64} color="#C7C7CC" />
                <Text style={styles.emptyText}>No Appointments</Text>
                <Text style={styles.emptySubtext}>
                  No appointments scheduled for this dock door
                </Text>
              </View>
            )}
          />
        );

      case 'receipts':
        return (
          <FlatList
            data={dockDoor.receipts || []}
            renderItem={renderReceiptItem}
            keyExtractor={(item) => item.id}
            style={styles.tabContent}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="receipt" size={64} color="#C7C7CC" />
                <Text style={styles.emptyText}>No Receipts</Text>
                <Text style={styles.emptySubtext}>
                  No receipts processed at this dock door
                </Text>
              </View>
            )}
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Dock Door Details" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading dock door details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dockDoor) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Dock Door Details" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#dc3545" />
          <Text style={styles.errorText}>Dock door not found</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadDockDoorDetails}
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
      <InternalHeader navigation={navigation} title="Dock Door Details" />
      
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.dockHeader}>
          <View style={styles.dockIconContainer}>
            <MaterialCommunityIcons name={getDoorTypeIcon(dockDoor.doorType)} size={32} color="#007AFF" />
          </View>
          <View style={styles.dockHeaderInfo}>
            <Text style={styles.dockNumber}>Door {dockDoor.doorNumber}</Text>
            <Text style={styles.dockType}>{dockDoor.doorType.replace('_', ' ')}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dockDoor.status) }]}>
            <Text style={styles.statusText}>{dockDoor.status}</Text>
          </View>
        </View>
      </View>

      {renderTabNavigation()}
      
      <View style={styles.contentContainer}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
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
  dockHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dockIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  dockHeaderInfo: {
    flex: 1
  },
  dockNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 4
  },
  dockType: {
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 8
  },
  tabButtonActive: {
    backgroundColor: '#007AFF'
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93'
  },
  tabButtonTextActive: {
    color: 'white'
  },
  contentContainer: {
    flex: 1,
    marginTop: 16
  },
  tabContent: {
    flex: 1
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
  listContainer: {
    padding: 16
  },
  listItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  listItemContent: {
    flex: 1
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 8,
    flex: 1
  },
  listItemStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  listItemStatusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600'
  },
  listItemDetails: {
    marginLeft: 28
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4
  },
  listItemInfo: {
    fontSize: 12,
    color: '#8E8E93'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center'
  },
  bottomPadding: {
    height: 32
  }
});

export default DockDoorDetailsScreen; 