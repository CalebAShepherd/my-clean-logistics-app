import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import InternalHeader from '../components/InternalHeader';
import { StatusBadge } from '../components/StatusBadge';
import assetAPI from '../api/assets';
import { maintenanceAPI } from '../api/maintenance';

const screenWidth = Dimensions.get('window').width;
const chartConfig = {
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  strokeWidth: 3,
  decimalPlaces: 0,
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#007AFF',
    fill: '#007AFF'
  },
  propsForBackgroundLines: {
    strokeDasharray: '',
    stroke: '#E1E5E9',
    strokeWidth: 1
  },
  propsForLabels: {
    fontSize: 12,
    fontWeight: '500'
  }
};

const AssetAnalyticsScreen = ({ navigation, route }) => {
  const { assetId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('3months');
  const [analytics, setAnalytics] = useState({});
  const [assetMetrics, setAssetMetrics] = useState({});
  const [maintenanceData, setMaintenanceData] = useState({});
  const [selectedMetric, setSelectedMetric] = useState('value');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, assetId]);

  const loadAnalytics = async () => {
    try {
      setRefreshing(true);
      
      const params = {
        timeRange,
        ...(assetId && { assetId })
      };

      const [
        analyticsData,
        metricsData,
        maintenanceAnalytics,
        assetTrends
      ] = await Promise.all([
        assetAPI.getAssetAnalytics(params),
        assetAPI.getAssetMetrics(params),
        maintenanceAPI.getMaintenanceAnalytics(params),
        assetAPI.getAssetTrends(params)
      ]);

      setAnalytics(analyticsData);
      setAssetMetrics(metricsData);
      setMaintenanceData(maintenanceAnalytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadAnalytics();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'EXCELLENT': return '#10B981';
      case 'GOOD': return '#84CC16';
      case 'FAIR': return '#F59E0B';
      case 'POOR': return '#EF4444';
      case 'CRITICAL': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return '#10B981';
      case 'INACTIVE': return '#6B7280';
      case 'MAINTENANCE': return '#F59E0B';
      case 'RETIRED': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const renderKPICards = () => (
    <View style={styles.kpiContainer}>
      <View style={styles.kpiCard}>
        <View style={styles.kpiIconContainer}>
          <Ionicons name="cube" size={24} color="#007AFF" />
        </View>
        <Text style={styles.kpiValue}>{analytics.totalAssets || 0}</Text>
        <Text style={styles.kpiLabel}>Total Assets</Text>
        <Text style={styles.kpiChange}>
          +{analytics.assetsGrowth || 0}% vs last period
        </Text>
      </View>

      <View style={styles.kpiCard}>
        <View style={styles.kpiIconContainer}>
          <Ionicons name="cash" size={24} color="#10B981" />
        </View>
        <Text style={styles.kpiValue}>{formatCurrency(analytics.totalValue)}</Text>
        <Text style={styles.kpiLabel}>Total Value</Text>
        <Text style={styles.kpiChange}>
          {analytics.valueChange >= 0 ? '+' : ''}{formatPercentage(analytics.valueChange)}
        </Text>
      </View>

      <View style={styles.kpiCard}>
        <View style={styles.kpiIconContainer}>
          <Ionicons name="trending-up" size={24} color="#F59E0B" />
        </View>
        <Text style={styles.kpiValue}>{formatPercentage(analytics.utilizationRate)}</Text>
        <Text style={styles.kpiLabel}>Utilization</Text>
        <Text style={styles.kpiChange}>
          {analytics.utilizationChange >= 0 ? '+' : ''}{formatPercentage(analytics.utilizationChange)}
        </Text>
      </View>

      <View style={styles.kpiCard}>
        <View style={styles.kpiIconContainer}>
          <Ionicons name="build" size={24} color="#EF4444" />
        </View>
        <Text style={styles.kpiValue}>{formatCurrency(analytics.maintenanceCosts)}</Text>
        <Text style={styles.kpiLabel}>Maintenance Costs</Text>
        <Text style={styles.kpiChange}>
          {analytics.maintenanceChange >= 0 ? '+' : ''}{formatPercentage(analytics.maintenanceChange)}
        </Text>
      </View>
    </View>
  );

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      <Text style={styles.sectionTitle}>Time Range</Text>
      <View style={styles.timeRangeButtons}>
        {[
          { label: '1M', value: '1month' },
          { label: '3M', value: '3months' },
          { label: '6M', value: '6months' },
          { label: '1Y', value: '1year' },
        ].map((range) => (
          <TouchableOpacity
            key={range.value}
            style={[
              styles.timeRangeButton,
              timeRange === range.value && styles.timeRangeButtonActive
            ]}
            onPress={() => setTimeRange(range.value)}
          >
            <Text style={[
              styles.timeRangeButtonText,
              timeRange === range.value && styles.timeRangeButtonTextActive
            ]}>
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAssetValueChart = () => {
    if (!analytics.valueHistory || analytics.valueHistory.length === 0) {
      return null;
    }

    const data = {
      labels: analytics.valueHistory.map(item => item.period),
      datasets: [{
        data: analytics.valueHistory.map(item => item.totalValue),
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 3
      }, {
        data: analytics.valueHistory.map(item => item.bookValue),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 3
      }]
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Asset Value Over Time</Text>
        <LineChart
          data={data}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          bezier
        />
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#007AFF' }]} />
            <Text style={styles.legendText}>Purchase Value</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Book Value</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAssetBreakdown = () => {
    if (!analytics.categoryBreakdown || analytics.categoryBreakdown.length === 0) {
      return null;
    }

    const colors = ['#007AFF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const data = analytics.categoryBreakdown.map((item, index) => ({
      name: item.category,
      count: item.count,
      color: colors[index % colors.length],
      legendFontColor: '#374151',
      legendFontSize: 12,
    }));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Asset Distribution by Category</Text>
        <PieChart
          data={data}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          accessor="count"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </View>
    );
  };

  const renderConditionAnalysis = () => {
    if (!analytics.conditionBreakdown || analytics.conditionBreakdown.length === 0) {
      return null;
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Asset Condition Analysis</Text>
        <View style={styles.conditionGrid}>
          {analytics.conditionBreakdown.map((item) => (
            <View key={item.condition} style={styles.conditionCard}>
              <View style={[
                styles.conditionIndicator,
                { backgroundColor: getConditionColor(item.condition) }
              ]} />
              <Text style={styles.conditionLabel}>{item.condition}</Text>
              <Text style={styles.conditionCount}>{item.count}</Text>
              <Text style={styles.conditionPercentage}>
                {formatPercentage((item.count / analytics.totalAssets) * 100)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMaintenanceInsights = () => {
    if (!maintenanceData.monthlyTrends || maintenanceData.monthlyTrends.length === 0) {
      return null;
    }

    const data = {
      labels: maintenanceData.monthlyTrends.map(item => item.month),
      datasets: [{
        data: maintenanceData.monthlyTrends.map(item => item.cost)
      }]
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Maintenance Cost Trends</Text>
        <BarChart
          data={data}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
          }}
          style={styles.chart}
        />
        <View style={styles.maintenanceStats}>
          <View style={styles.maintenanceStat}>
            <Text style={styles.maintenanceStatValue}>
              {maintenanceData.averageDowntime || 0}h
            </Text>
            <Text style={styles.maintenanceStatLabel}>Avg Downtime</Text>
          </View>
          <View style={styles.maintenanceStat}>
            <Text style={styles.maintenanceStatValue}>
              {formatPercentage(maintenanceData.preventiveRatio)}
            </Text>
            <Text style={styles.maintenanceStatLabel}>Preventive</Text>
          </View>
          <View style={styles.maintenanceStat}>
            <Text style={styles.maintenanceStatValue}>
              {maintenanceData.totalWorkOrders || 0}
            </Text>
            <Text style={styles.maintenanceStatLabel}>Work Orders</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTopAssets = () => {
    if (!analytics.topAssets || analytics.topAssets.length === 0) {
      return null;
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Top Assets by Value</Text>
        {analytics.topAssets.map((asset, index) => (
          <TouchableOpacity
            key={asset.id}
            style={styles.assetRow}
            onPress={() => navigation.navigate('AssetDetails', { assetId: asset.id })}
          >
            <View style={styles.assetRank}>
              <Text style={styles.assetRankText}>{index + 1}</Text>
            </View>
            <View style={styles.assetInfo}>
              <Text style={styles.assetName}>{asset.name}</Text>
              <Text style={styles.assetCategory}>{asset.category}</Text>
            </View>
            <View style={styles.assetValue}>
              <Text style={styles.assetValueText}>
                {formatCurrency(asset.currentValue)}
              </Text>
              <StatusBadge 
                status={asset.condition} 
                color={getConditionColor(asset.condition)}
              />
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderAlerts = () => {
    if (!analytics.alerts || analytics.alerts.length === 0) {
      return null;
    }

    return (
      <View style={styles.alertsContainer}>
        <Text style={styles.sectionTitle}>Alerts & Recommendations</Text>
        {analytics.alerts.map((alert, index) => (
          <View key={index} style={[styles.alertCard, { borderLeftColor: alert.severity === 'high' ? '#EF4444' : '#F59E0B' }]}>
            <View style={styles.alertHeader}>
              <Ionicons 
                name={alert.severity === 'high' ? 'warning' : 'information-circle'} 
                size={20} 
                color={alert.severity === 'high' ? '#EF4444' : '#F59E0B'} 
              />
              <Text style={styles.alertTitle}>{alert.title}</Text>
            </View>
            <Text style={styles.alertDescription}>{alert.description}</Text>
            {alert.actionable && (
              <TouchableOpacity style={styles.alertAction}>
                <Text style={styles.alertActionText}>Take Action</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Asset Analytics" />
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
        title={assetId ? "Asset Analytics" : "Asset Analytics"}
        rightIcon="download"
        onRightPress={() => Alert.alert('Export', 'Export functionality coming soon')}
      />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Time Range Selector */}
        {renderTimeRangeSelector()}

        {/* KPI Cards */}
        {renderKPICards()}

        {/* Asset Value Chart */}
        {renderAssetValueChart()}

        {/* Asset Distribution */}
        {renderAssetBreakdown()}

        {/* Condition Analysis */}
        {renderConditionAnalysis()}

        {/* Maintenance Insights */}
        {renderMaintenanceInsights()}

        {/* Top Assets */}
        {renderTopAssets()}

        {/* Alerts */}
        {renderAlerts()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  timeRangeContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#EBF8FF',
    borderColor: '#007AFF',
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  timeRangeButtonTextActive: {
    color: '#007AFF',
  },
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  kpiChange: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  conditionCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  conditionIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 8,
  },
  conditionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  conditionCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  conditionPercentage: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  maintenanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  maintenanceStat: {
    alignItems: 'center',
  },
  maintenanceStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  maintenanceStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  assetRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assetRankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  assetInfo: {
    flex: 1,
    marginRight: 12,
  },
  assetName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  assetCategory: {
    fontSize: 12,
    color: '#6B7280',
  },
  assetValue: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  assetValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  alertsContainer: {
    margin: 16,
    marginTop: 8,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  alertDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EBF8FF',
    borderRadius: 6,
  },
  alertActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default AssetAnalyticsScreen; 