import React, { useState, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { spaceOptimizationAPI } from '../api/spaceOptimization';
import InternalHeader from '../components/InternalHeader';
import StatusBadge from '../components/StatusBadge';

export default function SlottingOptimizationScreen({ navigation, route }) {
  const { userToken } = useContext(AuthContext);
  const { warehouseId } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slottingData, setSlottingData] = useState(null);
  const [filter, setFilter] = useState('all'); // all, A, B, C, relocate
  const [sortBy, setSortBy] = useState('velocity'); // velocity, classification, priority

  const loadSlottingData = async () => {
    try {
      let data;
      try {
        data = await spaceOptimizationAPI.getSlottingOptimization({ warehouseId });
             } catch (apiError) {
         console.info('Using demo data - Slotting optimization API not yet implemented');
        
        // Mock data for development
        data = {
          optimizationSummary: {
            totalItems: 1250,
            aClassItems: 125,
            bClassItems: 375,
            cClassItems: 750,
            relocateRecommendations: 45,
            estimatedTimeSavings: 18.5
          },
          itemAnalysis: [
            {
              sku: 'SKU-001',
              name: 'High Velocity Item A',
              velocity: 25.5,
              classification: 'A',
              quantity: 150,
              accessibilityScore: 65,
              shouldRelocate: true,
              priority: 'HIGH',
              currentLocation: { zone: 'C', aisle: '5', shelf: '3', bin: '2' },
              recommendation: 'Move to Zone A for better accessibility'
            },
            {
              sku: 'SKU-002', 
              name: 'Medium Velocity Item B',
              velocity: 12.3,
              classification: 'B',
              quantity: 200,
              accessibilityScore: 78,
              shouldRelocate: false,
              priority: 'MEDIUM',
              currentLocation: { zone: 'B', aisle: '2', shelf: '1', bin: '4' },
              recommendation: 'Current location is optimal'
            },
            {
              sku: 'SKU-003',
              name: 'Low Velocity Item C', 
              velocity: 3.2,
              classification: 'C',
              quantity: 75,
              accessibilityScore: 45,
              shouldRelocate: true,
              priority: 'LOW',
              currentLocation: { zone: 'A', aisle: '1', shelf: '2', bin: '1' },
              recommendation: 'Move to Zone C to free up prime space'
            }
          ]
        };
      }
      
      setSlottingData(data);
    } catch (error) {
      console.error('Error loading slotting data:', error);
      Alert.alert('Error', 'Failed to load slotting optimization data');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadSlottingData();
      setLoading(false);
    };
    initialize();
  }, [warehouseId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSlottingData();
    setRefreshing(false);
  };

  const getFilteredAndSortedItems = () => {
    if (!slottingData) return [];
    
    let items = [...slottingData.itemAnalysis];
    
    // Apply filter
    switch (filter) {
      case 'A':
      case 'B':
      case 'C':
        items = items.filter(item => item.classification === filter);
        break;
      case 'relocate':
        items = items.filter(item => item.shouldRelocate);
        break;
      default:
        // 'all' - no filter
        break;
    }
    
    // Apply sort
    switch (sortBy) {
      case 'velocity':
        items.sort((a, b) => b.velocity - a.velocity);
        break;
      case 'classification':
        items.sort((a, b) => a.classification.localeCompare(b.classification));
        break;
      case 'priority':
        const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        items.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
        break;
      default:
        break;
    }
    
    return items;
  };

  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'A': return '#FF453A';
      case 'B': return '#FF9500';
      case 'C': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH': return '#FF453A';
      case 'MEDIUM': return '#FF9500';
      case 'LOW': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const handleItemPress = (item) => {
    Alert.alert(
      'Item Details',
      `SKU: ${item.sku}\nName: ${item.name}\nVelocity: ${item.velocity.toFixed(1)} picks/day\nClassification: ${item.classification}\nCurrent Location: ${item.currentLocation ? `${item.currentLocation.zone}-${item.currentLocation.aisle}-${item.currentLocation.shelf}-${item.currentLocation.bin}` : 'Unknown'}\n\n${item.recommendation || 'No recommendations at this time.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        item.shouldRelocate ? { 
          text: 'Create Move Task', 
          onPress: () => {
            // TODO: Navigate to move task creation
            Alert.alert('Feature Coming Soon', 'Move task creation will be available soon.');
          }
        } : null
      ].filter(Boolean)
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.itemCard} onPress={() => handleItemPress(item)}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleContainer}>
          <Text style={styles.itemSku}>{item.sku}</Text>
          <StatusBadge 
            status={item.classification} 
            color={getClassificationColor(item.classification)}
          />
        </View>
        {item.shouldRelocate && (
          <MaterialCommunityIcons name="alert-circle" size={20} color={getPriorityColor(item.priority)} />
        )}
      </View>
      
      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
      
      <View style={styles.itemStats}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="speedometer" size={16} color="#8E8E93" />
          <Text style={styles.statText}>{item.velocity.toFixed(1)}/day</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="package" size={16} color="#8E8E93" />
          <Text style={styles.statText}>{item.quantity}</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="map-marker" size={16} color="#8E8E93" />
          <Text style={styles.statText}>{item.accessibilityScore.toFixed(0)}%</Text>
        </View>
      </View>
      
      {item.currentLocation && (
        <Text style={styles.locationText}>
          {item.currentLocation.zone}-{item.currentLocation.aisle}-{item.currentLocation.shelf}-{item.currentLocation.bin}
        </Text>
      )}
      
      {item.recommendation && (
        <View style={styles.recommendationContainer}>
          <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#FF9500" />
          <Text style={styles.recommendationText}>{item.recommendation}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Slotting Optimization" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Analyzing item placements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredItems = getFilteredAndSortedItems();

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Slotting Optimization" />
      
      {slottingData && (
        <>
          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{slottingData.optimizationSummary.totalItems}</Text>
              <Text style={styles.summaryLabel}>Total Items</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: '#FF453A' }]}>
                {slottingData.optimizationSummary.itemsNeedingRelocation}
              </Text>
              <Text style={styles.summaryLabel}>Need Relocation</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: '#34C759' }]}>
                {slottingData.optimizationSummary.potentialPickTimeReduction.toFixed(1)}m
              </Text>
              <Text style={styles.summaryLabel}>Time Savings</Text>
            </View>
          </View>

          {/* ABC Classification Overview */}
          <View style={styles.classificationContainer}>
            <Text style={styles.sectionTitle}>ABC Classification</Text>
            <View style={styles.classificationRow}>
              <View style={styles.classificationItem}>
                <View style={[styles.classificationBar, { backgroundColor: '#FF453A' }]}>
                  <Text style={styles.classificationValue}>
                    {slottingData.optimizationSummary.classificationBreakdown.A}
                  </Text>
                </View>
                <Text style={styles.classificationLabel}>Class A</Text>
              </View>
              <View style={styles.classificationItem}>
                <View style={[styles.classificationBar, { backgroundColor: '#FF9500' }]}>
                  <Text style={styles.classificationValue}>
                    {slottingData.optimizationSummary.classificationBreakdown.B}
                  </Text>
                </View>
                <Text style={styles.classificationLabel}>Class B</Text>
              </View>
              <View style={styles.classificationItem}>
                <View style={[styles.classificationBar, { backgroundColor: '#34C759' }]}>
                  <Text style={styles.classificationValue}>
                    {slottingData.optimizationSummary.classificationBreakdown.C}
                  </Text>
                </View>
                <Text style={styles.classificationLabel}>Class C</Text>
              </View>
            </View>
          </View>

          {/* Filters and Sort */}
          <View style={styles.controlsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {['all', 'relocate', 'A', 'B', 'C'].map((filterOption) => (
                <TouchableOpacity
                  key={filterOption}
                  style={[
                    styles.filterButton,
                    filter === filterOption && styles.filterButtonActive
                  ]}
                  onPress={() => setFilter(filterOption)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filter === filterOption && styles.filterButtonTextActive
                  ]}>
                    {filterOption === 'all' ? 'All Items' : 
                     filterOption === 'relocate' ? 'Need Relocation' : 
                     `Class ${filterOption}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.sortButton}
              onPress={() => {
                const sortOptions = ['velocity', 'classification', 'priority'];
                const currentIndex = sortOptions.indexOf(sortBy);
                const nextIndex = (currentIndex + 1) % sortOptions.length;
                setSortBy(sortOptions[nextIndex]);
              }}
            >
              <MaterialCommunityIcons name="sort" size={20} color="#007AFF" />
              <Text style={styles.sortButtonText}>
                {sortBy === 'velocity' ? 'Velocity' : 
                 sortBy === 'classification' ? 'Class' : 'Priority'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Items List */}
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.itemsList}
            contentContainerStyle={styles.itemsListContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="package-variant" size={64} color="#C7C7CC" />
                <Text style={styles.emptyTitle}>No Items Found</Text>
                <Text style={styles.emptyText}>
                  {filter === 'relocate' 
                    ? 'No items need relocation with current filter settings.'
                    : 'No items match the current filter criteria.'}
                </Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93'
  },
  summaryContainer: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 0
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E'
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center'
  },
  classificationContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16
  },
  classificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  classificationItem: {
    alignItems: 'center',
    flex: 1
  },
  classificationBar: {
    width: 80,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  classificationValue: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white'
  },
  classificationLabel: {
    fontSize: 14,
    color: '#8E8E93'
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16
  },
  filterScroll: {
    flex: 1
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  filterButtonText: {
    fontSize: 14,
    color: '#1C1C1E'
  },
  filterButtonTextActive: {
    color: 'white'
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    marginLeft: 8
  },
  sortButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4
  },
  itemsList: {
    flex: 1
  },
  itemsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  itemTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  itemSku: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 8
  },
  itemName: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12
  },
  itemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4
  },
  locationText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 8
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500'
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 8,
    lineHeight: 20
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22
  }
}); 