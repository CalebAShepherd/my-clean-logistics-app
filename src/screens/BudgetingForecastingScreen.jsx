import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import InternalHeader from '../components/InternalHeader';
import {
  getBudgetScenarios,
  getBudgetForecasts,
  getCashFlowForecasts,
  getVarianceAnalysis,
  getBudgetingForecastingDashboard,
  createBudgetScenario,
  createBudgetForecast,
} from '../api/budgetingForecasting';

const { width } = Dimensions.get('window');

const BudgetingForecastingScreen = ({ navigation }) => {
  const theme = useTheme();
  const [data, setData] = useState({
    scenarios: [],
    forecasts: [],
    cashFlowForecasts: [],
    varianceAnalysis: [],
    dashboard: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});

  // Mock data as fallback
  const getMockData = () => ({
    scenarios: [
      {
        id: 1,
        name: 'Baseline Budget 2024',
        scenarioType: 'BASELINE',
        totalBudget: 850000,
        description: 'Standard operating budget for 2024',
        isActive: true,
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        name: 'Optimistic Growth',
        scenarioType: 'OPTIMISTIC',
        totalBudget: 920000,
        description: 'Aggressive growth scenario',
        isActive: true,
        createdAt: '2024-01-20T14:30:00Z'
      },
      {
        id: 3,
        name: 'Conservative Plan',
        scenarioType: 'PESSIMISTIC',
        totalBudget: 780000,
        description: 'Conservative budget with reduced spending',
        isActive: false,
        createdAt: '2024-01-10T09:15:00Z'
      }
    ],
    forecasts: [
      {
        id: 1,
        forecastPeriod: '2024-Q1',
        forecastType: 'QUARTERLY',
        budgetedAmount: 212500,
        forecastedAmount: 198000,
        variance: -14500,
        variancePercent: -6.8,
        confidenceLevel: 85,
        lastUpdated: '2024-01-25T16:20:00Z'
      },
      {
        id: 2,
        forecastPeriod: '2024-Q2',
        forecastType: 'QUARTERLY',
        budgetedAmount: 212500,
        forecastedAmount: 225000,
        variance: 12500,
        variancePercent: 5.9,
        confidenceLevel: 78,
        lastUpdated: '2024-01-25T16:20:00Z'
      }
    ],
    cashFlowForecasts: [
      {
        id: 1,
        forecastPeriod: '2024-02',
        operatingCashFlow: 125000,
        investingCashFlow: -25000,
        financingCashFlow: -10000,
        netCashFlow: 90000,
        confidenceLevel: 92,
        notes: 'Strong operating performance expected'
      },
      {
        id: 2,
        forecastPeriod: '2024-03',
        operatingCashFlow: 135000,
        investingCashFlow: -15000,
        financingCashFlow: -5000,
        netCashFlow: 115000,
        confidenceLevel: 88,
        notes: 'Seasonal uptick in demand'
      }
    ],
    varianceAnalysis: [
      {
        id: 1,
        analysisType: 'BUDGET_VS_ACTUAL',
        account: { accountName: 'Labor Costs' },
        budgetAmount: 125000,
        actualAmount: 138500,
        variance: 13500,
        variancePercent: 10.8,
        varianceRating: 'UNFAVORABLE_SIGNIFICANT',
        explanation: 'Overtime costs higher than expected',
        actionRequired: true
      },
      {
        id: 2,
        analysisType: 'BUDGET_VS_ACTUAL',
        account: { accountName: 'Equipment Maintenance' },
        budgetAmount: 25000,
        actualAmount: 21000,
        variance: -4000,
        variancePercent: -16.0,
        varianceRating: 'FAVORABLE_MINOR',
        explanation: 'Preventive maintenance program effective',
        actionRequired: false
      }
    ],
    dashboard: {
      totalBudgetVariance: -12500,
      budgetUtilization: 85.2,
      cashFlowProjection: {
        nextMonth: 125000,
        quarterProjection: 385000,
        yearProjection: 1540000
      },
      activeBudgetScenarios: 3,
      significantVariances: 4,
      upcomingReviews: 2
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [scenarios, forecasts, cashFlow, variance, dashboard] = await Promise.all([
        getBudgetScenarios().catch(() => getMockData().scenarios),
        getBudgetForecasts().catch(() => getMockData().forecasts),
        getCashFlowForecasts().catch(() => getMockData().cashFlowForecasts),
        getVarianceAnalysis().catch(() => getMockData().varianceAnalysis),
        getBudgetingForecastingDashboard().catch(() => getMockData().dashboard),
      ]);

      // Ensure all data is in array format
      const processedData = {
        scenarios: Array.isArray(scenarios.data || scenarios) ? (scenarios.data || scenarios) : [],
        forecasts: Array.isArray(forecasts.data || forecasts) ? (forecasts.data || forecasts) : [],
        cashFlowForecasts: Array.isArray(cashFlow.data || cashFlow) ? (cashFlow.data || cashFlow) : [],
        varianceAnalysis: Array.isArray(variance.data || variance) ? (variance.data || variance) : [],
        dashboard: dashboard.data || dashboard
      };


      
      setData(processedData);
    } catch (error) {
      console.error('Error loading budgeting data:', error);
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getVarianceColor = (variance) => {
    if (variance > 0) return '#4CAF50';
    if (variance < -10000) return '#F44336';
    return '#FF9800';
  };

  const getVarianceRatingColor = (rating) => {
    switch (rating) {
      case 'FAVORABLE_SIGNIFICANT':
        return '#4CAF50';
      case 'FAVORABLE_MINOR':
        return '#8BC34A';
      case 'WITHIN_TOLERANCE':
        return '#2196F3';
      case 'UNFAVORABLE_MINOR':
        return '#FF9800';
      case 'UNFAVORABLE_SIGNIFICANT':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const TabButton = ({ id, title, isActive, onPress }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        { backgroundColor: isActive ? theme.colors.primary : 'transparent' }
      ]}
      onPress={() => onPress(id)}
    >
      <Text style={[
        styles.tabButtonText,
        { color: isActive ? '#FFFFFF' : theme.colors.text }
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const MetricCard = ({ title, value, subtitle, icon, color }) => (
    <View style={[styles.metricCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.metricTitle, { color: theme.text }]}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.metricSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
    </View>
  );

  const renderBudgetScenario = ({ item }) => (
    <View style={[styles.listItem, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.listItemHeader}>
        <Text style={[styles.listItemTitle, { color: theme.text }]}>{item.name}</Text>
        <View style={[
          styles.scenarioTypeBadge,
          { backgroundColor: item.scenarioType === 'BASELINE' ? '#2196F3' : 
                           item.scenarioType === 'OPTIMISTIC' ? '#4CAF50' : '#FF9800' }
        ]}>
          <Text style={styles.scenarioTypeText}>{item.scenarioType}</Text>
        </View>
      </View>
      <Text style={[styles.listItemDescription, { color: theme.textSecondary }]}>
        {item.description}
      </Text>
      <View style={styles.scenarioDetails}>
        <View style={styles.scenarioDetailItem}>
          <Text style={[styles.scenarioDetailLabel, { color: theme.textSecondary }]}>Total Budget</Text>
          <Text style={[styles.scenarioDetailValue, { color: theme.text }]}>
            {formatCurrency(item.totalBudget)}
          </Text>
        </View>
        <View style={styles.scenarioDetailItem}>
          <Text style={[styles.scenarioDetailLabel, { color: theme.textSecondary }]}>Status</Text>
          <Text style={[styles.scenarioDetailValue, { 
            color: item.isActive ? '#4CAF50' : '#F44336' 
          }]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <View style={styles.scenarioDetailItem}>
          <Text style={[styles.scenarioDetailLabel, { color: theme.textSecondary }]}>Created</Text>
          <Text style={[styles.scenarioDetailValue, { color: theme.text }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderBudgetForecast = ({ item }) => (
    <View style={[styles.listItem, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.listItemHeader}>
        <Text style={[styles.listItemTitle, { color: theme.text }]}>{item.forecastPeriod}</Text>
        <View style={[styles.confidenceBadge, { backgroundColor: '#2196F3' }]}>
          <Text style={styles.confidenceText}>{item.confidenceLevel}% Confidence</Text>
        </View>
      </View>
      <View style={styles.forecastGrid}>
        <View style={styles.forecastItem}>
          <Text style={[styles.forecastLabel, { color: theme.textSecondary }]}>Budgeted</Text>
          <Text style={[styles.forecastValue, { color: theme.text }]}>
            {formatCurrency(item.budgetedAmount)}
          </Text>
        </View>
        <View style={styles.forecastItem}>
          <Text style={[styles.forecastLabel, { color: theme.textSecondary }]}>Forecasted</Text>
          <Text style={[styles.forecastValue, { color: theme.text }]}>
            {formatCurrency(item.forecastedAmount)}
          </Text>
        </View>
        <View style={styles.forecastItem}>
          <Text style={[styles.forecastLabel, { color: theme.textSecondary }]}>Variance</Text>
          <Text style={[styles.forecastValue, { color: getVarianceColor(item.variance) }]}>
            {formatCurrency(item.variance)} ({formatPercentage(item.variancePercent)})
          </Text>
        </View>
      </View>
      <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
        Updated: {formatDate(item.lastUpdated)}
      </Text>
    </View>
  );

  const renderCashFlowForecast = ({ item }) => (
    <View style={[styles.listItem, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.listItemHeader}>
        <Text style={[styles.listItemTitle, { color: theme.text }]}>{item.forecastPeriod}</Text>
        <View style={[styles.confidenceBadge, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.confidenceText}>{item.confidenceLevel}% Confidence</Text>
        </View>
      </View>
      <View style={styles.cashFlowGrid}>
        <View style={styles.cashFlowItem}>
          <Text style={[styles.cashFlowLabel, { color: theme.textSecondary }]}>Operating</Text>
          <Text style={[styles.cashFlowValue, { color: '#4CAF50' }]}>
            {formatCurrency(item.operatingCashFlow)}
          </Text>
        </View>
        <View style={styles.cashFlowItem}>
          <Text style={[styles.cashFlowLabel, { color: theme.textSecondary }]}>Investing</Text>
          <Text style={[styles.cashFlowValue, { color: '#FF9800' }]}>
            {formatCurrency(item.investingCashFlow)}
          </Text>
        </View>
        <View style={styles.cashFlowItem}>
          <Text style={[styles.cashFlowLabel, { color: theme.textSecondary }]}>Financing</Text>
          <Text style={[styles.cashFlowValue, { color: '#2196F3' }]}>
            {formatCurrency(item.financingCashFlow)}
          </Text>
        </View>
        <View style={styles.cashFlowItem}>
          <Text style={[styles.cashFlowLabel, { color: theme.textSecondary }]}>Net Cash Flow</Text>
          <Text style={[styles.cashFlowValue, { 
            color: item.netCashFlow > 0 ? '#4CAF50' : '#F44336' 
          }]}>
            {formatCurrency(item.netCashFlow)}
          </Text>
        </View>
      </View>
      {item.notes && (
        <Text style={[styles.cashFlowNotes, { color: theme.textSecondary }]}>
          {item.notes}
        </Text>
      )}
    </View>
  );

  const renderVarianceAnalysis = ({ item }) => {
    if (!item || typeof item !== 'object') {
      return (
        <View style={[styles.listItem, { backgroundColor: theme.cardBackground }]}>
          <Text style={{ color: theme.text }}>Invalid variance analysis item</Text>
        </View>
      );
    }

    // Ensure all values are properly formatted as strings
    const categoryName = String(item.category || item.account?.accountName || 'Unknown Category');
    const budgetAmountStr = String(formatCurrency(item.budgetAmount));
    const actualAmountStr = String(formatCurrency(item.actualAmount));
    const varianceStr = String(formatCurrency(item.variance));
    const variancePercentStr = String(formatPercentage(item.variancePercent));
    const varianceRatingStr = String((item.varianceRating || 'WITHIN_TOLERANCE').replace('_', ' '));
    const explanationStr = item.explanation ? String(item.explanation) : null;

    return (
      <View style={[styles.listItem, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.listItemHeader}>
          <Text style={[styles.listItemTitle, { color: theme.text }]}>
            {categoryName}
          </Text>
          <View style={[
            styles.varianceRatingBadge,
            { backgroundColor: getVarianceRatingColor(item.varianceRating || 'WITHIN_TOLERANCE') }
          ]}>
            <Text style={styles.varianceRatingText}>
              {varianceRatingStr}
            </Text>
          </View>
        </View>
        <View style={styles.varianceGrid}>
          <View style={styles.varianceItem}>
            <Text style={[styles.varianceLabel, { color: theme.textSecondary }]}>Budget</Text>
            <Text style={[styles.varianceValue, { color: theme.text }]}>
              {budgetAmountStr}
            </Text>
          </View>
          <View style={styles.varianceItem}>
            <Text style={[styles.varianceLabel, { color: theme.textSecondary }]}>Actual</Text>
            <Text style={[styles.varianceValue, { color: theme.text }]}>
              {actualAmountStr}
            </Text>
          </View>
          <View style={styles.varianceItem}>
            <Text style={[styles.varianceLabel, { color: theme.textSecondary }]}>Variance</Text>
            <Text style={[styles.varianceValue, { color: getVarianceColor(item.variance) }]}>
              {varianceStr} ({variancePercentStr})
            </Text>
          </View>
        </View>
        {explanationStr && (
          <Text style={[styles.varianceExplanation, { color: theme.textSecondary }]}>
            {explanationStr}
          </Text>
        )}
        {item.actionRequired && (
          <View style={styles.actionRequiredBadge}>
            <Ionicons name="warning" size={16} color="#FF9800" />
            <Text style={[styles.actionRequiredText, { color: '#FF9800' }]}>
              Action Required
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderOverview = () => (
    <View>
      <View style={styles.overviewGrid}>
        <MetricCard
          title="Budget Variance"
          value={formatCurrency(data.dashboard?.totalBudgetVariance)}
          subtitle="vs planned budget"
          icon="trending-down"
          color="#F44336"
        />
        <MetricCard
          title="Budget Utilization"
          value={formatPercentage(data.dashboard?.budgetUtilization)}
          subtitle="of total budget"
          icon="pie-chart"
          color="#2196F3"
        />
        <MetricCard
          title="Active Scenarios"
          value={data.dashboard?.activeBudgetScenarios || 0}
          subtitle="budget scenarios"
          icon="folder"
          color="#4CAF50"
        />
        <MetricCard
          title="Significant Variances"
          value={Array.isArray(data.dashboard?.significantVariances) ? data.dashboard.significantVariances.length : (data.dashboard?.significantVariances || 0)}
          subtitle="require attention"
          icon="warning"
          color="#FF9800"
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.sectionHeaderWithIcon}>
          <Ionicons name="trending-up" size={24} color="#10B981" />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Cash Flow Projections</Text>
        </View>
        
        <View style={styles.cashFlowProjectionsContainer}>
          <View style={[styles.projectionCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.projectionCardHeader}>
              <View style={[styles.projectionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
              </View>
              <View style={styles.projectionCardContent}>
                <Text style={[styles.projectionLabel, { color: theme.textSecondary }]}>Next Month</Text>
                <Text style={[styles.projectionValue, { color: '#10B981' }]}>
                  {formatCurrency(data.dashboard?.cashFlowProjection?.nextMonth)}
                </Text>
              </View>
            </View>
            <View style={styles.projectionTrend}>
              <Ionicons name="trending-up" size={16} color="#10B981" />
              <Text style={[styles.projectionTrendText, { color: '#10B981' }]}>Positive outlook</Text>
            </View>
          </View>

          <View style={[styles.projectionCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.projectionCardHeader}>
              <View style={[styles.projectionIcon, { backgroundColor: '#F0F9FF' }]}>
                <Ionicons name="stats-chart" size={20} color="#0EA5E9" />
              </View>
              <View style={styles.projectionCardContent}>
                <Text style={[styles.projectionLabel, { color: theme.textSecondary }]}>Quarter</Text>
                <Text style={[styles.projectionValue, { color: '#0EA5E9' }]}>
                  {formatCurrency(data.dashboard?.cashFlowProjection?.quarterProjection)}
                </Text>
              </View>
            </View>
            <View style={styles.projectionTrend}>
              <Ionicons name="trending-up" size={16} color="#0EA5E9" />
              <Text style={[styles.projectionTrendText, { color: '#0EA5E9' }]}>Strong growth</Text>
            </View>
          </View>

          <View style={[styles.projectionCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.projectionCardHeader}>
              <View style={[styles.projectionIcon, { backgroundColor: '#FEF3E2' }]}>
                <Ionicons name="bar-chart" size={20} color="#F59E0B" />
              </View>
              <View style={styles.projectionCardContent}>
                <Text style={[styles.projectionLabel, { color: theme.textSecondary }]}>Annual</Text>
                <Text style={[styles.projectionValue, { color: '#F59E0B' }]}>
                  {formatCurrency(data.dashboard?.cashFlowProjection?.yearProjection)}
                </Text>
              </View>
            </View>
            <View style={styles.projectionTrend}>
              <Ionicons name="trending-up" size={16} color="#F59E0B" />
              <Text style={[styles.projectionTrendText, { color: '#F59E0B' }]}>Sustained growth</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'scenarios':
        return (
          <FlatList
            data={Array.isArray(data.scenarios) ? data.scenarios : []}
            renderItem={renderBudgetScenario}
            keyExtractor={(item) => (item.id || Math.random()).toString()}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'forecasts':
        return (
          <FlatList
            data={Array.isArray(data.forecasts) ? data.forecasts : []}
            renderItem={renderBudgetForecast}
            keyExtractor={(item) => (item.id || Math.random()).toString()}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'cashflow':
        return (
          <FlatList
            data={Array.isArray(data.cashFlowForecasts) ? data.cashFlowForecasts : []}
            renderItem={renderCashFlowForecast}
            keyExtractor={(item) => (item.id || Math.random()).toString()}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'variance':
        return (
          <FlatList
            data={Array.isArray(data.varianceAnalysis) ? data.varianceAnalysis : []}
            renderItem={renderVarianceAnalysis}
            keyExtractor={(item) => (item.id || item.key || Math.random()).toString()}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: theme.text }}>No variance analysis data available</Text>
              </View>
            )}
          />
        );
      default:
        return renderOverview();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <InternalHeader navigation={navigation} title="Budgeting & Forecasting" />
        <View style={[styles.container, styles.centered]}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading budgeting data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InternalHeader navigation={navigation} title="Budgeting & Forecasting" />
      
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TabButton
            id="overview"
            title="Overview"
            isActive={activeTab === 'overview'}
            onPress={setActiveTab}
          />
          <TabButton
            id="scenarios"
            title="Budget Scenarios"
            isActive={activeTab === 'scenarios'}
            onPress={setActiveTab}
          />
          <TabButton
            id="forecasts"
            title="Forecasts"
            isActive={activeTab === 'forecasts'}
            onPress={setActiveTab}
          />
          <TabButton
            id="cashflow"
            title="Cash Flow"
            isActive={activeTab === 'cashflow'}
            onPress={setActiveTab}
          />
          <TabButton
            id="variance"
            title="Variance Analysis"
            isActive={activeTab === 'variance'}
            onPress={setActiveTab}
          />
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  tabContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    width: (width - 52) / 2,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricTitle: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  metricSubtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
  section: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  cashFlowProjectionsContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  projectionCard: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  projectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  projectionCardContent: {
    flex: 1,
  },
  projectionLabel: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
    opacity: 0.7,
  },
  projectionValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  projectionTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  projectionTrendText: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
    opacity: 0.8,
  },
  listItem: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  listItemTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  listItemDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
    opacity: 0.8,
  },
  scenarioTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scenarioTypeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scenarioDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  scenarioDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  scenarioDetailLabel: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '500',
    opacity: 0.7,
  },
  scenarioDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  forecastGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
  },
  forecastItem: {
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  forecastLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
    opacity: 0.7,
  },
  forecastValue: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  lastUpdated: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
  },
  cashFlowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
  },
  cashFlowItem: {
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  cashFlowLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
    opacity: 0.7,
  },
  cashFlowValue: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  cashFlowNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 12,
    opacity: 0.7,
    lineHeight: 18,
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
  },
  varianceRatingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  varianceRatingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  varianceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
  },
  varianceItem: {
    alignItems: 'center',
    flex: 1,
  },
  varianceLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
    opacity: 0.7,
  },
  varianceValue: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  varianceExplanation: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 19,
    opacity: 0.8,
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
  },
  actionRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  actionRequiredText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    color: '#92400E',
  },
});

export default BudgetingForecastingScreen; 