import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  Platform,
  SafeAreaView,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';
import { getTaskDetails, getWarehouseWorkers, assignCycleCountTasks, countItem, startCycleCountTask } from '../api/cycleCounting';
import { getApiUrl } from '../utils/apiHost';


const API_URL = getApiUrl();

const CycleCountTaskDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userToken, user } = useContext(AuthContext);
  const { taskId } = route.params;

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [warehouseWorkers, setWarehouseWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [assigning, setAssigning] = useState(false);
  
  // Worker-specific state
  const [showCountModal, setShowCountModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [countedQuantity, setCountedQuantity] = useState('');
  const [countNotes, setCountNotes] = useState('');
  const [counting, setCounting] = useState(false);
  
  const isWorker = user?.role === 'warehouse_worker';

  const statusColors = {
    PENDING: '#FFC107',
    ASSIGNED: '#2196F3',
    IN_PROGRESS: '#FF9800',
    COMPLETED: '#4CAF50',
    PAUSED: '#9E9E9E',
    CANCELLED: '#F44336'
  };

  const itemStatusColors = {
    PENDING: '#FFC107',
    COUNTED: '#4CAF50',
    VARIANCE_REVIEW: '#FF9800',
    APPROVED: '#4CAF50',
    REJECTED: '#F44336',
    RECOUNTED: '#2196F3'
  };

  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  const loadTaskDetails = async () => {
    try {
      if (!userToken) {
        Alert.alert('Authentication Error', 'Please log in again');
        return;
      }

      const data = await getTaskDetails(userToken, taskId);
      setTask(data);
      
      // Load warehouse workers if not assigned or if user can reassign
      if (data.cycleCount?.warehouse) {
        loadWarehouseWorkers(data.cycleCount.warehouse.id);
      }
    } catch (error) {
      console.error('Error loading task details:', error);
      if (error.message.includes('Task not found')) {
        Alert.alert(
          'Task Not Found', 
          'This task no longer exists. It may have been deleted or completed by another user.',
          [
            { text: 'Go Back', onPress: () => navigation.goBack() }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to load task details');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouseWorkers = async (warehouseId) => {
    try {
      const workers = await getWarehouseWorkers(userToken, warehouseId);
      setWarehouseWorkers(workers);
    } catch (error) {
      console.error('Error loading warehouse workers:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTaskDetails();
    setRefreshing(false);
  };

  const handleAssignTask = () => {
    setSelectedWorker(task.assignedTo);
    setShowAssignModal(true);
  };

  const handleUnassignTask = () => {
    Alert.alert(
      'Unassign Task',
      'Are you sure you want to unassign this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unassign', onPress: () => assignTask(null) }
      ]
    );
  };

  const assignTask = async (workerId) => {
    try {
      setAssigning(true);
      
      const assignments = [{
        taskId: task.id,
        assignedToId: workerId
      }];

      await assignCycleCountTasks(userToken, task.cycleCount.id, assignments);
      
      // Refresh task details
      await loadTaskDetails();
      setShowAssignModal(false);
      
      Alert.alert(
        'Success',
        workerId ? 'Task assigned successfully' : 'Task unassigned successfully'
      );
    } catch (error) {
      console.error('Error assigning task:', error);
      Alert.alert('Error', 'Failed to assign task');
    } finally {
      setAssigning(false);
    }
  };

  // Worker-specific functions
  const handleCountItem = (item) => {
    setSelectedItem(item);
    setCountedQuantity(item.countedQty?.toString() || '');
    setCountNotes(item.notes || '');
    setShowCountModal(true);
  };

  const submitCount = async () => {
    if (!selectedItem || countedQuantity === '') {
      Alert.alert('Error', 'Please enter a quantity');
      return;
    }

    try {
      setCounting(true);
      
      // Start task if it's not already in progress
      if (task.status === 'ASSIGNED') {
        console.log('Starting task before counting...');
        await startCycleCountTask(userToken, task.id);
      }
      
      await countItem(userToken, selectedItem.id, {
        countedQty: parseInt(countedQuantity),
        notes: countNotes
      });

      Alert.alert('Success', 'Item counted successfully');
      setShowCountModal(false);
      setSelectedItem(null);
      setCountedQuantity('');
      setCountNotes('');
      
      // Refresh task details
      await loadTaskDetails();
    } catch (error) {
      console.error('Error counting item:', error);
      Alert.alert('Error', error.message || 'Failed to count item');
    } finally {
      setCounting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return 'time-outline';
      case 'ASSIGNED': return 'person-outline';
      case 'IN_PROGRESS': return 'play-circle-outline';
      case 'COMPLETED': return 'checkmark-circle-outline';
      case 'PAUSED': return 'pause-circle-outline';
      case 'CANCELLED': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const renderTaskHeader = () => (
    <View style={styles.headerCard}>
      <View style={styles.headerRow}>
        <View style={styles.headerInfo}>
          <Text style={styles.taskTitle}>
            {task.location ? 
              `${task.location.zone}-${task.location.aisle}-${task.location.shelf}` :
              'Multiple Locations'
            }
          </Text>
          <Text style={styles.cycleCountName}>{task.cycleCount.name}</Text>
          <Text style={styles.warehouseName}>{task.cycleCount.warehouse.name}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: statusColors[task.status] }
        ]}>
          <Ionicons 
            name={getStatusIcon(task.status)} 
            size={16} 
            color="#fff" 
            style={styles.statusIcon}
          />
          <Text style={styles.statusText}>{task.status.replace('_', ' ')}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{task.stats.totalItems}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{task.stats.countedItems}</Text>
          <Text style={styles.statLabel}>Counted</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{task.stats.progress}%</Text>
          <Text style={styles.statLabel}>Progress</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[
            styles.statValue,
            { color: task.stats.accuracy >= 95 ? '#4CAF50' : '#FF9800' }
          ]}>
            {task.stats.accuracy}%
          </Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { 
              width: `${task.stats.progress}%`,
              backgroundColor: statusColors[task.status]
            }
          ]}
        />
      </View>
    </View>
  );

  const renderAssignmentSection = () => {
    // Don't show assignment section for warehouse workers
    if (isWorker) return null;
    
    return (
      <View style={styles.assignmentCard}>
        <Text style={styles.sectionTitle}>Assignment</Text>
        
        {task.assignedTo ? (
          <View style={styles.assignedUser}>
            <View style={styles.userInfo}>
              <Ionicons name="person-circle" size={32} color="#2196F3" />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{task.assignedTo.username}</Text>
                <Text style={styles.userEmail}>{task.assignedTo.email}</Text>
              </View>
            </View>
            <View style={styles.assignmentActions}>
              <TouchableOpacity
                style={styles.reassignButton}
                onPress={handleAssignTask}
              >
                <Ionicons name="refresh" size={18} color="#2196F3" />
                <Text style={styles.reassignText}>Reassign</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.unassignButton}
                onPress={handleUnassignTask}
              >
                <Ionicons name="person-remove" size={18} color="#F44336" />
                <Text style={styles.unassignText}>Unassign</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.unassignedState}>
            <Ionicons name="person-add-outline" size={48} color="#9E9E9E" />
            <Text style={styles.unassignedText}>No one assigned</Text>
            <TouchableOpacity
              style={styles.assignButton}
              onPress={handleAssignTask}
            >
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={styles.assignButtonText}>Assign Worker</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderItemsList = () => (
    <View style={styles.itemsCard}>
      <Text style={styles.sectionTitle}>Items to Count ({task.items.length})</Text>
      
      <FlatList
        data={task.items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.itemRow,
              isWorker && item.status === 'PENDING' && styles.countableItem
            ]}
            onPress={() => isWorker && item.status === 'PENDING' ? handleCountItem(item) : null}
            disabled={!isWorker || item.status !== 'PENDING'}
          >
            <View style={styles.itemInfo}>
              <Text style={styles.itemSku}>{item.item.sku}</Text>
              <Text style={styles.itemName}>{item.item.name}</Text>
              <Text style={styles.itemLocation}>
                {item.location.zone}-{item.location.aisle}-{item.location.shelf}
              </Text>
            </View>
            
            <View style={styles.itemCounts}>
              {item.countedQty !== null && (
                <Text style={styles.countedQty}>Counted: {item.countedQty}</Text>
              )}
              {item.variance !== null && item.variance !== 0 && (
                <Text style={[
                  styles.variance,
                  { color: item.variance > 0 ? '#4CAF50' : '#F44336' }
                ]}>
                  Variance: {item.variance > 0 ? '+' : ''}{item.variance}
                </Text>
              )}
            </View>
            
            <View style={styles.itemActions}>
              <View style={[
                styles.itemStatusBadge,
                { backgroundColor: itemStatusColors[item.status] }
              ]}>
                <Text style={styles.itemStatusText}>
                  {item.status.replace('_', ' ')}
                </Text>
              </View>
              
              <Text style={styles.expectedQty}>Expected: {item.expectedQty}</Text>
              
              {isWorker && item.status === 'PENDING' && (
                <TouchableOpacity
                  style={styles.countButton}
                  onPress={() => handleCountItem(item)}
                >
                  <Ionicons name="calculator" size={18} color="#FFFFFF" />
                  <Text style={styles.countButtonText}>Count</Text>
                </TouchableOpacity>
              )}
              
              {isWorker && item.status === 'COUNTED' && (
                <TouchableOpacity
                  style={styles.recountButton}
                  onPress={() => handleCountItem(item)}
                >
                  <Ionicons name="refresh" size={18} color="#FFFFFF" />
                  <Text style={styles.recountButtonText}>Recount</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
        scrollEnabled={false}
      />
    </View>
  );

  const renderAssignModal = () => (
    <Modal
      visible={showAssignModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowAssignModal(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Assign Task</Text>
          <TouchableOpacity
            style={[
              styles.modalSaveButton,
              { opacity: selectedWorker ? 1 : 0.5 }
            ]}
            onPress={() => assignTask(selectedWorker?.id)}
            disabled={!selectedWorker || assigning}
          >
            <Text style={styles.modalSaveText}>
              {assigning ? 'Assigning...' : 'Assign'}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={warehouseWorkers}
          keyExtractor={worker => worker.id}
          renderItem={({ item: worker }) => (
            <TouchableOpacity
              style={[
                styles.workerItem,
                selectedWorker?.id === worker.id && styles.selectedWorkerItem
              ]}
              onPress={() => setSelectedWorker(worker)}
            >
              <View style={styles.workerInfo}>
                <Ionicons 
                  name="person-circle" 
                  size={32} 
                  color={selectedWorker?.id === worker.id ? '#2196F3' : '#9E9E9E'} 
                />
                <View style={styles.workerDetails}>
                  <Text style={[
                    styles.workerName,
                    selectedWorker?.id === worker.id && styles.selectedWorkerName
                  ]}>
                    {worker.username}
                  </Text>
                  <Text style={styles.workerEmail}>{worker.email}</Text>
                  {worker.phone && (
                    <Text style={styles.workerPhone}>{worker.phone}</Text>
                  )}
                </View>
              </View>
              {selectedWorker?.id === worker.id && (
                <Ionicons name="checkmark-circle" size={24} color="#2196F3" />
              )}
            </TouchableOpacity>
          )}
          style={styles.workersList}
        />
      </SafeAreaView>
    </Modal>
  );

  const renderCountModal = () => (
    <Modal
      visible={showCountModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowCountModal(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Count Item</Text>
          <TouchableOpacity
            style={[
              styles.modalSaveButton,
              { opacity: countedQuantity !== '' ? 1 : 0.5 }
            ]}
            onPress={submitCount}
            disabled={countedQuantity === '' || counting}
          >
            <Text style={styles.modalSaveText}>
              {counting ? 'Counting...' : 'Submit Count'}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedItem && (
          <View style={styles.modalContent}>
            <View style={styles.countItemCard}>
              <Text style={styles.countItemSku}>{selectedItem.item.sku}</Text>
              <Text style={styles.countItemName}>{selectedItem.item.name}</Text>
              <Text style={styles.countItemLocation}>
                Location: {selectedItem.location.zone}-{selectedItem.location.aisle}-{selectedItem.location.shelf}
              </Text>
              <Text style={styles.expectedQuantityLabel}>
                Expected Quantity: {selectedItem.expectedQty}
              </Text>
            </View>

            <View style={styles.countInputCard}>
              <Text style={styles.inputLabel}>Counted Quantity</Text>
              <TextInput
                style={styles.quantityInput}
                value={countedQuantity}
                onChangeText={setCountedQuantity}
                placeholder="Enter counted quantity"
                keyboardType="numeric"
                autoFocus
              />
            </View>

            <View style={styles.notesCard}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={countNotes}
                onChangeText={setCountNotes}
                placeholder="Add any notes about the count..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader 
          title="Task Details" 
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <Text>Loading task details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
              <InternalHeader 
        navigation={navigation}
        title="Task Details" 
      />
      <View style={styles.errorContainer}>
        <Text>Task not found</Text>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation}
        title="Task Details" 
      />
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
              {renderTaskHeader()}
      {renderAssignmentSection()}
      {renderItemsList()}
    </ScrollView>

    {!isWorker && renderAssignModal()}
    {isWorker && renderCountModal()}
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cycleCountName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  warehouseName: {
    fontSize: 14,
    color: '#888',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  assignmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  assignedUser: {
    
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginBottom: 20,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  assignmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
    gap: 4,
  },
  reassignText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '600',
  },
  unassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffebee',
    borderRadius: 20,
    gap: 4,
  },
  unassignText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '600',
  },
  unassignedState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  unassignedText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 12,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemSku: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemLocation: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  itemCounts: {
    alignItems: 'flex-end',
    marginHorizontal: 0,
    // minWidth: 100,
  },
  expectedQty: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    textAlign: 'center',
  },
  countedQty: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  variance: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemStatusBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 8,
  },
  itemStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '600',
  },
  workersList: {
    flex: 1,
  },
  workerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedWorkerItem: {
    backgroundColor: '#e3f2fd',
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedWorkerName: {
    color: '#2196F3',
  },
  workerEmail: {
    fontSize: 14,
    color: '#666',
  },
  workerPhone: {
    fontSize: 12,
    color: '#888',
  },
  
  // Worker-specific styles
  countableItem: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    borderRadius: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minWidth: 90,
    paddingLeft: 8,
  },
  countButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    marginTop: 8,
    gap: 6,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  countButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  recountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FF9500',
    borderRadius: 16,
    marginTop: 8,
    gap: 6,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  recountButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  countItemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  countItemSku: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  countItemName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  countItemLocation: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  expectedQuantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
  },
  countInputCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    minHeight: 80,
  },
});

export default CycleCountTaskDetailScreen; 