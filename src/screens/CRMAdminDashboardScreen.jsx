import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { fetchNotifications } from '../api/notifications';
import { fetchCRMDashboard } from '../api/analytics';
import { fetchAuditLogs } from '../api/auditTrail';

const DashboardCard = ({ title, icon, children, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} disabled={!onPress}>
    <View style={styles.cardHeader}>
      <MaterialCommunityIcons name={icon} size={22} color="#4A5568" />
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <View style={styles.cardContent}>
      {children}
    </View>
  </TouchableOpacity>
);

const Metric = ({ label, value, icon, color = "#2D3748" }) => (
  <View style={styles.metric}>
    <MaterialCommunityIcons name={icon} size={20} color={color} style={styles.metricIcon} />
    <View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  </View>
);

const ListItem = ({ text, timestamp, icon }) => (
  <View style={styles.listItem}>
    <MaterialCommunityIcons name={icon} size={20} color="#718096" style={styles.listItemIcon} />
    <View style={{ flex: 1 }}>
      <Text style={styles.listItemText}>{text}</Text>
      {timestamp && <Text style={styles.listItemTimestamp}>{timestamp}</Text>}
    </View>
  </View>
);


const getAuditIcon = (action) => {
  switch (action?.toLowerCase()) {
    case 'create':
    case 'created':
      return 'plus-circle-outline';
    case 'update':
    case 'updated':
      return 'pencil-outline';
    case 'delete':
    case 'deleted':
      return 'delete-outline';
    case 'login':
      return 'login';
    case 'logout':
      return 'logout';
    default:
      return 'information-outline';
  }
};


function CRMAdminDashboardScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [msgUnreadCount, setMsgUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [recentAuditLogs, setRecentAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUnread = async () => {
    if (!userToken) return;
    try {
      const data = await fetchNotifications(userToken);
      setNotifUnreadCount(data.filter(n => n.type !== 'message' && !n.isRead).length);
      setMsgUnreadCount(data.filter(n => n.type === 'message' && !n.isRead).length);
    } catch (err) {
      console.error('Error loading unread counts:', err);
    }
  };

  const loadDashboardData = async () => {
    if (!userToken) return;
    try {
      const [dashData, auditData] = await Promise.all([
        fetchCRMDashboard(userToken),
        fetchAuditLogs(userToken, { category: 'CRM', limit: 5 })
      ]);
      setDashboardData(dashData);
      setRecentAuditLogs(auditData.logs || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnread();
    loadDashboardData();
  }, [userToken]);

  useFocusEffect(
    React.useCallback(() => {
      loadUnread();
      loadDashboardData();
    }, [userToken])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUnread(), loadDashboardData()]);
    setRefreshing(false);
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>CRM Administration</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity 
                style={styles.headerIconButton} 
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="bell-outline" size={20} color="white" />
                {notifUnreadCount > 0 && <View style={styles.badge} />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerIconButton} 
                onPress={() => navigation.navigate('Conversations')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="message-outline" size={20} color="white" />
                {msgUnreadCount > 0 && <View style={styles.badge} />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="account-circle" size={22} color="white" />
              </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="white"
            />
          }
        >
          <View style={styles.grid}>
            <DashboardCard title="CRM Users & Permissions" icon="account-group" onPress={() => navigation.navigate('Users')}>
              <Metric label="Total CRM Users" value={dashboardData?.users?.total || '0'} icon="account-multiple" />
              <Metric label="Pending Invites" value={dashboardData?.users?.pendingInvites || '0'} icon="email-outline" />
            </DashboardCard>

            <DashboardCard title="Sales Pipeline" icon="chart-donut-variant">
              <View style={styles.pipelineContainer}>
                <View style={[styles.pipelineStage, { height: '100%' }]}>
                  <Text style={styles.pipelineValue}>{dashboardData?.pipeline?.prospects || '0'}</Text>
                  <Text style={styles.pipelineLabel}>Prospects</Text>
                  <View style={[styles.pipelineBar, { backgroundColor: '#667EEA' }]} />
                </View>
                <View style={[styles.pipelineStage, { height: '75%' }]}>
                  <Text style={styles.pipelineValue}>{dashboardData?.pipeline?.qualified || '0'}</Text>
                  <Text style={styles.pipelineLabel}>Qualified</Text>
                  <View style={[styles.pipelineBar, { backgroundColor: '#ED8936' }]} />
                </View>
                <View style={[styles.pipelineStage, { height: '50%' }]}>
                  <Text style={styles.pipelineValue}>{dashboardData?.pipeline?.quotes || '0'}</Text>
                  <Text style={styles.pipelineLabel}>Quotes</Text>
                  <View style={[styles.pipelineBar, { backgroundColor: '#48BB78' }]} />
                </View>
                <View style={[styles.pipelineStage, { height: '25%' }]}>
                  <Text style={styles.pipelineValue}>{dashboardData?.pipeline?.won || '0'}</Text>
                  <Text style={styles.pipelineLabel}>Won</Text>
                  <View style={[styles.pipelineBar, { backgroundColor: '#F56565' }]} />
                </View>
              </View>
            </DashboardCard>

            <DashboardCard title="Key Metrics & KPIs" icon="chart-bar">
              <Metric label="Win Rate" value={dashboardData?.quotes?.winRate || '0%'} icon="trophy-outline" color="#48BB78" />
              <Metric label="Avg. Deal Size" value={dashboardData?.quotes?.avgDealSize || '$0'} icon="cash-multiple" color="#38B2AC" />
            </DashboardCard>

            <DashboardCard title="CRM Health" icon="shield-check">
              <Metric label="Active Accounts" value={dashboardData?.accounts?.active || '0'} icon="star-circle" color="#4299E1" />
              <Metric label="Total Accounts" value={dashboardData?.accounts?.total || '0'} icon="office-building" color="#48BB78" />
            </DashboardCard>
            
            <DashboardCard title="Support & Tasks" icon="heart-pulse">
                <Metric label="Open Tickets" value={dashboardData?.tickets?.open || '0'} icon="ticket-outline" color="#F56565" />
                <Metric label="Overdue Tasks" value={dashboardData?.tasks?.overdue || '0'} icon="clock-alert-outline" color="#ED8936" />
            </DashboardCard>

            <DashboardCard title="Recent CRM Activity" icon="history">
              {recentAuditLogs.length > 0 ? (
                recentAuditLogs.slice(0, 2).map((log, index) => (
                  <ListItem 
                    key={log.id || index}
                    text={`${log.user} ${log.action} ${log.entityType.toLowerCase()}`} 
                    timestamp={formatTimestamp(log.timestamp)} 
                    icon={getAuditIcon(log.action)} 
                  />
                ))
              ) : (
                <ListItem text="No recent activity" icon="information-outline" />
              )}
            </DashboardCard>
            
            <DashboardCard title="Alerts & Notifications" icon="bell-alert" onPress={() => navigation.navigate('Notifications')}>
              <ListItem 
                text={dashboardData?.tasks?.overdue > 0 ? `${dashboardData.tasks.overdue} overdue tasks` : 'No overdue tasks'} 
                icon="clock-alert-outline" 
              />
              <ListItem 
                text={dashboardData?.tickets?.open > 0 ? `${dashboardData.tickets.open} open tickets` : 'No open tickets'} 
                icon="ticket-outline" 
              />
            </DashboardCard>

            <DashboardCard title="Integration Status" icon="sync" onPress={() => navigation.navigate('IntegrationDashboard')}>
                <ListItem text="Email: Connected" icon="email-check" />
                <ListItem text="CRM API: Connected" icon="api" />
            </DashboardCard>
            
            <DashboardCard title="CRM Audit Log" icon="format-list-bulleted-square" onPress={() => navigation.navigate('AuditTrail')}>
              {recentAuditLogs.length > 0 ? (
                recentAuditLogs.slice(0, 2).map((log, index) => (
                  <ListItem 
                    key={`audit-${log.id || index}`}
                    text={`${log.action} on ${log.entityType}`} 
                    icon={getAuditIcon(log.action)} 
                  />
                ))
              ) : (
                <ListItem text="No recent audit activity" icon="information-outline" />
              )}
            </DashboardCard>

            <DashboardCard title="CRM Settings" icon="cog" onPress={() => navigation.navigate('Settings')}>
                <ListItem text="Manage CRM workflows" icon="sitemap" />
                <ListItem text="Configure lead stages" icon="pencil-box-outline" />
            </DashboardCard>

          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  grid: {
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginLeft: 8,
  },
  cardContent: {},
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricIcon: {
    marginRight: 10,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  metricLabel: {
    fontSize: 12,
    color: '#718096',
  },
  pipelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 10,
  },
  pipelineStage: {
    alignItems: 'center',
    width: '22%',
  },
  pipelineValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  pipelineLabel: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 2,
    marginBottom: 4,
  },
  pipelineBar: {
    width: '100%',
    flex: 1,
    borderRadius: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  listItemIcon: {
    marginRight: 12,
  },
  listItemText: {
    fontSize: 14,
    color: '#4A5568',
    flexShrink: 1,
  },
  listItemTimestamp: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default CRMAdminDashboardScreen; 