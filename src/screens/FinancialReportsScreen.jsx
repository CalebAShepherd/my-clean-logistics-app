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
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import InternalHeader from '../components/InternalHeader';
import { 
  getTrialBalance, 
  getProfitAndLoss, 
  getBalanceSheet, 
  getCashFlowStatement 
} from '../api/financial';

const { width } = Dimensions.get('window');

const FinancialReportsScreen = ({ navigation }) => {
  const theme = useTheme();
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const periodOptions = [
    { label: 'Current Month', value: 'current_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Current Quarter', value: 'current_quarter' },
    { label: 'Last Quarter', value: 'last_quarter' },
    { label: 'Current Year', value: 'current_year' },
    { label: 'Last Year', value: 'last_year' },
    { label: 'Year to Date', value: 'ytd' },
  ];

  const reportTypes = [
    {
      id: 'profit_loss',
      title: 'Profit & Loss',
      subtitle: 'Income statement showing revenue and expenses',
      icon: 'trending-up',
      color: '#4CAF50',
      loadFunction: getProfitAndLoss,
    },
    {
      id: 'balance_sheet',
      title: 'Balance Sheet',
      subtitle: 'Assets, liabilities, and equity snapshot',
      icon: 'scale',
      color: '#2196F3',
      loadFunction: getBalanceSheet,
    },
    {
      id: 'trial_balance',
      title: 'Trial Balance',
      subtitle: 'All account balances for verification',
      icon: 'list',
      color: '#FF9800',
      loadFunction: getTrialBalance,
    },
    {
      id: 'cash_flow',
      title: 'Cash Flow Statement',
      subtitle: 'Cash inflows and outflows',
      icon: 'water',
      color: '#9C27B0',
      loadFunction: getCashFlowStatement,
    },
  ];

  useEffect(() => {
    loadReports();
  }, [selectedPeriod]);

  const loadReports = async () => {
    try {
      const filters = { period: selectedPeriod };
      const reportData = {};

      // Load all reports in parallel
      const promises = reportTypes.map(async (reportType) => {
        try {
          console.log(`Loading ${reportType.title} with filters:`, filters);
          const data = await reportType.loadFunction(filters);
          console.log(`${reportType.title} data received:`, data);
          reportData[reportType.id] = data;
        } catch (error) {
          console.error(`Error loading ${reportType.title}:`, error);
          console.error(`Error details:`, error.stack);
          reportData[reportType.id] = { error: error.message };
        }
      });

      await Promise.all(promises);
      setReports(reportData);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load financial reports');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const ReportCard = ({ reportType }) => {
    const reportData = reports[reportType.id];
    const hasError = reportData?.error;
    const hasData = reportData && !hasError;

    return (
      <TouchableOpacity
        style={[styles.reportCard, { backgroundColor: theme.cardBackground }]}
        onPress={() => navigation.navigate('ReportDetail', { 
          reportType: reportType.id, 
          period: selectedPeriod,
          title: reportType.title 
        })}
      >
        <View style={styles.reportHeader}>
          <View style={[styles.reportIcon, { backgroundColor: `${reportType.color}20` }]}>
            <Ionicons name={reportType.icon} size={24} color={reportType.color} />
          </View>
          <View style={styles.reportInfo}>
            <Text style={[styles.reportTitle, { color: theme.text }]}>
              {reportType.title}
            </Text>
            <Text style={[styles.reportSubtitle, { color: theme.textSecondary }]}>
              {reportType.subtitle}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </View>

        {hasError && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={16} color="#F44336" />
            <Text style={[styles.errorText, { color: '#F44336' }]}>
              Failed to load data
            </Text>
          </View>
        )}

        {hasData && (
          <View style={styles.reportPreview}>
            {reportType.id === 'profit_loss' && (
              <>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                    Total Revenue
                  </Text>
                  <Text style={[styles.previewValue, { color: '#4CAF50' }]}>
                    {formatCurrency(reportData.totalRevenue)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                    Net Income
                  </Text>
                  <Text style={[
                    styles.previewValue, 
                    { color: reportData.netIncome >= 0 ? '#4CAF50' : '#F44336' }
                  ]}>
                    {formatCurrency(reportData.netIncome)}
                  </Text>
                </View>
              </>
            )}

            {reportType.id === 'balance_sheet' && (
              <>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                    Total Assets
                  </Text>
                  <Text style={[styles.previewValue, { color: theme.text }]}>
                    {formatCurrency(reportData.totalAssets)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                    Total Equity
                  </Text>
                  <Text style={[styles.previewValue, { color: theme.text }]}>
                    {formatCurrency(reportData.totalEquity)}
                  </Text>
                </View>
              </>
            )}

            {reportType.id === 'trial_balance' && (
              <>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                    Total Debits
                  </Text>
                  <Text style={[styles.previewValue, { color: theme.text }]}>
                    {formatCurrency(reportData.totalDebits)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                    Total Credits
                  </Text>
                  <Text style={[styles.previewValue, { color: theme.text }]}>
                    {formatCurrency(reportData.totalCredits)}
                  </Text>
                </View>
              </>
            )}

            {reportType.id === 'cash_flow' && (
              <>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                    Operating Cash Flow
                  </Text>
                  <Text style={[
                    styles.previewValue, 
                    { color: reportData.operatingCashFlow >= 0 ? '#4CAF50' : '#F44336' }
                  ]}>
                    {formatCurrency(reportData.operatingCashFlow)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                    Net Cash Flow
                  </Text>
                  <Text style={[
                    styles.previewValue, 
                    { color: reportData.netCashFlow >= 0 ? '#4CAF50' : '#F44336' }
                  ]}>
                    {formatCurrency(reportData.netCashFlow)}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const SummaryCard = ({ title, value, subtitle, icon, color, trend }) => (
    <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.summaryHeader}>
        <View style={[styles.summaryIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.summaryTitle, { color: theme.text }]}>{title}</Text>
      </View>
      <Text style={[styles.summaryValue, { color: theme.text }]}>{value}</Text>
      {subtitle && (
        <View style={styles.summarySubtitle}>
          <Text style={[styles.summarySubtitleText, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
          {trend !== undefined && (
            <View style={styles.trendContainer}>
              <Ionicons 
                name={trend >= 0 ? 'trending-up' : 'trending-down'} 
                size={12} 
                color={trend >= 0 ? '#4CAF50' : '#F44336'} 
              />
              <Text style={[
                styles.trendText, 
                { color: trend >= 0 ? '#4CAF50' : '#F44336' }
              ]}>
                {formatPercent(Math.abs(trend))}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const PeriodModal = () => (
    <Modal
      visible={showPeriodModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPeriodModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Period</Text>
            <TouchableOpacity onPress={() => setShowPeriodModal(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {periodOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.periodOption,
                selectedPeriod === option.value && { backgroundColor: `${theme.primary}20` }
              ]}
              onPress={() => {
                setSelectedPeriod(option.value);
                setShowPeriodModal(false);
              }}
            >
              <Text style={[
                styles.periodOptionText,
                { color: selectedPeriod === option.value ? theme.primary : theme.text }
              ]}>
                {option.label}
              </Text>
              {selectedPeriod === option.value && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <InternalHeader navigation={navigation} title="Financial Reports" />
        <View style={[styles.container, styles.centered]}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedPeriodLabel = periodOptions.find(p => p.value === selectedPeriod)?.label;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InternalHeader navigation={navigation} title="Financial Reports" />
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Period: {selectedPeriodLabel}</Text>
        <TouchableOpacity
          style={[styles.periodSelector, { backgroundColor: theme.cardBackground }]}
          onPress={() => setShowPeriodModal(true)}
        >
          <Text style={[styles.periodText, { color: theme.text }]}>
            {selectedPeriodLabel}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        <View style={styles.summaryGrid}>
          <SummaryCard
            title="Revenue"
            value={formatCurrency(reports.profit_loss?.totalRevenue)}
            subtitle="This period"
            icon="trending-up"
            color="#4CAF50"
            trend={reports.profit_loss?.revenueGrowth}
          />
          <SummaryCard
            title="Expenses"
            value={formatCurrency(reports.profit_loss?.totalExpenses)}
            subtitle="This period"
            icon="trending-down"
            color="#F44336"
            trend={reports.profit_loss?.expenseGrowth}
          />
        </View>
        <View style={styles.summaryGrid}>
          <SummaryCard
            title="Net Income"
            value={formatCurrency(reports.profit_loss?.netIncome)}
            subtitle={`${formatPercent(reports.profit_loss?.profitMargin)} margin`}
            icon="analytics"
            color="#2196F3"
            trend={reports.profit_loss?.incomeGrowth}
          />
          <SummaryCard
            title="Cash Flow"
            value={formatCurrency(reports.cash_flow?.netCashFlow)}
            subtitle="Net change"
            icon="water"
            color="#9C27B0"
            trend={reports.cash_flow?.cashFlowGrowth}
          />
        </View>
      </View>

      {/* Report Cards */}
      <View style={styles.reportsSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Detailed Reports</Text>
        {reportTypes.map((reportType) => (
          <ReportCard key={reportType.id} reportType={reportType} />
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
            onPress={() => navigation.navigate('ExportReports')}
          >
            <Ionicons name="download" size={24} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.text }]}>Export Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
            onPress={() => navigation.navigate('ScheduleReports')}
          >
            <Ionicons name="time" size={24} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.text }]}>Schedule Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
            onPress={() => navigation.navigate('ReportTemplates')}
          >
            <Ionicons name="document-text" size={24} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.text }]}>Report Templates</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
            onPress={() => navigation.navigate('ReportSettings')}
          >
            <Ionicons name="settings" size={24} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.text }]}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

        <PeriodModal />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 0,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  summarySection: {
    padding: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summarySubtitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summarySubtitleText: {
    fontSize: 12,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
  reportsSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  reportCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  reportSubtitle: {
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 14,
    marginLeft: 8,
  },
  reportPreview: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  periodOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  periodOptionText: {
    fontSize: 16,
  },
});

export default FinancialReportsScreen; 