import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { fetchSoxControls } from '../api/soxCompliance';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import InternalHeader from '../components/InternalHeader';
import FilterPagination from '../components/FilterPagination';

export default function SoxControlsScreen({ navigation }) {
  const { userToken } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState([
    {
      key: 'area',
      label: 'Area',
      type: 'select',
      value: '',
      options: [
        { label: 'Financial Reporting', value: 'FINANCIAL_REPORTING' },
        { label: 'IT General Controls', value: 'IT_GENERAL_CONTROLS' },
        { label: 'Inventory', value: 'INVENTORY' },
        { label: 'Billing', value: 'BILLING' },
        { label: 'Revenue Recognition', value: 'REVENUE_RECOGNITION' },
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      value: '',
      options: [
        { label: 'Design', value: 'DESIGN' },
        { label: 'Implemented', value: 'IMPLEMENTED' },
        { label: 'Tested', value: 'TESTED' },
        { label: 'Effective', value: 'EFFECTIVE' },
        { label: 'Ineffective', value: 'INEFFECTIVE' },
      ]
    }
  ]);

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        sortBy: 'controlNumber',
        sortOrder: 'asc'
      };
      
      // Add active filters
      filters.forEach(filter => {
        if (filter.value) {
          params[filter.key] = filter.value;
        }
      });

      const res = await fetchSoxControls(userToken, params);
      setData(res.controls || []);
      setPagination(res.pagination || null);
    } catch (err) {
      // already logged
    } finally {
      setLoading(false);
    }
  }, [userToken, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('CreateSoxControl')}
        >
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      )
    });
  }, [navigation]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => prev.map(filter => 
      filter.key === key ? { ...filter, value } : filter
    ));
  };

  const handlePageChange = (page) => {
    loadData(page);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return '#28a745';
      case 'INACTIVE': return '#dc3545';
      case 'UNDER_REVIEW': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getAreaIcon = (area) => {
    switch (area) {
      case 'FINANCIAL_REPORTING': return 'bar-chart-outline';
      case 'INFORMATION_TECHNOLOGY': return 'laptop-outline';
      case 'OPERATIONS': return 'cog-outline';
      case 'COMPLIANCE': return 'shield-checkmark-outline';
      default: return 'document-outline';
    }
  };

  const renderControl = ({ item }) => (
    <TouchableOpacity style={styles.controlCard}>
      <View style={styles.controlHeader}>
        <View style={styles.controlTitleRow}>
          <Ionicons 
            name={getAreaIcon(item.area)} 
            size={20} 
            color="#007AFF" 
            style={styles.areaIcon}
          />
          <Text style={styles.controlNumber}>{item.controlNumber}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.controlName}>{item.name}</Text>
      
      {item.description && (
        <Text style={styles.controlDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.controlFooter}>
        <Text style={styles.areaText}>{item.area.replace('_', ' ')}</Text>
        <Text style={styles.frequencyText}>{item.frequency}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="SOX Controls" />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading SOX controls...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="SOX Controls" />
      <FilterPagination
        filters={filters}
        pagination={pagination}
        onFilterChange={handleFilterChange}
        onPageChange={handlePageChange}
        loading={loading}
      />
      <View style={styles.content}>
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderControl}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No SOX Controls</Text>
              <Text style={styles.emptySubtitle}>
                Create your first SOX control to start managing compliance
              </Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateSoxControl')}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Create Control</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  controlCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  areaIcon: {
    marginRight: 8,
  },
  controlNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  controlName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  controlDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  controlFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  areaText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  frequencyText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
}); 