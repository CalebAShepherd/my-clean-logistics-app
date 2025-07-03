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
import { facilityAPI } from '../api/facilities';

const FacilityAnalyticsScreen = ({ navigation, route }) => {
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
        year: new Date().getFullYear(),
        period: '12'
      };
      
      console.log('Loading facility analytics with params:', params);
      const response = await facilityAPI.getFacilityAnalytics(userToken, params);
      console.log('Facility analytics response:', response);
      setAnalyticsData(response);
    } catch (error) {
      console.error('Error loading facility analytics:', error);
      Alert.alert('Error', `Failed to load analytics data: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const renderKPICards = () => {
    const kpis = [
      {
        title: 'Total Facilities',
        value: analyticsData.totalFacilities || 0,
        icon: 'business',
        colors: ['#007AFF', '#0056CC'],
        format: 'number'
      },
      {
        title: 'Total Utility Costs',
        value: analyticsData.totalUtilityCosts?._sum?.amount || 0,
        icon: 'flash',
        colors: ['#FF9500', '#FF8C00'],
        format: 'currency'
      },
      {
        title: 'Space Utilization',
        value: analyticsData.spaceUtilization?._avg?.currentUtilization || 0,
        icon: 'pie-chart',
        colors: ['#34C759', '#30D158'],
        format: 'percentage'
      },
      {
        title: 'Total Square Feet',
        value: analyticsData.spaceUtilization?._sum?.squareFeet || 0,
        icon: 'resize',
        colors: ['#AF52DE', '#BF5AF2'],
        format: 'number'
      },
      {
        title: 'Utility Bills',
        value: analyticsData.totalUtilityCosts?._count?.id || 0,
        icon: 'receipt',
        colors: ['#FF3B30', '#D70015'],
        format: 'number'
      },
      {
        title: 'Avg Monthly Cost',
        value: analyticsData.avgMonthlyCost || 0,
        icon: 'trending-up',
        colors: ['#5856D6', '#4B4ACF'],
        format: 'currency'
      }
    ];

    return (
      <View style={styles.kpiContainer}>
        {kpis.map((kpi, index) => (
          <TouchableOpacity key={index} style={styles.kpiCard}>
            <LinearGradient colors={kpi.colors} style={styles.kpiGradient}>
              <Ionicons name={kpi.icon} size={24} color="white" />
              <Text style={styles.kpiValue}>
                {kpi.format === 'currency' ? formatCurrency(kpi.value) :
                 kpi.format === 'percentage' ? `${Math.round(kpi.value)}%` :
                 formatNumber(kpi.value)}
              </Text>
              <Text style={styles.kpiLabel}>{kpi.title}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderFacilityTypes = () => {
    if (!analyticsData.facilitiesByType?.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Facilities by Type</Text>
        <View style={styles.statsContainer}>
          {analyticsData.facilitiesByType.map((item, index) => (
            <View key={index} style={styles.statItem}>
              <View style={styles.statInfo}>
                <MaterialCommunityIcons 
                  name={getFacilityTypeIcon(item.facilityType)} 
                  size={20} 
                  color="#007AFF" 
                />
                <Text style={styles.statLabel}>
                  {item.facilityType?.replace('_', ' ') || 'Unknown'}
                </Text>
              </View>
              <Text style={styles.statCount}>{item._count?.facilityType || 0}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderUtilityCosts = () => {
    if (!analyticsData.utilityCostsByType?.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Utility Costs by Type</Text>
        <View style={styles.statsContainer}>
          {analyticsData.utilityCostsByType.map((item, index) => (
            <View key={index} style={styles.statItem}>
              <View style={styles.statInfo}>
                <MaterialCommunityIcons 
                  name={getUtilityTypeIcon(item.utilityType)} 
                  size={20} 
                  color={getUtilityTypeColor(item.utilityType)} 
                />
                <Text style={styles.statLabel}>
                  {item.utilityType?.replace('_', ' ') || 'Unknown'}
                </Text>
              </View>
              <View style={styles.statValues}>
                <Text style={styles.statCount}>{formatCurrency(item._sum?.amount || 0)}</Text>
                <Text style={styles.statSubtext}>
                  {formatNumber(item._sum?.usage || 0)} {getUtilityUnit(item.utilityType)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMonthlyCosts = () => {
    if (!analyticsData.monthlyTrends?.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly Cost Trends</Text>
        <View style={styles.trendsContainer}>
          {analyticsData.monthlyTrends.map((month, index) => (
            <View key={index} style={styles.trendItem}>
              <Text style={styles.trendMonth}>{month.month || 'Unknown'}</Text>
              <Text style={styles.trendValue}>{formatCurrency(month.totalCost || 0)}</Text>
              <View style={styles.trendBar}>
                <View 
                  style={[
                    styles.trendBarFill, 
                    { width: `${((month.totalCost || 0) / (analyticsData.maxMonthlyCost || 1)) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderQuickActions = () => {
    const actions = [
      {
        title: 'Utility Management',
        subtitle: 'Manage utility bills and costs',
        icon: 'flash',
        colors: ['#FF9500', '#FF8C00'],
        onPress: () => navigation.navigate('UtilityManagement', { 
          facilityId: facilityId || 'demo-facility-1', 
          facilityName: facilityName || 'Demo Facility' 
        })
      },
      {
        title: 'Space Optimization',
        subtitle: 'Optimize facility layout',
        icon: 'resize',
        colors: ['#007AFF', '#0056CC'],
        onPress: () => navigation.navigate('SpaceOptimizationDashboard')
      },
      {
        title: 'Maintenance Analytics',
        subtitle: 'View maintenance metrics',
        icon: 'construct',
        colors: ['#34C759', '#30D158'],
        onPress: () => navigation.navigate('FacilityMaintenanceAnalytics', { 
          facilityId, 
          facilityName 
        })
      },
      {
        title: 'Export Report',
        subtitle: 'Download analytics report',
        icon: 'download',
        colors: ['#AF52DE', '#BF5AF2'],
        onPress: () => Alert.alert('Export', 'Export functionality will be available soon')
      }
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={action.onPress}
              activeOpacity={0.8}
            >
              <LinearGradient colors={action.colors} style={styles.actionGradient}>
                <Ionicons name={action.icon} size={24} color="white" />
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const getFacilityTypeIcon = (type) => {
    if (!type) return 'business';
    switch (type) {
      case 'WAREHOUSE': return 'warehouse';
      case 'DISTRIBUTION_CENTER': return 'business';
      case 'RETAIL': return 'storefront';
      case 'MANUFACTURING': return 'construct';
      default: return 'business';
    }
  };

  const getUtilityTypeIcon = (type) => {
    if (!type) return 'flash';
    switch (type) {
      case 'ELECTRICITY': return 'flash';
      case 'GAS': return 'flame';
      case 'WATER': return 'water';
      case 'INTERNET': return 'wifi';
      case 'WASTE': return 'trash';
      default: return 'flash';
    }
  };

  const getUtilityTypeColor = (type) => {
    if (!type) return '#007AFF';
    switch (type) {
      case 'ELECTRICITY': return '#FF9500';
      case 'GAS': return '#FF3B30';
      case 'WATER': return '#007AFF';
      case 'INTERNET': return '#5856D6';
      case 'WASTE': return '#8E8E93';
      default: return '#007AFF';
    }
  };

  const getUtilityUnit = (type) => {
    if (!type) return 'units';
    switch (type) {
      case 'ELECTRICITY': return 'kWh';
      case 'GAS': return 'therms';
      case 'WATER': return 'gal';
      case 'INTERNET': return 'GB';
      case 'WASTE': return 'lbs';
      default: return 'units';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Facility Analytics" />
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
        title={facilityName ? `${facilityName} - Analytics` : "Facility Analytics"}
        rightIcons={[
          {
            icon: 'refresh',
            onPress: () => loadAnalyticsData(),
            color: '#007AFF'
          }
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Cards */}
        {renderKPICards()}

        {/* Facility Types */}
        {renderFacilityTypes()}

        {/* Utility Costs */}
        {renderUtilityCosts()}

        {/* Monthly Trends */}
        {renderMonthlyCosts()}

        {/* Quick Actions */}
        {renderQuickActions()}
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
    width: '31%',
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
    height: 110
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginTop: 4,
    marginBottom: 2,
    textAlign: 'center'
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
    margin: 16,
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
    marginLeft: 12,
    textTransform: 'capitalize'
  },
  statCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  statValues: {
    alignItems: 'flex-end'
  },
  statSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2
  },

  // Trends
  trendsContainer: {
    gap: 12
  },
  trendItem: {
    paddingVertical: 8
  },
  trendMonth: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4
  },
  trendValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  trendBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden'
  },
  trendBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3
  },

  // Actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  actionCard: {
    width: '48%',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3
  },
  actionGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center'
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginTop: 8,
    textAlign: 'center'
  },
  actionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    textAlign: 'center'
  }
});

export default FacilityAnalyticsScreen; 