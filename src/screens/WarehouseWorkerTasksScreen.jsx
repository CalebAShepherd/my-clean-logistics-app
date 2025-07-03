import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { fetchMyTasks, startCycleCountTask, unassignCycleCountTask } from '../api/cycleCounting';
import { getApiUrl } from '../utils/apiHost';

const { width } = Dimensions.get('window');

const API_URL = getApiUrl();

function WarehouseWorkerTasksScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  
  // State
  const [tasks, setTasks] = useState([]);
  const [cycleCountTasks, setCycleCountTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const taskFilters = [
    { key: 'ALL', label: 'All Tasks', icon: 'view-list' },
    { key: 'PICK', label: 'Pick Tasks', icon: 'package-down' },
    { key: 'PUTAWAY', label: 'Put Away', icon: 'package-up' },
    { key: 'RECEIVE', label: 'Receiving', icon: 'truck-delivery' },
    { key: 'COUNT', label: 'Cycle Count', icon: 'counter' },
    { key: 'CROSSDOCK', label: 'Cross Dock', icon: 'transit-connection-variant' },
    { key: 'LOADING', label: 'Loading', icon: 'truck-plus' },
    { key: 'UNLOADING', label: 'Unloading', icon: 'truck-minus' },
    { key: 'HIGH_PRIORITY', label: 'High Priority', icon: 'priority-high' }
  ];

  const taskStatusColors = {
    ASSIGNED: '#007AFF',
    IN_PROGRESS: '#FF9500',
    COMPLETED: '#34C759',
    PAUSED: '#8E8E93'
  };

  const priorityColors = {
    HIGH: '#FF3B30',
    MEDIUM: '#FF9500',
    LOW: '#34C759'
  };

  // Load tasks
  const loadTasks = async () => {
    try {
      let allTasks = [];
      
      // Load general warehouse tasks
      try {
        const warehouseTasksResponse = await fetch(`${API_URL}/warehouse-worker/my-tasks`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });

        if (warehouseTasksResponse.ok) {
          const data = await warehouseTasksResponse.json();
          const warehouseTasks = (data.all || []).map(task => ({
            ...task,
            taskSource: 'warehouse'
          }));
          allTasks = [...allTasks, ...warehouseTasks];
        }
      } catch (warehouseError) {
        console.error('Error loading warehouse tasks:', warehouseError);
      }

      // Load cycle count tasks
      try {
        const cycleCountTasksResponse = await fetchMyTasks(userToken);
        
        if (Array.isArray(cycleCountTasksResponse) && cycleCountTasksResponse.length > 0) {
          // Add cycle count tasks
          const cycleCountTaskList = cycleCountTasksResponse.map((task) => {
            return {
              ...task,
              taskSource: 'cycleCount',
              type: 'COUNT',
              priority: getPriorityFromStatus(task.status),
              title: `${task.cycleCount?.name || 'Unknown Count'} - ${getLocationString(task.location)}`,
              description: `${task.items?.length || 0} items to count`,
              warehouse: task.cycleCount?.warehouse?.name || 'Unknown Warehouse'
            };
          });
          
          setCycleCountTasks(cycleCountTasksResponse);
          allTasks = [...allTasks, ...cycleCountTaskList];
        }
      } catch (cycleCountError) {
        console.error('Error loading cycle count tasks:', cycleCountError.message || cycleCountError);
        // Silently fail for cycle count tasks - they're not critical for the task list
        // The warehouse tasks will still be displayed
        setCycleCountTasks([]);
      }
      
      setTasks(allTasks);
      filterTasks(allTasks, selectedFilter);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks');
    }
  };

  const filterTasks = (taskList, filter) => {
    let filtered = taskList;

    if (filter === 'HIGH_PRIORITY') {
      filtered = taskList.filter(task => task.priority === 'HIGH');
    } else if (filter !== 'ALL') {
      filtered = taskList.filter(task => task.type === filter);
    }

    setFilteredTasks(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      if (userToken) {
        setLoading(true);
        loadTasks().finally(() => setLoading(false));
      }
    }, [userToken])
  );

  // Filter change
  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    filterTasks(tasks, filter);
    setShowFilterModal(false);
  };

  // Task actions
  const startTask = async (task) => {
    try {
      if (task.taskSource === 'cycleCount') {
        // Handle cycle count task start
        await startCycleCountTask(userToken, task.id);
        Alert.alert('Success', 'Cycle count task started successfully');
        
        // Navigate to cycle count task detail
        navigation.navigate('CycleCountTaskDetail', { taskId: task.id });
      } else {
        // Handle warehouse task start
        const response = await fetch(`${API_URL}/warehouse-worker/tasks/${task.id}/start`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ taskType: task.type })
        });

        if (response.ok) {
          Alert.alert('Success', 'Task started successfully');
        } else {
          Alert.alert('Error', 'Failed to start task');
        }
      }
      
      loadTasks();
      setShowTaskModal(false);
    } catch (error) {
      console.error('Error starting task:', error);
      Alert.alert('Error', 'Failed to start task');
    }
  };

  const pauseTask = async (task) => {
    Alert.alert(
      'Pause Task',
      'Why are you pausing this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Break', onPress: () => submitPause(task, 'Taking a break') },
        { text: 'Issue Found', onPress: () => submitPause(task, 'Found an issue') },
        { text: 'Other', onPress: () => submitPause(task, 'Other reason') }
      ]
    );
  };

  const submitPause = async (task, reason) => {
    try {
      if (task.taskSource === 'cycleCount') {
        // For cycle count tasks, we can't pause them in the same way
        // Instead, show info that they can resume from where they left off
        Alert.alert(
          'Task Noted',
          'Your progress is automatically saved. You can resume this cycle count task anytime.',
          [{ text: 'OK', onPress: () => setShowTaskModal(false) }]
        );
      } else {
        // Handle warehouse task pause
        const response = await fetch(`${API_URL}/warehouse-worker/tasks/${task.id}/pause`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ taskType: task.type, reason })
        });

        if (response.ok) {
          Alert.alert('Success', 'Task paused successfully');
          loadTasks();
          setShowTaskModal(false);
        } else {
          Alert.alert('Error', 'Failed to pause task');
        }
      }
    } catch (error) {
      console.error('Error pausing task:', error);
      Alert.alert('Error', 'Failed to pause task');
    }
  };

  const removeTask = async (task) => {
    Alert.alert(
      'Remove Task',
      'Are you sure you want to remove this task from your list? This will unassign it and make it available for other workers.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => confirmRemoveTask(task) }
      ]
    );
  };

  const confirmRemoveTask = async (task) => {
    try {
      if (task.taskSource === 'cycleCount') {
        // Determine cycleCountId (support tasks with only cycleCountId field)
        const cycleCountId = task?.cycleCount?.id || task?.cycleCountId;
        if (!cycleCountId) {
          console.warn('Unable to determine cycleCountId for task', task.id);
        } else {
          // Unassign cycle count task
          try {
            await unassignCycleCountTask(userToken, cycleCountId, task.id);
          } catch (err) {
            // If the cycle count no longer exists, treat as already removed
            if (err.message?.includes('Cycle count not found')) {
              console.warn('Cycle count already removed, treating as success');
            } else {
              throw err;
            }
          }
        }
        Alert.alert('Success', 'Task removed from your list successfully');
      } else {
        // Handle warehouse task unassignment
        const response = await fetch(`${API_URL}/warehouse-worker/unassign-task`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            taskId: task.id,
            taskType: task.type 
          })
        });

        if (response.ok) {
          Alert.alert('Success', 'Task removed from your list successfully');
        } else {
          const errText = await response.text();
          throw new Error(errText || 'Failed to remove task');
        }
      }
      
      await loadTasks();
      setShowTaskModal(false);
    } catch (error) {
      console.error('Error removing task:', error);
      Alert.alert('Error', error.message || 'Failed to remove task');
    }
  };

  // Helper functions
  const getPriorityFromStatus = (status) => {
    switch (status) {
      case 'ASSIGNED': return 'HIGH';
      case 'IN_PROGRESS': return 'HIGH';
      case 'PENDING': return 'MEDIUM';
      default: return 'LOW';
    }
  };

  const getLocationString = (location) => {
    if (!location) return 'Multiple Locations';
    return `${location.zone}-${location.aisle}-${location.shelf}`;
  };

  const getTaskIcon = (type) => {
    switch (type) {
      case 'PICK': return 'package-down';
      case 'PUTAWAY': return 'package-up';
      case 'RECEIVE': return 'truck-delivery';
      case 'COUNT': return 'counter';
      case 'CROSSDOCK': return 'transit-connection-variant';
      case 'LOADING': return 'truck-plus';
      case 'UNLOADING': return 'truck-minus';
      default: return 'clipboard-check';
    }
  };

  const renderTaskCard = ({ item }) => {
    const displayTitle = item.title || `${item.type} Task`;
    const displayLocation = item.location || item.warehouse || 'Unknown Location';
    const displayTime = item.estimatedTime || (item.taskSource === 'cycleCount' ? '10-15 min' : '5-10 min');
    const itemCount = typeof item.items === 'number' ? item.items : 
                      (Array.isArray(item.items) ? item.items.length : null);
    
    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => {
          setSelectedTask(item);
          setShowTaskModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeader}>
          <View style={[styles.taskIcon, { backgroundColor: priorityColors[item.priority] }]}>
            <MaterialCommunityIcons name={getTaskIcon(item.type)} size={20} color="white" />
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{displayTitle || 'Task'}</Text>
            <Text style={styles.taskLocation}>{displayLocation || 'Unknown Location'}</Text>
            <Text style={styles.taskTime}>Est. {displayTime || '5-10 min'}</Text>
            {item.taskSource === 'cycleCount' && item.description && (
              <Text style={styles.taskDescription}>{item.description}</Text>
            )}
          </View>
          <View style={styles.taskMeta}>
            <View style={[styles.statusBadge, { backgroundColor: taskStatusColors[item.status] || '#8E8E93' }]}>
              <Text style={styles.statusText}>{(item.status || 'PENDING').replace('_', ' ')}</Text>
            </View>
            <Text style={[styles.priorityText, { color: priorityColors[item.priority] || '#007AFF' }]}>
              {(item.priority || 'MEDIUM')} PRIORITY
            </Text>
            {item.taskSource === 'cycleCount' && (
              <Text style={styles.cycleCountLabel}>CYCLE COUNT</Text>
            )}
          </View>
        </View>
        
        {itemCount && itemCount > 0 && (
          <View style={styles.taskFooter}>
            <MaterialCommunityIcons name="package-variant" size={14} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.itemsText}>{itemCount} items</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTaskModal = () => (
    <Modal
      visible={showTaskModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowTaskModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowTaskModal(false)}
          >
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Task Details</Text>
          <View style={{ width: 24 }} />
        </View>

        {selectedTask && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.taskDetailCard}>
              <View style={styles.taskDetailHeader}>
                <View style={[styles.taskDetailIcon, { backgroundColor: priorityColors[selectedTask.priority] }]}>
                  <MaterialCommunityIcons name={getTaskIcon(selectedTask.type)} size={24} color="white" />
                </View>
                <View style={styles.taskDetailInfo}>
                  <Text style={styles.taskDetailTitle}>{selectedTask.title}</Text>
                  <Text style={styles.taskDetailType}>{selectedTask.type} Task</Text>
                </View>
              </View>

              <View style={styles.taskDetailMeta}>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color="#8E8E93" />
                  <Text style={styles.metaText}>{selectedTask.location}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#8E8E93" />
                  <Text style={styles.metaText}>Est. {selectedTask.estimatedTime}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="flag" size={16} color={priorityColors[selectedTask.priority]} />
                  <Text style={[styles.metaText, { color: priorityColors[selectedTask.priority] }]}>
                    {selectedTask.priority} Priority
                  </Text>
                </View>
                {selectedTask.items && selectedTask.items > 0 && (
                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="package-variant" size={16} color="#8E8E93" />
                    <Text style={styles.metaText}>{selectedTask.items} items</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.actionButtonsContainer}>
              {(selectedTask.status === 'ASSIGNED' || selectedTask.status === 'PENDING') && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.startButton]}
                  onPress={() => startTask(selectedTask)}
                >
                  <MaterialCommunityIcons name="play" size={20} color="white" />
                  <Text style={styles.actionButtonText}>
                    {selectedTask.taskSource === 'cycleCount' ? 'Start Counting' : 'Start Task'}
                  </Text>
                </TouchableOpacity>
              )}

              {selectedTask.status === 'IN_PROGRESS' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.pauseButton]}
                    onPress={() => pauseTask(selectedTask)}
                  >
                    <MaterialCommunityIcons name="pause" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Pause Task</Text>
                  </TouchableOpacity>
                  
                  {selectedTask.taskSource === 'cycleCount' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.continueButton]}
                      onPress={() => {
                        setShowTaskModal(false);
                        navigation.navigate('CycleCountTaskDetail', { taskId: selectedTask.id });
                      }}
                    >
                      <MaterialCommunityIcons name="counter" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Continue Counting</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {selectedTask.taskSource === 'cycleCount' ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.detailButton]}
                  onPress={() => {
                    setShowTaskModal(false);
                    navigation.navigate('CycleCountTaskDetail', { taskId: selectedTask.id });
                  }}
                >
                  <MaterialCommunityIcons name="counter" size={20} color="white" />
                  <Text style={styles.actionButtonText}>View Count Details</Text>
                </TouchableOpacity>
              ) : selectedTask.type === 'LOADING' || selectedTask.type === 'UNLOADING' ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.detailButton]}
                  onPress={() => {
                    setShowTaskModal(false);
                    navigation.navigate('LoadingTaskDetail', { taskId: selectedTask.id, taskType: selectedTask.type });
                  }}
                >
                  <MaterialCommunityIcons name="truck-delivery" size={20} color="white" />
                  <Text style={styles.actionButtonText}>View Loading Details</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.detailButton]}
                  onPress={() => {
                    setShowTaskModal(false);
                    navigation.navigate('TaskDetail', { taskId: selectedTask.id, taskType: selectedTask.type });
                  }}
                >
                  <MaterialCommunityIcons name="information" size={20} color="white" />
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
              )}

              {/* Remove Task Button */}
              <TouchableOpacity
                style={[styles.actionButton, styles.removeButton]}
                onPress={() => removeTask(selectedTask)}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>Remove from My Tasks</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.filterModalOverlay}>
        <View style={styles.filterModalContainer}>
          <Text style={styles.filterModalTitle}>Filter Tasks</Text>
          
          {taskFilters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterOption,
                selectedFilter === filter.key && styles.filterOptionSelected
              ]}
              onPress={() => handleFilterChange(filter.key)}
            >
              <MaterialCommunityIcons 
                name={filter.icon} 
                size={20} 
                color={selectedFilter === filter.key ? '#007AFF' : '#8E8E93'} 
              />
              <Text style={[
                styles.filterOptionText,
                selectedFilter === filter.key && styles.filterOptionTextSelected
              ]}>
                {filter.label}
              </Text>
              {selectedFilter === filter.key && (
                <MaterialCommunityIcons name="check" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.filterCloseButton}
            onPress={() => setShowFilterModal(false)}
          >
            <Text style={styles.filterCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="clipboard-check-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No Tasks Available</Text>
      <Text style={styles.emptyMessage}>
        {selectedFilter === 'ALL' 
          ? "You don't have any tasks assigned right now." 
          : `No ${(selectedFilter || 'filtered').toLowerCase()} tasks available.`}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Loading your tasks...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Tasks</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <MaterialCommunityIcons name="filter-variant" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Filter Summary */}
        <View style={styles.filterSummary}>
          <Text style={styles.filterSummaryText}>
            {selectedFilter === 'ALL' ? 'All Tasks' : (taskFilters.find(f => f.key === selectedFilter)?.label || 'Filtered Tasks')}
          </Text>
          <Text style={styles.taskCount}>
            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
          </Text>
        </View>

        {/* Tasks List */}
        <FlatList
          data={filteredTasks}
          renderItem={renderTaskCard}
          keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="white"
            />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

        {renderTaskModal()}
        {renderFilterModal()}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterSummaryText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  taskCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  taskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
    marginLeft: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  taskLocation: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  taskTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  taskMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  priorityText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  itemsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  
  // Filter Modal
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    maxHeight: '70%',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  filterOptionSelected: {
    backgroundColor: '#F0F8FF',
  },
  filterOptionText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
    color: '#1C1C1E',
  },
  filterOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  filterCloseButton: {
    padding: 20,
    alignItems: 'center',
  },
  filterCloseButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },

  // Task Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  taskDetailCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  taskDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  taskDetailIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskDetailInfo: {
    marginLeft: 16,
    flex: 1,
  },
  taskDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  taskDetailType: {
    fontSize: 14,
    color: '#8E8E93',
  },
  taskDetailMeta: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 8,
  },
  actionButtonsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  pauseButton: {
    backgroundColor: '#FF9500',
  },
  detailButton: {
    backgroundColor: '#007AFF',
  },
  continueButton: {
    backgroundColor: '#5856D6',
  },
  removeButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  taskDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  cycleCountLabel: {
    fontSize: 8,
    color: '#5856D6',
    fontWeight: 'bold',
    marginTop: 2,
  },
});

export default WarehouseWorkerTasksScreen; 