import React, { useState, useEffect, useContext } from 'react';
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
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import InternalHeader from '../components/InternalHeader';
import StatusBadge from '../components/StatusBadge';
import { facilityMaintenanceAPI } from '../api/facilityMaintenance';
import { AuthContext } from '../context/AuthContext';

const FacilityMaintenanceLogsScreen = ({ navigation, route }) => {
  const { facilityId, facilityName } = route.params || {};
  const { userToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMaintenanceLogs();
  }, [facilityId]);

  const loadMaintenanceLogs = async () => {
    try {
      const params = {
        facilityId: facilityId || 'all',
        limit: 50
      };
      
      const response = await facilityMaintenanceAPI.getMaintenanceLogs(params, userToken);
      setLogs(response.logs || []);
    } catch (error) {
      console.error('Error loading maintenance logs:', error);
      Alert.alert('Error', 'Failed to load maintenance logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateLog = () => {
    navigation.navigate('CreateMaintenanceLog', { facilityId, facilityName });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return '#10B981';
      case 'IN_PROGRESS': return '#3B82F6';
      case 'SCHEDULED': return '#8B5CF6';
      case 'OVERDUE': return '#DC2626';
      default: return '#F59E0B';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderMaintenanceLog = (log) => (
    <TouchableOpacity
      key={log.id}
      style={styles.logCard}
      onPress={() => navigation.navigate('MaintenanceLogDetails', { logId: log.id })}
      activeOpacity={0.8}
    >
      <View style={styles.logHeader}>
        <Text style={styles.logTitle}>{log.title}</Text>
        <StatusBadge
          status={log.status}
          color={getStatusColor(log.status)}
          size="small"
        />
      </View>

      <Text style={styles.logDescription} numberOfLines={2}>
        {log.description || 'No description provided'}
      </Text>

      <View style={styles.logDetails}>
        <View style={styles.logDetailItem}>
          <Ionicons name="calendar" size={16} color="#6B7280" />
          <Text style={styles.logDetailText}>
            {formatDate(log.scheduledDate)}
          </Text>
        </View>
        
        {log.facility && (
          <View style={styles.logDetailItem}>
            <Ionicons name="business" size={16} color="#6B7280" />
            <Text style={styles.logDetailText}>
              {log.facility.name}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.logFooter}>
        <Text style={styles.logType}>{log.maintenanceType}</Text>
        {log.estimatedCost && (
          <Text style={styles.logCost}>${log.estimatedCost}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="wrench" size={64} color="#E5E7EB" />
      <Text style={styles.emptyTitle}>No Maintenance Logs</Text>
      <Text style={styles.emptyText}>
        No maintenance logs found for this facility
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleCreateLog}>
        <Text style={styles.emptyButtonText}>Create First Log</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Maintenance Logs" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading maintenance logs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Maintenance Logs"
        rightIcons={[
          {
            icon: 'add',
            onPress: handleCreateLog,
            color: '#007AFF'
          }
        ]}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search maintenance logs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadMaintenanceLogs} />
        }
        showsVerticalScrollIndicator={false}
      >
        {logs.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.logsContainer}>
            {logs.map(renderMaintenanceLog)}
          </View>
        )}
      </ScrollView>
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
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280'
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16
  },
  searchIcon: {
    marginRight: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#111827'
  },
  scrollView: {
    flex: 1
  },
  logsContainer: {
    padding: 20
  },
  logCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  logTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12
  },
  logDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16
  },
  logDetails: {
    marginBottom: 16
  },
  logDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  logDetailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  logCost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 12
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default FacilityMaintenanceLogsScreen; 