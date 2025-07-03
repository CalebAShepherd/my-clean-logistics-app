import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Platform,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';
import { getApiUrl } from '../utils/apiHost';


const API_URL = getApiUrl();

const LoadingTaskDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userToken, user } = useContext(AuthContext);
  const { taskId, taskType = 'UNLOADING' } = route.params;

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const statusColors = {
    PENDING: '#FFC107',
    ASSIGNED: '#2196F3',
    IN_PROGRESS: '#FF9800',
    COMPLETED: '#4CAF50',
    PAUSED: '#9E9E9E',
    CANCELLED: '#F44336'
  };

  const priorityColors = {
    HIGH: '#F44336',
    MEDIUM: '#FF9800',
    LOW: '#4CAF50'
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

      const response = await fetch(`${API_URL}/warehouse-worker/tasks/${taskId}?type=${taskType}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Task not found');
        }
        throw new Error('Failed to fetch task details');
      }

      const data = await response.json();
      setTask(data);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTaskDetails();
    setRefreshing(false);
  };

  const startTask = async () => {
    try {
      setActionLoading(true);

      const response = await fetch(`${API_URL}/warehouse-worker/tasks/${taskId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ taskType })
      });

      if (!response.ok) {
        throw new Error('Failed to start task');
      }

      Alert.alert('Success', 'Task started successfully');
      await loadTaskDetails();
    } catch (error) {
      console.error('Error starting task:', error);
      Alert.alert('Error', 'Failed to start task');
    } finally {
      setActionLoading(false);
    }
  };

  const completeTask = async () => {
    Alert.alert(
      'Complete Task',
      'Are you sure you want to mark this task as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: performCompleteTask }
      ]
    );
  };

  const performCompleteTask = async () => {
    try {
      setActionLoading(true);

      const response = await fetch(`${API_URL}/warehouse-worker/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ 
          taskType,
          data: { notes: 'Task completed successfully' }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to complete task');
      }

      Alert.alert('Success', 'Task completed successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task');
    } finally {
      setActionLoading(false);
    }
  };

  const pauseTask = async () => {
    Alert.alert(
      'Pause Task',
      'Why are you pausing this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Break', onPress: () => performPauseTask('Taking a break') },
        { text: 'Equipment Issue', onPress: () => performPauseTask('Equipment issue') },
        { text: 'Other', onPress: () => performPauseTask('Other reason') }
      ]
    );
  };

  const performPauseTask = async (reason) => {
    try {
      setActionLoading(true);

      const response = await fetch(`${API_URL}/warehouse-worker/tasks/${taskId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ taskType, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to pause task');
      }

      Alert.alert('Success', 'Task paused successfully');
      await loadTaskDetails();
    } catch (error) {
      console.error('Error pausing task:', error);
      Alert.alert('Error', 'Failed to pause task');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteTask = async () => {
    Alert.alert(
      'Remove Task',
      'Are you sure you want to remove this task from your assignments? This will unassign you from the task.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: performDeleteTask }
      ]
    );
  };

  const performDeleteTask = async () => {
    try {
      setActionLoading(true);

      const response = await fetch(`${API_URL}/warehouse-worker/unassign-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ taskId, taskType })
      });

      if (!response.ok) {
        throw new Error('Failed to remove task');
      }

      Alert.alert('Success', 'Task removed from your assignments', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error removing task:', error);
      Alert.alert('Error', 'Failed to remove task');
    } finally {
      setActionLoading(false);
    }
  };

  const renderTaskHeader = () => (
    <View style={styles.headerCard}>
      <View style={styles.headerTop}>
        <View style={styles.taskTypeContainer}>
          <MaterialCommunityIcons 
            name={taskType === 'LOADING' ? 'truck-plus' : 'truck-minus'} 
            size={24} 
            color="#2196F3" 
          />
          <Text style={styles.taskType}>{taskType} Task</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[task?.status] || '#9E9E9E' }]}>
          <Text style={styles.statusText}>{task?.status?.replace('_', ' ') || 'UNKNOWN'}</Text>
        </View>
      </View>
      
      <Text style={styles.taskTitle}>
        {task?.shipment?.description || `${taskType} Task`}
      </Text>
      
      <View style={styles.taskMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="business" size={16} color="#666" />
          <Text style={styles.metaText}>{task?.warehouse?.name || 'Unknown Warehouse'}</Text>
        </View>
        
        {task?.dockDoor && (
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="truck-delivery" size={16} color="#666" />
            <Text style={styles.metaText}>Dock {task.dockDoor.doorNumber}</Text>
          </View>
        )}
        
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="flag" size={16} color={priorityColors[task?.priority] || '#9E9E9E'} />
          <Text style={[styles.metaText, { color: priorityColors[task?.priority] || '#9E9E9E' }]}>
            {task?.priority || 'MEDIUM'} Priority
          </Text>
        </View>
      </View>
    </View>
  );

  const renderShipmentDetails = () => (
    <View style={styles.detailCard}>
      <Text style={styles.sectionTitle}>Shipment Details</Text>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Origin:</Text>
        <Text style={styles.detailValue}>{task?.shipment?.origin || 'Not specified'}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Destination:</Text>
        <Text style={styles.detailValue}>{task?.shipment?.destination || 'Not specified'}</Text>
      </View>
      
      {task?.shipment?.weight && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Weight:</Text>
          <Text style={styles.detailValue}>{task.shipment.weight} lbs</Text>
        </View>
      )}
      
      {task?.shipment?.palletCount && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Pallets:</Text>
          <Text style={styles.detailValue}>{task.shipment.palletCount}</Text>
        </View>
      )}
    </View>
  );

  const renderWorkerAssignments = () => (
    <View style={styles.detailCard}>
      <Text style={styles.sectionTitle}>Worker Assignments</Text>
      
      {task?.workerAssignments?.length > 0 ? (
        task.workerAssignments.map((assignment, index) => (
          <View key={assignment.id || index} style={styles.workerRow}>
            <Ionicons name="person-circle" size={24} color="#2196F3" />
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{assignment.worker.username}</Text>
              <Text style={styles.workerEmail}>{assignment.worker.email}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.noWorkersText}>No workers assigned</Text>
      )}
    </View>
  );

  const renderActionButtons = () => {
    if (!task) return null;

    const canStart = task.status === 'ASSIGNED' || task.status === 'PENDING';
    const canPause = task.status === 'IN_PROGRESS';
    const canComplete = task.status === 'IN_PROGRESS';

    return (
      <View style={styles.actionContainer}>
        {canStart && (
          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={startTask}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="play" size={20} color="white" />
                <Text style={styles.actionButtonText}>Start Task</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {canPause && (
          <TouchableOpacity
            style={[styles.actionButton, styles.pauseButton]}
            onPress={pauseTask}
            disabled={actionLoading}
          >
            <MaterialCommunityIcons name="pause" size={20} color="white" />
            <Text style={styles.actionButtonText}>Pause Task</Text>
          </TouchableOpacity>
        )}

        {canComplete && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={completeTask}
            disabled={actionLoading}
          >
            <MaterialCommunityIcons name="check" size={20} color="white" />
            <Text style={styles.actionButtonText}>Complete Task</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={deleteTask}
          disabled={actionLoading}
        >
          <MaterialCommunityIcons name="delete-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>Remove Task</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader 
          navigation={navigation}
          title="Loading Task Details" 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading task details...</Text>
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
          <Text style={styles.errorText}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation}
        title="Loading Task Details" 
      />
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderTaskHeader()}
        {renderShipmentDetails()}
        {renderWorkerAssignments()}
        {renderActionButtons()}
      </ScrollView>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  headerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskType: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#2196F3',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  detailCard: {
    backgroundColor: 'white',
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  workerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  workerEmail: {
    fontSize: 14,
    color: '#666',
  },
  noWorkersText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  actionContainer: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoadingTaskDetailScreen; 