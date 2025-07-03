import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { fetchInsuranceClaims } from '../api/insuranceClaims';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import InternalHeader from '../components/InternalHeader';
import FilterPagination from '../components/FilterPagination';

export default function InsuranceClaimsScreen({ navigation }) {
  const { userToken } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState([
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      value: '',
      options: [
        { label: 'Open', value: 'OPEN' },
        { label: 'Under Review', value: 'UNDER_REVIEW' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Rejected', value: 'REJECTED' },
        { label: 'Closed', value: 'CLOSED' },
      ]
    }
  ]);

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        sortBy: 'dateFiled',
        sortOrder: 'desc'
      };
      
      // Add active filters
      filters.forEach(filter => {
        if (filter.value) {
          params[filter.key] = filter.value;
        }
      });

      const res = await fetchInsuranceClaims(userToken, params);
      setData(res.claims || []);
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
          onPress={() => navigation.navigate('CreateInsuranceClaim')}
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
      case 'SUBMITTED': return '#007AFF';
      case 'UNDER_REVIEW': return '#ffc107';
      case 'APPROVED': return '#28a745';
      case 'DENIED': return '#dc3545';
      case 'PAID': return '#6f42c1';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUBMITTED': return 'paper-plane-outline';
      case 'UNDER_REVIEW': return 'eye-outline';
      case 'APPROVED': return 'checkmark-circle-outline';
      case 'DENIED': return 'close-circle-outline';
      case 'PAID': return 'card-outline';
      default: return 'help-circle-outline';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const renderClaim = ({ item }) => (
    <TouchableOpacity style={styles.claimCard}>
      <View style={styles.claimHeader}>
        <View style={styles.claimInfo}>
          <Text style={styles.claimNumber}>{item.claimNumber}</Text>
          <Text style={styles.insurer}>{item.insurer}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={getStatusIcon(item.status)} 
            size={20} 
            color={getStatusColor(item.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.amountContainer}>
        <Text style={styles.amountLabel}>Claim Amount</Text>
        <Text style={styles.amountValue}>{formatCurrency(item.claimAmount)}</Text>
      </View>

      {item.description && (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.claimFooter}>
        <Text style={styles.dateText}>
          Filed: {new Date(item.dateFiled).toLocaleDateString()}
        </Text>
        {item.dateResolved && (
          <Text style={styles.dateText}>
            Resolved: {new Date(item.dateResolved).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Insurance Claims" />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading insurance claims...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Insurance Claims" />
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
          renderItem={renderClaim}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="shield-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Insurance Claims</Text>
              <Text style={styles.emptySubtitle}>
                File your first insurance claim to get started
              </Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateInsuranceClaim')}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.createButtonText}>File Claim</Text>
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
  claimCard: {
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
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  claimInfo: {
    flex: 1,
  },
  claimNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  insurer: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  amountContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  claimFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
}); 