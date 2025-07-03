import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  Vibration,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';
import { getApiUrl } from '../utils/apiHost';


const API_URL = getApiUrl();
// Optional barcode scanner - will gracefully handle if not available
let BarCodeScanner;
try {
  BarCodeScanner = require('expo-barcode-scanner').BarCodeScanner;
} catch (error) {
  console.warn('Barcode scanner not available:', error);
  BarCodeScanner = null;
}

const MobileCycleCountScreen = () => {
  const navigation = useNavigation();
  const { userToken } = useContext(AuthContext);
  const [myTasks, setMyTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [countedQty, setCountedQty] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [showCountModal, setShowCountModal] = useState(false);

  const taskStatusColors = {
    ASSIGNED: '#2196F3',
    IN_PROGRESS: '#FF9800',
    COMPLETED: '#4CAF50',
    PAUSED: '#9E9E9E'
  };

  const itemStatusColors = {
    PENDING: '#FFC107',
    COUNTED: '#4CAF50',
    VARIANCE_REVIEW: '#FF9800'
  };

  useFocusEffect(
    useCallback(() => {
      loadMyTasks();
      requestCameraPermission();
    }, [])
  );

  const requestCameraPermission = async () => {
    if (!BarCodeScanner) {
      setHasPermission(false);
      return;
    }
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.warn('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const loadMyTasks = async () => {
    try {
      if (!userToken) {
        Alert.alert('Authentication Error', 'Please log in again');
        return;
      }
      const response = await fetch(
        `${API_URL}/cycle-counts/my-tasks`,
        {
          headers: { 'Authorization': `Bearer ${userToken}` }
        }
      );

      if (response.ok) {
        const tasks = await response.json();
        setMyTasks(tasks);
        
        // If there's an active task, update it
        if (activeTask) {
          const updatedActiveTask = tasks.find(task => task.id === activeTask.id);
          if (updatedActiveTask) {
            setActiveTask(updatedActiveTask);
          }
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMyTasks();
    setRefreshing(false);
  }, []);

  const startTask = async (task) => {
    try {
      if (!userToken) {
        Alert.alert('Authentication Error', 'Please log in again');
        return;
      }
      const response = await fetch(
        `${API_URL}/cycle-counts/tasks/${task.id}/start`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${userToken}` }
        }
      );

      if (response.ok) {
        const updatedTask = await response.json();
        setActiveTask(updatedTask);
        loadMyTasks();
        Alert.alert('Success', 'Task started successfully!');
      } else {
        Alert.alert('Error', 'Failed to start task');
      }
    } catch (error) {
      console.error('Error starting task:', error);
      Alert.alert('Error', 'Failed to start task');
    }
  };

  const openCountModal = (item) => {
    setCurrentItem(item);
    setCountedQty(item.countedQty?.toString() || '');
    setNotes(item.notes || '');
    setShowCountModal(true);
  };

  const submitCount = async () => {
    if (!currentItem || countedQty === '') {
      Alert.alert('Error', 'Please enter a quantity');
      return;
    }

    try {
      if (!userToken) {
        Alert.alert('Authentication Error', 'Please log in again');
        return;
      }
      const response = await fetch(
        `${API_URL}/cycle-counts/items/${currentItem.id}/count`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            countedQty: parseInt(countedQty),
            notes
          })
        }
      );

      if (response.ok) {
        const updatedItem = await response.json();
        
        // Vibrate for feedback
        Vibration.vibrate(100);
        
        // Show variance alert if there's a discrepancy
        if (updatedItem.variance !== 0) {
          Alert.alert(
            'Variance Detected',
            `Expected: ${updatedItem.expectedQty}\nCounted: ${updatedItem.countedQty}\nVariance: ${updatedItem.variance}`,
            [{ text: 'OK' }]
          );
        }
        
        setShowCountModal(false);
        setCurrentItem(null);
        setCountedQty('');
        setNotes('');
        loadMyTasks();
        
        Alert.alert('Success', 'Item counted successfully!');
      } else {
        Alert.alert('Error', 'Failed to submit count');
      }
    } catch (error) {
      console.error('Error submitting count:', error);
      Alert.alert('Error', 'Failed to submit count');
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setShowScanner(false);
    
    // Find item by SKU in active task
    if (activeTask) {
      const item = activeTask.items.find(item => item.item.sku === data);
      if (item) {
        openCountModal(item);
      } else {
        Alert.alert('Item Not Found', `SKU "${data}" not found in current task`);
      }
    }
  };

  const renderTaskCard = ({ item: task }) => {
    const totalItems = task.items.length;
    const countedItems = task.items.filter(item => 
      item.status === 'COUNTED' || item.status === 'VARIANCE_REVIEW'
    ).length;
    const progress = totalItems > 0 ? (countedItems / totalItems) * 100 : 0;

    return (
      <TouchableOpacity
        style={[
          styles.taskCard,
          activeTask?.id === task.id && styles.activeTaskCard
        ]}
        onPress={() => activeTask?.id === task.id ? setActiveTask(null) : setActiveTask(task)}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{task.cycleCount.name}</Text>
            <Text style={styles.taskLocation}>
              {task.location ? 
                `${task.location.zone}-${task.location.aisle}-${task.location.shelf}` :
                task.zone || 'Multiple Locations'
              }
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: taskStatusColors[task.status] }
          ]}>
            <Text style={styles.statusText}>{task.status.replace('_', ' ')}</Text>
          </View>
        </View>

        <View style={styles.taskStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalItems}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{countedItems}</Text>
            <Text style={styles.statLabel}>Counted</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(progress)}%</Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { 
                width: `${progress}%`,
                backgroundColor: taskStatusColors[task.status]
              }
            ]}
          />
        </View>

        {task.status === 'ASSIGNED' && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={(e) => {
              e.stopPropagation();
              startTask(task);
            }}
          >
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={styles.startButtonText}>Start Task</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderItemRow = ({ item }) => {
    const isVariance = item.variance !== null && item.variance !== 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.itemRow,
          item.status === 'COUNTED' && styles.countedItemRow,
          isVariance && styles.varianceItemRow
        ]}
        onPress={() => openCountModal(item)}
      >
        <View style={styles.itemInfo}>
          <Text style={styles.itemSku}>{item.item.sku}</Text>
          <Text style={styles.itemName}>{item.item.name}</Text>
          <Text style={styles.itemLocation}>
            {item.location.zone}-{item.location.aisle}-{item.location.shelf}
          </Text>
        </View>

        <View style={styles.itemCounts}>
          <View style={styles.countColumn}>
            <Text style={styles.countLabel}>Expected</Text>
            <Text style={styles.countValue}>{item.expectedQty}</Text>
          </View>
          <View style={styles.countColumn}>
            <Text style={styles.countLabel}>Counted</Text>
            <Text style={[
              styles.countValue,
              item.countedQty !== null && styles.countedValue
            ]}>
              {item.countedQty !== null ? item.countedQty : '-'}
            </Text>
          </View>
          {item.variance !== null && (
            <View style={styles.countColumn}>
              <Text style={styles.countLabel}>Variance</Text>
              <Text style={[
                styles.countValue,
                isVariance ? styles.varianceValue : styles.noVarianceValue
              ]}>
                {item.variance > 0 ? '+' : ''}{item.variance}
              </Text>
            </View>
          )}
        </View>

        <View style={[
          styles.itemStatusBadge,
          { backgroundColor: itemStatusColors[item.status] }
        ]}>
          <Text style={styles.itemStatusText}>
            {item.status === 'VARIANCE_REVIEW' ? 'VARIANCE' : item.status}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderActiveTaskDetails = () => {
    if (!activeTask) return null;

    const pendingItems = activeTask.items.filter(item => item.status === 'PENDING');
    const nextItem = pendingItems[0];

    return (
      <View style={styles.activeTaskContainer}>
        <View style={styles.activeTaskHeader}>
          <Text style={styles.activeTaskTitle}>Active Task</Text>
          <TouchableOpacity
            style={[styles.scanButton, !BarCodeScanner && styles.scanButtonDisabled]}
            onPress={() => BarCodeScanner ? setShowScanner(true) : Alert.alert('Scanner Unavailable', 'Barcode scanner is not available on this device')}
          >
            <Ionicons name={BarCodeScanner ? "barcode" : "search"} size={20} color="#fff" />
            <Text style={styles.scanButtonText}>{BarCodeScanner ? 'Scan' : 'Search'}</Text>
          </TouchableOpacity>
        </View>

        {nextItem && (
          <View style={styles.nextItemCard}>
            <Text style={styles.nextItemLabel}>Next Item to Count:</Text>
            <TouchableOpacity
              style={styles.nextItemButton}
              onPress={() => openCountModal(nextItem)}
            >
              <View style={styles.nextItemInfo}>
                <Text style={styles.nextItemSku}>{nextItem.item.sku}</Text>
                <Text style={styles.nextItemName}>{nextItem.item.name}</Text>
                <Text style={styles.nextItemExpected}>
                  Expected: {nextItem.expectedQty} {nextItem.item.unit}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#2196F3" />
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={activeTask.items}
          renderItem={renderItemRow}
          keyExtractor={item => item.id}
          style={styles.itemsList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  const renderCountModal = () => (
    <Modal
      visible={showCountModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowCountModal(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Count Item</Text>
          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={submitCount}
          >
            <Text style={styles.modalSaveText}>Save</Text>
          </TouchableOpacity>
        </View>

        {currentItem && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.itemDetailsCard}>
              <Text style={styles.itemDetailsSku}>{currentItem.item.sku}</Text>
              <Text style={styles.itemDetailsName}>{currentItem.item.name}</Text>
              <Text style={styles.itemDetailsLocation}>
                Location: {currentItem.location.zone}-{currentItem.location.aisle}-{currentItem.location.shelf}
              </Text>
              <Text style={styles.itemDetailsExpected}>
                Expected Quantity: {currentItem.expectedQty} {currentItem.item.unit}
              </Text>
            </View>

            <View style={styles.countInputContainer}>
              <Text style={styles.inputLabel}>Counted Quantity *</Text>
              <TextInput
                style={styles.countInput}
                value={countedQty}
                onChangeText={setCountedQty}
                placeholder="Enter quantity"
                keyboardType="numeric"
                autoFocus
              />
            </View>

            <View style={styles.notesContainer}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about this count..."
                multiline
                numberOfLines={3}
              />
            </View>

            {countedQty && currentItem && (
              <View style={styles.variancePreview}>
                <Text style={styles.varianceLabel}>Variance Preview:</Text>
                <Text style={[
                  styles.varianceValue,
                  parseInt(countedQty) - currentItem.expectedQty === 0 ? 
                    styles.noVarianceValue : styles.hasVarianceValue
                ]}>
                  {parseInt(countedQty) - currentItem.expectedQty > 0 ? '+' : ''}
                  {parseInt(countedQty) - currentItem.expectedQty}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  const renderScanner = () => (
    <Modal visible={showScanner} animationType="slide">
      <View style={styles.scannerContainer}>
        <View style={styles.scannerHeader}>
          <TouchableOpacity
            style={styles.scannerCloseButton}
            onPress={() => setShowScanner(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>Scan Item Barcode</Text>
        </View>
        
        {!BarCodeScanner ? (
          <View style={styles.scannerUnavailable}>
            <Text style={styles.scannerUnavailableText}>Barcode scanner not available</Text>
            <Text style={styles.scannerUnavailableSubtext}>Please manually select items to count</Text>
          </View>
        ) : hasPermission === null ? (
          <View style={styles.scannerUnavailable}>
            <Text style={styles.scannerUnavailableText}>Requesting camera permission...</Text>
          </View>
        ) : hasPermission === false ? (
          <View style={styles.scannerUnavailable}>
            <Text style={styles.scannerUnavailableText}>No access to camera</Text>
            <Text style={styles.scannerUnavailableSubtext}>Please enable camera permissions in settings</Text>
          </View>
        ) : (
          <BarCodeScanner
            onBarCodeScanned={handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame} />
          <Text style={styles.scannerInstructions}>
            Position the barcode within the frame
          </Text>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="My Cycle Count Tasks" />
        <View style={styles.loadingContainer}>
          <Text>Loading your tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="My Cycle Count Tasks"
        rightIcon="refresh"
        onRightPress={onRefresh}
      />

      {activeTask ? (
        renderActiveTaskDetails()
      ) : (
        <FlatList
          data={myTasks}
          renderItem={renderTaskCard}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Tasks Assigned</Text>
              <Text style={styles.emptyMessage}>
                You don't have any cycle count tasks assigned yet.
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      )}

      {renderCountModal()}
      {renderScanner()}
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  refreshButton: {
    padding: 8
  },
  listContainer: {
    padding: 16
  },
  taskCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  activeTaskCard: {
    borderWidth: 2,
    borderColor: '#2196F3'
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
  taskLocation: {
    fontSize: 14,
    color: '#666'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
  },
  taskStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 12
  },
  progressFill: {
    height: '100%',
    borderRadius: 2
  },
  startButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  activeTaskContainer: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  activeTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  activeTaskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  scanButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  scanButtonDisabled: {
    backgroundColor: '#9E9E9E'
  },
  nextItemCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  nextItemLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  nextItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  nextItemInfo: {
    flex: 1
  },
  nextItemSku: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  nextItemName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  nextItemExpected: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 4
  },
  itemsList: {
    flex: 1
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  countedItemRow: {
    backgroundColor: '#f0f8f0'
  },
  varianceItemRow: {
    backgroundColor: '#fff3e0'
  },
  itemInfo: {
    flex: 1
  },
  itemSku: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  itemName: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  itemLocation: {
    fontSize: 10,
    color: '#999',
    marginTop: 2
  },
  itemCounts: {
    flexDirection: 'row',
    gap: 12
  },
  countColumn: {
    alignItems: 'center',
    minWidth: 50
  },
  countLabel: {
    fontSize: 10,
    color: '#666'
  },
  countValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2
  },
  countedValue: {
    color: '#4CAF50'
  },
  varianceValue: {
    color: '#FF9800'
  },
  noVarianceValue: {
    color: '#4CAF50'
  },
  itemStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8
  },
  itemStatusText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
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
  itemDetailsCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20
  },
  itemDetailsSku: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  itemDetailsName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8
  },
  itemDetailsLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  itemDetailsExpected: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600'
  },
  countInputContainer: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  countInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  notesContainer: {
    marginBottom: 20
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    textAlignVertical: 'top'
  },
  variancePreview: {
    backgroundColor: '#f0f8f0',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  varianceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  hasVarianceValue: {
    color: '#FF9800',
    fontSize: 18,
    fontWeight: 'bold'
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000'
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1
  },
  scannerCloseButton: {
    padding: 8
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent'
  },
  scannerInstructions: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center'
  },
  scannerUnavailable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  scannerUnavailableText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10
  },
  scannerUnavailableSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center'
  }
});

export default MobileCycleCountScreen; 