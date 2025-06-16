import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
  TextInput,
  Switch,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || `http://${localhost}:3000`;

const CycleCountDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userToken } = useContext(AuthContext);
  const { cycleCountId } = route.params;

  const [cycleCount, setCycleCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showVarianceModal, setShowVarianceModal] = useState(false);
  const [selectedVarianceItem, setSelectedVarianceItem] = useState(null);
  const [varianceReason, setVarianceReason] = useState('');
  const [adjustInventory, setAdjustInventory] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);

  const statusColors = {
    SCHEDULED: '#2196F3',
    IN_PROGRESS: '#FF9800',
    COMPLETED: '#4CAF50',
    CANCELLED: '#F44336',
    ON_HOLD: '#9E9E9E'
  };

  const taskStatusColors = {
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
    loadCycleCountDetails();
    loadAvailableUsers();
  }, [cycleCountId]);

  const loadCycleCountDetails = async () => {
    try {
      if (!userToken) {
        Alert.alert('Authentication Error', 'Please log in again');
        navigation.goBack();
        return;
      }
      const response = await fetch(
        `${API_URL}/cycle-counts/${cycleCountId}`,
        {
          headers: { 'Authorization': `Bearer ${userToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCycleCount(data);
      } else {
        Alert.alert('Error', 'Failed to load cycle count details');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading cycle count details:', error);
      Alert.alert('Error', 'Failed to load cycle count details');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      if (!userToken) return;
      const response = await fetch(
        `${API_URL}/users?role=warehouse_admin`,
        {
          headers: { 'Authorization': `Bearer ${userToken}` }
        }
      );

      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCycleCountDetails();
    setRefreshing(false);
  }, [cycleCountId]);

  const generateTasks = async () => {
    Alert.alert(
      'Generate Tasks',
      'This will create counting tasks based on the cycle count configuration. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              if (!userToken) {
                Alert.alert('Authentication Error', 'Please log in again');
                return;
              }
              const response = await fetch(
                `${API_URL}/cycle-counts/${cycleCountId}/generate-tasks`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    taskCount: 10,
                    locationFilters: {},
                    itemFilters: {}
                  })
                }
              );

              if (response.ok) {
                const result = await response.json();
                Alert.alert('Success', `Generated ${result.tasksCreated} tasks with ${result.itemsToCount} items`);
                loadCycleCountDetails();
              } else {
                Alert.alert('Error', 'Failed to generate tasks');
              }
            } catch (error) {
              console.error('Error generating tasks:', error);
              Alert.alert('Error', 'Failed to generate tasks');
            }
          }
        }
      ]
    );
  };

  const completeCycleCount = async () => {
    Alert.alert(
      'Complete Cycle Count',
      'Are you sure you want to complete this cycle count? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!userToken) {
                Alert.alert('Authentication Error', 'Please log in again');
                return;
              }
              const response = await fetch(
                `${API_URL}/cycle-counts/${cycleCountId}/complete`,
                {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${userToken}` }
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Cycle count completed successfully');
                loadCycleCountDetails();
              } else {
                const error = await response.json();
                Alert.alert('Error', error.error || 'Failed to complete cycle count');
              }
            } catch (error) {
              console.error('Error completing cycle count:', error);
              Alert.alert('Error', 'Failed to complete cycle count');
            }
          }
        }
      ]
    );
  };

  const handleVarianceReview = (item, action) => {
    setSelectedVarianceItem({ ...item, action });
    setVarianceReason('');
    setAdjustInventory(action === 'APPROVE');
    setShowVarianceModal(true);
  };

  const submitVarianceReview = async () => {
    if (!selectedVarianceItem || !varianceReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for this decision');
      return;
    }

    try {
      if (!userToken) {
        Alert.alert('Authentication Error', 'Please log in again');
        return;
      }
      const response = await fetch(
        `${API_URL}/cycle-counts/items/${selectedVarianceItem.id}/review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: selectedVarianceItem.action,
            reason: varianceReason,
            adjustInventory
          })
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Variance reviewed successfully');
        setShowVarianceModal(false);
        setSelectedVarianceItem(null);
        loadCycleCountDetails();
      } else {
        Alert.alert('Error', 'Failed to review variance');
      }
    } catch (error) {
      console.error('Error reviewing variance:', error);
      Alert.alert('Error', 'Failed to review variance');
    }
  };

  const renderOverviewTab = () => {
    if (!cycleCount) return null;

    const { summary } = cycleCount;

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.totalTasks}</Text>
              <Text style={styles.summaryLabel}>Total Tasks</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                {summary.completedTasks}
              </Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.totalItems}</Text>
              <Text style={styles.summaryLabel}>Total Items</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#FF9800' }]}>
                {summary.varianceItems}
              </Text>
              <Text style={styles.summaryLabel}>Variances</Text>
            </View>
          </View>
          
          <View style={styles.accuracyContainer}>
            <Text style={styles.accuracyLabel}>Overall Accuracy</Text>
            <Text style={[styles.accuracyValue, { color: summary.accuracy >= 95 ? '#4CAF50' : '#FF9800' }]}>
              {summary.accuracy}%
            </Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{cycleCount.countType.replace('_', ' ')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Frequency:</Text>
            <Text style={styles.detailValue}>{cycleCount.frequency}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created By:</Text>
            <Text style={styles.detailValue}>{cycleCount.createdBy.username}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Assigned To:</Text>
            <Text style={styles.detailValue}>
              {cycleCount.assignedTo?.username || 'Unassigned'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Scheduled:</Text>
            <Text style={styles.detailValue}>
              {new Date(cycleCount.scheduledDate).toLocaleDateString()}
            </Text>
          </View>
          {cycleCount.startedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Started:</Text>
              <Text style={styles.detailValue}>
                {new Date(cycleCount.startedAt).toLocaleString()}
              </Text>
            </View>
          )}
          {cycleCount.completedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Completed:</Text>
              <Text style={styles.detailValue}>
                {new Date(cycleCount.completedAt).toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderTasksTab = () => {
    if (!cycleCount?.tasks) return null;

    const renderTaskItem = ({ item: task }) => {
      const totalItems = task.items.length;
      const countedItems = task.items.filter(item => 
        item.status === 'COUNTED' || item.status === 'APPROVED'
      ).length;
      const progress = totalItems > 0 ? (countedItems / totalItems) * 100 : 0;

      return (
        <View style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>
                {task.location ? 
                  `${task.location.zone}-${task.location.aisle}-${task.location.shelf}` :
                  task.zone || 'Multiple Locations'
                }
              </Text>
              <Text style={styles.taskAssignee}>
                {task.assignedTo ? `Assigned to: ${task.assignedTo.username}` : 'Unassigned'}
              </Text>
            </View>
            <View style={[
              styles.taskStatusBadge,
              { backgroundColor: taskStatusColors[task.status] }
            ]}>
              <Text style={styles.taskStatusText}>{task.status.replace('_', ' ')}</Text>
            </View>
          </View>

          <View style={styles.taskStats}>
            <View style={styles.taskStatItem}>
              <Text style={styles.taskStatValue}>{totalItems}</Text>
              <Text style={styles.taskStatLabel}>Items</Text>
            </View>
            <View style={styles.taskStatItem}>
              <Text style={styles.taskStatValue}>{countedItems}</Text>
              <Text style={styles.taskStatLabel}>Counted</Text>
            </View>
            <View style={styles.taskStatItem}>
              <Text style={styles.taskStatValue}>{Math.round(progress)}%</Text>
              <Text style={styles.taskStatLabel}>Progress</Text>
            </View>
            {task.accuracyRate && (
              <View style={styles.taskStatItem}>
                <Text style={[
                  styles.taskStatValue,
                  { color: task.accuracyRate >= 95 ? '#4CAF50' : '#FF9800' }
                ]}>
                  {task.accuracyRate}%
                </Text>
                <Text style={styles.taskStatLabel}>Accuracy</Text>
              </View>
            )}
          </View>

          <View style={styles.taskProgressBar}>
            <View
              style={[
                styles.taskProgressFill,
                { 
                  width: `${progress}%`,
                  backgroundColor: taskStatusColors[task.status]
                }
              ]}
            />
          </View>

          {task.varianceFlag && (
            <View style={styles.varianceAlert}>
              <Ionicons name="warning" size={16} color="#FF9800" />
              <Text style={styles.varianceAlertText}>Contains variances requiring review</Text>
            </View>
          )}
        </View>
      );
    };

    return (
      <FlatList
        data={cycleCount.tasks}
        renderItem={renderTaskItem}
        keyExtractor={item => item.id}
        style={styles.tabContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderVariancesTab = () => {
    if (!cycleCount?.tasks) return null;

    const varianceItems = cycleCount.tasks
      .flatMap(task => task.items)
      .filter(item => item.variance !== null && item.variance !== 0);

    const renderVarianceItem = ({ item }) => {
      const isPositiveVariance = item.variance > 0;
      
      return (
        <View style={styles.varianceCard}>
          <View style={styles.varianceHeader}>
            <View style={styles.varianceItemInfo}>
              <Text style={styles.varianceItemSku}>{item.item.sku}</Text>
              <Text style={styles.varianceItemName}>{item.item.name}</Text>
              <Text style={styles.varianceLocation}>
                {item.location.zone}-{item.location.aisle}-{item.location.shelf}
              </Text>
            </View>
            <View style={[
              styles.varianceStatusBadge,
              { backgroundColor: itemStatusColors[item.status] }
            ]}>
              <Text style={styles.varianceStatusText}>{item.status.replace('_', ' ')}</Text>
            </View>
          </View>

          <View style={styles.varianceCounts}>
            <View style={styles.varianceCountItem}>
              <Text style={styles.varianceCountLabel}>Expected</Text>
              <Text style={styles.varianceCountValue}>{item.expectedQty}</Text>
            </View>
            <View style={styles.varianceCountItem}>
              <Text style={styles.varianceCountLabel}>Counted</Text>
              <Text style={styles.varianceCountValue}>{item.countedQty}</Text>
            </View>
            <View style={styles.varianceCountItem}>
              <Text style={styles.varianceCountLabel}>Variance</Text>
              <Text style={[
                styles.varianceCountValue,
                { color: isPositiveVariance ? '#4CAF50' : '#F44336' }
              ]}>
                {isPositiveVariance ? '+' : ''}{item.variance}
              </Text>
            </View>
            <View style={styles.varianceCountItem}>
              <Text style={styles.varianceCountLabel}>Percentage</Text>
              <Text style={[
                styles.varianceCountValue,
                { color: Math.abs(item.variancePercent) > 10 ? '#F44336' : '#FF9800' }
              ]}>
                {item.variancePercent > 0 ? '+' : ''}{item.variancePercent?.toFixed(1)}%
              </Text>
            </View>
          </View>

          {item.notes && (
            <View style={styles.varianceNotes}>
              <Text style={styles.varianceNotesLabel}>Notes:</Text>
              <Text style={styles.varianceNotesText}>{item.notes}</Text>
            </View>
          )}

          {item.countedBy && (
            <Text style={styles.varianceCountedBy}>
              Counted by: {item.countedBy.username} on {new Date(item.countedAt).toLocaleString()}
            </Text>
          )}

          {item.status === 'VARIANCE_REVIEW' && (
            <View style={styles.varianceActions}>
              <TouchableOpacity
                style={[styles.varianceActionButton, styles.approveButton]}
                onPress={() => handleVarianceReview(item, 'APPROVE')}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.varianceActionText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.varianceActionButton, styles.rejectButton]}
                onPress={() => handleVarianceReview(item, 'REJECT')}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={styles.varianceActionText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.varianceActionButton, styles.recountButton]}
                onPress={() => handleVarianceReview(item, 'RECOUNT')}
              >
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.varianceActionText}>Recount</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    };

    return (
      <FlatList
        data={varianceItems}
        renderItem={renderVarianceItem}
        keyExtractor={item => item.id}
        style={styles.tabContent}
        ListEmptyComponent={
          <View style={styles.emptyVariances}>
            <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
            <Text style={styles.emptyVariancesTitle}>No Variances Found</Text>
            <Text style={styles.emptyVariancesMessage}>
              All counted items match expected quantities.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderVarianceModal = () => (
    <Modal
      visible={showVarianceModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowVarianceModal(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {selectedVarianceItem?.action === 'APPROVE' ? 'Approve Variance' :
             selectedVarianceItem?.action === 'REJECT' ? 'Reject Variance' : 'Request Recount'}
          </Text>
          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={submitVarianceReview}
          >
            <Text style={styles.modalSaveText}>Submit</Text>
          </TouchableOpacity>
        </View>

        {selectedVarianceItem && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.varianceItemDetails}>
              <Text style={styles.varianceItemDetailsSku}>{selectedVarianceItem.item.sku}</Text>
              <Text style={styles.varianceItemDetailsName}>{selectedVarianceItem.item.name}</Text>
              <View style={styles.varianceItemDetailsStats}>
                <Text>Expected: {selectedVarianceItem.expectedQty}</Text>
                <Text>Counted: {selectedVarianceItem.countedQty}</Text>
                <Text style={{ color: selectedVarianceItem.variance > 0 ? '#4CAF50' : '#F44336' }}>
                  Variance: {selectedVarianceItem.variance > 0 ? '+' : ''}{selectedVarianceItem.variance}
                </Text>
              </View>
            </View>

            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Reason *</Text>
              <TextInput
                style={styles.reasonInput}
                value={varianceReason}
                onChangeText={setVarianceReason}
                placeholder="Provide a reason for this decision..."
                multiline
                numberOfLines={4}
              />
            </View>

            {selectedVarianceItem?.action === 'APPROVE' && (
              <View style={styles.adjustInventoryContainer}>
                <View style={styles.adjustInventoryHeader}>
                  <Text style={styles.adjustInventoryLabel}>Adjust Inventory</Text>
                  <Switch
                    value={adjustInventory}
                    onValueChange={setAdjustInventory}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={adjustInventory ? '#2196F3' : '#f4f3f4'}
                  />
                </View>
                <Text style={styles.adjustInventoryDescription}>
                  {adjustInventory ? 
                    'Inventory quantities will be updated to match the counted amount.' :
                    'Inventory quantities will remain unchanged.'
                  }
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  const renderActionButtons = () => {
    if (!cycleCount) return null;

    return (
      <View style={styles.actionButtons}>
        {cycleCount.status === 'SCHEDULED' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.generateButton]}
            onPress={generateTasks}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Generate Tasks</Text>
          </TouchableOpacity>
        )}
        
        {cycleCount.status === 'IN_PROGRESS' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={completeCycleCount}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Complete Count</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Cycle Count Details" />
        <View style={styles.loadingContainer}>
          <Text>Loading cycle count details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cycleCount) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Cycle Count Details" />
        <View style={styles.errorContainer}>
          <Text>Cycle count not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title={cycleCount.name}
        subtitle={`Status: ${cycleCount.status.replace('_', ' ')}`}
      />

      <View style={styles.tabBar}>
        {['overview', 'tasks', 'variances'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              selectedTab === tab && styles.activeTabButton
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[
              styles.tabButtonText,
              selectedTab === tab && styles.activeTabButtonText
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'tasks' && renderTasksTab()}
        {selectedTab === 'variances' && renderVariancesTab()}
      </ScrollView>

      {renderActionButtons()}
      {renderVarianceModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: {
    marginRight: 16
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  headerStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  headerStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  tabBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center'
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3'
  },
  tabButtonText: {
    fontSize: 14,
    color: '#666'
  },
  activeTabButtonText: {
    color: '#2196F3',
    fontWeight: '600'
  },
  content: {
    flex: 1
  },
  tabContent: {
    flex: 1,
    padding: 16
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  accuracyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  accuracyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  accuracyValue: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  detailsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400'
  },
  taskCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  taskInfo: {
    flex: 1
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  taskAssignee: {
    fontSize: 12,
    color: '#666'
  },
  taskStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  taskStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
  },
  taskStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12
  },
  taskStatItem: {
    alignItems: 'center'
  },
  taskStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3'
  },
  taskStatLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2
  },
  taskProgressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8
  },
  taskProgressFill: {
    height: '100%',
    borderRadius: 2
  },
  varianceAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 8,
    borderRadius: 6,
    gap: 6
  },
  varianceAlertText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500'
  },
  varianceCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  varianceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  varianceItemInfo: {
    flex: 1
  },
  varianceItemSku: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2
  },
  varianceItemName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  varianceLocation: {
    fontSize: 12,
    color: '#999'
  },
  varianceStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  varianceStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
  },
  varianceCounts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8
  },
  varianceCountItem: {
    alignItems: 'center'
  },
  varianceCountLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4
  },
  varianceCountValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  varianceNotes: {
    backgroundColor: '#f0f8f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  varianceNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  varianceNotesText: {
    fontSize: 12,
    color: '#666'
  },
  varianceCountedBy: {
    fontSize: 10,
    color: '#999',
    marginBottom: 12
  },
  varianceActions: {
    flexDirection: 'row',
    gap: 8
  },
  varianceActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4
  },
  approveButton: {
    backgroundColor: '#4CAF50'
  },
  rejectButton: {
    backgroundColor: '#F44336'
  },
  recountButton: {
    backgroundColor: '#2196F3'
  },
  varianceActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  emptyVariances: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyVariancesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  emptyVariancesMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  actionButtons: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6
  },
  generateButton: {
    backgroundColor: '#2196F3'
  },
  completeButton: {
    backgroundColor: '#4CAF50'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  modalCloseButton: {
    padding: 8
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  modalSaveButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '600'
  },
  modalContent: {
    flex: 1,
    padding: 16
  },
  varianceItemDetails: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20
  },
  varianceItemDetailsSku: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  varianceItemDetailsName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12
  },
  varianceItemDetailsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  reasonContainer: {
    marginBottom: 20
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    textAlignVertical: 'top'
  },
  adjustInventoryContainer: {
    backgroundColor: '#f0f8f0',
    padding: 16,
    borderRadius: 8
  },
  adjustInventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  adjustInventoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  adjustInventoryDescription: {
    fontSize: 14,
    color: '#666'
  }
});

export default CycleCountDetailsScreen; 