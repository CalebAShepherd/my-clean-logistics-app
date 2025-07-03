import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import InternalHeader from '../components/InternalHeader';
import StatusBadge from '../components/StatusBadge';
import { facilityMaintenanceAPI } from '../api/facilityMaintenance';
import { AuthContext } from '../context/AuthContext';

const FacilityComplianceScreen = ({ navigation, route }) => {
  const { facilityId, facilityName } = route.params || {};
  const { userToken } = useContext(AuthContext);
  const [compliance, setCompliance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    complianceType: 'all',
    status: 'all',
    complianceLevel: 'all'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });

  useEffect(() => {
    loadCompliance();
  }, [filters, searchQuery, facilityId]);

  const loadCompliance = async (page = 1, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (page === 1) setLoading(true);

      const params = {
        page,
        limit: 20,
        search: searchQuery,
        facilityId,
        ...filters
      };

      const data = await facilityMaintenanceAPI.getCompliance(params, userToken);
      
      if (page === 1 || refresh) {
        setCompliance(data.compliance);
      } else {
        setCompliance(prev => [...prev, ...data.compliance]);
      }
      
      setPagination(data.pagination);
    } catch (error) {
      Alert.alert('Error', 'Failed to load compliance records');
      console.error('Error loading compliance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadCompliance(1, true);
  };

  const handleLoadMore = () => {
    if (pagination.hasNext && !loading) {
      loadCompliance(pagination.currentPage + 1);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLIANT': return '#10B981';
      case 'NON_COMPLIANT': return '#EF4444';
      case 'PENDING': return '#F59E0B';
      case 'IN_PROGRESS': return '#3B82F6';
      case 'EXPIRED': return '#DC2626';
      case 'WAIVED': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getComplianceLevelColor = (level) => {
    switch (level) {
      case 'FULL': return '#10B981';
      case 'PARTIAL': return '#F59E0B';
      case 'NON_COMPLIANT': return '#EF4444';
      case 'UNKNOWN': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const isOverdue = (nextCheckDate) => {
    return new Date(nextCheckDate) < new Date();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderComplianceCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.complianceCard,
        isOverdue(item.nextCheckDate) && styles.overdueCard
      ]}
      onPress={() => navigation.navigate('ComplianceDetails', { 
        complianceId: item.id,
        facilityId,
        facilityName 
      })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.complianceName}>{item.name}</Text>
          <Text style={styles.complianceType}>
            {item.complianceType.replace(/_/g, ' ')}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <StatusBadge 
            status={item.status} 
            color={getStatusColor(item.status)}
          />
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="account-tie" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            {item.regulatoryBody || 'Internal'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            Due: {formatDate(item.nextCheckDate)}
          </Text>
          {isOverdue(item.nextCheckDate) && (
            <MaterialCommunityIcons 
              name="alert-circle" 
              size={16} 
              color="#EF4444" 
              style={styles.overdueIcon}
            />
          )}
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="repeat" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            {item.frequency.replace(/_/g, ' ')}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="account" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            {item.responsible.username}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.complianceLevelContainer}>
          <Text style={styles.complianceLevelLabel}>Level:</Text>
          <StatusBadge 
            status={item.complianceLevel} 
            color={getComplianceLevelColor(item.complianceLevel)}
          />
        </View>
        
        {item.audits && item.audits.length > 0 && (
          <View style={styles.auditInfo}>
            <MaterialCommunityIcons name="clipboard-check" size={16} color="#6B7280" />
            <Text style={styles.auditText}>
              {item.audits.length} audit(s)
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {isOverdue(item.nextCheckDate) && (
        <View style={styles.overdueAlert}>
          <MaterialCommunityIcons name="alert-circle" size={16} color="#EF4444" />
          <Text style={styles.overdueText}>Overdue</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && pagination.currentPage === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader 
          navigation={navigation} 
          title={facilityName ? `${facilityName} - Compliance` : "Facility Compliance"} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading compliance records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title={facilityName ? `${facilityName} - Compliance` : "Facility Compliance"}
        rightIcons={[
          {
            icon: 'add',
            onPress: () => navigation.navigate('CreateComplianceRecord', {
              facilityId,
              facilityName
            }),
            color: '#007AFF'
          }
        ]}
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search compliance records..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {pagination.totalCount} compliance records
        </Text>
      </View>

      {/* Compliance List */}
      <FlatList
        data={compliance}
        renderItem={renderComplianceCard}
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
              <MaterialCommunityIcons name="shield-check" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Compliance Records</Text>
              <Text style={styles.emptyText}>
                Start by adding your first compliance requirement
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('CreateComplianceRecord', {
                  facilityId,
                  facilityName
                })}
              >
                <Text style={styles.emptyButtonText}>Add Compliance Record</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
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

  complianceCard: {
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
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444'
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  cardInfo: {
    flex: 1
  },
  complianceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4
  },
  complianceType: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize'
  },
  statusContainer: {
    marginLeft: 12
  },

  cardDetails: {
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
  overdueIcon: {
    marginLeft: 4
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  complianceLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  complianceLevelLabel: {
    fontSize: 12,
    color: '#6B7280'
  },
  auditInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  auditText: {
    fontSize: 12,
    color: '#6B7280'
  },
  actionButton: {
    padding: 8
  },

  overdueAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    gap: 6
  },
  overdueText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600'
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

export default FacilityComplianceScreen; 