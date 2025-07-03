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
import { facilityMaintenanceAPI } from '../api/facilityMaintenance';
import { AuthContext } from '../context/AuthContext';

const FacilityMaintenanceScreen = ({ navigation, route }) => {
  const { facilityId, facilityName } = route.params || {};
  const { userToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({});

  useEffect(() => {
    loadDashboardData();
  }, [facilityId]);

  const loadDashboardData = async () => {
    try {
      const data = await facilityMaintenanceAPI.getDashboardData(facilityId, userToken);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', `Error loading dashboard data: ${error}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleModulePress = (screen, params = {}) => {
    navigation.navigate(screen, { facilityId, facilityName, ...params });
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
    if (!analyticsData.maintenance) return null;

    const { maintenance, compliance, safety, environmental } = analyticsData;

    return (
      <View style={styles.kpiContainer}>
        {/* Maintenance KPIs */}
        <TouchableOpacity 
          style={styles.kpiCard} 
          onPress={() => handleModulePress('FacilityMaintenanceLogs')}
        >
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.kpiGradient}
          >
            <MaterialCommunityIcons name="wrench" size={24} color="white" />
            <Text style={styles.kpiValue}>{maintenance.totalLogs || 0}</Text>
            <Text style={styles.kpiLabel}>Maintenance Logs</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Compliance KPIs */}
        <TouchableOpacity 
          style={styles.kpiCard} 
          onPress={() => handleModulePress('FacilityCompliance')}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.kpiGradient}
          >
            <MaterialCommunityIcons name="shield-check" size={24} color="white" />
            <Text style={styles.kpiValue}>{compliance.overdueCount || 0}</Text>
            <Text style={styles.kpiLabel}>Overdue Items</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Safety KPIs */}
        <TouchableOpacity 
          style={styles.kpiCard} 
          onPress={() => handleModulePress('SafetyIncidents')}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.kpiGradient}
          >
            <MaterialCommunityIcons name="alert-circle" size={24} color="white" />
            <Text style={styles.kpiValue}>{safety.recentIncidents || 0}</Text>
            <Text style={styles.kpiLabel}>Recent Incidents</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Environmental KPIs */}
        <TouchableOpacity 
          style={styles.kpiCard} 
          onPress={() => handleModulePress('EnvironmentalMonitoring')}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={styles.kpiGradient}
          >
            <MaterialCommunityIcons name="leaf" size={24} color="white" />
            <Text style={styles.kpiValue}>{environmental.alertsCount || 0}</Text>
            <Text style={styles.kpiLabel}>Env. Alerts</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMaintenanceStatus = () => {
    if (!analyticsData.maintenance?.byStatus) return null;

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Maintenance Status</Text>
        <View style={styles.statusCard}>
          {analyticsData.maintenance.byStatus.map((item, index) => (
            <View key={index} style={styles.statusItem}>
              <View style={styles.statusInfo}>
                <StatusBadge 
                  status={item.status} 
                  color={getStatusColor(item.status)}
                />
                <Text style={styles.statusLabel}>{item.status.replace('_', ' ')}</Text>
              </View>
              <Text style={styles.statusCount}>{item.count}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderComplianceOverview = () => {
    if (!analyticsData.compliance?.byStatus) return null;

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Compliance Overview</Text>
        <View style={styles.statusCard}>
          {analyticsData.compliance.byStatus.map((item, index) => (
            <View key={index} style={styles.statusItem}>
              <View style={styles.statusInfo}>
                <StatusBadge 
                  status={item.status} 
                  color={getStatusColor(item.status)}
                />
                <Text style={styles.statusLabel}>{item.status.replace('_', ' ')}</Text>
              </View>
              <Text style={styles.statusCount}>{item.count}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderQuickActions = () => {
    const actions = [
      {
        id: 'maintenance-logs',
        title: 'Maintenance Logs',
        subtitle: 'View and manage facility maintenance',
        icon: 'construct',
        colors: ['#3B82F6', '#1D4ED8'],
        screen: 'FacilityMaintenanceLogs'
      },
      {
        id: 'compliance-tracking',
        title: 'Compliance Tracking',
        subtitle: 'Monitor regulatory compliance',
        icon: 'shield-checkmark',
        colors: ['#10B981', '#059669'],
        screen: 'FacilityCompliance'
      },
      {
        id: 'safety-incidents',
        title: 'Safety Incidents',
        subtitle: 'Report and track safety incidents',
        icon: 'warning',
        colors: ['#F59E0B', '#D97706'],
        screen: 'SafetyIncidents'
      },
      {
        id: 'environmental',
        title: 'Environmental Monitoring',
        subtitle: 'Track environmental parameters',
        icon: 'leaf',
        colors: ['#8B5CF6', '#7C3AED'],
        screen: 'EnvironmentalMonitoring'
      },
      {
        id: 'compliance-audits',
        title: 'Compliance Audits',
        subtitle: 'Schedule and track audits',
        icon: 'clipboard',
        colors: ['#EF4444', '#DC2626'],
        screen: 'ComplianceAudits'
      },
      {
        id: 'analytics',
        title: 'Analytics & Reports',
        subtitle: 'View detailed analytics',
        icon: 'analytics',
        colors: ['#6366F1', '#4F46E5'],
        screen: 'FacilityMaintenanceAnalytics'
      }
    ];

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              onPress={() => handleModulePress(action.screen)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={action.colors}
                style={styles.actionGradient}
              >
                <Ionicons name={action.icon} size={32} color="white" />
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader 
          navigation={navigation} 
          title={facilityName ? `${facilityName} - Maintenance` : "Facility Maintenance"} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title={facilityName ? `${facilityName} - Maintenance` : "Facility Maintenance"}
        rightIcons={[
          {
            icon: 'add',
            onPress: () => handleModulePress('CreateMaintenanceLog'),
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

        {/* Maintenance Status */}
        {renderMaintenanceStatus()}

        {/* Compliance Overview */}
        {renderComplianceOverview()}

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
    alignItems: 'center',
    backgroundColor: '#F3F4F6'
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
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12
  },
  kpiCard: {
    flex: 1,
    minWidth: '46%',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  kpiGradient: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 120
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginTop: 8,
    marginBottom: 4
  },
  kpiLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center'
  },

  // Sections
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 20
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16
  },

  // Status Cards
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  statusLabel: {
    fontSize: 16,
    color: '#374151',
    textTransform: 'capitalize'
  },
  statusCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827'
  },

  // Quick Actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  actionCard: {
    flex: 1,
    minWidth: '46%',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  actionGradient: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 140
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center'
  },
  actionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center'
  }
});

export default FacilityMaintenanceScreen; 