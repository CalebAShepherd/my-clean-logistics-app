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
import { hasCrossDocking } from '../utils/featureFlags';
import InternalHeader from '../components/InternalHeader';
import { getWarehouseWorkers } from '../api/cycleCounting';
import { getApiUrl } from '../utils/apiHost';


const API_URL = getApiUrl();

const CrossDockManagementScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [crossDockTasks, setCrossDockTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  
  // Inline picker expansion states
  const [expandedInventoryPicker, setExpandedInventoryPicker] = useState(false);
  const [expandedInboundPicker, setExpandedInboundPicker] = useState(false);
  const [expandedOutboundPicker, setExpandedOutboundPicker] = useState(false);
  
  const [newTask, setNewTask] = useState({
    inventoryItemId: '',
    quantity: '',
    inboundShipmentId: '',
    outboundShipmentId: '',
    priority: 1,
    stagingLocation: '',
    notes: ''
  });

  useEffect(() => {
    if (!hasCrossDocking(settings)) {
      Alert.alert(
        'Feature Not Available',
        'Cross-docking is not enabled for your account.',
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

  const loadWorkers = async () => {
    if (!selectedWarehouse) {
      return;
    }
    
    try {
      const workers = await getWarehouseWorkers(userToken, selectedWarehouse);
      setWorkers(workers);
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const loadCrossDockTasks = useCallback(async () => {
    if (!selectedWarehouse || !userToken) {
      console.log('loadCrossDockTasks: Missing requirements - selectedWarehouse:', selectedWarehouse, 'userToken:', userToken ? 'present' : 'missing');
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        warehouseId: selectedWarehouse,
        ...(filterStatus !== 'ALL' && { status: filterStatus })
      });

      console.log('loadCrossDockTasks: Making API calls to:', `${API_URL}/crossdock?${params}`);
      console.log('loadCrossDockTasks: Using token:', userToken.substring(0, 20) + '...');

      const [tasksResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/crossdock?${params}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        }),
        fetch(`${API_URL}/crossdock/stats/${selectedWarehouse}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        })
      ]);

      console.log('loadCrossDockTasks: Tasks response status:', tasksResponse.status);
      console.log('loadCrossDockTasks: Stats response status:', statsResponse.status);

      if (!tasksResponse.ok) {
        const errorText = await tasksResponse.text();
        console.log('loadCrossDockTasks: Tasks error response:', errorText);
        throw new Error(`Tasks API error: ${tasksResponse.status}`);
      }
      if (!statsResponse.ok) {
        const errorText = await statsResponse.text();
        console.log('loadCrossDockTasks: Stats error response:', errorText);
        throw new Error(`Stats API error: ${statsResponse.status}`);
      }

      const tasksData = await tasksResponse.json();
      const statsData = await statsResponse.json();

      console.log('loadCrossDockTasks: Tasks data:', tasksData);
      console.log('loadCrossDockTasks: Stats data:', statsData);

      setCrossDockTasks(tasksData.tasks || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading cross-dock tasks:', error);
      Alert.alert('Error', `Error loading cross-dock tasks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, filterStatus, userToken]);

  const loadFormData = async () => {
    if (!selectedWarehouse) {
      return;
    }

    try {
      const [inventoryResponse, shipmentsResponse] = await Promise.all([
        fetch(`${API_URL}/inventory-items?warehouseId=${selectedWarehouse}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        }),
        fetch(`${API_URL}/api/shipments?warehouseId=${selectedWarehouse}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        })
      ]);

      const inventoryData = await inventoryResponse.json();
      const shipmentsData = await shipmentsResponse.json();

      setInventoryItems(inventoryData);
      setShipments(shipmentsData.shipments || []);
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  useEffect(() => {
    if (selectedWarehouse) {
      loadCrossDockTasks();
      loadWorkers();
    }
  }, [selectedWarehouse, filterStatus, loadCrossDockTasks]);

  useEffect(() => {
    if (showCreateModal && selectedWarehouse) {
      loadFormData();
    }
  }, [showCreateModal, selectedWarehouse]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCrossDockTasks();
    setRefreshing(false);
  }, [loadCrossDockTasks]);

  const handleCreateTask = async () => {
    try {
      const response = await fetch(`${API_URL}/crossdock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
          ...newTask,
          warehouseId: selectedWarehouse,
          quantity: parseInt(newTask.quantity),
          priority: parseInt(newTask.priority)
        })
      });

      if (response.ok) {
        await loadCrossDockTasks();
        setShowCreateModal(false);
        setNewTask({
          inventoryItemId: '',
          quantity: '',
          inboundShipmentId: '',
          outboundShipmentId: '',
          priority: 1,
          stagingLocation: '',
          notes: ''
        });
        Alert.alert('Success', 'Cross-dock task created successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task');
    }
  };

  const handleAssignWorker = async () => {
    if (!selectedTask || !selectedWorker) {
      Alert.alert('Error', 'Please select a worker');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/crossdock/${selectedTask.id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ workerId: selectedWorker.id })
      });

      if (response.ok) {
        await loadCrossDockTasks();
        setSelectedTask(null);
        setSelectedWorker(null);
        Alert.alert('Success', 'Worker assigned successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to assign worker');
      }
    } catch (error) {
      console.error('Error assigning worker:', error);
      Alert.alert('Error', 'Failed to assign worker');
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      const response = await fetch(`${API_URL}/crossdock/${taskId}/start`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        }
      });

      if (response.ok) {
        await loadCrossDockTasks();
        Alert.alert('Success', 'Task started successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to start task');
      }
    } catch (error) {
      console.error('Error starting task:', error);
      Alert.alert('Error', 'Failed to start task');
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const response = await fetch(`${API_URL}/crossdock/${taskId}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        }
      });

      if (response.ok) {
        await loadCrossDockTasks();
        Alert.alert('Success', 'Task completed successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to complete task');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task');
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      1: '#32CD32', // Low - Green
      2: '#FFA500', // Medium - Orange
      3: '#DC143C'  // High - Red
    };
    return colors[priority] || '#666';
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: '#FFA500',
      ASSIGNED: '#4169E1',
      IN_PROGRESS: '#FF6347',
      STAGED: '#9370DB',
      COMPLETED: '#008000',
      CANCELLED: '#666'
    };
    return colors[status] || '#666';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTaskCard = ({ item }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => navigation.navigate('CrossDockTaskDetails', { taskId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.taskCardContent}>
        <View style={styles.taskHeader}>
          <View style={styles.taskInfoContainer}>
            <View style={styles.taskIconContainer}>
              <MaterialCommunityIcons name="swap-horizontal-circle-outline" size={20} color="#007AFF" />
            </View>
            <View style={styles.taskInfo}>
              <Text style={styles.taskNumber}>{item.taskNumber}</Text>
              <Text style={styles.taskItem}>
                {item.inventoryItem?.name || 'Unknown Item'} ({item.quantity} units)
              </Text>
            </View>
          </View>
          <View style={styles.taskStatusContainer}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
              <Text style={styles.priorityText}>P{item.priority}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.taskDetails}>
          {item.stagingLocation && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>Staging: {item.stagingLocation}</Text>
            </View>
          )}
          
          {item.assignedUser && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>Assigned: {item.assignedUser.name}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color="#8E8E93" />
            <Text style={styles.detailText}>Created: {formatDateTime(item.createdAt)}</Text>
          </View>

          {item.startTime && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="play-circle" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>Started: {formatDateTime(item.startTime)}</Text>
            </View>
          )}
        </View>

        <View style={styles.taskActions}>
          {item.status === 'PENDING' && !item.assignedUser && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#007bff' }]}
              onPress={() => setSelectedTask(item)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="account-plus" size={16} color="white" />
              <Text style={styles.actionButtonText}>Assign Worker</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'ASSIGNED' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#28a745' }]}
              onPress={() => handleStartTask(item.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="play-circle" size={16} color="white" />
              <Text style={styles.actionButtonText}>Start Task</Text>
            </TouchableOpacity>
          )}
          
          {(item.status === 'IN_PROGRESS' || item.status === 'STAGED') && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#28a745' }]}
              onPress={() => handleCompleteTask(item.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="check-circle" size={16} color="white" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#6c757d' }]}
            onPress={() => navigation.navigate('CrossDockTaskDetails', { taskId: item.id })}
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
        <Text style={styles.sectionTitle}>Cross-Dock Overview</Text>
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total || 0}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.pending || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.inProgress || 0}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.completed || 0}</Text>
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
        {['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'STAGED', 'COMPLETED', 'CANCELLED'].map((status) => (
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

  if (loading && crossDockTasks.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Cross-Docking" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading cross-dock tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Cross-Docking"
        rightIcons={[
          {
            icon: 'refresh',
            color: '#007AFF',
            onPress: () => loadCrossDockTasks()
          }
        ]}
      />

      {renderStatsCard()}
      {renderFilterButtons()}

      <View style={styles.content}>
        <FlatList
          data={crossDockTasks}
          renderItem={renderTaskCard}
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
              <MaterialCommunityIcons name="swap-horizontal-circle-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyText}>No Cross-Dock Tasks</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to create your first cross-dock task
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

      {/* Create Cross-Dock Task Modal */}
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
            <Text style={styles.modalTitle}>Create Cross-Dock Task</Text>
            <TouchableOpacity onPress={handleCreateTask}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formSection}>
              <Text style={styles.modalSectionTitle}>Task Information</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Inventory Item *</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity 
                    style={styles.pickerButton}
                    onPress={() => {
                      if (!selectedWarehouse) {
                        Alert.alert('Error', 'Please select a warehouse first');
                        return;
                      }
                      
                      setExpandedInventoryPicker(!expandedInventoryPicker);
                      setExpandedInboundPicker(false);
                      setExpandedOutboundPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerText, !newTask.inventoryItemId && styles.placeholderText]}>
                      {newTask.inventoryItemId 
                        ? inventoryItems.find(item => item.id === newTask.inventoryItemId)?.name || 'Select Item'
                        : 'Select Inventory Item'
                      }
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Inline Inventory Picker */}
              {expandedInventoryPicker && (
                <View style={styles.inlinePickerContainer}>
                  <FlatList
                    data={inventoryItems}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    style={styles.inlinePickerList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.inlinePickerItem,
                          newTask.inventoryItemId === item.id && styles.inlinePickerItemSelected
                        ]}
                        onPress={() => {
                          setNewTask({...newTask, inventoryItemId: item.id});
                          setExpandedInventoryPicker(false);
                        }}
                      >
                        <View style={styles.inlinePickerItemContent}>
                          <Text style={styles.inlinePickerItemName}>{item.name}</Text>
                          <Text style={styles.inlinePickerItemSku}>SKU: {item.sku}</Text>
                        </View>
                        {newTask.inventoryItemId === item.id && (
                          <MaterialCommunityIcons name="check-circle" size={20} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={() => (
                      <Text style={styles.inlinePickerEmpty}>No inventory items available</Text>
                    )}
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Outbound Shipment *</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity 
                    style={styles.pickerButton}
                    onPress={() => {
                      if (!selectedWarehouse) {
                        Alert.alert('Error', 'Please select a warehouse first');
                        return;
                      }
                      
                      setExpandedOutboundPicker(!expandedOutboundPicker);
                      setExpandedInventoryPicker(false);
                      setExpandedInboundPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerText, !newTask.outboundShipmentId && styles.placeholderText]}>
                      {newTask.outboundShipmentId 
                        ? shipments.find(shipment => shipment.id === newTask.outboundShipmentId)?.trackingNumber || 'Select Shipment'
                        : 'Select Outbound Shipment'
                      }
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Inline Outbound Shipment Picker */}
              {expandedOutboundPicker && (
                <View style={styles.inlinePickerContainer}>
                  <FlatList
                    data={shipments}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    style={styles.inlinePickerList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.inlinePickerItem,
                          newTask.outboundShipmentId === item.id && styles.inlinePickerItemSelected
                        ]}
                        onPress={() => {
                          setNewTask({...newTask, outboundShipmentId: item.id});
                          setExpandedOutboundPicker(false);
                        }}
                      >
                        <View style={styles.inlinePickerItemContent}>
                          <Text style={styles.inlinePickerItemName}>
                            {item.trackingNumber || `Shipment ${item.id.slice(0, 8)}`}
                          </Text>
                          <Text style={styles.inlinePickerItemSku}>
                            {item.origin} → {item.destination}
                          </Text>
                        </View>
                        {newTask.outboundShipmentId === item.id && (
                          <MaterialCommunityIcons name="check-circle" size={20} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={() => (
                      <Text style={styles.inlinePickerEmpty}>No outbound shipments available</Text>
                    )}
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Inbound Shipment (Optional)</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity 
                    style={styles.pickerButton}
                    onPress={() => {
                      if (!selectedWarehouse) {
                        Alert.alert('Error', 'Please select a warehouse first');
                        return;
                      }
                      
                      setExpandedInboundPicker(!expandedInboundPicker);
                      setExpandedInventoryPicker(false);
                      setExpandedOutboundPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerText, !newTask.inboundShipmentId && styles.placeholderText]}>
                      {newTask.inboundShipmentId 
                        ? shipments.find(shipment => shipment.id === newTask.inboundShipmentId)?.trackingNumber || 'Select Shipment'
                        : 'Select Inbound Shipment (Optional)'
                      }
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Inline Inbound Shipment Picker */}
              {expandedInboundPicker && (
                <View style={styles.inlinePickerContainer}>
                  <FlatList
                    data={shipments}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    style={styles.inlinePickerList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.inlinePickerItem,
                          newTask.inboundShipmentId === item.id && styles.inlinePickerItemSelected
                        ]}
                        onPress={() => {
                          setNewTask({...newTask, inboundShipmentId: item.id});
                          setExpandedInboundPicker(false);
                        }}
                      >
                        <View style={styles.inlinePickerItemContent}>
                          <Text style={styles.inlinePickerItemName}>
                            {item.trackingNumber || `Shipment ${item.id.slice(0, 8)}`}
                          </Text>
                          <Text style={styles.inlinePickerItemSku}>
                            {item.origin} → {item.destination}
                          </Text>
                        </View>
                        {newTask.inboundShipmentId === item.id && (
                          <MaterialCommunityIcons name="check-circle" size={20} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={() => (
                      <Text style={styles.inlinePickerEmpty}>No inbound shipments available</Text>
                    )}
                  />
                </View>
              )}
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Quantity *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newTask.quantity}
                  onChangeText={(text) => setNewTask({...newTask, quantity: text})}
                  placeholder="Enter quantity"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Priority</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity style={styles.pickerButton}>
                    <Text style={styles.pickerText}>Priority {newTask.priority}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Staging Location</Text>
                <TextInput
                  style={styles.formInput}
                  value={newTask.stagingLocation}
                  onChangeText={(text) => setNewTask({...newTask, stagingLocation: text})}
                  placeholder="Enter staging location"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={newTask.notes}
                  onChangeText={(text) => setNewTask({...newTask, notes: text})}
                  placeholder="Enter additional notes"
                  placeholderTextColor="#8E8E93"
                  multiline
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Worker Assignment Modal */}
      <Modal
        visible={selectedTask !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedTask(null)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Assign Worker</Text>
            <TouchableOpacity onPress={handleAssignWorker}>
              <Text style={styles.modalSave}>Assign</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Select Worker</Text>
              
              <FlatList
                data={workers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.workerCard,
                      selectedWorker?.id === item.id && styles.workerCardSelected
                    ]}
                    onPress={() => setSelectedWorker(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.workerInfo}>
                      <View style={styles.workerIconContainer}>
                        <MaterialCommunityIcons name="account" size={20} color="#007AFF" />
                      </View>
                      <View style={styles.workerDetails}>
                        <Text style={styles.workerName}>{item.username}</Text>
                        <Text style={styles.workerStatus}>
                          {item.isAvailable ? 'Available' : 'Busy'}
                        </Text>
                      </View>
                    </View>
                    {selectedWorker?.id === item.id && (
                      <MaterialCommunityIcons name="check-circle" size={24} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                )}
              />
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
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    // marginBottom: 16,
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

  // Task Cards
  taskCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  taskCardContent: {
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  taskInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  taskItem: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  taskStatusContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
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
  taskDetails: {
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
  taskActions: {
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
    marginTop: 20,
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
  placeholderText: {
    color: '#8E8E93',
  },
  workerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  workerCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workerDetails: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  workerStatus: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  pickerItemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  pickerItemCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  pickerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  pickerItemSku: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  pickerItemDescription: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  inlinePickerContainer: {
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    backgroundColor: 'white',
    marginTop: 8,
    maxHeight: 200,
  },
  inlinePickerList: {
    maxHeight: 180,
  },
  inlinePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  inlinePickerItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  inlinePickerItemContent: {
    flex: 1,
  },
  inlinePickerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  inlinePickerItemSku: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  inlinePickerEmpty: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    padding: 16,
  },
});

export default CrossDockManagementScreen; 