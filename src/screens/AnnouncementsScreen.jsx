import React, { useContext, useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import InternalHeader from '../components/InternalHeader';
import { fetchAnnouncements } from '../api/announcements';
import { AuthContext } from '../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ROLE_CONFIG = {
  client: { 
    icon: 'account-group', 
    color: '#007AFF', 
    label: 'Clients',
    lightColor: '#EAF4FF'
  },
  transporter: { 
    icon: 'truck', 
    color: '#FF9500', 
    label: 'Transporters',
    lightColor: '#FFF3E8'
  },
  warehouse_admin: { 
    icon: 'warehouse', 
    color: '#34C759', 
    label: 'Warehouse',
    lightColor: '#E8F8EA'
  },
  dispatcher: { 
    icon: 'clipboard-list', 
    color: '#AF52DE', 
    label: 'Dispatchers',
    lightColor: '#F3EAFF'
  },
  all: { 
    icon: 'earth', 
    color: '#FF3B30', 
    label: 'Everyone',
    lightColor: '#FFE8E8'
  },
  individual: { 
    icon: 'account', 
    color: '#8E8E93', 
    label: 'Individual',
    lightColor: '#F2F2F7'
  }
};

const FILTER_TABS = [
  { id: 'all', label: 'All', icon: 'view-grid' },
  { id: 'client', label: 'Clients', icon: 'account-group' },
  { id: 'transporter', label: 'Transport', icon: 'truck' },
  { id: 'warehouse_admin', label: 'Warehouse', icon: 'warehouse' },
  { id: 'dispatcher', label: 'Dispatch', icon: 'clipboard-list' }
];

export default function AnnouncementsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    loadAnnouncements();
  }, [userToken]);

  useEffect(() => {
    applyFilters();
  }, [announcements, searchQuery, activeFilter]);

  const loadAnnouncements = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchAnnouncements(userToken);
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const applyFilters = () => {
    let filtered = [...announcements];

    // Apply role filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(item => {
        const roles = item.roles && item.roles.length ? item.roles : ['all'];
        return roles.includes(activeFilter);
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        (item.message && item.message.toLowerCase().includes(query))
      );
    }

    setFilteredAnnouncements(filtered);
  };

  const onRefresh = () => {
    loadAnnouncements(true);
  };

  const getAnnouncementConfig = (item) => {
    const roles = item.roles && item.roles.length ? item.roles : item.userId ? ['individual'] : ['all'];
    const primaryRole = item.userId ? 'individual' : roles.length === 1 ? roles[0] : 'all';
    return ROLE_CONFIG[primaryRole] || ROLE_CONFIG.all;
  };

  const formatTime = (createdAt) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderFilterTab = ({ item }) => {
    const isActive = activeFilter === item.id;
    const count = item.id === 'all' 
      ? announcements.length 
      : announcements.filter(ann => {
          const roles = ann.roles && ann.roles.length ? ann.roles : ['all'];
          return roles.includes(item.id);
        }).length;

    return (
      <TouchableOpacity
        style={[styles.filterTab, isActive && styles.filterTabActive]}
        onPress={() => setActiveFilter(item.id)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons 
          name={item.icon} 
          size={16} 
          color={isActive ? '#FFFFFF' : '#8E8E93'} 
        />
        <Text style={[
          styles.filterTabText,
          isActive && styles.filterTabTextActive
        ]}>
          {item.label}
        </Text>
        {count > 0 && (
          <View style={[
            styles.filterBadge,
            isActive && styles.filterBadgeActive
          ]}>
            <Text style={[
              styles.filterBadgeText,
              isActive && styles.filterBadgeTextActive
            ]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderAnnouncementCard = ({ item, index }) => {
    const config = getAnnouncementConfig(item);
    const timeAgo = formatTime(item.createdAt);
    
    return (
      <View style={[styles.announcementCard, index === 0 && styles.firstCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.roleIconContainer, { backgroundColor: config.lightColor }]}>
            <MaterialCommunityIcons 
              name={config.icon} 
              size={20} 
              color={config.color} 
            />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.announcementTitle}>{item.title}</Text>
            <View style={styles.roleTimeContainer}>
              <View style={[styles.roleBadge, { backgroundColor: config.color + '20' }]}>
                <MaterialCommunityIcons 
                  name={config.icon} 
                  size={12} 
                  color={config.color} 
                />
                <Text style={[styles.roleText, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
              <Text style={styles.timeText}>{timeAgo}</Text>
            </View>
          </View>
        </View>

        {item.message && (
          <Text style={styles.announcementMessage}>{item.message}</Text>
        )}

        <View style={styles.cardFooter}>
          <MaterialCommunityIcons name="clock-outline" size={14} color="#C7C7CC" />
          <Text style={styles.fullTimeText}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Visual Header Section */}
      <View style={styles.visualHeader}>
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons name="bullhorn" size={48} color="#007AFF" />
        </View>
        <Text style={styles.headerTitle}>Announcements</Text>
        <Text style={styles.headerSubtitle}>
          Stay updated with important company news and updates
        </Text>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{announcements.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {announcements.filter(ann => {
              const date = new Date(ann.createdAt);
              const now = new Date();
              const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
              return diffInDays <= 7;
            }).length}
          </Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search announcements..."
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          data={FILTER_TABS}
          renderItem={renderFilterTab}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Results Header */}
      {(searchQuery.length > 0 || activeFilter !== 'all') && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsText}>
            {filteredAnnouncements.length} result{filteredAnnouncements.length !== 1 ? 's' : ''} 
            {searchQuery.length > 0 && ` for "${searchQuery}"`}
            {activeFilter !== 'all' && ` in ${FILTER_TABS.find(f => f.id === activeFilter)?.label}`}
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons 
        name={searchQuery.length > 0 ? "magnify" : "bullhorn-outline"} 
        size={64} 
        color="#C7C7CC" 
      />
      <Text style={styles.emptyStateTitle}>
        {searchQuery.length > 0 ? 'No Matches Found' : 'No Announcements'}
      </Text>
      <Text style={styles.emptyStateText}>
        {searchQuery.length > 0 
          ? 'Try adjusting your search terms or filters'
          : 'New announcements will appear here when they are posted'
        }
      </Text>
    </View>
  );

  const renderCreateButton = () => (
    <TouchableOpacity 
      style={styles.createButton}
      onPress={() => navigation.navigate('New Announcement')}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={styles.createGradient}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader
          navigation={navigation}
          title="Announcements"
          rightIcon="plus"
          onRightPress={() => navigation.navigate('New Announcement')}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader
        navigation={navigation}
        title="Announcements"
        rightIcon="plus"
        onRightPress={() => navigation.navigate('New Announcement')}
      />
      
      <FlatList
        data={filteredAnnouncements}
        keyExtractor={item => item.id}
        renderItem={renderAnnouncementCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.content,
          filteredAnnouncements.length === 0 && styles.emptyContent
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      />

      {renderCreateButton()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F2F2F7' 
  },
  content: {
    paddingTop: 16,
    paddingBottom: 80,
  },
  emptyContent: {
    flexGrow: 1,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },

  // Header Styles
  headerContainer: {
    paddingBottom: 16,
  },
  visualHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
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
    marginHorizontal: 8,
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

  // Search
  searchContainer: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },

  // Filter Tabs
  filterContainer: {
    marginBottom: 16,
  },
  filterList: {
    paddingHorizontal: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },

  // Results Header
  resultsHeader: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },

  // Announcement Cards
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 8,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  firstCard: {
    marginTop: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
    lineHeight: 22,
  },
  roleTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  announcementMessage: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 21,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    gap: 6,
  },
  fullTimeText: {
    fontSize: 13,
    color: '#C7C7CC',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Floating Create Button
  createButton: {
    position: 'absolute',
    bottom: 124,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 