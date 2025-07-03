import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import InternalHeader from '../components/InternalHeader';
import { getActivityBasedCostingDashboard } from '../api/activityBasedCosting';
import { getBudgetingForecastingDashboard } from '../api/budgetingForecasting';

const { width } = Dimensions.get('window');

const CostManagementDashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data functions as fallback
  const getMockActivityBasedData = () => ({
    totalActivityCosts: 245000,
    activityCostVariance: -8.5,
    topCostCenters: [
      { activityType: 'PICKING', totalCost: 85000, unitCost: 2.50, units: 34000 },
      { activityType: 'RECEIVING', totalCost: 62000, unitCost: 12.40, units: 5000 },
      { activityType: 'PACKING', totalCost: 48000, unitCost: 1.80, units: 26667 },
      { activityType: 'STORAGE', totalCost: 35000, unitCost: 0.15, units: 233333 }
    ],
    customerProfitability: [
      { customerName: 'Acme Corp', revenue: 125000, totalCosts: 95000, margin: 24.0 },
      { customerName: 'Tech Solutions', revenue: 85000, totalCosts: 72000, margin: 15.3 },
      { customerName: 'Global Logistics', revenue: 95000, totalCosts: 68000, margin: 28.4 }
    ],
    serviceProfitability: [
      { serviceType: 'RECEIVING', revenue: 185000, costs: 145000, margin: 21.6, utilization: 87.5 },
      { serviceType: 'PICKING', revenue: 225000, costs: 195000, margin: 13.3, utilization: 92.1 },
      { serviceType: 'STORAGE', revenue: 155000, costs: 125000, margin: 19.4, utilization: 78.2 }
    ],
    recentAllocations: [
      {
        id: 1,
        description: 'Q1 Pick Operations - Acme Corp',
        amount: 15000,
        method: 'ACTIVITY_BASED',
        time: '2 hours ago'
      },
      {
        id: 2,
        description: 'Storage Costs - Tech Solutions',
        amount: 8500,
        method: 'USAGE_BASED',
        time: '4 hours ago'
      }
    ]
  });

  const getMockBudgetingData = () => ({
    totalBudgetVariance: -12500,
    budgetUtilization: 85.2,
    cashFlowProjection: {
      nextMonth: 125000,
      quarterProjection: 385000,
      yearProjection: 1540000
    },
    scenarios: [
      { name: 'Baseline', totalBudget: 850000, utilized: 725000, variance: -15000 },
      { name: 'Optimistic', totalBudget: 920000, utilized: 725000, variance: 195000 },
      { name: 'Pessimistic', totalBudget: 780000, utilized: 725000, variance: 55000 }
    ],
    significantVariances: [
      {
        id: 1,
        category: 'Labor Costs',
        budgeted: 125000,
        actual: 138500,
        variance: 13500,
        rating: 'UNFAVORABLE_SIGNIFICANT'
      },
      {
        id: 2,
        category: 'Equipment Maintenance',
        budgeted: 25000,
        actual: 21000,
        variance: -4000,
        rating: 'FAVORABLE_MINOR'
      }
    ]
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('Loading cost management dashboard data...');
      
      const [activityData, budgetData] = await Promise.all([
        getActivityBasedCostingDashboard().catch(err => {
          console.error('Activity-based costing API error:', err);
          return getMockActivityBasedData();
        }),
        getBudgetingForecastingDashboard().catch(err => {
          console.error('Budgeting forecasting API error:', err);
          return getMockBudgetingData();
        }),
      ]);

      console.log('Cost management data loaded:', { activityData, budgetData });

      setDashboardData({
        activity: activityData,
        budget: budgetData,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Use mock data as fallback
      setDashboardData({
        activity: getMockActivityBasedData(),
        budget: getMockBudgetingData(),
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const getVarianceColor = (variance) => {
    if (variance > 0) return '#4CAF50';
    if (variance < -10000) return '#F44336';
    return '#FF9800';
  };

  const MetricCard = ({ title, value, subtitle, icon, color, onPress }) => (
    <TouchableOpacity
      style={[styles.metricCard, { backgroundColor: theme.cardBackground }]}
      onPress={onPress}
    >
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.metricTitle, { color: theme.text }]}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.metricSubtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );

  const QuickActionCard = ({ title, icon, color, onPress }) => (
    <TouchableOpacity
      style={[styles.quickActionCard, { backgroundColor: theme.cardBackground }]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.quickActionTitle, { color: theme.colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <InternalHeader navigation={navigation} title="Cost Management" />
        <View style={[styles.container, styles.centered]}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading cost management data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InternalHeader navigation={navigation} title="Cost Management Dashboard" />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

        {/* Key Cost Metrics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Key Cost Metrics</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Activity Costs"
              value={formatCurrency(dashboardData?.activity?.totalActivityCosts)}
              subtitle={`${dashboardData?.activity?.activityCostVariance > 0 ? '+' : ''}${dashboardData?.activity?.activityCostVariance?.toFixed(1)}% vs budget`}
              icon="calculator"
              color={getVarianceColor(dashboardData?.activity?.activityCostVariance * 1000)}
              onPress={() => navigation.navigate('ActivityBasedCostingDashboard')}
            />
            <MetricCard
              title="Budget Utilization"
              value={formatPercentage(dashboardData?.budget?.budgetUtilization)}
              subtitle={`Variance: ${formatCurrency(dashboardData?.budget?.totalBudgetVariance)}`}
              icon="pie-chart"
              color={getVarianceColor(dashboardData?.budget?.totalBudgetVariance)}
              onPress={() => navigation.navigate('BudgetingForecastingDashboard')}
            />
            <MetricCard
              title="Cash Flow (Next Month)"
              value={formatCurrency(dashboardData?.budget?.cashFlowProjection?.nextMonth)}
              subtitle={`Annual: ${formatCurrency(dashboardData?.budget?.cashFlowProjection?.yearProjection)}`}
              icon="trending-up"
              color="#2196F3"
              onPress={() => navigation.navigate('CashFlowForecastScreen')}
            />
            <MetricCard
              title="Best Customer Margin"
              value={formatPercentage(Math.max(...(dashboardData?.activity?.customerProfitability?.map(c => c.margin) || [0])))}
              subtitle="Customer profitability"
              icon="people"
              color="#4CAF50"
              onPress={() => navigation.navigate('CustomerProfitabilityScreen')}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              title="Activity Centers"
              icon="business"
              color="#2196F3"
              onPress={() => navigation.navigate('ActivityCenterManagementScreen')}
            />
            <QuickActionCard
              title="Cost Allocations"
              icon="git-branch"
              color="#FF9800"
              onPress={() => navigation.navigate('CostAllocationScreen')}
            />
            <QuickActionCard
              title="Budget Scenarios"
              icon="stats-chart"
              color="#9C27B0"
              onPress={() => navigation.navigate('BudgetScenarioScreen')}
            />
            <QuickActionCard
              title="Variance Analysis"
              icon="analytics"
              color="#F44336"
              onPress={() => navigation.navigate('VarianceAnalysisScreen')}
            />
            <QuickActionCard
              title="Service Profitability"
              icon="construct"
              color="#4CAF50"
              onPress={() => navigation.navigate('ServiceProfitabilityScreen')}
            />
            <QuickActionCard
              title="Cash Flow Forecast"
              icon="cash"
              color="#607D8B"
              onPress={() => navigation.navigate('CashFlowForecastScreen')}
            />
          </View>
        </View>

        {/* Top Cost Centers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Top Activity Cost Centers</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ActivityBasedCostingDashboard')}>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {dashboardData?.activity?.topCostCenters?.map((center, index) => (
            <View key={index} style={[styles.costCenterItem, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.costCenterHeader}>
                <Text style={[styles.costCenterTitle, { color: theme.colors.text }]}>
                  {center.activityType}
                </Text>
                <Text style={[styles.costCenterAmount, { color: theme.colors.text }]}>
                  {formatCurrency(center.totalCost)}
                </Text>
              </View>
              <Text style={[styles.costCenterSubtitle, { color: theme.colors.textSecondary }]}>
                {formatCurrency(center.unitCost)} per unit • {center.units.toLocaleString()} units
              </Text>
            </View>
          ))}
        </View>

        {/* Customer Profitability Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Customer Profitability</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CustomerProfitabilityScreen')}>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {dashboardData?.activity?.customerProfitability?.map((customer, index) => (
            <View key={index} style={[styles.profitabilityItem, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.profitabilityHeader}>
                <Text style={[styles.profitabilityCustomer, { color: theme.colors.text }]}>
                  {customer.customerName}
                </Text>
                <Text style={[styles.profitabilityMargin, { 
                  color: customer.margin > 20 ? '#4CAF50' : customer.margin > 10 ? '#FF9800' : '#F44336' 
                }]}>
                  {formatPercentage(customer.margin)}
                </Text>
              </View>
              <View style={styles.profitabilityNumbers}>
                <Text style={[styles.profitabilityRevenue, { color: theme.colors.textSecondary }]}>
                  Revenue: {formatCurrency(customer.revenue)}
                </Text>
                <Text style={[styles.profitabilityCosts, { color: theme.colors.textSecondary }]}>
                  Costs: {formatCurrency(customer.totalCosts)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Budget Scenarios */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Budget Scenarios</Text>
            <TouchableOpacity onPress={() => navigation.navigate('BudgetScenarioScreen')}>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {dashboardData?.budget?.scenarios?.map((scenario, index) => (
            <View key={index} style={[styles.scenarioItem, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.scenarioHeader}>
                <Text style={[styles.scenarioName, { color: theme.colors.text }]}>
                  {scenario.name}
                </Text>
                <Text style={[styles.scenarioVariance, { 
                  color: getVarianceColor(scenario.variance)
                }]}>
                  {formatCurrency(scenario.variance)}
                </Text>
              </View>
              <View style={styles.scenarioProgress}>
                <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${Math.min((scenario.utilized / scenario.totalBudget) * 100, 100)}%`,
                        backgroundColor: scenario.utilized > scenario.totalBudget ? '#F44336' : '#4CAF50'
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.scenarioUtilization, { color: theme.colors.textSecondary }]}>
                  {formatCurrency(scenario.utilized)} / {formatCurrency(scenario.totalBudget)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Significant Variances */}
        {dashboardData?.budget?.significantVariances?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Significant Variances</Text>
            {dashboardData.budget.significantVariances.map((variance, index) => {
              const isUnfavorable = variance.rating && variance.rating.includes('UNFAVORABLE');
              return (
                <View key={index} style={[styles.varianceItem, { 
                  backgroundColor: isUnfavorable ? '#FFEBEE' : '#E8F5E8',
                  borderLeftColor: isUnfavorable ? '#F44336' : '#4CAF50'
                }]}>
                  <View style={styles.varianceHeader}>
                    <Text style={[styles.varianceCategory, { color: theme.colors.text }]}>
                      {variance.category}
                    </Text>
                    <Text style={[styles.varianceAmount, { 
                      color: isUnfavorable ? '#F44336' : '#4CAF50'
                    }]}>
                      {variance.variance > 0 ? '+' : ''}{formatCurrency(variance.variance)}
                    </Text>
                  </View>
                  <Text style={[styles.varianceDetails, { color: theme.colors.textSecondary }]}>
                    Budget: {formatCurrency(variance.budgeted)} • Actual: {formatCurrency(variance.actual)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 50,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    margin: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 11,
    fontWeight: '400',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 48) / 3 - 4,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  costCenterItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  costCenterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  costCenterTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  costCenterAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  costCenterSubtitle: {
    fontSize: 12,
  },
  profitabilityItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  profitabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  profitabilityCustomer: {
    fontSize: 14,
    fontWeight: '600',
  },
  profitabilityMargin: {
    fontSize: 14,
    fontWeight: '700',
  },
  profitabilityNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profitabilityRevenue: {
    fontSize: 12,
  },
  profitabilityCosts: {
    fontSize: 12,
  },
  scenarioItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scenarioName: {
    fontSize: 14,
    fontWeight: '600',
  },
  scenarioVariance: {
    fontSize: 14,
    fontWeight: '700',
  },
  scenarioProgress: {
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  scenarioUtilization: {
    fontSize: 12,
    textAlign: 'right',
  },
  varianceItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  varianceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  varianceCategory: {
    fontSize: 14,
    fontWeight: '600',
  },
  varianceAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  varianceDetails: {
    fontSize: 12,
  },
});

export default CostManagementDashboardScreen; 