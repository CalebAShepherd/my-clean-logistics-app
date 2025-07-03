import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, SafeAreaView, TextInput, TouchableOpacity, Alert, RefreshControl, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { Platform } from 'react-native';
import InternalHeader from '../components/InternalHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getApiUrl } from '../utils/apiHost';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : getApiUrl();

const ROLE_CONFIG = {
  crm_admin: {
    icon: 'shield-account',
    color: '#667eea',
    label: 'CRM Admin',
    description: 'Full CRM access',
    lightColor: '#E0E7FF'
  },
  sales_rep: {
    icon: 'account-tie',
    color: '#34C759',
    label: 'Sales Rep',
    description: 'Manages leads and opportunities',
    lightColor: '#E8F8EA'
  },
  account_manager: {
    icon: 'account-heart',
    color: '#5856D6',
    label: 'Account Manager',
    description: 'Manages client relationships',
    lightColor: '#EDE9FE'
  }
};
const CRM_ROLES = ['crm_admin', 'sales_rep', 'account_manager'];

export default function CRMUsersScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [expandedUserId, setExpandedUserId] = useState(null);

  useEffect(() => {
    if (!userToken) return;
    loadUsers();
  }, [userToken]);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, roleFilter]);

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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Ensure data is an array before filtering
      const usersArray = Array.isArray(data) ? data : [];
      const crmUsers = usersArray.filter(u => CRM_ROLES.includes(u.role));
      setUsers(crmUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
      setUsers([]); // Set empty array on error
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const applyFilters = () => {
    // Ensure users is always an array
    const usersArray = Array.isArray(users) ? users : [];
    let filtered = [...usersArray];

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user && user.role === roleFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user && 
        user.username && 
        user.email &&
        (user.username.toLowerCase().includes(query) ||
         user.email.toLowerCase().includes(query))
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
        throw new Error('Failed to update role');
      }

      setUsers(prev =>
        prev.map(u => (u.id === id ? { ...u, role } : u))
      );
      setEditingId(null);
      Alert.alert('Success', 'User role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Error', 'Failed to update user role.');
    }
  };
  
  const renderRoleFilterTab = (role) => {
    const isActive = roleFilter === role;
    const config = role === 'all' ? { icon: 'account-group', label: 'All CRM Users' } : ROLE_CONFIG[role];
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
    const isEditing = editingId === item.id;
    const isExpanded = expandedUserId === item.id;
    const config = ROLE_CONFIG[item.role] || {};

    return (
      <View style={[styles.userCard, { backgroundColor: config.lightColor || '#F9F9F9' }]}>
        <TouchableOpacity onPress={() => setExpandedUserId(isExpanded ? null : item.id)} style={styles.cardHeader}>
          <MaterialCommunityIcons name={config.icon || 'account'} size={24} color={config.color || '#444'} />
          <View style={styles.cardHeaderText}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={[styles.role, { color: config.color || '#444' }]}>{config.label || item.role}</Text>
          </View>
          <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color="#555" />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardBody}>
            <View style={styles.userInfoSection}>
              <Text style={styles.email}>{item.email}</Text>
              <Text style={styles.createdAt}>Member since: {new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => {
                  setEditingId(item.id);
                  setNewRole(item.role);
                }}
              >
                <MaterialCommunityIcons name="pencil" color="#fff" size={16} />
                <Text style={styles.actionButtonText}>Change Role</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => deleteUser(item.id, item.username)}
              >
                <MaterialCommunityIcons name="delete" color="#fff" size={16} />
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>

            {isEditing && (
              <View style={styles.editingContainer}>
                <Picker
                  selectedValue={newRole}
                  onValueChange={(itemValue) => setNewRole(itemValue)}
                  style={styles.picker}
                >
                  {CRM_ROLES.map(role => (
                    <Picker.Item key={role} label={ROLE_CONFIG[role]?.label || role} value={role} />
                  ))}
                </Picker>
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={() => changeRole(item.id, newRole)}
                >
                  <MaterialCommunityIcons name="check" color="#fff" size={16} />
                  <Text style={styles.actionButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => setEditingId(null)}
                >
                  <MaterialCommunityIcons name="close" color="#fff" size={16} />
                  <Text style={styles.actionButtonText}>Cancel</Text>
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
        <TextInput
            style={styles.searchBar}
            placeholder="Search by name, email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
            {renderRoleFilterTab('all')}
            {CRM_ROLES.map(role => renderRoleFilterTab(role))}
        </ScrollView>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="account-search-outline" size={80} color="#CBD5E0" />
        <Text style={styles.emptyText}>No CRM users found.</Text>
        <Text style={styles.emptySubText}>
            {searchQuery || roleFilter !== 'all'
                ? "Try adjusting your search or filter."
                : "There are currently no users with CRM roles in the system."}
        </Text>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#F7FAFC', '#E2E8F0']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={{ marginTop: 10, color: '#667eea' }}>Loading CRM Users...</Text>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7FAFC' }}>
      <InternalHeader title="CRM User Management" navigation={navigation} />
      <FlatList
        data={filteredUsers}
        renderItem={renderUserCard}
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerContainer: {
    marginBottom: 16,
    paddingTop: 10
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 5,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterTabText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '600'
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    marginLeft: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterBadgeText: {
    color: '#4A5568',
    fontSize: 12,
    fontWeight: '700',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  userCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 16,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  role: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2
  },
  cardBody: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  userInfoSection: {
    marginBottom: 16,
  },
  email: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 4
  },
  createdAt: {
    fontSize: 12,
    color: '#718096',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: 'bold',
  },
  editButton: { backgroundColor: '#3B82F6' },
  deleteButton: { backgroundColor: '#EF4444' },
  saveButton: { backgroundColor: '#10B981' },
  cancelButton: { backgroundColor: '#6B7280' },
  editingContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16
  },
  picker: {
    backgroundColor: '#fff',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A5568',
    marginTop: 16,
    textAlign: 'center'
  },
  emptySubText: {
    fontSize: 14,
    color: '#718096',
    marginTop: 8,
    textAlign: 'center'
  }
}); 