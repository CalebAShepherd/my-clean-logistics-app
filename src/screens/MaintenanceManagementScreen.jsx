import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from '../components/StatusBadge';
import InternalHeader from '../components/InternalHeader';
import { maintenanceAPI } from '../api/maintenance';

const MaintenanceManagementScreen = ({ navigation, route }) => {
  const { assetId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('workOrders');
  const [workOrders, setWorkOrders] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [analytics, setAnalytics] = useState({});

  useEffect(() => {
    loadMaintenanceData();
  }, [assetId]);

  const loadMaintenanceData = async () => {
    try {
      const params = assetId ? { assetId } : {};
      const [workOrdersData, schedulesData, analyticsData] = await Promise.all([
        maintenanceAPI.getWorkOrders(params),
        maintenanceAPI.getMaintenanceSchedules(params),
        maintenanceAPI.getMaintenanceAnalytics(params)
      ]);
      
      setWorkOrders(workOrdersData.workOrders || workOrdersData);
      setSchedules(schedulesData.schedules || schedulesData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
      Alert.alert('Error', 'Failed to load maintenance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMaintenanceData();
  };

  const handleCreateWorkOrder = () => {
    navigation.navigate('CreateWorkOrder', { assetId });
  };

  const handleWorkOrderPress = (workOrder) => {
    navigation.navigate('WorkOrderDetails', { workOrderId: workOrder.id });
  };

  const handleCompleteWorkOrder = async (workOrderId) => {
    Alert.alert(
      'Complete Work Order',
      'Are you sure you want to mark this work order as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await maintenanceAPI.completeWorkOrder(workOrderId, {
                completedAt: new Date().toISOString(),
                notes: 'Completed from mobile app'
              });
              loadMaintenanceData();
              Alert.alert('Success', 'Work order completed successfully');
            } catch (error) {
              console.error('Error completing work order:', error);
              Alert.alert('Error', 'Failed to complete work order');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#F59E0B';
      case 'IN_PROGRESS': return '#007AFF';
      case 'COMPLETED': return '#10B981';
      case 'CANCELLED': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority) => {
    return maintenanceAPI.getMaintenancePriorityColor(priority);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderAnalyticsCards = () => (
    <View style={styles.analyticsContainer}>
      <View style={styles.analyticsCard}>
        <View style={styles.analyticsContent}>
          <Ionicons name="construct" size={32} color="#007AFF" />
          <View style={styles.analyticsText}>
            <Text style={styles.analyticsNumber}>
              {analytics.totalWorkOrders || 0}
            </Text>
            <Text style={styles.analyticsLabel}>
              Work Orders
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.analyticsCard}>
        <View style={styles.analyticsContent}>
          <Ionicons name="checkmark-circle" size={32} color="#10B981" />
          <View style={styles.analyticsText}>
            <Text style={styles.analyticsNumber}>
              {analytics.completedWorkOrders || 0}
            </Text>
            <Text style={styles.analyticsLabel}>
              Completed
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.analyticsCard}>
        <View style={styles.analyticsContent}>
          <Ionicons name="cash" size={32} color="#F59E0B" />
          <View style={styles.analyticsText}>
            <Text style={styles.analyticsNumber}>
              {formatCurrency(analytics.totalCost)}
            </Text>
            <Text style={styles.analyticsLabel}>
              Total Cost
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderWorkOrders = () => (
    <View style={styles.listContainer}>
      {workOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="clipboard-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>
            No work orders found
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={handleCreateWorkOrder}
          >
            <Text style={styles.emptyStateButtonText}>Create Work Order</Text>
          </TouchableOpacity>
        </View>
      ) : (
        workOrders.map((workOrder) => (
          <TouchableOpacity
            key={workOrder.id}
            style={styles.workOrderCard}
            onPress={() => handleWorkOrderPress(workOrder)}
          >
            <View style={styles.workOrderHeader}>
              <View style={styles.workOrderInfo}>
                <Text style={styles.workOrderTitle}>
                  {workOrder.title}
                </Text>
                <Text style={styles.workOrderAsset}>
                  Asset: {workOrder.asset?.name || 'N/A'}
                </Text>
              </View>
              <View style={styles.workOrderBadges}>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(workOrder.priority) + '20' }]}>
                  <Text style={[styles.priorityText, { color: getPriorityColor(workOrder.priority) }]}>
                    {workOrder.priority}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(workOrder.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(workOrder.status) }]}>
                    {workOrder.status}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.workOrderDescription}>
              {workOrder.description}
            </Text>

            <View style={styles.workOrderFooter}>
              <View style={styles.workOrderDetails}>
                <Text style={styles.workOrderDate}>
                  Scheduled: {formatDate(workOrder.scheduledDate)}
                </Text>
                {workOrder.estimatedCost && (
                  <Text style={styles.workOrderCost}>
                    Cost: {formatCurrency(workOrder.estimatedCost)}
                  </Text>
                )}
              </View>
              
              {workOrder.status === 'OPEN' && (
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => handleCompleteWorkOrder(workOrder.id)}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.completeButtonText}>Complete</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderSchedules = () => (
    <View style={styles.listContainer}>
      {schedules.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>
            No maintenance schedules found
          </Text>
        </View>
      ) : (
        schedules.map((schedule) => (
          <View key={schedule.id} style={styles.scheduleCard}>
            <View style={styles.scheduleHeader}>
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleTitle}>
                  {schedule.maintenanceType}
                </Text>
                <Text style={styles.scheduleAsset}>
                  Asset: {schedule.asset?.name || 'N/A'}
                </Text>
              </View>
              <View style={styles.frequencyBadge}>
                <Text style={styles.frequencyText}>
                  {schedule.frequency}
                </Text>
              </View>
            </View>

            <Text style={styles.scheduleDescription}>
              {schedule.description}
            </Text>

            <View style={styles.scheduleFooter}>
              <Text style={styles.scheduleNext}>
                Next Due: {formatDate(schedule.nextDueDate)}
              </Text>
              <View 
                style={[
                  styles.dueBadge, 
                  { 
                    backgroundColor: new Date(schedule.nextDueDate) < new Date() 
                      ? '#FEE2E2' 
                      : '#FEF3C7'
                  }
                ]}
              >
                <Text 
                  style={[
                    styles.dueText, 
                    { 
                      color: new Date(schedule.nextDueDate) < new Date() 
                        ? '#EF4444' 
                        : '#F59E0B'
                    }
                  ]}
                >
                  {new Date(schedule.nextDueDate) < new Date() ? 'Overdue' : 'Upcoming'}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Maintenance" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            Loading maintenance data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Maintenance Management"
        rightIcon="plus"
        onRightPress={handleCreateWorkOrder}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Analytics Cards */}
        {renderAnalyticsCards()}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'workOrders' && styles.activeTab]}
            onPress={() => setActiveTab('workOrders')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'workOrders' && styles.activeTabText
            ]}>
              Work Orders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'schedules' && styles.activeTab]}
            onPress={() => setActiveTab('schedules')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'schedules' && styles.activeTabText
            ]}>
              Schedules
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'workOrders' ? renderWorkOrders() : renderSchedules()}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateWorkOrder}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  analyticsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analyticsContent: {
    alignItems: 'center',
  },
  analyticsText: {
    alignItems: 'center',
    marginTop: 8,
  },
  analyticsNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#007AFF',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  workOrderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workOrderInfo: {
    flex: 1,
    marginRight: 12,
  },
  workOrderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  workOrderAsset: {
    fontSize: 14,
    color: '#6B7280',
  },
  workOrderBadges: {
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  workOrderDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  workOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workOrderDetails: {
    flex: 1,
  },
  workOrderDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  workOrderCost: {
    fontSize: 12,
    color: '#6B7280',
  },
  completeButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scheduleInfo: {
    flex: 1,
    marginRight: 12,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  scheduleAsset: {
    fontSize: 14,
    color: '#6B7280',
  },
  frequencyBadge: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  frequencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  scheduleDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  scheduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleNext: {
    fontSize: 12,
    color: '#6B7280',
  },
  dueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dueText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default MaintenanceManagementScreen; 