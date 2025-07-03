import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { hasReceivingOperations, hasReceivingQC } from '../utils/featureFlags';
import InternalHeader from '../components/InternalHeader';
import { getApiUrl } from '../utils/apiHost';


const API_URL =
  getApiUrl();

const ReceivingManagementScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    if (!hasReceivingOperations(settings)) {
      Alert.alert(
        'Feature Not Available',
        'Receiving operations are not enabled for your account.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    loadWarehouses();
  }, [settings]);

  const loadWarehouses = async () => {
    try {
      const response = await fetch(`${API_URL}/warehouses`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      const data = await response.json();
      setWarehouses(data);
      if (data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(data[0].id);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadReceipts = useCallback(async () => {
    if (!selectedWarehouse) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        warehouseId: selectedWarehouse,
        ...(filterStatus !== 'ALL' && { status: filterStatus })
      });

      const [receiptsResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/receiving?${params}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        }),
        fetch(`${API_URL}/receiving/stats/${selectedWarehouse}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        })
      ]);

      const receiptsData = await receiptsResponse.json();
      const statsData = await statsResponse.json();

      setReceipts(receiptsData.receipts || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading receipts:', error);
      Alert.alert('Error', 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, filterStatus]);

  useEffect(() => {
    if (selectedWarehouse) {
      loadReceipts();
    }
  }, [selectedWarehouse, filterStatus, loadReceipts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReceipts();
    setRefreshing(false);
  }, [loadReceipts]);

  const handleCompleteReceipt = async (receiptId) => {
    try {
      const response = await fetch(`${API_URL}/receiving/${receiptId}/complete`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ generatePutAwayTasks: true })
      });

      if (response.ok) {
        await loadReceipts();
        Alert.alert('Success', 'Receipt completed successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to complete receipt');
      }
    } catch (error) {
      console.error('Error completing receipt:', error);
      Alert.alert('Error', 'Failed to complete receipt');
    }
  };

  const handlePerformQC = async (receiptId, qcPassed) => {
    try {
      const response = await fetch(`${API_URL}/receiving/${receiptId}/qc`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ 
          qcPassed,
          qcNotes: qcPassed ? 'QC Passed' : 'QC Failed - requires review'
        })
      });

      if (response.ok) {
        await loadReceipts();
        Alert.alert('Success', `QC ${qcPassed ? 'passed' : 'failed'} successfully`);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to perform QC');
      }
    } catch (error) {
      console.error('Error performing QC:', error);
      Alert.alert('Error', 'Failed to perform QC');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: '#FFA500',
      IN_PROGRESS: '#4169E1',
      QC_PENDING: '#FF6347',
      QC_FAILED: '#DC143C',
      COMPLETED: '#008000',
      CANCELLED: '#666'
    };
    return colors[status] || '#666';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderReceiptCard = ({ item }) => (
    <TouchableOpacity
      style={styles.receiptCard}
      onPress={() => navigation.navigate('ReceiptDetails', { receiptId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.receiptCardContent}>
        <View style={styles.receiptHeader}>
          <View style={styles.receiptNumberContainer}>
            <View style={styles.receiptIconContainer}>
              <MaterialCommunityIcons name="package-variant" size={20} color="#007AFF" />
            </View>
            <Text style={styles.receiptNumber}>{item.receiptNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>

        <View style={styles.receiptDetails}>
          {item.asn && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="document-text" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>ASN: {item.asn.asnNumber}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color="#8E8E93" />
            <Text style={styles.detailText}>Started: {formatDate(item.createdAt)}</Text>
          </View>

          {item.assignedTo && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>Assigned: {item.assignedTo.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.receiptActions}>
          {item.status === 'IN_PROGRESS' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#28a745' }]}
              onPress={() => handleCompleteReceipt(item.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="check" size={16} color="white" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'QC_PENDING' && hasReceivingQC(settings) && (
            <View style={styles.qcActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#28a745' }]}
                onPress={() => handlePerformQC(item.id, true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="check-circle" size={16} color="white" />
                <Text style={styles.actionButtonText}>Pass QC</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#dc3545' }]}
                onPress={() => handlePerformQC(item.id, false)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close-circle" size={16} color="white" />
                <Text style={styles.actionButtonText}>Fail QC</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#007bff' }]}
            onPress={() => navigation.navigate('ReceiptDetails', { receiptId: item.id })}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="eye" size={16} color="white" />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Receiving Overview</Text>
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total || 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.pending || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.inProgress || 0}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.completed || 0}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
        {['ALL', 'PENDING', 'IN_PROGRESS', 'QC_PENDING', 'QC_FAILED', 'COMPLETED'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filterStatus === status && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus(status)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterButtonText,
              filterStatus === status && styles.filterButtonTextActive
            ]}>
              {status.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading && receipts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Receiving" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading receipts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Receiving"
        rightIcons={[
          {
            icon: 'refresh',
            color: '#007AFF',
            onPress: () => loadReceipts()
          }
        ]}
      />

      {renderStatsCard()}
      {renderFilterButtons()}

      <View style={styles.content}>
        <FlatList
          data={receipts}
          renderItem={renderReceiptCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="package-variant" size={64} color="#C7C7CC" />
              <Text style={styles.emptyText}>No Receipts Found</Text>
              <Text style={styles.emptySubtext}>
                Receipts will appear here when receiving starts
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  // Stats Section
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },

  // Filter Buttons
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  filterScrollContent: {
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },

  // Content & List
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  listContainer: {
    paddingBottom: 40,
  },

  // Receipt Cards
  receiptCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  receiptCardContent: {
    padding: 16,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  receiptIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  receiptNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  receiptDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  receiptActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F8F9FA',
  },
  qcActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default ReceivingManagementScreen; 