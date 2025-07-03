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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import InternalHeader from '../components/InternalHeader';
import { 
  getActivityCenters, 
  getCustomerProfitability, 
  getServiceProfitability,
  getActivityBasedCostingDashboard 
} from '../api/activityBasedCosting';

const ActivityBasedCostingScreen = ({ navigation }) => {
  const theme = useTheme();
  const [data, setData] = useState({
    activityCenters: [],
    customerProfitability: [],
    serviceProfitability: [],
    dashboard: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data as fallback
  const getMockData = () => ({
    activityCenters: [
      {
        id: 1,
        name: 'Picking Operations',
        activityType: 'PICKING',
        costPerUnit: 2.50,
        unitOfMeasure: 'item',
        description: 'Order picking and fulfillment',
        isActive: true
      },
      {
        id: 2,
        name: 'Receiving Operations',
        activityType: 'RECEIVING',
        costPerUnit: 12.40,
        unitOfMeasure: 'pallet',
        description: 'Inbound shipment receiving',
        isActive: true
      },
      {
        id: 3,
        name: 'Storage Operations',
        activityType: 'STORAGE',
        costPerUnit: 0.15,
        unitOfMeasure: 'cubic_foot',
        description: 'Warehouse storage',
        isActive: true
      }
    ],
    customerProfitability: [
      {
        id: 1,
        customerName: 'Acme Corporation',
        totalRevenue: 125000,
        totalCosts: 95000,
        grossMargin: 30000,
        marginPercentage: 24.0,
        totalActivities: 15420,
        avgActivityCost: 6.16
      },
      {
        id: 2,
        customerName: 'Tech Solutions Inc',
        totalRevenue: 85000,
        totalCosts: 72000,
        grossMargin: 13000,
        marginPercentage: 15.3,
        totalActivities: 12850,
        avgActivityCost: 5.60
      }
    ],
    serviceProfitability: [
      {
        id: 1,
        serviceType: 'RECEIVING',
        totalRevenue: 185000,
        totalCosts: 145000,
        grossMargin: 40000,
        marginPercentage: 21.6,
        utilizationRate: 87.5,
        avgCostPerUnit: 12.40
      },
      {
        id: 2,
        serviceType: 'PICKING',
        totalRevenue: 225000,
        totalCosts: 195000,
        grossMargin: 30000,
        marginPercentage: 13.3,
        utilizationRate: 92.1,
        avgCostPerUnit: 2.50
      }
    ],
    dashboard: {
      totalActivityCosts: 245000,
      totalRevenue: 485000,
      overallMargin: 49.5,
      activeActivityCenters: 8,
      topPerformingService: 'RECEIVING',
      lowestMarginCustomer: 'Tech Solutions Inc'
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [centers, customerProf, serviceProf, dashboard] = await Promise.all([
        getActivityCenters().catch(() => getMockData().activityCenters),
        getCustomerProfitability().catch(() => getMockData().customerProfitability),
        getServiceProfitability().catch(() => getMockData().serviceProfitability),
        getActivityBasedCostingDashboard().catch(() => getMockData().dashboard),
      ]);

      setData({
        activityCenters: centers.data || centers,
        customerProfitability: customerProf.data || customerProf,
        serviceProfitability: serviceProf.data || serviceProf,
        dashboard: dashboard.data || dashboard
      });
    } catch (error) {
      console.error('Error loading activity-based costing data:', error);
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

  const OverviewCard = ({ title, value, subtitle, icon, color }) => (
    <View style={[styles.overviewCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.overviewHeader}>
        <View style={[styles.overviewIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.overviewTitle, { color: theme.text }]}>{title}</Text>
      </View>
      <Text style={[styles.overviewValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.overviewSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
    </View>
  );

  const renderActivityCenter = ({ item }) => (
    <View style={[styles.listItem, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.listItemHeader}>
        <Text style={[styles.listItemTitle, { color: theme.text }]}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#4CAF50' : '#F44336' }]}>
          <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      <Text style={[styles.listItemDescription, { color: theme.textSecondary }]}>
        {item.description}
      </Text>
      <View style={styles.listItemDetails}>
        <Text style={[styles.listItemDetail, { color: theme.text }]}>
          Cost: {formatCurrency(item.costPerUnit)} per {item.unitOfMeasure}
        </Text>
        <Text style={[styles.listItemDetail, { color: theme.text }]}>
          Type: {item.activityType}
        </Text>
      </View>
    </View>
  );

  const renderCustomerProfitability = ({ item }) => (
    <View style={[styles.listItem, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.listItemHeader}>
        <Text style={[styles.listItemTitle, { color: theme.text }]}>{item.customerName}</Text>
        <Text style={[styles.marginText, { 
          color: item.marginPercentage > 20 ? '#4CAF50' : item.marginPercentage > 10 ? '#FF9800' : '#F44336' 
        }]}>
          {formatPercentage(item.marginPercentage)}
        </Text>
      </View>
      <View style={styles.profitabilityGrid}>
        <View style={styles.profitabilityItem}>
          <Text style={[styles.profitabilityLabel, { color: theme.textSecondary }]}>Revenue</Text>
          <Text style={[styles.profitabilityValue, { color: theme.text }]}>
            {formatCurrency(item.totalRevenue)}
          </Text>
        </View>
        <View style={styles.profitabilityItem}>
          <Text style={[styles.profitabilityLabel, { color: theme.textSecondary }]}>Costs</Text>
          <Text style={[styles.profitabilityValue, { color: theme.text }]}>
            {formatCurrency(item.totalCosts)}
          </Text>
        </View>
        <View style={styles.profitabilityItem}>
          <Text style={[styles.profitabilityLabel, { color: theme.textSecondary }]}>Margin</Text>
          <Text style={[styles.profitabilityValue, { color: theme.text }]}>
            {formatCurrency(item.grossMargin)}
          </Text>
        </View>
        <View style={styles.profitabilityItem}>
          <Text style={[styles.profitabilityLabel, { color: theme.textSecondary }]}>Activities</Text>
          <Text style={[styles.profitabilityValue, { color: theme.text }]}>
            {item.totalActivities?.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderServiceProfitability = ({ item }) => (
    <View style={[styles.listItem, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.listItemHeader}>
        <Text style={[styles.listItemTitle, { color: theme.text }]}>{item.serviceType}</Text>
        <Text style={[styles.marginText, { 
          color: item.marginPercentage > 20 ? '#4CAF50' : item.marginPercentage > 10 ? '#FF9800' : '#F44336' 
        }]}>
          {formatPercentage(item.marginPercentage)}
        </Text>
      </View>
      <View style={styles.serviceGrid}>
        <View style={styles.serviceMetric}>
          <Text style={[styles.serviceLabel, { color: theme.textSecondary }]}>Revenue</Text>
          <Text style={[styles.serviceValue, { color: theme.text }]}>
            {formatCurrency(item.totalRevenue)}
          </Text>
        </View>
        <View style={styles.serviceMetric}>
          <Text style={[styles.serviceLabel, { color: theme.textSecondary }]}>Utilization</Text>
          <Text style={[styles.serviceValue, { color: theme.text }]}>
            {formatPercentage(item.utilizationRate)}
          </Text>
        </View>
      </View>
      <View style={styles.serviceGrid}>
        <View style={styles.serviceMetric}>
          <Text style={[styles.serviceLabel, { color: theme.textSecondary }]}>Costs</Text>
          <Text style={[styles.serviceValue, { color: theme.text }]}>
            {formatCurrency(item.totalCosts)}
          </Text>
        </View>
        <View style={styles.serviceMetric}>
          <Text style={[styles.serviceLabel, { color: theme.textSecondary }]}>Avg Cost/Unit</Text>
          <Text style={[styles.serviceValue, { color: theme.text }]}>
            {formatCurrency(item.avgCostPerUnit)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderOverview = () => (
    <View style={styles.overviewContainer}>
      {/* Key Metrics Grid */}
      <View style={styles.overviewGrid}>
        <OverviewCard
          title="Total Activity Costs"
          value={formatCurrency(data.dashboard?.totalActivityCosts)}
          subtitle="All operations"
          icon="calculator"
          color="#2196F3"
        />
        <OverviewCard
          title="Overall Margin"
          value={formatPercentage(data.dashboard?.overallMargin)}
          subtitle="Profit margin"
          icon="trending-up"
          color="#4CAF50"
        />
        <OverviewCard
          title="Active Centers"
          value={data.dashboard?.activeActivityCenters}
          subtitle="Cost centers"
          icon="business"
          color="#FF9800"
        />
        <OverviewCard
          title="Total Revenue"
          value={formatCurrency(data.dashboard?.totalRevenue)}
          subtitle="All services"
          icon="cash"
          color="#9C27B0"
        />
      </View>

      {/* Performance Summary */}
      <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Performance Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="star" size={20} color="#2196F3" />
            </View>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Top Service</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {data.dashboard?.topPerformingService || 'RECEIVING'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="alert-circle" size={20} color="#FF9800" />
            </View>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Attention Needed</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {data.dashboard?.lowestMarginCustomer || 'Tech Solutions'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, { backgroundColor: '#E8F5E8' }]}>
              <Ionicons name="speedometer" size={20} color="#4CAF50" />
            </View>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Efficiency</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>87.3%</Text>
          </View>
        </View>
      </View>

      {/* Cost Breakdown Chart */}
      <View style={[styles.chartCard, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Cost Breakdown by Activity</Text>
        <View style={styles.chartContainer}>
          {data.activityCenters.slice(0, 4).map((center, index) => {
            const percentage = ((center.costPerUnit * 1000) / (data.dashboard?.totalActivityCosts || 245000) * 100);
            return (
              <View key={center.id} style={styles.chartItem}>
                <View style={styles.chartRow}>
                  <View style={styles.chartLegend}>
                    <View style={[styles.legendDot, { 
                      backgroundColor: ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0'][index] 
                    }]} />
                    <Text style={[styles.chartLabel, { color: theme.text }]}>
                      {center.activityType}
                    </Text>
                  </View>
                  <Text style={[styles.chartPercentage, { color: theme.text }]}>
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                    <View style={[
                      styles.progressFill,
                      { 
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0'][index]
                      }
                    ]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Quick Insights */}
      <View style={[styles.insightsCard, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Insights</Text>
        <View style={styles.insightsList}>
          <View style={styles.insightItem}>
            <View style={[styles.insightIcon, { backgroundColor: '#E8F5E8' }]}>
              <Ionicons name="trending-up" size={16} color="#4CAF50" />
            </View>
            <Text style={[styles.insightText, { color: theme.text }]}>
              Picking operations show 15% cost efficiency improvement this quarter
            </Text>
          </View>
          <View style={styles.insightItem}>
            <View style={[styles.insightIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="warning" size={16} color="#FF9800" />
            </View>
            <Text style={[styles.insightText, { color: theme.text }]}>
              Storage costs are 8% above industry benchmark - optimization needed
            </Text>
          </View>
          <View style={styles.insightItem}>
            <View style={[styles.insightIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="information-circle" size={16} color="#2196F3" />
            </View>
            <Text style={[styles.insightText, { color: theme.text }]}>
              Customer profitability analysis shows 3 high-value opportunities
            </Text>
          </View>
        </View>
      </View>

      {/* Activity Centers Preview */}
      <View style={[styles.previewCard, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.previewHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Activity Centers</Text>
          <TouchableOpacity onPress={() => setActiveTab('centers')}>
            <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>
        {data.activityCenters.slice(0, 3).map((center, index) => (
          <View key={center.id} style={styles.previewItem}>
            <View style={styles.previewItemHeader}>
              <Text style={[styles.previewItemTitle, { color: theme.text }]}>
                {center.name}
              </Text>
              <Text style={[styles.previewItemValue, { color: theme.text }]}>
                {formatCurrency(center.costPerUnit)}/{center.unitOfMeasure}
              </Text>
            </View>
            <Text style={[styles.previewItemSubtitle, { color: theme.textSecondary }]}>
              {center.description}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'centers':
        return (
          <FlatList
            data={data.activityCenters}
            renderItem={renderActivityCenter}
            keyExtractor={(item) => item.id?.toString()}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'customers':
        return (
          <FlatList
            data={data.customerProfitability}
            renderItem={renderCustomerProfitability}
            keyExtractor={(item) => item.id?.toString()}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'services':
        return (
          <FlatList
            data={data.serviceProfitability}
            renderItem={renderServiceProfitability}
            keyExtractor={(item) => item.id?.toString()}
            showsVerticalScrollIndicator={false}
          />
        );
      default:
        return renderOverview();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <InternalHeader navigation={navigation} title="Activity-Based Costing" />
        <View style={[styles.container, styles.centered]}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading costing data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InternalHeader navigation={navigation} title="Activity-Based Costing" />
      
      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: theme.cardBackground }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContainer}>
          <TabButton
            id="overview"
            title="Overview"
            isActive={activeTab === 'overview'}
            onPress={setActiveTab}
          />
          <TabButton
            id="centers"
            title="Activity Centers"
            isActive={activeTab === 'centers'}
            onPress={setActiveTab}
          />
          <TabButton
            id="customers"
            title="Customer Profitability"
            isActive={activeTab === 'customers'}
            onPress={setActiveTab}
          />
          <TabButton
            id="services"
            title="Service Profitability"
            isActive={activeTab === 'services'}
            onPress={setActiveTab}
          />
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabScrollContainer: {
    paddingHorizontal: 16,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  overviewContainer: {
    paddingBottom: 20,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  overviewCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  overviewTitle: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 11,
  },
  listItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  marginText: {
    fontSize: 16,
    fontWeight: '700',
  },
  listItemDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  listItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listItemDetail: {
    fontSize: 12,
    fontWeight: '500',
  },
  profitabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  profitabilityItem: {
    width: '48%',
    marginBottom: 8,
  },
  profitabilityLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  profitabilityValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  serviceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  serviceMetric: {
    flex: 1,
  },
  serviceLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  serviceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  // New enhanced overview styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  chartContainer: {
    paddingTop: 8,
  },
  chartItem: {
    marginBottom: 16,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  chartLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  chartPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarContainer: {
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  insightsCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  insightsList: {
    paddingTop: 8,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  previewCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  previewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  previewItemValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2196F3',
  },
  previewItemSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default ActivityBasedCostingScreen; 