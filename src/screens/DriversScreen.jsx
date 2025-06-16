import React, { useEffect, useState, useContext } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  StyleSheet, 
  Alert, 
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.0.73:3000';

export default function DriversScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDriverId, setExpandedDriverId] = useState(null);

  const fetchDrivers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
    setLoading(true);
    }
    
    try {
      const res = await fetch(`${API_URL}/users`, { 
        headers: { Authorization: `Bearer ${userToken}` } 
      });
      const data = await res.json();
      setDrivers(data.filter(u => u.role === 'transporter'));
    } catch (e) {
      console.error('fetchDrivers error:', e);
      Alert.alert('Error', 'Failed to load drivers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const deleteDriver = async (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this driver?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/users/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${userToken}` },
            });
            if (!res.ok) throw new Error('Failed to delete');
            setDrivers(prev => prev.filter(d => d.id !== id));
            Alert.alert('Success', 'Driver deleted successfully');
          } catch (e) {
            console.error('deleteDriver error:', e);
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpanded = (driverId) => {
    setExpandedDriverId(expandedDriverId === driverId ? null : driverId);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const renderDriverCard = ({ item }) => {
    const isExpanded = expandedDriverId === item.id;

  return (
      <View style={styles.driverCard}>
        <TouchableOpacity
          onPress={() => toggleExpanded(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.driverInfo}>
              <View style={styles.avatarContainer}>
                <MaterialCommunityIcons 
                  name="account" 
                  size={24} 
                  color="#007AFF" 
                />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{item.username}</Text>
                <Text style={styles.driverEmail}>{item.email}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <View style={styles.statusBadge}>
                <MaterialCommunityIcons name="check-circle" size={12} color="#34C759" />
                <Text style={styles.statusText}>Active</Text>
              </View>
              <MaterialCommunityIcons 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#C7C7CC" 
              />
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.driverMetrics}>
              <View style={styles.metricItem}>
                <MaterialCommunityIcons name="truck" size={16} color="#8E8E93" />
                <Text style={styles.metricLabel}>Driver ID</Text>
                <Text style={styles.metricValue}>{item.id.substring(0, 8).toUpperCase()}</Text>
              </View>
              <View style={styles.metricItem}>
                <MaterialCommunityIcons name="clock" size={16} color="#8E8E93" />
                <Text style={styles.metricLabel}>Joined</Text>
                <Text style={styles.metricValue}>
                  {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                </Text>
      </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => navigation.navigate('Create Driver', { driverId: item.id })}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#007AFF', '#0056CC']}
                  style={styles.actionGradient}
                >
                  <MaterialCommunityIcons name="pencil" size={16} color="#FFFFFF" />
                  <Text style={styles.actionText}>Edit Driver</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => deleteDriver(item.id)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FF3B30', '#CC2E24']}
                  style={styles.actionGradient}
                >
                  <MaterialCommunityIcons name="delete" size={16} color="#FFFFFF" />
                <Text style={styles.actionText}>Delete</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="truck-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No Drivers Found</Text>
      <Text style={styles.emptyText}>
        {searchQuery 
          ? `No drivers match "${searchQuery}"`
          : "Start by adding your first driver to the system"
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity 
          style={styles.emptyActionButton}
          onPress={() => navigation.navigate('Create Driver')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#007AFF', '#0056CC']}
            style={styles.emptyActionGradient}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.emptyActionText}>Add First Driver</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Drivers" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading drivers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Drivers" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchDrivers(true)} />
        }
      >
        {/* Visual Header */}
        <View style={styles.visualHeader}>
          <View style={styles.headerIconContainer}>
            <MaterialCommunityIcons name="account-group" size={48} color="#007AFF" />
          </View>
          <Text style={styles.headerTitle}>Driver Management</Text>
          <Text style={styles.headerSubtitle}>
            Manage your transportation team
          </Text>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{drivers.length}</Text>
            <Text style={styles.statLabel}>Total Drivers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{drivers.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search drivers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#C7C7CC"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Drivers List */}
        <View style={styles.driversSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Drivers ({filteredDrivers.length})
            </Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('Create Driver')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#34C759', '#28A745']}
                style={styles.addButtonGradient}
              >
                <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add Driver</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {filteredDrivers.length > 0 ? (
            <FlatList
              data={filteredDrivers}
              keyExtractor={item => item.id}
              renderItem={renderDriverCard}
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
    marginBottom: 24,
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

  // Search Section
  searchSection: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },

  // Drivers Section
  driversSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Driver Cards
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  driverEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  headerActions: {
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#34C759',
  },

  // Expanded Content
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    padding: 16,
  },
  driverMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  metricItem: {
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
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