import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { fetchSoxTests } from '../api/soxCompliance';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import InternalHeader from '../components/InternalHeader';
import FilterPagination from '../components/FilterPagination';

export default function SoxTestsScreen({ navigation }) {
  const { userToken } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState([
    {
      key: 'result',
      label: 'Test Result',
      type: 'select',
      value: '',
      options: [
        { label: 'Pass', value: 'PASS' },
        { label: 'Fail', value: 'FAIL' },
        { label: 'Partial', value: 'PARTIAL' },
        { label: 'Not Tested', value: 'NOT_TESTED' },
      ]
    }
  ]);

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        sortBy: 'testDate',
        sortOrder: 'desc'
      };
      
      // Add active filters
      filters.forEach(filter => {
        if (filter.value) {
          params[filter.key] = filter.value;
        }
      });

      const res = await fetchSoxTests(userToken, params);
      setData(res.tests || []);
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
          onPress={() => navigation.navigate('CreateSoxTest')}
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

  const getResultColor = (result) => {
    switch (result) {
      case 'PASS': return '#28a745';
      case 'FAIL': return '#dc3545';
      case 'PARTIAL': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'PASS': return 'checkmark-circle';
      case 'FAIL': return 'close-circle';
      case 'PARTIAL': return 'warning';
      default: return 'help-circle';
    }
  };

  const renderTest = ({ item }) => (
    <View style={styles.testCard}>
      <View style={styles.testHeader}>
        <View style={styles.testInfo}>
          <Text style={styles.testDate}>
            {new Date(item.testDate).toLocaleDateString()}
          </Text>
          <Text style={styles.controlNumber}>
            {item.control?.controlNumber || 'Unknown Control'}
          </Text>
        </View>
        <View style={styles.resultContainer}>
          <Ionicons 
            name={getResultIcon(item.result)} 
            size={24} 
            color={getResultColor(item.result)} 
          />
          <Text style={[styles.resultText, { color: getResultColor(item.result) }]}>
            {item.result}
          </Text>
        </View>
      </View>

      {item.control?.name && (
        <Text style={styles.controlName}>{item.control.name}</Text>
      )}

      {item.issuesFound && (
        <View style={styles.issuesSection}>
          <Text style={styles.sectionTitle}>Issues Found:</Text>
          <Text style={styles.issuesText} numberOfLines={3}>
            {item.issuesFound}
          </Text>
        </View>
      )}

      {item.remediationPlan && (
        <View style={styles.remediationSection}>
          <Text style={styles.sectionTitle}>Remediation Plan:</Text>
          <Text style={styles.remediationText} numberOfLines={2}>
            {item.remediationPlan}
          </Text>
        </View>
      )}

      <View style={styles.testFooter}>
        <Text style={styles.testerText}>
          Tested by: {item.user?.name || `User ${item.userId}`}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="SOX Tests" />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading SOX tests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="SOX Tests" />
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
          renderItem={renderTest}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No SOX Tests</Text>
              <Text style={styles.emptySubtitle}>
                Record your first SOX test to track compliance
              </Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateSoxTest')}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Record Test</Text>
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
  testCard: {
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
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  testInfo: {
    flex: 1,
  },
  testDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  controlNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  controlName: {
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
    fontWeight: '500',
  },
  issuesSection: {
    marginBottom: 12,
  },
  remediationSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  issuesText: {
    fontSize: 13,
    color: '#dc3545',
    lineHeight: 18,
  },
  remediationText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  testFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  testerText: {
    fontSize: 12,
    color: '#999',
  },
}); 