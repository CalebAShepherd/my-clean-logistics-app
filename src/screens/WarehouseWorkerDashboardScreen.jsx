import React, { useEffect, useContext, useState, useCallback } from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Platform, 
  RefreshControl,
  Alert,
  Vibration,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { LineChart } from 'react-native-chart-kit';
import QuickScanner from '../components/QuickScanner';
import { fetchNotifications } from '../api/notifications';
import { getApiUrl } from '../utils/apiHost';

const { width } = Dimensions.get('window');

const API_URL = getApiUrl();

function WarehouseWorkerDashboardScreen({ navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const { settings } = useSettings();
  
  // Dashboard Stats
  const [stats, setStats] = useState({
    pendingTasks: 0,
    completedToday: 0,
    inProgressTasks: 0,
    productivity: 0
  });
  
  // Tasks
  const [myTasks, setMyTasks] = useState([]);
  const [priorityTasks, setPriorityTasks] = useState([]);
  
  // Performance
  const [performanceData, setPerformanceData] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Messages
  const [msgUnreadCount, setMsgUnreadCount] = useState(0);
  
  // Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState('general'); // 'general', 'pick', 'receive', 'count'

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      const [tasksResponse, statsResponse, performanceResponse] = await Promise.allSettled([
        fetch(`${API_URL}/warehouse-worker/my-tasks`, {
          headers: { Authorization: `Bearer ${userToken}` }
        }),
        fetch(`${API_URL}/warehouse-worker/stats`, {
          headers: { Authorization: `Bearer ${userToken}` }
        }),
        fetch(`${API_URL}/warehouse-worker/performance`, {
          headers: { Authorization: `Bearer ${userToken}` }
        })
      ]);

      // Handle tasks
      if (tasksResponse.status === 'fulfilled' && tasksResponse.value.ok) {
        const tasksData = await tasksResponse.value.json();
        setMyTasks(tasksData.all || []);
        setPriorityTasks(tasksData.priority || []);
      }

      // Handle stats
      if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
        const statsData = await statsResponse.value.json();
        setStats(statsData);
      }

      // Handle performance
      if (performanceResponse.status === 'fulfilled' && performanceResponse.value.ok) {
        const perfData = await performanceResponse.value.json();
        setPerformanceData(perfData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboardData(),
      loadMsgUnread()
    ]);
    setRefreshing(false);
  };

  const loadMsgUnread = async () => {
    try {
      const data = await fetchNotifications(userToken);
      setMsgUnreadCount(data.filter(n => n.type === 'message' && !n.isRead).length);
    } catch (err) {
      console.error('Error loading message unread count:', err);
    }
  };

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      if (userToken) {
        setLoading(true);
        loadDashboardData().finally(() => setLoading(false));
        loadMsgUnread();
      }
    }, [userToken])
  );

  // Poll for message updates every 5 seconds when screen is focused
  useEffect(() => {
    if (!userToken) return;
    
    const interval = setInterval(() => {
      loadMsgUnread();
    }, 5000);

    return () => clearInterval(interval);
  }, [userToken]);

  // Handle barcode scan
  const handleBarCodeScanned = async ({ type, data, mode }) => {
    setShowScanner(false);
    Vibration.vibrate(100);

    try {
      // Determine action based on scan mode and barcode data
      const response = await fetch(`${API_URL}/warehouse-worker/process-scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barcode: data,
          scanMode: mode || scanMode,
          type: type
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Scan result:', result); // Debug log
        
        if (result.action) {
          switch (result.action) {
            case 'navigate':
              console.log('Navigating to:', result.screen, 'with params:', result.params); // Debug log
              try {
                // Map some screens to available warehouse worker screens
                let targetScreen = result.screen;
                let params = result.params;
                
                if (result.screen === 'Pick Lists' || result.screen === 'ReceivingManagement' || 
                    result.screen === 'PutAwayManagement' || result.screen === 'MobileCycleCount') {
                  // For now, navigate to Tasks screen with additional info
                  targetScreen = 'Tasks';
                  Alert.alert(
                    result.screen.replace(/([A-Z])/g, ' $1').trim(),
                    `Scanned item/location details:\n${JSON.stringify(params, null, 2)}\n\nNavigating to Tasks screen...`
                  );
                } else if (result.screen === 'Location Detail') {
                  // Show location info in alert for now
                  Alert.alert(
                    'Location Information',
                    `Location ID: ${params.locationId}\n\nThis feature will be available in the full warehouse management system.`
                  );
                  return; // Don't navigate
                }
                
                navigation.navigate(targetScreen, params);
              } catch (navigationError) {
                console.error('Navigation error:', navigationError);
                Alert.alert('Navigation Error', `Could not navigate to ${result.screen}. This feature is not yet available for warehouse workers.`);
              }
              break;
            case 'quickAction':
              await handleQuickAction(result);
              break;
            case 'showInfo':
              Alert.alert(result.title, result.message);
              break;
            default:
              Alert.alert('Unknown Action', `Action: ${result.action}`);
              break;
          }
        } else {
          Alert.alert('No Action', 'No action specified in scan result');
        }
        
        // Refresh dashboard data
        loadDashboardData();
      } else {
        const errorText = await response.text();
        console.error('Scan error response:', errorText);
        Alert.alert('Scan Error', 'Could not process the scanned barcode');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process scan');
      console.error('Scan processing error:', error);
    }
  };

  const handleQuickAction = async (actionData) => {
    // Handle quick actions like marking tasks complete, updating quantities, etc.
    Alert.alert(
      actionData.title,
      actionData.message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/warehouse-worker/quick-action`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${userToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(actionData)
              });
              loadDashboardData();
            } catch (error) {
              Alert.alert('Error', 'Failed to complete action');
            }
          }
        }
      ]
    );
  };

  const TaskCard = ({ task, onPress }) => {
    const getTaskIcon = (type) => {
      switch (type) {
        case 'PICK': return 'package-down';
        case 'PUTAWAY': return 'package-up';
        case 'RECEIVE': return 'truck-delivery';
        case 'COUNT': return 'counter';
        case 'PACK': return 'package-variant-closed';
        default: return 'clipboard-check';
      }
    };

    const getTaskColor = (priority) => {
      switch (priority) {
        case 'HIGH': return '#FF3B30';
        case 'MEDIUM': return '#FF9500';
        case 'LOW': return '#34C759';
        default: return '#007AFF';
      }
    };

    return (
      <TouchableOpacity style={styles.taskCard} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.taskHeader}>
          <View style={[styles.taskIcon, { backgroundColor: getTaskColor(task.priority) }]}>
            <MaterialCommunityIcons name={getTaskIcon(task.type)} size={20} color="white" />
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskSubtitle}>{task.location}</Text>
          </View>
          <View style={styles.taskMeta}>
            <Text style={[styles.taskPriority, { color: getTaskColor(task.priority) }]}>
              {task.priority}
            </Text>
            <Text style={styles.taskTime}>{task.estimatedTime}</Text>
          </View>
        </View>
        {task.items && task.items > 0 && (
          <Text style={styles.taskItems}>{task.items} items</Text>
        )}
      </TouchableOpacity>
    );
  };

  const QuickActionButton = ({ icon, title, onPress, color = '#007AFF' }) => (
    <TouchableOpacity style={[styles.quickActionButton, { borderColor: color }]} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={[styles.quickActionText, { color }]}>{title}</Text>
    </TouchableOpacity>
  );



  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!settings || !settings.hasWarehouses) return null;

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Dashboard</Text>
              <Text style={styles.headerSubtitle}>{user?.username || 'Warehouse Worker'}</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity 
                style={styles.headerIconButton} 
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="bell-outline" size={20} color="white" />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: 'rgba(255, 59, 48, 0.9)' }]}>
                <MaterialCommunityIcons name="clipboard-list" size={24} color="white" />
                <Text style={styles.statNumber}>{stats.pendingTasks}</Text>
                <Text style={styles.statLabel}>Pending Tasks</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: 'rgba(52, 199, 89, 0.9)' }]}>
                <MaterialCommunityIcons name="check-circle" size={24} color="white" />
                <Text style={styles.statNumber}>{stats.completedToday}</Text>
                <Text style={styles.statLabel}>Completed Today</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: 'rgba(0, 122, 255, 0.9)' }]}>
                <MaterialCommunityIcons name="play-circle-outline" size={24} color="white" />
                <Text style={styles.statNumber}>{stats.inProgressTasks}</Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: 'rgba(255, 149, 0, 0.9)' }]}>
                <MaterialCommunityIcons name="trending-up" size={24} color="white" />
                <Text style={styles.statNumber}>{stats.productivity}%</Text>
                <Text style={styles.statLabel}>Productivity</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <QuickActionButton 
                icon="barcode-scan" 
                title="Scan Item" 
                color="#007AFF"
                onPress={() => setShowScanner(true)}
              />
              <QuickActionButton 
                icon="package-down" 
                title="Pick Tasks" 
                color="#34C759"
                onPress={() => navigation.navigate('PickLists')}
              />
              <QuickActionButton 
                icon="truck-delivery" 
                title="Receiving" 
                color="#FF9500"
                onPress={() => navigation.navigate('ReceivingManagement')}
              />
              <QuickActionButton 
                icon="counter" 
                title="Cycle Count" 
                color="#5856D6"
                onPress={() => navigation.navigate('MobileCycleCount')}
              />
              <QuickActionButton 
                icon="package-up" 
                title="Put Away" 
                color="#FF3B30"
                onPress={() => navigation.navigate('PutAwayManagement')}
              />
              <QuickActionButton 
                icon="package-variant-closed" 
                title="Packing" 
                color="#AF52DE"
                onPress={() => navigation.navigate('PackingManagement')}
              />
            </View>
          </View>

          {/* Priority Tasks */}
          {priorityTasks.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Priority Tasks</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AllTasks')}>
                  <Text style={styles.sectionLink}>View All</Text>
                </TouchableOpacity>
              </View>
              {priorityTasks.slice(0, 3).map((task, index) => (
                <TaskCard 
                  key={task.id || index} 
                  task={task} 
                  onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                />
              ))}
            </View>
          )}

          {/* My Tasks */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Tasks</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
                <Text style={styles.sectionLink}>View All ({myTasks.length})</Text>
              </TouchableOpacity>
            </View>
            
            {myTasks.length === 0 ? (
              <View style={styles.emptyTasksContainer}>
                <MaterialCommunityIcons name="clipboard-check-outline" size={48} color="rgba(0,0,0,0.5)" />
                <Text style={styles.emptyTasksText}>No tasks assigned</Text>
                <Text style={styles.emptyTasksSubtext}>Check back later or contact your supervisor</Text>
              </View>
            ) : (
              myTasks.slice(0, 5).map((task, index) => (
                <TaskCard 
                  key={task.id || index} 
                  task={task} 
                  onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                />
              ))
            )}
          </View>

          {/* Performance Chart */}
          {performanceData && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Your Performance</Text>
              <View style={styles.chartContainer}>
                <LineChart
                  data={performanceData}
                  width={width}
                  height={200}
                  chartConfig={{
                    backgroundColor: '#fff',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: { borderRadius: 12 },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#007AFF'
                    },
                    formatXLabel: (value) => {
                      // Format dates to be shorter to prevent overlap
                      if (value.includes('/')) {
                        const parts = value.split('/');
                        return `${parts[1]}/${parts[2]?.slice(-2) || parts[0]}`;
                      }
                      return value.length > 5 ? value.substring(0, 5) : value;
                    },
                    propsForLabels: {
                      fontSize: 10,
                    }
                  }}
                  bezier
                  style={styles.chart}
                  fromZero={true}
                  segments={4}
                />
              </View>
            </View>
          )}

          {/* Safety Reminder */}
          <View style={[styles.sectionContainer, styles.safetyContainer]}>
            <View style={styles.safetyHeader}>
              <MaterialCommunityIcons name="shield-check" size={24} color="#34C759" />
              <Text style={styles.safetyTitle}>Safety First</Text>
            </View>
            <Text style={styles.safetyText}>
              Remember to follow all safety protocols. Report any hazards immediately.
            </Text>
          </View>
        </ScrollView>

        {/* Scanner Modal */}
        <QuickScanner
          visible={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleBarCodeScanned}
          title="Scan Barcode"
          mode={scanMode}
          onModeChange={setScanMode}
        />
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
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
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
    marginLeft: 12,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  
  // Stats
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'white',
    marginTop: 4,
    textAlign: 'center',
  },

  // Sections
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    color: 'black',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 10,
  },
  sectionLink: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.8)',
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },

  // Tasks
  taskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
    marginLeft: 12,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  taskSubtitle: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.7)',
    marginTop: 2,
  },
  taskMeta: {
    alignItems: 'flex-end',
  },
  taskPriority: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  taskItems: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    marginLeft: 48,
  },

  // Empty States
  emptyTasksContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTasksText: {
    fontSize: 16,
    color: 'black',
    marginTop: 16,
  },
  emptyTasksSubtext: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.7)',
    marginTop: 4,
    textAlign: 'center',
  },

  // Chart
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    // padding: 12,
    marginLeft: 0,
    overflow: 'hidden',
    width: '100%',
  },
  chart: {
    borderRadius: 12,
    // marginVertical: 8,
    marginLeft: -40,
  },

  // Safety
  safetyContainer: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    borderColor: 'rgba(52, 199, 89, 0.5)',
    borderWidth: 1,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  safetyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },


});

export default WarehouseWorkerDashboardScreen; 