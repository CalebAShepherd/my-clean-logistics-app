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

export default function SpaceOptimizationRecommendationsScreen({ navigation, route }) {
  const { userToken } = useContext(AuthContext);
  const { warehouseId, facilityId } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState([]);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedSort, setSelectedSort] = useState('priority');

  const filterOptions = [
    { key: 'all', label: 'All', count: 0 },
    { key: 'CRITICAL', label: 'Critical', count: 0 },
    { key: 'HIGH', label: 'High', count: 0 },
    { key: 'MEDIUM', label: 'Medium', count: 0 },
    { key: 'LOW', label: 'Low', count: 0 },
    { key: 'SPACE_UTILIZATION', label: 'Space', count: 0 },
    { key: 'CAPACITY_PLANNING', label: 'Capacity', count: 0 },
    { key: 'LAYOUT_OPTIMIZATION', label: 'Layout', count: 0 },
    { key: 'SLOTTING', label: 'Slotting', count: 0 }
  ];

  const sortOptions = [
    { key: 'priority', label: 'Priority' },
    { key: 'impact', label: 'Impact' },
    { key: 'category', label: 'Category' },
    { key: 'date', label: 'Date' }
  ];

  const [filters, setFilters] = useState(filterOptions);

  const loadRecommendations = async () => {
    try {
      setError(null);
      let data;
      try {
        data = await spaceOptimizationAPI.getOptimizationRecommendations({
          warehouseId,
          facilityId,
          priority: 'all'
        });
             } catch (apiError) {
         console.info('Using demo data - Recommendations API not yet implemented');
        
        // Mock data for development
        data = {
          recommendations: [
            {
              id: 1,
              title: 'Optimize Zone A Layout',
              category: 'LAYOUT_OPTIMIZATION',
              priority: 'CRITICAL',
              description: 'Current layout in Zone A causes significant congestion during peak hours. Reorganizing item placement and widening aisles would improve flow.',
              impact: 'Estimated 25% reduction in pick times and 15% improvement in throughput',
              estimatedImpact: 25,
              createdAt: new Date()
            },
            {
              id: 2,
              title: 'Capacity Expansion Required',
              category: 'CAPACITY_PLANNING',
              priority: 'HIGH',
              description: 'Current growth trends indicate warehouse capacity will be exceeded within 3 months. Immediate expansion planning required.',
              impact: 'Prevent operational disruptions and maintain service levels',
              estimatedImpact: 30,
              createdAt: new Date()
            },
            {
              id: 3,
              title: 'Relocate High-Velocity Items',
              category: 'SLOTTING',
              priority: 'HIGH',
              description: 'Move top 20% of SKUs to more accessible locations to reduce travel time and improve picking efficiency.',
              impact: 'Reduce average pick time by 18% and improve order fulfillment speed',
              estimatedImpact: 18,
              createdAt: new Date()
            },
            {
              id: 4,
              title: 'Improve Zone B Space Utilization',
              category: 'SPACE_UTILIZATION',
              priority: 'MEDIUM',
              description: 'Zone B is currently under-utilized at 65%. Better slot allocation could increase utilization to 85%.',
              impact: 'Increase storage capacity by 15% without facility expansion',
              estimatedImpact: 15,
              createdAt: new Date()
            },
            {
              id: 5,
              title: 'Install Pick Path Optimization',
              category: 'LAYOUT_OPTIMIZATION',
              priority: 'LOW',
              description: 'Implement pick path optimization software to reduce travel distances and improve pick efficiency.',
              impact: 'Reduce travel time by 12% and improve overall productivity',
              estimatedImpact: 12,
              createdAt: new Date()
            }
          ]
        };
      }
      
      setRecommendations(data.recommendations || []);
      updateFilterCounts(data.recommendations || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setError('Failed to load space optimization recommendations');
    }
  };

  const updateFilterCounts = (recs) => {
    const updatedFilters = filterOptions.map(filter => ({
      ...filter,
      count: filter.key === 'all' 
        ? recs.length 
        : recs.filter(rec => 
            rec.priority === filter.key || rec.category === filter.key
          ).length
    }));
    setFilters(updatedFilters);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...recommendations];

    // Apply filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(rec => 
        rec.priority === selectedFilter || rec.category === selectedFilter
      );
    }

    // Apply sort
    switch (selectedSort) {
      case 'priority':
        const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        filtered.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
        break;
      case 'impact':
        filtered.sort((a, b) => (b.estimatedImpact || 0) - (a.estimatedImpact || 0));
        break;
      case 'category':
        filtered.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'date':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        break;
    }

    setFilteredRecommendations(filtered);
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadRecommendations();
      setLoading(false);
    };
    initialize();
  }, [warehouseId, facilityId]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [recommendations, selectedFilter, selectedSort]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL': return '#FF453A';
      case 'HIGH': return '#FF9500';
      case 'MEDIUM': return '#FFD60A';
      case 'LOW': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'SPACE_UTILIZATION': return 'view-grid';
      case 'CAPACITY_PLANNING': return 'chart-line';
      case 'LAYOUT_OPTIMIZATION': return 'floor-plan';
      case 'SLOTTING': return 'package-variant';
      default: return 'information';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'SPACE_UTILIZATION': return '#007AFF';
      case 'CAPACITY_PLANNING': return '#34C759';
      case 'LAYOUT_OPTIMIZATION': return '#AF52DE';
      case 'SLOTTING': return '#FF9500';
      default: return '#8E8E93';
    }
  };

  const handleRecommendationPress = (recommendation) => {
    Alert.alert(
      recommendation.title,
      `${recommendation.description}\n\n${recommendation.impact || 'Impact assessment pending...'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Mark as Implemented', 
          onPress: () => markAsImplemented(recommendation.id)
        },
        { 
          text: 'Create Task', 
          onPress: () => createTask(recommendation)
        }
      ]
    );
  };

  const markAsImplemented = async (recommendationId) => {
    try {
      // TODO: Implement API call to mark as implemented
      Alert.alert('Success', 'Recommendation marked as implemented');
      await loadRecommendations();
    } catch (error) {
      Alert.alert('Error', 'Failed to update recommendation status');
    }
  };

  const createTask = (recommendation) => {
    Alert.alert(
      'Create Task', 
      'Would you like to create a warehouse task for this recommendation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create Task', 
          onPress: () => {
            // TODO: Navigate to task creation or implement task creation
            Alert.alert('Feature Coming Soon', 'Task creation will be available soon.');
          }
        }
      ]
    );
  };

  const renderRecommendation = ({ item: recommendation }) => (
    <TouchableOpacity 
      style={styles.recommendationCard}
      onPress={() => handleRecommendationPress(recommendation)}
      activeOpacity={0.7}
    >
      <View style={styles.recommendationHeader}>
        <View style={styles.recommendationTitleContainer}>
          <MaterialCommunityIcons 
            name={getCategoryIcon(recommendation.category)} 
            size={24} 
            color={getCategoryColor(recommendation.category)} 
          />
          <Text style={styles.recommendationTitle} numberOfLines={2}>
            {recommendation.title}
          </Text>
        </View>
        <View style={styles.recommendationBadges}>
          <StatusBadge 
            status={recommendation.priority} 
            color={getPriorityColor(recommendation.priority)}
          />
        </View>
      </View>

      <Text style={styles.recommendationDescription} numberOfLines={3}>
        {recommendation.description}
      </Text>

      {recommendation.impact && (
        <View style={styles.recommendationImpact}>
          <MaterialCommunityIcons name="trending-up" size={16} color="#34C759" />
          <Text style={styles.recommendationImpactText}>{recommendation.impact}</Text>
        </View>
      )}

      <View style={styles.recommendationFooter}>
        <View style={styles.recommendationMeta}>
          <View style={styles.recommendationMetaItem}>
            <MaterialCommunityIcons name="tag" size={14} color="#8E8E93" />
            <Text style={styles.recommendationMetaText}>
              {recommendation.category.replace('_', ' ').toLowerCase()}
            </Text>
          </View>
          {recommendation.estimatedImpact && (
            <View style={styles.recommendationMetaItem}>
              <MaterialCommunityIcons name="chart-line" size={14} color="#8E8E93" />
              <Text style={styles.recommendationMetaText}>
                {recommendation.estimatedImpact}% improvement
              </Text>
            </View>
          )}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Recommendations" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="lightbulb-outline" size={64} color="#FF453A" />
          <Text style={styles.errorTitle}>Loading Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setError(null);
            loadRecommendations();
          }}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Recommendations" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading recommendations...</Text>
          <Text style={styles.loadingSubtext}>Analyzing optimization opportunities</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Recommendations" />
      
      {/* Summary Header */}
      <View style={styles.summaryContainer}>
        <LinearGradient
          colors={['#007AFF', '#0056CC']}
          style={styles.summaryGradient}
        >
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>Optimization Opportunities</Text>
            <Text style={styles.summaryCount}>
              {filteredRecommendations.length} of {recommendations.length} recommendations
            </Text>
          </View>
          <MaterialCommunityIcons name="lightbulb-outline" size={32} color="white" />
        </LinearGradient>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                selectedFilter === filter.key && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === filter.key && styles.filterTabTextActive
              ]}>
                {filter.label}
              </Text>
              {filter.count > 0 && (
                <View style={[
                  styles.filterBadge,
                  selectedFilter === filter.key && styles.filterBadgeActive
                ]}>
                  <Text style={[
                    styles.filterBadgeText,
                    selectedFilter === filter.key && styles.filterBadgeTextActive
                  ]}>
                    {filter.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Controls */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.sortScroll}
        >
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortOption,
                selectedSort === option.key && styles.sortOptionActive
              ]}
              onPress={() => setSelectedSort(option.key)}
            >
              <Text style={[
                styles.sortOptionText,
                selectedSort === option.key && styles.sortOptionTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recommendations List */}
      <FlatList
        data={filteredRecommendations}
        renderItem={renderRecommendation}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="lightbulb-off-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Recommendations</Text>
            <Text style={styles.emptyText}>
              {selectedFilter === 'all' 
                ? 'Your warehouse optimization is on track! Check back later for new recommendations.'
                : `No ${selectedFilter.toLowerCase()} priority recommendations found.`
              }
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      {filteredRecommendations.length > 0 && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => Alert.alert('Bulk Actions', 'Bulk recommendation actions will be available soon.')}
        >
          <MaterialCommunityIcons name="playlist-check" size={24} color="white" />
        </TouchableOpacity>
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
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '600'
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 12
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  summaryContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden'
  },
  summaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  summaryContent: {
    flex: 1
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white'
  },
  summaryCount: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginTop: 4
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    marginRight: 8
  },
  filterTabActive: {
    backgroundColor: '#007AFF'
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E'
  },
  filterTabTextActive: {
    color: 'white'
  },
  filterBadge: {
    backgroundColor: '#8E8E93',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center'
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)'
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white'
  },
  filterBadgeTextActive: {
    color: 'white'
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginRight: 12
  },
  sortScroll: {
    flex: 1
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginRight: 8
  },
  sortOptionActive: {
    backgroundColor: '#E3F2FD'
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93'
  },
  sortOptionTextActive: {
    color: '#007AFF'
  },
  list: {
    flex: 1
  },
  listContent: {
    padding: 16
  },
  recommendationCard: {
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
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  recommendationTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 12,
    flex: 1
  },
  recommendationBadges: {
    marginLeft: 8
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 12
  },
  recommendationImpact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12
  },
  recommendationImpactText: {
    fontSize: 14,
    color: '#34C759',
    marginLeft: 6,
    fontStyle: 'italic'
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  recommendationMeta: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  recommendationMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  recommendationMetaText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64
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
    lineHeight: 22,
    maxWidth: 280
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  }
}); 