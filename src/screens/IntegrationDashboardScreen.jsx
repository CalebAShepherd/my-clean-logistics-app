import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import InternalHeader from '../components/InternalHeader';
import { AuthContext } from '../context/AuthContext';
import { getApiUrl } from '../utils/apiHost';

const { width } = Dimensions.get('window');

const IntegrationDashboardScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [healthData, setHealthData] = useState(null);

  useEffect(() => {
    loadDashboard();
    loadHealthData();
  }, [selectedPeriod, userToken]);

  const loadDashboard = async () => {
    if (!userToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/integration/dashboard?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        console.error('Failed to load integration dashboard:', response.status, response.statusText);
        Alert.alert('Error', 'Failed to load integration dashboard. Please try again.');
      }
    } catch (error) {
      console.error('Error loading integration dashboard:', error);
      Alert.alert('Error', 'Network error loading dashboard. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadHealthData = async () => {
    if (!userToken) return;

    try {
      const response = await fetch(`${getApiUrl()}/api/integration/health`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHealthData(data);
      } else {
        console.error('Failed to load health data:', response.status);
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
    loadHealthData();
  };

  const runBatchReconciliation = async () => {
    if (!userToken) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    setBatchLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/integration/batch-reconciliation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert('Success', 'Batch reconciliation completed successfully');
        setShowBatchModal(false);
        loadDashboard();
      } else {
        Alert.alert('Error', 'Failed to run batch reconciliation');
      }
    } catch (error) {
      console.error('Error running batch reconciliation:', error);
      Alert.alert('Error', 'Failed to run batch reconciliation');
    } finally {
      setBatchLoading(false);
    }
  };

  const navigateToEvents = () => {
    navigation.navigate('IntegrationEvents');
  };

  const navigateToConfig = () => {
    navigation.navigate('IntegrationConfig');
  };

  const navigateToReports = () => {
    navigation.navigate('IntegrationReports');
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return '#10B981';
      case 'warning':
        return '#F59E0B';
      case 'unhealthy':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy':
        return 'heart-pulse';
      case 'warning':
        return 'alert-circle';
      case 'unhealthy':
        return 'heart-broken';
      default:
        return 'help-circle';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader title="Integration Dashboard" navigation={navigation} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading integration dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader title="Integration Dashboard" navigation={navigation} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="swap-horizontal" size={32} color="#007AFF" />
          </View>
          <Text style={styles.headerTitle}>Integration Dashboard</Text>
          <Text style={styles.headerSubtitle}>Monitor automated integrations and system health</Text>
        </View>

        {/* Period Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Period</Text>
          <View style={styles.periodContainer}>
            {['1d', '7d', '30d'].map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.periodButton]}
                onPress={() => setSelectedPeriod(period)}
                activeOpacity={0.7}
              >
                {selectedPeriod === period && (
                  <LinearGradient
                    colors={['#007AFF', '#5856D6']}
                    style={styles.periodButtonGradient}
                  />
                )}
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive
                ]}>
                  {period === '1d' ? 'Today' : period === '7d' ? '7 Days' : '30 Days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Health Status */}
        {healthData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Health</Text>
            <View style={styles.healthCard}>
              <View style={styles.healthHeader}>
                <View style={styles.healthIndicator}>
                  <View style={[
                    styles.healthDot,
                    { backgroundColor: getHealthStatusColor(healthData.status) }
                  ]} />
                  <Text style={styles.healthStatus}>
                    {healthData.status.charAt(0).toUpperCase() + healthData.status.slice(1)}
                  </Text>
                </View>
                <MaterialCommunityIcons 
                  name={getHealthIcon(healthData.status)} 
                  size={28} 
                  color={getHealthStatusColor(healthData.status)} 
                />
              </View>
              <Text style={styles.healthDetail}>
                Last Checked: {formatDate(healthData.lastChecked)}
              </Text>
              {healthData.metrics?.pendingIntegrations > 0 && (
                <View style={styles.warningContainer}>
                  <MaterialCommunityIcons name="clock-alert" size={16} color="#F59E0B" />
                  <Text style={styles.warningText}>
                    {healthData.metrics.pendingIntegrations} pending integrations
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Key Metrics */}
        {dashboardData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Integration Metrics</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricIconContainer}>
                  <MaterialCommunityIcons name="file-document-multiple" size={24} color="white" />
                </View>
                <View style={styles.metricContent}>
                  <Text style={styles.metricValue}>
                    {formatNumber(dashboardData.metrics.journalEntriesCreated)}
                  </Text>
                  <Text style={styles.metricLabel}>Journal Entries</Text>
                </View>
              </View>
              
              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#10B981' }]}>
                  <MaterialCommunityIcons name="receipt" size={24} color="white" />
                </View>
                <View style={styles.metricContent}>
                  <Text style={styles.metricValue}>
                    {formatNumber(dashboardData.metrics.invoicesGenerated)}
                  </Text>
                  <Text style={styles.metricLabel}>Invoices Generated</Text>
                </View>
              </View>
              
              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#F59E0B' }]}>
                  <MaterialCommunityIcons name="chart-pie" size={24} color="white" />
                </View>
                <View style={styles.metricContent}>
                  <Text style={styles.metricValue}>
                    {formatNumber(dashboardData.metrics.costAllocations)}
                  </Text>
                  <Text style={styles.metricLabel}>Cost Allocations</Text>
                </View>
              </View>
              
              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#8B5CF6' }]}>
                  <MaterialCommunityIcons name="currency-usd" size={24} color="white" />
                </View>
                <View style={styles.metricContent}>
                  <Text style={styles.metricValue}>
                    {formatCurrency(dashboardData.metrics.revenueRecognized?._sum?.totalAmount).replace('$', '')}
                  </Text>
                  <Text style={styles.metricLabel}>Revenue Recognized</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Recent Activities */}
        {dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Integration Activities</Text>
            <View style={styles.activitiesList}>
              {dashboardData.recentActivities.slice(0, 5).map((activity, index) => (
                <View key={activity.id || index} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <MaterialCommunityIcons name="swap-horizontal" size={16} color="#007AFF" />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.entryNumber}</Text>
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                    <Text style={styles.activityDate}>{formatDate(activity.createdAt)}</Text>
                  </View>
                  <Text style={styles.activityAmount}>
                    {formatCurrency(activity.totalAmount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={navigateToEvents}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="history" size={24} color="#007AFF" />
              <Text style={styles.actionButtonText}>View Events</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={navigateToConfig}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="cog" size={24} color="#007AFF" />
              <Text style={styles.actionButtonText}>Configuration</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={navigateToReports}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="chart-line" size={24} color="#007AFF" />
              <Text style={styles.actionButtonText}>Reports</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryActionButton]} 
              onPress={() => setShowBatchModal(true)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#007AFF', '#5856D6']}
                style={styles.primaryActionGradient}
              >
                <MaterialCommunityIcons name="sync" size={24} color="#FFFFFF" />
                <Text style={styles.primaryActionButtonText}>
                  Run Batch Reconciliation
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Batch Reconciliation Modal */}
      <Modal
        visible={showBatchModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBatchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Run Batch Reconciliation</Text>
            <Text style={styles.modalDescription}>
              This will run a complete reconciliation of all integration events for today. 
              This process may take a few minutes.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowBatchModal(false)}
                disabled={batchLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalConfirmButton, batchLoading && styles.disabledButton]}
                onPress={runBatchReconciliation}
                disabled={batchLoading}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#007AFF', '#5856D6']}
                  style={styles.modalConfirmGradient}
                >
                  {batchLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmButtonText}>Run Reconciliation</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  
  // Period Selection
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    position: 'relative',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    zIndex: 1,
  },
  periodButtonTextActive: {
    color: 'white',
  },
  
  // Health Card
  healthCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  healthStatus: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  healthDetail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
    marginLeft: 6,
  },
  
  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricContent: {
    // Remove flex: 1 to prevent stretching
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    lineHeight: 14,
  },
  
  // Activities List
  activitiesList: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#C7C7CC',
    fontWeight: '500',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  
  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  primaryActionButton: {
    width: '100%',
    padding: 0,
    overflow: 'hidden',
    marginTop: 4,
  },
  primaryActionGradient: {
    width: '100%',
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 6,
    textAlign: 'center',
  },
  primaryActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 6,
    textAlign: 'center',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    margin: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 22,
    marginBottom: 28,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 12,
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  modalConfirmGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  modalConfirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default IntegrationDashboardScreen; 