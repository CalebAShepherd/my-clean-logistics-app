import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import InternalHeader from '../components/InternalHeader';
import { AuthContext } from '../context/AuthContext';
import { listUsers } from '../api/users';
import { createAnnouncement } from '../api/announcements';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ROLE_OPTIONS = [
  {
    id: 'client',
    label: 'Clients',
    icon: 'account-tie',
    description: 'Customer accounts',
    color: '#007AFF',
    lightColor: '#EAF4FF'
  },
  {
    id: 'transporter',
    label: 'Transporters',
    icon: 'truck',
    description: 'Delivery drivers',
    color: '#34C759',
    lightColor: '#E8F8EA'
  },
  {
    id: 'warehouse_admin',
    label: 'Warehouse',
    icon: 'warehouse',
    description: 'Warehouse staff',
    color: '#FF9500',
    lightColor: '#FFF3E8'
  },
  {
    id: 'dispatcher',
    label: 'Dispatchers',
    icon: 'phone-in-talk',
    description: 'Operations team',
    color: '#AF52DE',
    lightColor: '#F3EAFF'
  }
];

export default function NewAnnouncementScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [roles, setRoles] = useState([]);
  const [userId, setUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserList, setShowUserList] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (showUserList) {
      setLoadingUsers(true);
      listUsers(userToken)
        .then(list => {
          const clients = list.filter(u => u.role === 'client');
          setUsers(clients);
          setFilteredUsers(clients);
        })
        .catch(err => console.error('Error loading users:', err))
        .finally(() => setLoadingUsers(false));
    }
  }, [showUserList]);

  useEffect(() => {
    if (search) {
      setFilteredUsers(users.filter(u => 
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      ));
    } else {
      setFilteredUsers(users);
    }
  }, [search, users]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (roles.length === 0 && !userId) {
      newErrors.target = 'Please select target audience';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors below before sending.');
      return;
    }

    setSending(true);
    try {
      const payload = { 
        title: title.trim(), 
        message: message.trim(), 
        metadata: {}, 
        roles: userId ? [] : roles, 
        userId 
      };
      await createAnnouncement(userToken, payload);
      Alert.alert('Success', 'Announcement sent successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Error creating announcement:', err);
      Alert.alert('Error', 'Failed to send announcement. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const toggleRole = (roleId) => {
    setUserId(null);
    setSelectedUser(null);
    clearError('target');
    
    if (roles.includes(roleId)) {
      setRoles(roles.filter(r => r !== roleId));
    } else {
      setRoles([...roles, roleId]);
    }
  };

  const selectIndividual = () => {
    setRoles([]);
    clearError('target');
    setShowUserList(!showUserList);
  };

  const selectUser = (user) => {
    setUserId(user.id);
    setSelectedUser(user);
    setShowUserList(false);
    setSearch('');
  };

  const renderRoleCard = (role) => {
    const isSelected = roles.includes(role.id);
    
    return (
      <TouchableOpacity
        key={role.id}
        style={[
          styles.roleCard,
          isSelected && styles.roleCardSelected,
          { borderColor: isSelected ? role.color : '#E5E5EA' }
        ]}
        onPress={() => toggleRole(role.id)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.roleIconContainer,
          { backgroundColor: isSelected ? role.color : role.lightColor }
        ]}>
          <MaterialCommunityIcons 
            name={role.icon} 
            size={20} 
            color={isSelected ? '#FFFFFF' : role.color} 
          />
        </View>
        <Text style={[
          styles.roleLabel,
          isSelected && { color: role.color }
        ]}>
          {role.label}
        </Text>
        <Text style={[
          styles.roleDescription,
          isSelected && { color: role.color, opacity: 0.8 }
        ]}>
          {role.description}
        </Text>
        {isSelected && (
          <View style={[styles.roleSelectedIndicator, { backgroundColor: role.color }]}>
            <MaterialCommunityIcons name="check" size={10} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => selectUser(item)}
      activeOpacity={0.7}
    >
      <View style={styles.userAvatar}>
        <MaterialCommunityIcons name="account" size={20} color="#007AFF" />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  const renderUserListHeader = () => (
    <View>
      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Search clients..."
        placeholderTextColor="#8E8E93"
        autoCapitalize="none"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader
        navigation={navigation}
        title="New Announcement"
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {!showUserList ? (
          <>
            {/* Main Form */}
            <FlatList
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={() => (
                <View>
                  {/* Visual Header */}
                  <View style={styles.visualHeader}>
                    <View style={styles.iconContainer}>
                      <MaterialCommunityIcons name="bullhorn" size={48} color="#007AFF" />
                    </View>
                    <Text style={styles.headerTitle}>New Announcement</Text>
                    <Text style={styles.headerSubtitle}>
                      Share important updates with your team
                    </Text>
                  </View>

                  {/* Message Details Card */}
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Message Details</Text>
                    
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>
                        Title <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          errors.title && styles.inputError
                        ]}
                        value={title}
                        onChangeText={(text) => {
                          setTitle(text);
                          clearError('title');
                        }}
                        placeholder="Enter announcement title"
                        placeholderTextColor="#8E8E93"
                        autoCapitalize="sentences"
                      />
                      {errors.title && (
                        <Text style={styles.errorText}>{errors.title}</Text>
                      )}
                    </View>

                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Message</Text>
                      <TextInput
                        style={[styles.textAreaInput]}
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Enter announcement message (optional)"
                        placeholderTextColor="#8E8E93"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        autoCapitalize="sentences"
                      />
                    </View>
                  </View>

                  {/* Target Audience Card */}
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                      Target Audience <Text style={styles.required}>*</Text>
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Choose who should receive this announcement
                    </Text>
                    
                    <Text style={styles.sectionLabel}>User Roles</Text>
                    <View style={styles.rolesGrid}>
                      {ROLE_OPTIONS.map(renderRoleCard)}
                    </View>

                    <Text style={styles.sectionLabel}>Individual User</Text>
                    <TouchableOpacity
                      style={[
                        styles.individualCard,
                        (userId || showUserList) && styles.individualCardSelected
                      ]}
                      onPress={selectIndividual}
                      activeOpacity={0.7}
                    >
                      <View style={styles.individualIconContainer}>
                        <MaterialCommunityIcons name="account-search" size={20} color="#007AFF" />
                      </View>
                      <View style={styles.individualInfo}>
                        <Text style={styles.individualLabel}>
                          {selectedUser ? selectedUser.username : 'Select Individual'}
                        </Text>
                        <Text style={styles.individualDescription}>
                          {selectedUser ? selectedUser.email : 'Send to specific person'}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
                    </TouchableOpacity>
                    
                    {errors.target && (
                      <Text style={styles.errorText}>{errors.target}</Text>
                    )}
                  </View>
                </View>
              )}
              data={[]}
              renderItem={() => null}
            />

            {/* Send Button */}
            <View style={styles.submitContainer}>
              <TouchableOpacity 
                style={[styles.submitButton, sending && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={sending}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={sending ? ['#C7C7CC', '#C7C7CC'] : ['#007AFF', '#0056CC']}
                  style={styles.submitGradient}
                >
                  {sending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
                      <Text style={styles.submitText}>Send Announcement</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // User Selection List
          <View style={styles.userListContainer}>
            <View style={styles.userListHeader}>
              <Text style={styles.userListTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => setShowUserList(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            
            {loadingUsers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading clients...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={item => item.id}
                renderItem={renderUserItem}
                ListHeaderComponent={renderUserListHeader}
                contentContainerStyle={styles.userListContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F2F2F7' 
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: { 
    padding: 16,
    paddingBottom: 120,
  },

  // Visual Header
  visualHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
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

  // Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    lineHeight: 20,
  },

  // Form Fields
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: { 
    fontSize: 16,
    color: '#1C1C1E', 
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: { 
    borderWidth: 1.5, 
    borderColor: '#E5E5EA', 
    borderRadius: 12, 
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#1C1C1E',
  },
  textAreaInput: {
    borderWidth: 1.5, 
    borderColor: '#E5E5EA', 
    borderRadius: 12, 
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#1C1C1E',
    height: 100,
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 6,
    lineHeight: 18,
  },

  // Section Labels
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    marginTop: 8,
  },

  // Role Selection
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  roleCard: {
    width: '48%',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    position: 'relative',
  },
  roleCardSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  roleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  roleDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  roleSelectedIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Individual Selection
  individualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  individualCardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  individualIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  individualInfo: {
    flex: 1,
  },
  individualLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  individualDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },

  // User List
  userListContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  userListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  userListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  userListContent: {
    padding: 16,
  },
  searchInput: {
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
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
  },

  // Submit Button
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
}); 