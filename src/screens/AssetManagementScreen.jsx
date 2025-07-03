import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../components/StatusBadge';
import InternalHeader from '../components/InternalHeader';
import assetAPI from '../api/assets';

const AssetManagementScreen = ({ navigation }) => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    condition: 'all',
    warehouseId: 'all'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });

  useEffect(() => {
    loadAssets();
  }, [filters, searchQuery]);

  const loadAssets = async (page = 1, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (page === 1) setLoading(true);

      const params = {
        page,
        limit: 20,
        search: searchQuery,
        ...filters
      };

      const data = await assetAPI.getAssets(params);
      
      if (page === 1 || refresh) {
        setAssets(data.assets);
      } else {
        setAssets(prev => [...prev, ...data.assets]);
      }
      
      setPagination(data.pagination);
    } catch (error) {
      Alert.alert('Error', 'Failed to load assets');
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadAssets(1, true);
  };

  const handleLoadMore = () => {
    if (pagination.hasNext && !loading) {
      loadAssets(pagination.currentPage + 1);
    }
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
    loadAssets(1);
  };

  const clearFilters = () => {
    setFilters({
      category: 'all',
      status: 'all',
      condition: 'all',
      warehouseId: 'all'
    });
    setSearchQuery('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return '#10B981';
      case 'INACTIVE': return '#6B7280';
      case 'MAINTENANCE': return '#F59E0B';
      case 'RETIRED': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'EXCELLENT': return '#10B981';
      case 'GOOD': return '#84CC16';
      case 'FAIR': return '#F59E0B';
      case 'POOR': return '#EF4444';
      case 'CRITICAL': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const renderAssetCard = ({ item }) => (
    <TouchableOpacity
      style={styles.assetCard}
      onPress={() => navigation.navigate('AssetDetails', { assetId: item.id })}
    >
      <View style={styles.assetHeader}>
        <View style={styles.assetInfo}>
          <Text style={styles.assetName}>{item.name}</Text>
          <Text style={styles.assetNumber}>#{item.assetNumber}</Text>
        </View>
        <View style={styles.statusContainer}>
          <StatusBadge 
            status={item.status} 
            color={getStatusColor(item.status)}
          />
        </View>
      </View>

      <View style={styles.assetDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="layers-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{item.category}</Text>
        </View>
        
        {item.warehouse && (
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{item.warehouse.name}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Ionicons name="fitness-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>Condition: </Text>
          <StatusBadge 
            status={item.condition} 
            color={getConditionColor(item.condition)}
          />
        </View>

        {item.assignedUser && (
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              Assigned to: {item.assignedUser.username}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.assetFooter}>
        <View style={styles.valueContainer}>
          <Text style={styles.valueLabel}>Purchase Cost</Text>
          <Text style={styles.valueAmount}>
            ${parseFloat(item.purchaseCost).toLocaleString()}
          </Text>
        </View>
        
        {item.bookValue && (
          <View style={styles.valueContainer}>
            <Text style={styles.valueLabel}>Book Value</Text>
            <Text style={styles.valueAmount}>
              ${parseFloat(item.bookValue).toLocaleString()}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chevron-forward" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {item.maintenanceSchedules && item.maintenanceSchedules.length > 0 && (
        <View style={styles.maintenanceAlert}>
          <Ionicons name="build-outline" size={16} color="#F59E0B" />
          <Text style={styles.maintenanceText}>
            {item.maintenanceSchedules.length} scheduled maintenance(s)
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filter Assets</Text>
          <TouchableOpacity onPress={applyFilters}>
            <Text style={styles.modalApplyText}>Apply</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Category Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Category</Text>
            <View style={styles.filterOptions}>
              {['all', 'WAREHOUSE_EQUIPMENT', 'MATERIAL_HANDLING', 'TRANSPORTATION', 'IT_EQUIPMENT'].map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterOption,
                    filters.category === category && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, category }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.category === category && styles.filterOptionTextSelected
                  ]}>
                    {category === 'all' ? 'All Categories' : category.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterOptions}>
              {['all', 'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    filters.status === status && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, status }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.status === status && styles.filterOptionTextSelected
                  ]}>
                    {status === 'all' ? 'All Statuses' : status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Condition Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Condition</Text>
            <View style={styles.filterOptions}>
              {['all', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'].map(condition => (
                <TouchableOpacity
                  key={condition}
                  style={[
                    styles.filterOption,
                    filters.condition === condition && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, condition }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.condition === condition && styles.filterOptionTextSelected
                  ]}>
                    {condition === 'all' ? 'All Conditions' : condition}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={clearFilters}
          >
            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading && pagination.currentPage === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Asset Management" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading assets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Asset Management"
        rightIcons={[
          {
            icon: 'wrench',
            onPress: () => navigation.navigate('MaintenanceManagement'),
            color: '#007AFF'
          },
          {
            icon: 'chart-line',
            onPress: () => navigation.navigate('AssetAnalytics'),
            color: '#007AFF'
          },
          {
            icon: 'plus',
            onPress: () => navigation.navigate('CreateAsset'),
            color: '#007AFF'
          }
        ]}
      />

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assets..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="funnel-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {pagination.totalCount} assets total
        </Text>
      </View>

      {/* Assets List */}
      <FlatList
        data={assets}
        renderItem={renderAssetCard}
        keyExtractor={(item) => item.id}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading && pagination.currentPage > 1 ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Assets Found</Text>
              <Text style={styles.emptyText}>
                Start by adding your first asset to track equipment and inventory
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('CreateAsset')}
              >
                <Text style={styles.emptyButtonText}>Add Asset</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {renderFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280'
  },

  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    gap: 12
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827'
  },
  filterButton: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  statsText: {
    fontSize: 14,
    color: '#6B7280'
  },
  assetCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  assetInfo: {
    flex: 1
  },
  assetName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4
  },
  assetNumber: {
    fontSize: 14,
    color: '#6B7280'
  },
  statusContainer: {
    marginLeft: 12
  },
  assetDetails: {
    gap: 8,
    marginBottom: 16
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  detailText: {
    fontSize: 14,
    color: '#374151'
  },
  assetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  valueContainer: {
    flex: 1
  },
  valueLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2
  },
  valueAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  actionButton: {
    padding: 8
  },
  maintenanceAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    gap: 6
  },
  maintenanceText: {
    fontSize: 12,
    color: '#92400E'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827'
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6B7280'
  },
  modalApplyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF'
  },
  modalContent: {
    flex: 1,
    padding: 20
  },
  filterSection: {
    marginBottom: 32
  },
  filterLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12
  },
  filterOptions: {
    gap: 8
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  filterOptionSelected: {
    backgroundColor: '#EBF8FF',
    borderColor: '#007AFF'
  },
  filterOptionText: {
    fontSize: 16,
    color: '#374151'
  },
  filterOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600'
  },
  clearFiltersButton: {
    marginTop: 32,
    paddingVertical: 12,
    alignItems: 'center'
  },
  clearFiltersText: {
    fontSize: 16,
    color: '#EF4444'
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center'
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
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default AssetManagementScreen; 