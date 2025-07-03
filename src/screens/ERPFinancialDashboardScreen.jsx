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
import { getFinancialDashboard } from '../api/financial';
import { getBillingDashboard } from '../api/billing';
import { getExpenseDashboard } from '../api/expenses';

const { width } = Dimensions.get('window');

const ERPFinancialDashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data functions as fallback
  const getMockFinancialData = () => ({
    netProfit: 125000,
    profitMargin: 15.2,
    recentActivity: [
      {
        id: 1,
        title: 'Invoice Payment Received',
        subtitle: 'Acme Corp - $15,000',
        time: '2 hours ago',
        icon: 'cash',
        color: '#4CAF50'
      },
      {
        id: 2,
        title: 'Expense Approved',
        subtitle: 'Office Supplies - $250',
        time: '4 hours ago',
        icon: 'receipt',
        color: '#FF9800'
      },
      {
        id: 3,
        title: 'Journal Entry Created',
        subtitle: 'Equipment Purchase - $5,000',
        time: '1 day ago',
        icon: 'book',
        color: '#2196F3'
      }
    ],
    alerts: [
      {
        id: 1,
        title: 'Budget Alert',
        message: 'Office supplies budget is 85% utilized',
        icon: 'warning',
        color: '#FF9800'
      },
      {
        id: 2,
        title: 'Overdue Invoices',
        message: '3 invoices are overdue by more than 30 days',
        icon: 'alert-circle',
        color: '#F44336'
      }
    ]
  });

  const getMockBillingData = () => ({
    totalRevenue: 850000,
    revenueGrowth: 12.5,
    outstandingAR: 125000,
    overdueInvoices: 3,
    recentInvoices: [
      {
        id: 'INV-2024-001',
        customer: 'Acme Corp',
        amount: 15000,
        status: 'PAID',
        dueDate: '2024-01-15'
      },
      {
        id: 'INV-2024-002',
        customer: 'Tech Solutions Inc',
        amount: 8500,
        status: 'SENT',
        dueDate: '2024-01-20'
      }
    ]
  });

  const getMockExpenseData = () => ({
    monthlyTotal: 65000,
    expenseGrowth: -3.2,
    pendingApprovals: 5,
    categoryBreakdown: [
      { category: 'Office Supplies', amount: 2500 },
      { category: 'Utilities', amount: 3200 },
      { category: 'Fuel', amount: 8500 },
      { category: 'Equipment', amount: 12000 }
    ]
  });

  useEffect(() => {
    loadDashboardData();
    // Test API calls separately
    testAPIConnections();
  }, []);

  const testAPIConnections = async () => {
    console.log('Testing API connections...');
    
    try {
      const financialResult = await getFinancialDashboard();
      console.log('Financial API success:', financialResult);
    } catch (error) {
      console.log('Financial API failed:', error.message);
    }

    try {
      const billingResult = await getBillingDashboard();
      console.log('Billing API success:', billingResult);
    } catch (error) {
      console.log('Billing API failed:', error.message);
    }

    try {
      const expenseResult = await getExpenseDashboard();
      console.log('Expense API success:', expenseResult);
    } catch (error) {
      console.log('Expense API failed:', error.message);
    }
  };

  const loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data...');
      
      const [financialData, billingData, expenseData] = await Promise.all([
        getFinancialDashboard().catch(err => {
          console.error('Financial API error:', err);
          return getMockFinancialData();
        }),
        getBillingDashboard().catch(err => {
          console.error('Billing API error:', err);
          return getMockBillingData();
        }),
        getExpenseDashboard().catch(err => {
          console.error('Expense API error:', err);
          return getMockExpenseData();
        }),
      ]);

      console.log('Dashboard data loaded:', { financialData, billingData, expenseData });

      setDashboardData({
        financial: financialData,
        billing: billingData,
        expenses: expenseData,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Use mock data as fallback
      setDashboardData({
        financial: getMockFinancialData(),
        billing: getMockBillingData(),
        expenses: getMockExpenseData(),
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
        <InternalHeader navigation={navigation} title="Financial Dashboard" />
        <View style={[styles.container, styles.centered]}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading financial data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InternalHeader navigation={navigation} title="Financial Dashboard" />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

      {/* Key Financial Metrics */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(dashboardData?.billing?.totalRevenue)}
            subtitle={`${dashboardData?.billing?.revenueGrowth > 0 ? '+' : ''}${dashboardData?.billing?.revenueGrowth?.toFixed(1)}% vs last month`}
            icon="trending-up"
            color="#4CAF50"
            onPress={() => navigation.navigate('BillingManagement')}
          />
          <MetricCard
            title="Outstanding AR"
            value={formatCurrency(dashboardData?.billing?.outstandingAR)}
            subtitle={`${dashboardData?.billing?.overdueInvoices} overdue invoices`}
            icon="card"
            color="#FF9800"
            onPress={() => navigation.navigate('InvoiceManagement')}
          />
          <MetricCard
            title="Monthly Expenses"
            value={formatCurrency(dashboardData?.expenses?.monthlyTotal)}
            subtitle={`${dashboardData?.expenses?.expenseGrowth > 0 ? '+' : ''}${dashboardData?.expenses?.expenseGrowth?.toFixed(1)}% vs last month`}
            icon="receipt"
            color="#F44336"
            onPress={() => navigation.navigate('ExpenseManagement')}
          />
          <MetricCard
            title="Net Profit"
            value={formatCurrency(dashboardData?.financial?.netProfit)}
            subtitle={`${dashboardData?.financial?.profitMargin?.toFixed(1)}% margin`}
            icon="analytics"
            color="#2196F3"
            onPress={() => navigation.navigate('FinancialReports')}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickActionCard
            title="Create Invoice"
            icon="document-text"
            color="#4CAF50"
            onPress={() => navigation.navigate('CreateInvoice')}
          />
          <QuickActionCard
            title="Record Expense"
            icon="receipt"
            color="#FF9800"
            onPress={() => navigation.navigate('RecordExpense')}
          />
          <QuickActionCard
            title="Journal Entry"
            icon="book"
            color="#2196F3"
            onPress={() => navigation.navigate('JournalEntry')}
          />
          <QuickActionCard
            title="Financial Reports"
            icon="bar-chart"
            color="#9C27B0"
            onPress={() => navigation.navigate('FinancialReports')}
          />
          <QuickActionCard
            title="Chart of Accounts"
            icon="list"
            color="#607D8B"
            onPress={() => navigation.navigate('ChartOfAccounts')}
          />
          <QuickActionCard
            title="Budgeting & Forecasting"
            icon="calculator"
            color="#795548"
            onPress={() => navigation.navigate('BudgetingForecastingScreen')}
          />
          <QuickActionCard
            title="Cost Managing"
            icon="stats-chart"
            color="#E91E63"
                          onPress={() => navigation.navigate('CostManagementDashboardScreen')}
          />
          <QuickActionCard
            title="Activity Costing"
            icon="business"
            color="#00BCD4"
                          onPress={() => navigation.navigate('ActivityBasedCostingScreen')}
          />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ActivityLog')}>
            <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {dashboardData?.financial?.recentActivity?.map((activity, index) => (
          <View key={index} style={[styles.activityItem, { borderBottomColor: theme.colors.border }]}>
            <View style={[styles.activityIcon, { backgroundColor: `${activity.color}20` }]}>
              <Ionicons name={activity.icon} size={16} color={activity.color} />
            </View>
            <View style={styles.activityContent}>
              <Text style={[styles.activityTitle, { color: theme.colors.text }]}>
                {activity.title}
              </Text>
              <Text style={[styles.activitySubtitle, { color: theme.colors.text }]}>
                {activity.subtitle}
              </Text>
            </View>
            <Text style={[styles.activityTime, { color: theme.colors.text }]}>
              {activity.time}
            </Text>
          </View>
        ))}
      </View>

      {/* Alerts & Notifications */}
      {dashboardData?.financial?.alerts?.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Alerts & Notifications</Text>
          {dashboardData.financial.alerts.map((alert, index) => (
            <View key={index} style={[styles.alertItem, { 
              backgroundColor: `${alert.color}10`,
              borderLeftColor: alert.color 
            }]}>
              <Ionicons name={alert.icon} size={20} color={alert.color} />
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: theme.colors.text }]}>
                  {alert.title}
                </Text>
                <Text style={[styles.alertMessage, { color: theme.colors.text }]}>
                  {alert.message}
                </Text>
              </View>
            </View>
          ))}
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
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  quickActionCard: {
    width: (width - 80) / 3,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
  },
  activityTime: {
    fontSize: 12,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default ERPFinancialDashboardScreen; 