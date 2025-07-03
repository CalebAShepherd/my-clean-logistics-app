import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import InternalHeader from '../components/InternalHeader';
import { complianceReportingAPI } from '../api/complianceReporting';
import { formatDate } from '../utils/formatDate';

const { width } = Dimensions.get('window');

const ComplianceDashboardScreen = ({ navigation }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('MONTHLY');

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await complianceReportingAPI.getDashboard({ period });
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const updatePeriod = (newPeriod) => {
    setPeriod(newPeriod);
  };

  const getPeriodLabel = () => {
    switch(period) {
      case 'MONTHLY': return 'Monthly View';
      case 'QUARTERLY': return 'Quarterly View';
      case 'ANNUAL': return 'Annual View';
      default: return 'Monthly View';
    }
  };

  const renderStatCard = (title, value, icon, color, onPress) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.statCardContent}>
        <View style={styles.statCardHeader}>
          <Text style={styles.statCardTitle}>{title}</Text>
          <Icon name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderStatusChart = (title, data, colors) => (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartContent}>
        {Object.entries(data || {}).map(([status, count], index) => (
          <View key={status} style={styles.chartItem}>
            <View style={[styles.chartIndicator, { backgroundColor: colors[index % colors.length] }]} />
            <Text style={styles.chartLabel}>{status.replace('_', ' ')}</Text>
            <Text style={styles.chartValue}>{count}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderRecentReports = () => (
    <View style={styles.recentCard}>
      <Text style={styles.recentTitle}>Recent Reports</Text>
      {dashboardData?.recentReports?.length > 0 ? (
        dashboardData.recentReports.map((report) => (
          <TouchableOpacity
            key={report.id}
            style={styles.recentItem}
            onPress={() => navigation.navigate('ComplianceReports', { reportId: report.id })}
          >
            <View style={styles.recentItemContent}>
              <Text style={styles.recentItemTitle}>{report.title}</Text>
              <Text style={styles.recentItemSubtitle}>
                {report.reportType.replace('_', ' ')} • {formatDate(report.createdAt)}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(report.status) }
            ]}>
              <Text style={styles.statusText}>{report.status}</Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>No recent reports</Text>
      )}
    </View>
  );

  const renderUpcomingReminders = () => (
    <View style={styles.recentCard}>
      <Text style={styles.recentTitle}>Upcoming Reminders</Text>
      {dashboardData?.upcomingReminders?.length > 0 ? (
        dashboardData.upcomingReminders.map((reminder) => (
          <TouchableOpacity key={reminder.id} style={styles.reminderItem}>
            <Icon name="bell-outline" size={20} color="#f39c12" />
            <View style={styles.reminderContent}>
              <Text style={styles.reminderTitle}>{reminder.document?.title}</Text>
              <Text style={styles.reminderDate}>
                Due: {formatDate(reminder.reminderDate)}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>No upcoming reminders</Text>
      )}
    </View>
  );

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: '#95a5a6',
      GENERATED: '#3498db',
      REVIEWED: '#f39c12',
      APPROVED: '#27ae60',
      ARCHIVED: '#7f8c8d'
    };
    return colors[status] || '#95a5a6';
  };

  if (loading && !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Compliance Dashboard" />
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >

        {/* Time Period Selector */}
        <View style={styles.timeRangeContainer}>
          <Text style={styles.sectionTitle}>Time Period</Text>
          <View style={styles.timeRangeButtons}>
            {[
              { key: 'MONTHLY', label: 'Monthly' },
              { key: 'QUARTERLY', label: 'Quarterly' },
              { key: 'ANNUAL', label: 'Annual' }
            ].map(periodOption => (
              <TouchableOpacity
                key={periodOption.key}
                style={[styles.timeButton, period === periodOption.key && styles.timeButtonActive]}
                onPress={() => updatePeriod(periodOption.key)}
                activeOpacity={0.7}
              >
                {period === periodOption.key && (
                  <LinearGradient
                    colors={['#3498db', '#2980b9']}
                    style={styles.timeButtonGradient}
                  />
                )}
                <Text style={[styles.timeButtonText, period === periodOption.key && styles.timeButtonTextActive]}>
                  {periodOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.selectedRange}>{getPeriodLabel()}</Text>
        </View>

        <View style={styles.statsGrid}>
          {renderStatCard(
            'SOX Controls',
            dashboardData?.soxControls?.total || 0,
            'shield-check',
            '#3498db',
            () => navigation.navigate('SoxControls')
          )}
          {renderStatCard(
            'SOX Tests',
            dashboardData?.soxTests?.total || 0,
            'test-tube',
            '#e74c3c',
            () => navigation.navigate('SoxTests')
          )}
          {renderStatCard(
            'Insurance Claims',
            dashboardData?.insuranceClaims?.total || 0,
            'shield-account',
            '#f39c12',
            () => navigation.navigate('InsuranceClaims')
          )}
          {renderStatCard(
            'Documents',
            dashboardData?.documents?.total || 0,
            'file-document',
            '#27ae60',
            () => navigation.navigate('DocumentManagement')
          )}
        </View>

        <View style={styles.chartsContainer}>
          {renderStatusChart(
            'SOX Controls by Status',
            dashboardData?.soxControls?.byStatus,
            ['#3498db', '#27ae60', '#f39c12', '#e74c3c']
          )}
          {renderStatusChart(
            'SOX Tests by Result',
            dashboardData?.soxTests?.byResult,
            ['#27ae60', '#e74c3c', '#f39c12']
          )}
        </View>

        <View style={styles.recentContainer}>
          {renderRecentReports()}
          {renderUpcomingReminders()}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('DocumentUpload')}
            >
              <Icon name="upload" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Upload Document</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('GenerateReport')}
            >
              <Icon name="file-chart" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Generate Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('RiskAssessment')}
            >
              <Icon name="alert-circle" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Risk Assessment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },

  // Section Titles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginVertical: 16,
    textAlign: 'center',
  },

  // Time Range Section
  timeRangeContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },

  timeRangeButtons: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },

  timeButton: {
    flex: 1,
    position: 'relative',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },

  timeButtonActive: {
    elevation: 2,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  timeButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },

  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    zIndex: 1,
  },

  timeButtonTextActive: {
    color: 'white',
  },

  selectedRange: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '500',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderLeftWidth: 4,
    width: (width - 48) / 2,
  },
  statCardContent: {
    flex: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardTitle: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  chartsContainer: {
    paddingHorizontal: 16,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  chartContent: {
    flex: 1,
  },
  chartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  chartIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  chartLabel: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    textTransform: 'capitalize',
  },
  chartValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  recentContainer: {
    paddingHorizontal: 16,
  },
  recentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  recentItemContent: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  recentItemSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  reminderContent: {
    flex: 1,
    marginLeft: 12,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  reminderDate: {
    fontSize: 12,
    color: '#f39c12',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingVertical: 20,
  },
  quickActions: {
    padding: 16,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
});

export default ComplianceDashboardScreen; 