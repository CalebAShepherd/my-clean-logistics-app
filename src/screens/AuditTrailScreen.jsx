import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { fetchAuditLogs } from '../api/auditTrail';
import { useAuth } from '../hooks/useAuth';
import InternalHeader from '../components/InternalHeader';
import FilterPagination from '../components/FilterPagination';
import { AuthContext } from '../context/AuthContext';

const ALL_ENTITY_TYPES = [
  { label: 'Account', value: 'ACCOUNT' },
  { label: 'Lead', value: 'LEAD' },
  { label: 'Ticket', value: 'TICKET' },
  { label: 'Task', value: 'TASK' },
  { label: 'SOX Control', value: 'SOX_CONTROL' },
  { label: 'SOX Test', value: 'SOX_TEST' },
  { label: 'Insurance Claim', value: 'INSURANCE_CLAIM' },
  { label: 'User', value: 'USER' },
  { label: 'Shipment', value: 'SHIPMENT' },
  { label: 'Inventory', value: 'INVENTORY' },
];

const CRM_ENTITY_TYPES = [
  { label: 'Account', value: 'ACCOUNT' },
  { label: 'Lead', value: 'LEAD' },
  { label: 'Ticket', value: 'TICKET' },
  { label: 'Task', value: 'TASK' },
  { label: 'User', value: 'USER' }, // CRM users
];

export default function AuditTrailScreen({ navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  const isCrmAdmin = user?.role === 'crm_admin';

  const [filters, setFilters] = useState([
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      value: isCrmAdmin ? 'CRM' : '',
      options: [
        { label: 'CRM', value: 'CRM' },
        { label: 'Warehouse', value: 'WAREHOUSE' },
        { label: 'Financial', value: 'FINANCIAL' },
        { label: 'Compliance', value: 'COMPLIANCE' },
      ],
      // Do not show this filter for CRM admin, as it's auto-applied
      hidden: isCrmAdmin,
    },
    {
      key: 'entityType',
      label: 'Entity Type',
      type: 'select',
      value: '',
      options: isCrmAdmin ? CRM_ENTITY_TYPES : ALL_ENTITY_TYPES
    },
    {
      key: 'action',
      label: 'Action',
      type: 'select',
      value: '',
      options: [
        { label: 'Created', value: 'CREATE' },
        { label: 'Updated', value: 'UPDATE' },
        { label: 'Deleted', value: 'DELETE' },
        { label: 'Viewed', value: 'VIEW' },
      ]
    }
  ]);

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      };
      
      // Add active filters
      filters.forEach(filter => {
        if (filter.value) {
          params[filter.key] = filter.value;
        }
      });

      const res = await fetchAuditLogs(userToken, params);
      setData(res.logs || []);
      setPagination(res.pagination || null);
    } catch (err) {
      // error already logged in api layer
    } finally {
      setLoading(false);
    }
  }, [userToken, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => prev.map(filter => 
      filter.key === key ? { ...filter, value } : filter
    ));
  };

  const handlePageChange = (page) => {
    loadData(page);
  };

  const renderAuditLog = ({ item }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <Text style={styles.entityType}>{item.entityType}</Text>
        <Text style={styles.action}>{item.action}</Text>
      </View>
      <Text style={styles.entityId}>ID: {item.entityId}</Text>
      {item.changes && (
        <Text style={styles.changes} numberOfLines={2}>
          Changes: {JSON.stringify(item.changes)}
        </Text>
      )}
      <View style={styles.logFooter}>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
        <Text style={styles.user}>
          {item.user?.name || `User ${item.userId}`}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader title="Audit Trail" />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading audit logs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Audit Trail" />
      <FilterPagination
        filters={filters.filter(f => !f.hidden)}
        pagination={pagination}
        onFilterChange={handleFilterChange}
        onPageChange={handlePageChange}
        loading={loading}
      />
      <View style={styles.content}>
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderAuditLog}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Audit Logs</Text>
              <Text style={styles.emptySubtitle}>
                System activities will appear here once they occur
              </Text>
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
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  logCard: {
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
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entityType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  action: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    textTransform: 'uppercase',
  },
  entityId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  changes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  user: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
}); 