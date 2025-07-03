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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import InternalHeader from '../components/InternalHeader';
import StatusBadge from '../components/StatusBadge';
import { AuthContext } from '../context/AuthContext';
import { facilityMaintenanceAPI } from '../api/facilityMaintenance';

const FacilityMaintenanceAnalyticsScreen = ({ navigation, route }) => {
  const { facilityId, facilityName } = route.params || {};
  const { userToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({});

  useEffect(() => {
    loadAnalyticsData();
  }, [facilityId]);

  const loadAnalyticsData = async () => {
    try {
      const params = {
        facilityId: facilityId || 'all',
        period: '30'
      };
      
      console.log('Loading analytics with params:', params);
      const response = await facilityMaintenanceAPI.getAnalytics(params, userToken);
      console.log('Analytics response:', response);
      setAnalyticsData(response);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      Alert.alert('Error', `Failed to load analytics data: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLIANT': return '#10B981';
      case 'NON_COMPLIANT': return '#EF4444';
      case 'PENDING': return '#F59E0B';
      case 'EXPIRED': return '#DC2626';
      case 'COMPLETED': return '#10B981';
      case 'IN_PROGRESS': return '#3B82F6';
      case 'SCHEDULED': return '#8B5CF6';
      case 'OVERDUE': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'LOW': return '#10B981';
      case 'MODERATE': return '#F59E0B';
      case 'HIGH': return '#EF4444';
      case 'CRITICAL': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const renderKPICards = () => {
    console.log('renderKPICards - analyticsData:', analyticsData);
    if (!analyticsData.kpis) {
      console.log('No KPIs data found');
      return null;
    }

    const { kpis } = analyticsData;

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    return (
      <View style={styles.kpiContainer}>
        <TouchableOpacity style={styles.kpiCard}>
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.kpiGradient}
          >
            <MaterialCommunityIcons name="wrench" size={24} color="white" />
            <Text style={styles.kpiValue}>{kpis.totalMaintenanceLogs || 0}</Text>
            <Text style={styles.kpiLabel}>Total Maintenance</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.kpiGradient}
          >
            <MaterialCommunityIcons name="check-circle" size={24} color="white" />
            <Text style={styles.kpiValue}>{kpis.completedInPeriod || 0}</Text>
            <Text style={styles.kpiLabel}>Completed</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard}>
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.kpiGradient}
          >
            <MaterialCommunityIcons name="currency-usd" size={24} color="white" />
            <Text style={styles.kpiValue}>{formatCurrency(kpis.totalCost || 0)}</Text>
            <Text style={styles.kpiLabel}>Total Cost</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard}>
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={styles.kpiGradient}
          >
            <MaterialCommunityIcons name="trending-up" size={24} color="white" />
            <Text style={styles.kpiValue}>{kpis.maintenanceEfficiency || 0}%</Text>
            <Text style={styles.kpiLabel}>Efficiency</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard}>
          <LinearGradient
            colors={['#EC4899', '#BE185D']}
            style={styles.kpiGradient}
          >
            <MaterialCommunityIcons name="shield-check" size={24} color="white" />
            <Text style={styles.kpiValue}>{kpis.complianceRate || 0}%</Text>
            <Text style={styles.kpiLabel}>Compliance Rate</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard}>
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.kpiGradient}
          >
            <MaterialCommunityIcons name="alert-circle" size={24} color="white" />
            <Text style={styles.kpiValue}>{kpis.recentSafetyIncidents || 0}</Text>
            <Text style={styles.kpiLabel}>Safety Incidents</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMaintenanceStats = () => {
    if (!analyticsData.maintenance?.byStatus) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Maintenance by Status</Text>
        <View style={styles.statsContainer}>
          {analyticsData.maintenance.byStatus.map((item, index) => (
            <View key={index} style={styles.statItem}>
              <View style={styles.statInfo}>
                <StatusBadge 
                  status={item.status} 
                  color={getStatusColor(item.status)}
                  size="small"
                />
                <Text style={styles.statLabel}>{item.status.replace('_', ' ')}</Text>
              </View>
              <Text style={styles.statCount}>{item.count}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderComplianceStats = () => {
    if (!analyticsData.compliance?.byStatus) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compliance by Status</Text>
        <View style={styles.statsContainer}>
          {analyticsData.compliance.byStatus.map((item, index) => (
            <View key={index} style={styles.statItem}>
              <View style={styles.statInfo}>
                <StatusBadge 
                  status={item.status} 
                  color={getStatusColor(item.status)}
                  size="small"
                />
                <Text style={styles.statLabel}>{item.status.replace('_', ' ')}</Text>
              </View>
              <Text style={styles.statCount}>{item.count}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCostAnalysis = () => {
    if (!analyticsData.kpis?.totalCost && !analyticsData.maintenance?.costTrends) return null;

    const { kpis, maintenance } = analyticsData;

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cost Analysis</Text>
        
        <View style={styles.costSummary}>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Total Cost</Text>
            <Text style={styles.costValue}>{formatCurrency(kpis?.totalCost || 0)}</Text>
          </View>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Avg. per Job</Text>
            <Text style={styles.costValue}>{formatCurrency(kpis?.averageCostPerJob || 0)}</Text>
          </View>
        </View>

        {maintenance?.costTrends && maintenance.costTrends.length > 0 && (
          <View style={styles.costBreakdown}>
            <Text style={styles.subSectionTitle}>Cost Trends (Last 6 Months)</Text>
            {maintenance.costTrends.map((trend, index) => (
              <View key={index} style={styles.costTypeItem}>
                <Text style={styles.costTypeLabel}>
                  {new Date(trend.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </Text>
                <View style={styles.trendInfo}>
                  <Text style={styles.costTypeValue}>{formatCurrency(trend.totalCost)}</Text>
                  <Text style={styles.trendJobs}>{trend.jobCount} jobs</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {maintenance?.upcomingMaintenance && maintenance.upcomingMaintenance.length > 0 && (
          <View style={styles.costBreakdown}>
            <Text style={styles.subSectionTitle}>Upcoming Maintenance (Next 30 Days)</Text>
            {maintenance.upcomingMaintenance.slice(0, 5).map((item, index) => (
              <View key={index} style={styles.costTypeItem}>
                <View style={styles.upcomingInfo}>
                  <Text style={styles.costTypeLabel}>{item.title}</Text>
                  <Text style={styles.upcomingDate}>
                    {new Date(item.scheduledDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.upcomingMeta}>
                  <Text style={styles.costTypeValue}>
                    {item.estimatedCost ? formatCurrency(item.estimatedCost) : 'TBD'}
                  </Text>
                  <StatusBadge 
                    status={item.priority} 
                    color={getSeverityColor(item.priority)}
                    size="small"
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderTrends = () => {
    if (!analyticsData.trends) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trends & Insights</Text>
        
        <View style={styles.trendsContainer}>
          <View style={styles.trendItem}>
            <MaterialCommunityIcons name="trending-up" size={24} color="#10B981" />
            <Text style={styles.trendText}>
              Maintenance requests increased by 15% this month
            </Text>
          </View>

          <View style={styles.trendItem}>
            <MaterialCommunityIcons name="trending-down" size={24} color="#EF4444" />
            <Text style={styles.trendText}>
              Average resolution time decreased by 2 days
            </Text>
          </View>

          <View style={styles.trendItem}>
            <MaterialCommunityIcons name="alert" size={24} color="#F59E0B" />
            <Text style={styles.trendText}>
              3 compliance items due within next 7 days
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Analytics" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Maintenance Analytics"
        rightIcons={[
          {
            icon: 'download',
            onPress: () => Alert.alert('Export', 'Export functionality will be available soon'),
            color: '#007AFF'
          }
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadAnalyticsData} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Cards */}
        {renderKPICards()}

        {/* Maintenance Stats */}
        {renderMaintenanceStats()}

        {/* Compliance Stats */}
        {renderComplianceStats()}

        {/* Cost Analysis */}
        {renderCostAnalysis()}

        {/* Trends */}
        {renderTrends()}
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
  scrollView: {
    flex: 1
  },

  // KPI Cards
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8
  },
  kpiCard: {
    width: '31%', // 3 cards per row with gaps
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4
  },
  kpiGradient: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginTop: 4,
    marginBottom: 2
  },
  kpiLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 13
  },

  // Sections
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginTop: 16
  },

  // Stats
  statsContainer: {
    gap: 12
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  statInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12
  },
  statCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },

  // Cost Analysis
  costSummary: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20
  },
  costItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  costLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8
  },
  costValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669'
  },
  costBreakdown: {
    marginTop: 8
  },
  costTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  costTypeLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  costTypeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827'
  },

  // Trends
  trendsContainer: {
    gap: 16
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16
  },
  trendText: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 12,
    flex: 1
  },

  // New styles for enhanced cost analysis
  trendInfo: {
    alignItems: 'flex-end'
  },
  trendJobs: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  upcomingInfo: {
    flex: 1
  },
  upcomingDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  upcomingMeta: {
    alignItems: 'flex-end'
  }
});

export default FacilityMaintenanceAnalyticsScreen; 