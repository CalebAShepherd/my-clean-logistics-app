import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, SafeAreaView, TextInput, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { Platform } from 'react-native';
import InternalHeader from '../components/InternalHeader';
import { fetchWarehouses } from '../api/warehouses';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getApiUrl } from '../utils/apiHost';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : getApiUrl();

const ROLE_CONFIG = {
  admin: {
    icon: 'shield-account',
    color: '#FF3B30',
    label: 'Admin',
    description: 'Full system access',
    lightColor: '#FFE8E8'
  },
  client: {
    icon: 'account-group',
    color: '#007AFF',
    label: 'Client',
    description: 'Customer access',
    lightColor: '#EAF4FF'
  },
  dispatcher: {
    icon: 'clipboard-list',
    color: '#AF52DE',
    label: 'Dispatcher',
    description: 'Route management',
    lightColor: '#F3EAFF'
  },
  transporter: {
    icon: 'truck',
    color: '#FF9500',
    label: 'Transporter',
    description: 'Transport operations',
    lightColor: '#FFF3E8'
  },
  warehouse_admin: {
    icon: 'warehouse',
    color: '#34C759',
    label: 'Warehouse Admin',
    description: 'Warehouse management',
    lightColor: '#E8F8EA'
  }
};

export default function AdminUsersScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouses, setWarehouses] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [expandedUserId, setExpandedUserId] = useState(null);

  const roles = ['admin', 'client', 'dispatcher', 'transporter', 'warehouse_admin'];

  useEffect(() => {
    if (!userToken) return;
    loadInitialData();
  }, [userToken]);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, roleFilter]);

  const loadInitialData = async () => {
    await Promise.all([loadWarehouses(), loadUsers()]);
  };

  const loadWarehouses = async () => {
    setLoadingWarehouses(true);
    try {
      const data = await fetchWarehouses(userToken);
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const loadUsers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const onRefresh = () => {
    loadUsers(true);
  };

  const deleteUser = async (id, username) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete user "${username}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/users/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${userToken}` },
              });
              setUsers(prev => prev.filter(u => u.id !== id));
              Alert.alert('Success', 'User deleted successfully');
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const changeRole = async (id, role) => {
    try {
      const response = await fetch(`${API_URL}/users/${id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Role update failed:', response.status, errorData);
        throw new Error(`Failed to update role: ${response.status} ${response.statusText}`);
      }

      // Only update local state if API call was successful
      setUsers(prev =>
        prev.map(u => (u.id === id ? { ...u, role } : u))
      );
      setEditingId(null);
      Alert.alert('Success', 'User role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Error', `Failed to update user role: ${error.message}`);
    }
  };

  const changeWarehouse = async (id, warehouseId) => {
    try {
      await fetch(`${API_URL}/users/${id}/warehouse`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ warehouseId })
      });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, warehouseId } : u));
      Alert.alert('Success', 'User warehouse updated successfully');
    } catch (error) {
      console.error('Error updating warehouse:', error);
      Alert.alert('Error', 'Failed to update user warehouse');
    }
  };

  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : 'No warehouse assigned';
  };

  const renderRoleFilterTab = (role) => {
    const isActive = roleFilter === role;
    const config = role === 'all' ? { icon: 'view-grid', label: 'All Users' } : ROLE_CONFIG[role];
    const count = role === 'all' ? users.length : users.filter(u => u.role === role).length;

    return (
      <TouchableOpacity
        key={role}
        style={[styles.filterTab, isActive && styles.filterTabActive]}
        onPress={() => setRoleFilter(role)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons 
          name={config?.icon || 'account'} 
          size={16} 
          color={isActive ? '#FFFFFF' : '#8E8E93'} 
        />
        <Text style={[
          styles.filterTabText,
          isActive && styles.filterTabTextActive
        ]}>
          {config?.label || role}
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

  const renderUserCard = ({ item, index }) => {
    const roleConfig = ROLE_CONFIG[item.role] || ROLE_CONFIG.client;
    const isExpanded = expandedUserId === item.id;
    const isEditing = editingId === item.id;

    return (
      <View style={[styles.userCard, index === 0 && styles.firstCard]}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpandedUserId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.roleIconContainer, { backgroundColor: roleConfig.lightColor }]}>
            <MaterialCommunityIcons 
              name={roleConfig.icon} 
              size={24} 
              color={roleConfig.color} 
            />
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '20' }]}>
              <MaterialCommunityIcons 
                name={roleConfig.icon} 
                size={14} 
                color={roleConfig.color} 
              />
              <Text style={[styles.roleText, { color: roleConfig.color }]}>
                {roleConfig.label}
              </Text>
            </View>
          </View>
          
          <MaterialCommunityIcons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#C7C7CC" 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>User Information</Text>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-circle" size={16} color="#8E8E93" />
                <Text style={styles.infoLabel}>User ID:</Text>
                <Text style={styles.infoValue}>{item.id}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="warehouse" size={16} color="#8E8E93" />
                <Text style={styles.infoLabel}>Warehouse:</Text>
                <Text style={styles.infoValue}>{getWarehouseName(item.warehouseId)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="information" size={16} color="#8E8E93" />
                <Text style={styles.infoLabel}>Role Description:</Text>
                <Text style={styles.infoValue}>{roleConfig.description}</Text>
              </View>
            </View>

            {isEditing ? (
              <View style={styles.editSection}>
                <Text style={styles.sectionTitle}>Edit Role</Text>
                
                <View style={styles.pickerContainer}>
                  <MaterialCommunityIcons name="account-cog" size={20} color="#007AFF" />
                  <Picker
                    selectedValue={newRole}
                    style={styles.picker}
                    onValueChange={(value) => setNewRole(value)}
                  >
                    {roles.map(r => (
                      <Picker.Item 
                        key={r} 
                        label={ROLE_CONFIG[r]?.label || r} 
                        value={r} 
                      />
                    ))}
                  </Picker>
                </View>
                
                <View style={styles.editButtons}>
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={() => changeRole(item.id, newRole)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#34C759', '#28A745']}
                      style={styles.saveGradient}
                    >
                      <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                      <Text style={styles.saveText}>Save</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setEditingId(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.actionSection}>
                <TouchableOpacity 
                  style={styles.editRoleButton}
                  onPress={() => {
                    setEditingId(item.id);
                    setNewRole(item.role);
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="pencil" size={16} color="#007AFF" />
                  <Text style={styles.editRoleText}>Edit Role</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => deleteUser(item.id, item.username)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="delete" size={16} color="#FF3B30" />
                  <Text style={styles.deleteText}>Delete User</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Visual Header Section */}
      <View style={styles.visualHeader}>
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons name="account-group" size={48} color="#007AFF" />
        </View>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSubtitle}>
          Manage user accounts, roles, and permissions
        </Text>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {Object.keys(ROLE_CONFIG).filter(role => 
              users.some(user => user.role === role)
            ).length}
          </Text>
          <Text style={styles.statLabel}>Active Roles</Text>
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
            placeholder="Search by username, email or role"
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

      {/* Role Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          data={['all', ...roles]}
          renderItem={({ item }) => renderRoleFilterTab(item)}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Results Header */}
      {(searchQuery.length > 0 || roleFilter !== 'all') && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsText}>
            {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''} found
            {searchQuery.length > 0 && ` for "${searchQuery}"`}
            {roleFilter !== 'all' && ` in ${ROLE_CONFIG[roleFilter]?.label}`}
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons 
        name={searchQuery.length > 0 ? "magnify" : "account-plus-outline"} 
        size={64} 
        color="#C7C7CC" 
      />
      <Text style={styles.emptyStateTitle}>
        {searchQuery.length > 0 ? 'No Users Found' : 'No Users Available'}
      </Text>
      <Text style={styles.emptyStateText}>
        {searchQuery.length > 0 
          ? 'Try adjusting your search terms or filters'
          : 'Users will appear here when they are created'
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Loading..." />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading user information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Admin Users" />
      
      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id}
        renderItem={renderUserCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.content,
          filteredUsers.length === 0 && styles.emptyContent
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F2F2F7' 
  },
  content: {
    paddingHorizontal: 16,
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

  // User Cards
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 8,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  firstCard: {
    marginTop: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Expanded Content
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginLeft: 8,
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
    flex: 1,
  },

  // Edit Section
  editSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
  },
  cancelText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
  },

  // Action Section
  actionSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  editRoleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#EAF4FF',
    borderRadius: 12,
    gap: 6,
  },
  editRoleText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFE8E8',
    borderRadius: 12,
    gap: 6,
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
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
});

