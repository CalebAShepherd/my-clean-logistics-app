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
import { hasPutAwayOperations } from '../utils/featureFlags';
import InternalHeader from '../components/InternalHeader';
import { getWarehouseWorkers } from '../api/cycleCounting';
import { getApiUrl } from '../utils/apiHost';


const API_URL = getApiUrl();

const PutAwayManagementScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);

  useEffect(() => {
    if (!hasPutAwayOperations(settings)) {
      Alert.alert(
        'Feature Not Available',
        'Put-away operations are not enabled for your account.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    loadWarehouses();
    loadWorkers();
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

  const loadTasks = useCallback(async () => {
    if (!selectedWarehouse) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        warehouseId: selectedWarehouse,
        ...(filterStatus !== 'ALL' && { status: filterStatus })
      });

      const [tasksResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/putaway?${params}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        }),
        fetch(`${API_URL}/putaway/stats/${selectedWarehouse}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        })
      ]);

      const tasksData = await tasksResponse.json();
      const statsData = await statsResponse.json();

      setTasks(tasksData.tasks || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load put-away tasks');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, filterStatus]);

  useEffect(() => {
    if (selectedWarehouse) {
      loadTasks();
      loadWorkers();
    }
  }, [selectedWarehouse, filterStatus, loadTasks]);

  useEffect(() => {
    if (selectedTask && workers.length === 0) {
      loadWorkers();
    }
  }, [selectedTask]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

  const handleAssignTask = async (taskId, workerId) => {
    try {
      const response = await fetch(`${API_URL}/putaway/${taskId}/assign`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ workerId })
      });

      if (response.ok) {
        await loadTasks();
        setSelectedTask(null);
        setSelectedWorker(null);
        Alert.alert('Success', 'Task assigned successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to assign task');
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      Alert.alert('Error', 'Failed to assign task');
    }
  };

  const handleAssignWorker = async () => {
    if (!selectedTask || !selectedWorker) {
      Alert.alert('Error', 'Please select a worker');
      return;
    }
    
    await handleAssignTask(selectedTask.id, selectedWorker.id);
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const response = await fetch(`${API_URL}/putaway/${taskId}/complete`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        }
      });

      if (response.ok) {
        await loadTasks();
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
      HIGH: '#DC143C',
      MEDIUM: '#FFA500',
      LOW: '#32CD32'
    };
    return colors[priority] || '#666';
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: '#FFA500',
      ASSIGNED: '#4169E1',
      IN_PROGRESS: '#FF6347',
      COMPLETED: '#008000',
      CANCELLED: '#666'
    };
    return colors[status] || '#666';
  };

  const formatDate = (dateString) => {
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
      onPress={() => navigation.navigate('PutAwayTaskDetails', { taskId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.taskCardContent}>
        <View style={styles.taskHeader}>
          <View style={styles.taskInfoContainer}>
            <View style={styles.taskIconContainer}>
              <MaterialCommunityIcons name="package-up" size={20} color="#007AFF" />
            </View>
            <View style={styles.taskInfo}>
              <Text style={styles.taskId}>Task #{item.id}</Text>
              <Text style={styles.taskLocation}>
                {item.sourceLocation} → {item.destinationLocation}
              </Text>
            </View>
          </View>
          <View style={styles.taskStatusContainer}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
              <Text style={styles.priorityText}>{item.priority}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.taskDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="package-variant" size={16} color="#8E8E93" />
            <Text style={styles.detailText}>
              Item: {item.inventoryItem?.name || 'N/A'} ({item.quantity} units)
            </Text>
          </View>
          
          {item.assignedTo && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>Assigned: {item.assignedTo.name}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color="#8E8E93" />
            <Text style={styles.detailText}>Created: {formatDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.taskActions}>
          {item.status === 'PENDING' && !item.assignedTo && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#007bff' }]}
              onPress={() => setSelectedTask(item)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="account-plus" size={16} color="white" />
              <Text style={styles.actionButtonText}>Assign Worker</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'IN_PROGRESS' && (
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
            onPress={() => navigation.navigate('PutAwayTaskDetails', { taskId: item.id })}
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
        <Text style={styles.sectionTitle}>Put-Away Overview</Text>
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
        {['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
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

  if (loading && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Put-Away Tasks" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading put-away tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Put-Away Tasks"
        rightIcons={[
          {
            icon: 'refresh',
            color: '#007AFF',
            onPress: () => loadTasks()
          }
        ]}
      />

      {renderStatsCard()}
      {renderFilterButtons()}

      <View style={styles.content}>
        <FlatList
          data={tasks}
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
              <MaterialCommunityIcons name="package-up" size={64} color="#C7C7CC" />
              <Text style={styles.emptyText}>No Put-Away Tasks</Text>
              <Text style={styles.emptySubtext}>
                Put-away tasks will appear here when items need to be stored
              </Text>
            </View>
          )}
        />
      </View>

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
                        <Text style={styles.workerName}>{item.name}</Text>
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
    paddingBottom: 40,
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
  taskId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  taskLocation: {
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
});

export default PutAwayManagementScreen; 