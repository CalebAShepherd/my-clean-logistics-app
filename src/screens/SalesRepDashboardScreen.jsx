import React, { useEffect, useContext, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { SafeAreaView } from 'react-native';
import { fetchNotifications } from '../api/notifications';
import { useFocusEffect } from '@react-navigation/native';
import { fetchLeads } from '../api/crm/leads';
import { fetchTasks } from '../api/crm/tasks';

function SalesRepDashboardScreen({ navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const { settings } = useSettings();
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [msgUnreadCount, setMsgUnreadCount] = useState(0);
  const [myLeadsCount, setMyLeadsCount] = useState(null);
  const [myTasksCount, setMyTasksCount] = useState(null);
  const [conversionRate, setConversionRate] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    if (!userToken || !user) return;

    try {
      const [leadsData, tasksData] = await Promise.allSettled([
        fetchLeads(),
        fetchTasks()
      ]);

      if (leadsData.status === 'fulfilled') {
        const myLeads = leadsData.value.filter(l => l.ownerId === user.id);
        const convertedLeads = myLeads.filter(l => l.status === 'CONVERTED');
        setMyLeadsCount(myLeads.length);
        setConversionRate(myLeads.length > 0 ? Math.round((convertedLeads.length / myLeads.length) * 100) : 0);
        setRecentLeads(myLeads.slice(0, 5));
      } else {
        console.error('Error loading leads:', leadsData.reason);
      }

      if (tasksData.status === 'fulfilled') {
        const myTasks = tasksData.value.filter(t => t.assigneeId === user.id && !t.completed);
        setMyTasksCount(myTasks.length);
      } else {
        console.error('Error loading tasks:', tasksData.reason);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useEffect(() => {
    if (userToken) {
      setLoadingStats(true);
      loadDashboardData().finally(() => {
        setLoadingStats(false);
      });
    }
  }, [userToken, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboardData(),
      loadUnread()
    ]);
    setRefreshing(false);
  };

  const loadUnread = async () => {
    try {
      const data = await fetchNotifications(userToken);
      setNotifUnreadCount(data.filter(n => n.type !== 'message' && !n.isRead).length);
      setMsgUnreadCount(data.filter(n => n.type === 'message' && !n.isRead).length);
    } catch (err) {
      console.error('Error loading unread counts:', err);
    }
  };

  useEffect(() => {
    if (userToken) loadUnread();
  }, [userToken]);

  useFocusEffect(
    React.useCallback(() => {
      if (userToken) loadUnread();
    }, [userToken])
  );

  useEffect(() => {
    if (!userToken) return;
    
    const interval = setInterval(() => {
      loadUnread();
    }, 5000);

    return () => clearInterval(interval);
  }, [userToken]);

  if (!settings) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <LinearGradient
      colors={['#34C759', '#30D158']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Dashboard</Text>
              <Text style={styles.headerSubtitle}>Sales Representative</Text>
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
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="white"
              colors={['#34C759']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                style={styles.statCardGradient}
              >
                <View style={styles.statContent}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="account-plus" size={28} color="#34C759" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>My Leads</Text>
                    {loadingStats ? (
                      <ActivityIndicator size="small" color="#34C759" />
                    ) : (
                      <Text style={styles.statNumber}>{myLeadsCount ?? '-'}</Text>
                    )}
                    <Text style={styles.statSub}>Active</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                style={styles.statCardGradient}
              >
                <View style={styles.statContent}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="clipboard-check" size={28} color="#FF9500" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>My Tasks</Text>
                    {loadingStats ? (
                      <ActivityIndicator size="small" color="#FF9500" />
                    ) : (
                      <Text style={styles.statNumber}>{myTasksCount ?? '-'}</Text>
                    )}
                    <Text style={styles.statSub}>Pending</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                style={styles.statCardGradient}
              >
                <View style={styles.statContent}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="chart-line" size={28} color="#007AFF" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>Conversion</Text>
                    {loadingStats ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <Text style={styles.statNumber}>{conversionRate ?? '-'}%</Text>
                    )}
                    <Text style={styles.statSub}>Rate</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                style={styles.statCardGradient}
              >
                <View style={styles.statContent}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="target" size={28} color="#5856D6" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>Goal</Text>
                    <Text style={styles.statNumber}>85%</Text>
                    <Text style={styles.statSub}>Target</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => navigation.navigate('LeadsPipeline')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                  style={styles.actionCardGradient}
                >
                  <MaterialCommunityIcons name="account-plus" size={32} color="#34C759" />
                  <Text style={styles.actionTitle}>My Pipeline</Text>
                  <Text style={styles.actionSubtitle}>Manage leads</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => navigation.navigate('TasksList')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                  style={styles.actionCardGradient}
                >
                  <MaterialCommunityIcons name="clipboard-check" size={32} color="#FF9500" />
                  <Text style={styles.actionTitle}>My Tasks</Text>
                  <Text style={styles.actionSubtitle}>Daily activities</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => navigation.navigate('AccountsList')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                  style={styles.actionCardGradient}
                >
                  <MaterialCommunityIcons name="domain" size={32} color="#007AFF" />
                  <Text style={styles.actionTitle}>Accounts</Text>
                  <Text style={styles.actionSubtitle}>Customer base</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => navigation.navigate('CreateLead')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                  style={styles.actionCardGradient}
                >
                  <MaterialCommunityIcons name="plus-circle" size={32} color="#5856D6" />
                  <Text style={styles.actionTitle}>New Lead</Text>
                  <Text style={styles.actionSubtitle}>Add prospect</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Leads */}
          {recentLeads.length > 0 && (
            <View style={styles.recentContainer}>
              <Text style={styles.sectionTitle}>Recent Leads</Text>
              {recentLeads.map((lead, index) => (
                <TouchableOpacity 
                  key={lead.id} 
                  style={styles.leadCard}
                  onPress={() => navigation.navigate('LeadDetail', { id: lead.id })}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                    style={styles.leadCardGradient}
                  >
                    <View style={styles.leadContent}>
                      <View style={styles.leadInfo}>
                        <Text style={styles.leadName}>{lead.firstName} {lead.lastName}</Text>
                        <Text style={styles.leadCompany}>{lead.companyName || 'No company'}</Text>
                        <Text style={styles.leadStatus}>Status: {lead.status}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
  },
  statCardGradient: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    marginRight: 15,
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginTop: 2,
  },
  statSub: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  actionsContainer: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    marginBottom: 15,
  },
  actionCardGradient: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginTop: 10,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  recentContainer: {
    marginTop: 20,
  },
  leadCard: {
    marginBottom: 10,
  },
  leadCardGradient: {
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  leadContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1D1D1F',
  },
  leadCompany: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  leadStatus: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 4,
    fontWeight: '600',
  },
});

export default SalesRepDashboardScreen; 