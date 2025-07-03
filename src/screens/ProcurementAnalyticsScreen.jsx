import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import InternalHeader from '../components/InternalHeader';
import {
  fetchProcurementOverview,
  fetchSpendAnalysis,
  fetchProcurementTrends,
  fetchCostSavingsAnalysis,
  fetchPurchaseRequisitionAnalytics,
  fetchPurchaseOrderAnalytics,
} from '../api/procurementAnalytics';

const { width } = Dimensions.get('window');

export default function ProcurementAnalyticsScreen({ navigation }) {
  const { user, userToken: token } = useContext(AuthContext);
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('12months');
  
  const [overview, setOverview] = useState({});
  const [spendAnalysis, setSpendAnalysis] = useState({});
  const [trends, setTrends] = useState([]);
  const [costSavings, setCostSavings] = useState({});
  const [requisitionAnalytics, setRequisitionAnalytics] = useState({});
  const [orderAnalytics, setOrderAnalytics] = useState({});

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        overviewData,
        spendData,
        trendsData,
        savingsData,
        reqData,
        orderData,
      ] = await Promise.all([
        fetchProcurementOverview(token, selectedPeriod),
        fetchSpendAnalysis(token, { period: selectedPeriod }),
        fetchProcurementTrends(token, selectedPeriod === '12months' ? 12 : 6),
        fetchCostSavingsAnalysis(token, selectedPeriod),
        fetchPurchaseRequisitionAnalytics(token, selectedPeriod === '12months' ? '12months' : '6months'),
        fetchPurchaseOrderAnalytics(token, selectedPeriod === '12months' ? '12months' : '6months'),
      ]);
      
      setOverview(overviewData);
      setSpendAnalysis(spendData);
      setTrends(trendsData);
      setCostSavings(savingsData);
      setRequisitionAnalytics(reqData);
      setOrderAnalytics(orderData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load analytics data. Please try again.');
      console.error('Error loading procurement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const KPICard = ({ title, value, subtitle, icon, color, trend }) => (
    <View style={[styles.kpiCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.kpiHeader}>
        <View style={[styles.kpiIcon, { backgroundColor: color + '20' }]}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        {trend && (
          <View style={[styles.trendIndicator, { backgroundColor: trend > 0 ? '#10B981' : '#EF4444' }]}>
            <MaterialCommunityIcons 
              name={trend > 0 ? 'trending-up' : 'trending-down'} 
              size={16} 
              color="#fff" 
            />
            <Text style={styles.trendText}>{Math.abs(trend)}%</Text>
          </View>
        )}
      </View>
      <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.kpiTitle, { color: theme.colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.kpiSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
  );

  const ChartCard = ({ title, children }) => (
    <View style={[styles.chartCard, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.chartTitle, { color: theme.colors.text }]}>{title}</Text>
      {children}
    </View>
  );

  const ProgressBar = ({ label, value, total, color }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarHeader}>
          <Text style={[styles.progressBarLabel, { color: theme.colors.text }]}>{label}</Text>
          <Text style={[styles.progressBarValue, { color: theme.textSecondary }]}>
            ${value?.toLocaleString() || '0'}
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }
            ]} 
          />
        </View>
        <Text style={[styles.progressBarPercentage, { color: theme.textSecondary }]}>
          {percentage.toFixed(1)}%
        </Text>
      </View>
    );
  };

  const StatusDistribution = ({ data, colors }) => (
    <View style={styles.statusDistribution}>
      {data.map((item, index) => (
        <View key={index} style={styles.statusItem}>
          <View style={[styles.statusDot, { backgroundColor: colors[index % colors.length] }]} />
          <Text style={[styles.statusLabel, { color: theme.colors.text }]}>{item.status}</Text>
          <Text style={[styles.statusCount, { color: theme.textSecondary }]}>{item.count}</Text>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <InternalHeader navigation={navigation} title="Procurement Analytics" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InternalHeader navigation={navigation} title="Procurement Analytics" />

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['6months', '12months', '24months'].map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && { color: '#fff' }
              ]}>
                {period === '6months' ? '6 Months' : period === '12months' ? '12 Months' : '24 Months'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Key Performance Indicators */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Key Performance Indicators</Text>
          <View style={styles.kpiGrid}>
            <KPICard
              title="Total Spend"
              value={`$${overview.totalSpend?.toLocaleString() || '0'}`}
              subtitle="All procurement activities"
              icon="currency-usd"
              color="#3B82F6"
              trend={overview.spendTrend}
            />
            <KPICard
              title="Active Suppliers"
              value={overview.activeSuppliers || '0'}
              subtitle="Currently engaged"
              icon="account-group"
              color="#10B981"
              trend={overview.supplierTrend}
            />
            <KPICard
              title="Purchase Orders"
              value={overview.totalPurchaseOrders || '0'}
              subtitle="This period"
              icon="file-document"
              color="#F59E0B"
              trend={overview.orderTrend}
            />
            <KPICard
              title="Cost Savings"
              value={`$${costSavings.totalSavings?.toLocaleString() || '0'}`}
              subtitle={`${costSavings.savingsPercentage?.toFixed(1) || '0'}% saved`}
              icon="trending-down"
              color="#10B981"
              trend={costSavings.savingsTrend}
            />
          </View>
        </View>

        {/* Spend Analysis */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Spend Analysis</Text>
          <ChartCard title="Spend by Category">
            {spendAnalysis.byCategory?.map((category, index) => (
              <ProgressBar
                key={index}
                label={category.name}
                value={category.amount}
                total={spendAnalysis.totalSpend}
                color={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]}
              />
            ))}
            {(!spendAnalysis.byCategory || spendAnalysis.byCategory.length === 0) && (
              <View style={styles.emptyChart}>
                <MaterialCommunityIcons name="chart-pie" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
                  No spend data available
                </Text>
              </View>
            )}
          </ChartCard>

          <ChartCard title="Top Suppliers by Spend">
            {spendAnalysis.topSuppliers?.map((supplier, index) => (
              <ProgressBar
                key={index}
                label={supplier.name}
                value={supplier.totalSpend}
                total={spendAnalysis.totalSpend}
                color={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]}
              />
            ))}
            {(!spendAnalysis.topSuppliers || spendAnalysis.topSuppliers.length === 0) && (
              <View style={styles.emptyChart}>
                <MaterialCommunityIcons name="account-group" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
                  No supplier data available
                </Text>
              </View>
            )}
          </ChartCard>
        </View>

        {/* Purchase Requisitions Analytics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Purchase Requisitions</Text>
          <View style={styles.analyticsRow}>
            <View style={[styles.analyticsCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.analyticsValue, { color: theme.colors.text }]}>
                {requisitionAnalytics.total || '0'}
              </Text>
              <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>Total Requisitions</Text>
            </View>
            <View style={[styles.analyticsCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.analyticsValue, { color: '#F59E0B' }]}>
                {requisitionAnalytics.pending || '0'}
              </Text>
              <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>Pending Approval</Text>
            </View>
            <View style={[styles.analyticsCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.analyticsValue, { color: '#10B981' }]}>
                {requisitionAnalytics.approved || '0'}
              </Text>
              <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>Approved</Text>
            </View>
          </View>

          {requisitionAnalytics.statusDistribution && (
            <ChartCard title="Requisition Status Distribution">
              <StatusDistribution
                data={requisitionAnalytics.statusDistribution}
                colors={['#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#6B7280']}
              />
            </ChartCard>
          )}
        </View>

        {/* Purchase Orders Analytics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Purchase Orders</Text>
          <View style={styles.analyticsRow}>
            <View style={[styles.analyticsCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.analyticsValue, { color: theme.colors.text }]}>
                {orderAnalytics.total || '0'}
              </Text>
              <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>Total Orders</Text>
            </View>
            <View style={[styles.analyticsCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.analyticsValue, { color: '#3B82F6' }]}>
                {orderAnalytics.sent || '0'}
              </Text>
              <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>Sent to Suppliers</Text>
            </View>
            <View style={[styles.analyticsCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.analyticsValue, { color: '#10B981' }]}>
                {orderAnalytics.received || '0'}
              </Text>
              <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>Received</Text>
            </View>
          </View>

          {orderAnalytics.statusDistribution && (
            <ChartCard title="Purchase Order Status Distribution">
              <StatusDistribution
                data={orderAnalytics.statusDistribution}
                colors={['#6B7280', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444']}
              />
            </ChartCard>
          )}
        </View>

        {/* Cost Savings Analysis */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Cost Savings Analysis</Text>
          <ChartCard title="Savings Breakdown">
            <View style={styles.savingsGrid}>
              <View style={styles.savingsItem}>
                <Text style={[styles.savingsValue, { color: '#10B981' }]}>
                  ${costSavings.negotiationSavings?.toLocaleString() || '0'}
                </Text>
                <Text style={[styles.savingsLabel, { color: theme.textSecondary }]}>
                  Negotiation Savings
                </Text>
              </View>
              <View style={styles.savingsItem}>
                <Text style={[styles.savingsValue, { color: '#3B82F6' }]}>
                  ${costSavings.volumeDiscounts?.toLocaleString() || '0'}
                </Text>
                <Text style={[styles.savingsLabel, { color: theme.textSecondary }]}>
                  Volume Discounts
                </Text>
              </View>
              <View style={styles.savingsItem}>
                <Text style={[styles.savingsValue, { color: '#F59E0B' }]}>
                  ${costSavings.earlyPaymentDiscounts?.toLocaleString() || '0'}
                </Text>
                <Text style={[styles.savingsLabel, { color: theme.textSecondary }]}>
                  Early Payment
                </Text>
              </View>
              <View style={styles.savingsItem}>
                <Text style={[styles.savingsValue, { color: '#8B5CF6' }]}>
                  ${costSavings.processImprovements?.toLocaleString() || '0'}
                </Text>
                <Text style={[styles.savingsLabel, { color: theme.textSecondary }]}>
                  Process Improvements
                </Text>
              </View>
            </View>
          </ChartCard>
        </View>

        {/* Procurement Trends */}
        {trends.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Procurement Trends</Text>
            <ChartCard title="Monthly Spend Trend">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.trendChart}>
                  {trends.map((trend, index) => (
                    <View key={index} style={styles.trendBar}>
                      <View 
                        style={[
                          styles.trendBarFill,
                          { 
                            height: Math.max((trend.totalSpend / Math.max(...trends.map(t => t.totalSpend))) * 100, 5),
                            backgroundColor: theme.colors.primary
                          }
                        ]}
                      />
                      <Text style={[styles.trendBarLabel, { color: theme.textSecondary }]}>
                        {trend.month}
                      </Text>
                      <Text style={[styles.trendBarValue, { color: theme.colors.text }]}>
                        ${(trend.totalSpend / 1000).toFixed(0)}K
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </ChartCard>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Procurement Management</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { 
                backgroundColor: theme.cardBackground,
                borderColor: '#E1F5FE',
                borderWidth: 1,
              }]}
              onPress={() => navigation.navigate('PurchaseRequisitionScreen')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <MaterialCommunityIcons name="file-document-plus" size={28} color="#1976D2" />
              </View>
              <Text style={[styles.actionText, { color: theme.colors.text }]}>Purchase</Text>
              <Text style={[styles.actionSubtext, { color: theme.textSecondary }]}>Requisitions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { 
                backgroundColor: theme.cardBackground,
                borderColor: '#E8F5E8',
                borderWidth: 1,
              }]}
              onPress={() => navigation.navigate('PurchaseOrderScreen')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E8' }]}>
                <MaterialCommunityIcons name="clipboard-text" size={28} color="#388E3C" />
              </View>
              <Text style={[styles.actionText, { color: theme.colors.text }]}>Purchase</Text>
              <Text style={[styles.actionSubtext, { color: theme.textSecondary }]}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { 
                backgroundColor: theme.cardBackground,
                borderColor: '#FFF3E0',
                borderWidth: 1,
              }]}
              onPress={() => navigation.navigate('VendorScorecardScreen')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <MaterialCommunityIcons name="chart-box" size={28} color="#F57C00" />
              </View>
              <Text style={[styles.actionText, { color: theme.colors.text }]}>Vendor</Text>
              <Text style={[styles.actionSubtext, { color: theme.textSecondary }]}>Scorecards</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { 
                backgroundColor: theme.cardBackground,
                borderColor: '#F3E5F5',
                borderWidth: 1,
              }]}
              onPress={() => navigation.navigate('SuppliersScreen')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#F3E5F5' }]}>
                <MaterialCommunityIcons name="account-group" size={28} color="#7B1FA2" />
              </View>
              <Text style={[styles.actionText, { color: theme.colors.text }]}>Supplier</Text>
              <Text style={[styles.actionSubtext, { color: theme.textSecondary }]}>Management</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  periodSelector: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  trendText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  kpiSubtitle: {
    fontSize: 12,
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBarLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBarValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 4,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  progressBarPercentage: {
    fontSize: 12,
    textAlign: 'right',
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyChartText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  analyticsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  statusDistribution: {
    paddingVertical: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  statusCount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  savingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  savingsItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  savingsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  savingsLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 8,
  },
  trendBar: {
    alignItems: 'center',
    marginHorizontal: 4,
    minWidth: 40,
  },
  trendBarFill: {
    width: 24,
    borderRadius: 2,
    marginBottom: 8,
  },
  trendBarLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  trendBarValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    minHeight: 140,
    justifyContent: 'center',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  actionSubtext: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
}); 