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
  Dimensions,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';
import { getApiUrl } from '../utils/apiHost';


const API_URL = getApiUrl();

const { width } = Dimensions.get('window');

const CycleCountManagementScreen = () => {
  const navigation = useNavigation();
  const { userToken } = useContext(AuthContext);
  const [cycleCounts, setCycleCounts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [warehouses, setWarehouses] = useState([]);

  const statusColors = {
    SCHEDULED: '#2196F3',
    IN_PROGRESS: '#FF9800',
    COMPLETED: '#4CAF50',
    CANCELLED: '#F44336',
    ON_HOLD: '#9E9E9E'
  };

  const statusLabels = {
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    ON_HOLD: 'On Hold'
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      loadCycleCounts();
      loadAnalytics();
    }
  }, [selectedWarehouse, filterStatus]);

  const loadInitialData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      // Load warehouses
      await loadWarehouses();
      
      // Set default warehouse if user has one
      if (user && user.warehouseId) {
        setSelectedWarehouse(user.warehouseId);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadWarehouses = async () => {
    try {
      if (!userToken) {
        Alert.alert('Authentication Error', 'Please log in again');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/warehouses`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      
      if (response.status === 401) {
        Alert.alert('Session Expired', 'Please log in again');
        setLoading(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
        if (data.length > 0 && !selectedWarehouse) {
          setSelectedWarehouse(data[0].id);
        }
      } else {
        console.error('Failed to load warehouses:', response.status);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
      setLoading(false);
    }
  };

  const loadCycleCounts = useCallback(async () => {
    if (!selectedWarehouse) {
      setLoading(false);
      return;
    }
    
    try {
      if (!userToken) {
        Alert.alert('Authentication Error', 'Please log in again');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        ...(filterStatus !== 'ALL' && { status: filterStatus }),
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      const response = await fetch(
        `${API_URL}/cycle-counts/warehouse/${selectedWarehouse}?${params}`,
        {
          headers: { 'Authorization': `Bearer ${userToken}` }
        }
      );

      if (response.status === 401) {
        Alert.alert('Session Expired', 'Please log in again');
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setCycleCounts(data.cycleCounts);
      } else {
        console.error('Failed to load cycle counts:', response.status);
        Alert.alert('Error', 'Failed to load cycle counts');
      }
    } catch (error) {
      console.error('Error loading cycle counts:', error);
      Alert.alert('Error', 'Failed to load cycle counts');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, filterStatus, userToken]);

  const loadAnalytics = useCallback(async () => {
    if (!selectedWarehouse) return;
    
    try {
      if (!userToken) {
        return; // Already handled in loadCycleCounts
      }

      const response = await fetch(
        `${API_URL}/cycle-counts/warehouse/${selectedWarehouse}/analytics`,
        {
          headers: { 'Authorization': `Bearer ${userToken}` }
        }
      );

      if (response.status === 401) {
        return; // Already handled in loadCycleCounts
      }

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        console.error('Failed to load analytics:', response.status);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }, [selectedWarehouse, userToken]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadCycleCounts(), loadAnalytics()]);
    setRefreshing(false);
  }, [loadCycleCounts, loadAnalytics]);

  const handleCreateCycleCount = () => {
    navigation.navigate('CreateCycleCount', { warehouseId: selectedWarehouse });
  };

  const handleCycleCountPress = (cycleCount) => {
    navigation.navigate('CycleCountDetails', { cycleCountId: cycleCount.id });
  };

  const generateQuickCount = async () => {
    if (!selectedWarehouse) return;
    
    Alert.alert(
      'Quick Cycle Count',
      'Generate a random cycle count for today?',
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
                `${API_URL}/cycle-counts/warehouse/${selectedWarehouse}`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    name: `Quick Count - ${new Date().toLocaleDateString()}`,
                    description: 'Quick random cycle count',
                    warehouseId: selectedWarehouse,
                    countType: 'RANDOM',
                    frequency: 'CUSTOM',
                    scheduledDate: new Date().toISOString(),
                    settings: { taskCount: 10 }
                  })
                }
              );
              
              if (response.ok) {
                const newCount = await response.json();
                Alert.alert('Success', 'Quick cycle count created!');
                loadCycleCounts();
              } else {
                Alert.alert('Error', 'Failed to create cycle count');
              }
            } catch (error) {
              console.error('Error creating quick count:', error);
              Alert.alert('Error', 'Failed to create cycle count');
            }
          }
        }
      ]
    );
  };

  const renderCycleCountCard = ({ item }) => {
    const totalTasks = item._count?.tasks || 0;
    const completedTasks = item.tasks?.filter(task => task.status === 'COMPLETED').length || 0;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
      <TouchableOpacity
        style={styles.cycleCountCard}
        onPress={() => handleCycleCountPress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
              <Text style={styles.statusText}>{statusLabels[item.status]}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
        
        {item.description && (
          <Text style={styles.cardDescription}>{item.description}</Text>
        )}
        
        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalTasks}</Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedTasks}</Text>
            <Text style={styles.statLabel}>Completed</Text>
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
              { width: `${progress}%`, backgroundColor: statusColors[item.status] }
            ]}
          />
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>
            Created: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          {item.scheduledDate && (
            <Text style={styles.cardDate}>
              Scheduled: {new Date(item.scheduledDate).toLocaleDateString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderAnalytics = () => {
    if (!analytics) return null;

    const accuracyData = {
      labels: ['Accurate', 'Variances'],
      datasets: [{
        data: [
          analytics.summary.accurateItems,
          analytics.summary.totalVariances
        ]
      }]
    };

    const chartConfig = {
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
      strokeWidth: 2,
      barPercentage: 0.5,
      useShadowColorFromDataset: false
    };

    return (
      <View style={styles.analyticsSection}>
        <Text style={styles.sectionTitle}>Analytics Overview</Text>
        
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsValue}>{analytics.summary.totalCounts}</Text>
            <Text style={styles.analyticsLabel}>Total Counts</Text>
          </View>
          <View style={styles.analyticsCard}>
            <Text style={[styles.analyticsValue, { color: '#4CAF50' }]}>
              {analytics.summary.overallAccuracy}%
            </Text>
            <Text style={styles.analyticsLabel}>Accuracy</Text>
          </View>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsValue}>{analytics.summary.totalItems}</Text>
            <Text style={styles.analyticsLabel}>Items Counted</Text>
          </View>
          <View style={styles.analyticsCard}>
            <Text style={[styles.analyticsValue, { color: '#FF9800' }]}>
              {analytics.summary.totalVariances}
            </Text>
            <Text style={styles.analyticsLabel}>Variances</Text>
          </View>
        </View>

        {analytics.summary.totalItems > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Accuracy Distribution</Text>
            <PieChart
              data={[
                {
                  name: 'Accurate',
                  count: analytics.summary.accurateItems,
                  color: '#4CAF50',
                  legendFontColor: '#333',
                  legendFontSize: 12
                },
                {
                  name: 'Variances',
                  count: analytics.summary.totalVariances,
                  color: '#FF9800',
                  legendFontColor: '#333',
                  legendFontSize: 12
                }
              ]}
              width={width - 40}
              height={200}
              chartConfig={chartConfig}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}
      </View>
    );
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].map(status => (
        <TouchableOpacity
          key={status}
          style={[
            styles.filterButton,
            filterStatus === status && styles.filterButtonActive
          ]}
          onPress={() => setFilterStatus(status)}
        >
          <Text style={[
            styles.filterButtonText,
            filterStatus === status && styles.filterButtonTextActive
          ]}>
            {status === 'ALL' ? 'All' : statusLabels[status]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={generateQuickCount}
      >
        <Ionicons name="flash" size={20} color="#fff" />
        <Text style={styles.quickActionText}>Quick Count</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader 
          navigation={navigation} 
          title="Cycle Count Management"
          rightIcon="add"
          onRightPress={handleCreateCycleCount}
        />
        <View style={styles.loadingContainer}>
          <Text>Loading cycle counts...</Text>
        </View>
      </SafeAreaView>
    );
  }

      return (
      <SafeAreaView style={styles.container}>
        <InternalHeader 
          navigation={navigation} 
          title="Cycle Count Management"
          rightIcon="add"
          onRightPress={handleCreateCycleCount}
        />
        <FlatList
          data={cycleCounts}
          renderItem={renderCycleCountCard}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            <View>
              {renderQuickActions()}
              {renderAnalytics()}
              {renderFilterButtons()}
            </View>
          }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Cycle Counts</Text>
            <Text style={styles.emptyMessage}>
              Create your first cycle count to get started with inventory accuracy management.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleCreateCycleCount}
            >
              <Text style={styles.emptyButtonText}>Create Cycle Count</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
  quickActionsContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center'
  },
  quickActionButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },

  analyticsSection: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20
  },
  analyticsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 10
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333'
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    justifyContent: 'space-between'
  },
  filterButton: {
    width: '48%',
    marginBottom: 10,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterButtonActive: {
    backgroundColor: '#2196F3'
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center'
  },
  listContainer: {
    paddingBottom: 20
  },
  cycleCountCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
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
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  cardStats: {
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cardDate: {
    fontSize: 12,
    color: '#999'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default CycleCountManagementScreen; 