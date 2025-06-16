// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';
import { listRoutes } from '../api/routes';
import { SafeAreaView } from 'react-native-safe-area-context';

const TAB_CONFIG = [
  {
    key: 'pending',
    label: 'Active Routes',
    icon: 'truck-fast',
    color: '#007AFF',
    description: 'Routes with pending shipments'
  },
  {
    key: 'past',
    label: 'Completed',
    icon: 'check-circle',
    color: '#34C759',
    description: 'Finished route deliveries'
  }
];

function RoutesScreen({ navigation, route }) {
  const { userToken, user } = useContext(AuthContext);
  // For transporters, default to their own routes if no explicit param provided
  let transporterId = route?.params?.transporterId;
  if (!transporterId && user?.role === 'transporter') {
    transporterId = user.id;
  }
  
  const [routes, setRoutes] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const onSelectRoute = route?.params?.onSelectRoute;
  const routeStarted = route?.params?.routeStarted;
  const selectedRouteId = route?.params?.selectedRouteId;

  const fetchRoutesData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const data = await listRoutes(userToken, transporterId);
      setRoutes(data);
    } catch (e) {
      console.error('Error loading routes:', e);
      Alert.alert('Error', 'Failed to load routes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRoutesData();
  }, [userToken, transporterId]);

  // Filter routes based on active tab
  const filteredRoutes = routes.filter(item =>
    activeTab === 'pending'
      ? item.RouteShipment?.some(rs => rs.status === 'PENDING')
      : !item.RouteShipment?.some(rs => rs.status === 'PENDING')
  );

  const getTabStats = () => {
    const pending = routes.filter(item => 
      item.RouteShipment?.some(rs => rs.status === 'PENDING')
    ).length;
    const completed = routes.length - pending;
    
    return { pending, completed };
  };

  const renderTabButton = (tab) => {
    const isActive = activeTab === tab.key;
    const stats = getTabStats();
    const count = tab.key === 'pending' ? stats.pending : stats.completed;
    
    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
        onPress={() => setActiveTab(tab.key)}
        activeOpacity={0.7}
      >
        <View style={styles.tabContent}>
          <View style={styles.tabHeader}>
            <MaterialCommunityIcons 
              name={tab.icon} 
              size={20} 
              color={isActive ? tab.color : '#8E8E93'} 
            />
            <View style={[styles.tabBadge, { backgroundColor: `${tab.color}15` }]}>
              <Text style={[styles.tabBadgeText, { color: tab.color }]}>
                {count}
              </Text>
            </View>
          </View>
          <Text style={[styles.tabLabel, isActive && { color: tab.color }]}>
            {tab.label}
          </Text>
          <Text style={styles.tabDescription}>
            {tab.description}
          </Text>
        </View>
        {isActive && (
          <View style={[styles.tabIndicator, { backgroundColor: tab.color }]} />
        )}
      </TouchableOpacity>
    );
  };

  const renderRouteCard = ({ item, index }) => {
    const isSelected = item.id === selectedRouteId;
    const isStarted = routeStarted && isSelected;
    const label = isStarted ? 'In Progress' : (isSelected ? 'Selected' : 'Select Route');
    const disabled = routeStarted || isSelected;
    
    const shipmentCount = item.RouteShipment?.length ?? 0;
    const completedCount = item.RouteShipment?.filter(rs => rs.status === 'COMPLETED').length ?? 0;
    const progressPercentage = shipmentCount > 0 ? (completedCount / shipmentCount) * 100 : 0;
    
    return (
      <View style={styles.routeCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('RouteDetail', { routeId: item.id })}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.routeInfo}>
              <Text style={styles.routeTitle}>
                Route #{(index + 1).toString().padStart(3, '0')}
              </Text>
              <Text style={styles.routeDate}>
                {new Date(item.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
          </View>

          <View style={styles.routeDetails}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>
                {item.User?.username || 'Unassigned'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="map-marker-multiple" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>
                {shipmentCount} stop{shipmentCount !== 1 ? 's' : ''}
              </Text>
            </View>
            
            {activeTab === 'past' && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#34C759" />
                <Text style={[styles.detailText, { color: '#34C759' }]}>
                  Completed
                </Text>
              </View>
            )}
          </View>

          {activeTab === 'pending' && shipmentCount > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressText}>
                  {completedCount}/{shipmentCount} completed
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${progressPercentage}%` }
                    ]} 
                  />
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {onSelectRoute && (
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                disabled && styles.actionButtonDisabled
              ]}
              disabled={disabled}
              onPress={() => {
                if (!disabled) {
                  Alert.alert(
                    'Begin this route?',
                    'Are you sure you want to begin this route?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Begin', 
                        style: 'default', 
                        onPress: () => {
                          onSelectRoute(item.id);
                          navigation.goBack();
                        } 
                      }
                    ]
                  );
                }
              }}
              activeOpacity={disabled ? 1 : 0.8}
            >
              <LinearGradient
                colors={disabled ? ['#C7C7CC', '#C7C7CC'] : ['#007AFF', '#0056CC']}
                style={styles.actionGradient}
              >
                <MaterialCommunityIcons 
                  name={isStarted ? "play" : (isSelected ? "check" : "play")} 
                  size={16} 
                  color="#FFFFFF" 
                />
                <Text style={styles.actionText}>{label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => {
    const tabConfig = TAB_CONFIG.find(tab => tab.key === activeTab);
    
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons 
          name={tabConfig?.icon || 'map-marker-off'} 
          size={64} 
          color="#C7C7CC" 
        />
        <Text style={styles.emptyTitle}>
          No {tabConfig?.label || 'Routes'} Found
        </Text>
        <Text style={styles.emptyText}>
          {activeTab === 'pending' 
            ? "No active routes with pending deliveries at the moment"
            : "No completed routes to display"
          }
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Routes" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading routes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = getTabStats();

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Routes" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchRoutesData(true)} />
        }
      >
        {/* Visual Header */}
        <View style={styles.visualHeader}>
          <View style={styles.headerIconContainer}>
            <MaterialCommunityIcons name="map-marker-path" size={48} color="#007AFF" />
          </View>
          <Text style={styles.headerTitle}>Route Management</Text>
          <Text style={styles.headerSubtitle}>
            Monitor and manage delivery routes
          </Text>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{routes.length}</Text>
            <Text style={styles.statLabel}>Total Routes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Enhanced Tab Header */}
        <View style={styles.tabContainer}>
          <Text style={styles.tabSectionTitle}>Route Status</Text>
          <View style={styles.tabRow}>
            {TAB_CONFIG.map(renderTabButton)}
          </View>
        </View>

        {/* Routes List */}
        <View style={styles.routesSection}>
          <Text style={styles.sectionTitle}>
            {TAB_CONFIG.find(tab => tab.key === activeTab)?.label} ({filteredRoutes.length})
          </Text>
          
          {filteredRoutes.length > 0 ? (
            <FlatList
              data={filteredRoutes}
              keyExtractor={item => item.id}
              renderItem={renderRouteCard}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            />
          ) : (
            renderEmptyState()
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F2F2F7' 
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },

  // Visual Header
  visualHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 20,
  },

  // Enhanced Tabs
  tabContainer: {
    marginBottom: 32,
  },
  tabSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tabButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  tabButtonActive: {
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E5EDFF',
  },
  tabContent: {
    alignItems: 'center',
  },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
    textAlign: 'center',
  },
  tabDescription: {
    fontSize: 11,
    color: '#C7C7CC',
    textAlign: 'center',
    lineHeight: 14,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },

  // Routes Section
  routesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },

  // Route Cards
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  routeDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  routeDetails: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#1C1C1E',
  },

  // Progress Section
  progressSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  progressText: {
    fontSize: 12,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 2,
  },

  // Card Footer
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    padding: 16,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Misc
  itemSeparator: {
    height: 8,
  },
}); 
// export default withScreenLayout(RoutesScreen, { title: 'Routes' });
export default RoutesScreen;
