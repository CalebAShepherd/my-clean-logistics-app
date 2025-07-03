import React, { useEffect, useContext, useState } from 'react';
import { SafeAreaView, View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import Constants from 'expo-constants';
import InternalHeader from '../components/InternalHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getApiUrl } from '../utils/apiHost';

const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || getApiUrl();

export default function GroupInfoScreen({ route, navigation }) {
  const { conversationId, participants: initialParticipants } = route.params;
  const { userToken, user } = useContext(AuthContext);
  const [participants, setParticipants] = useState(initialParticipants || []);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!initialParticipants || initialParticipants.length === 0) {
      loadParticipants();
    }
  }, [conversationId]);

  const loadParticipants = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const res = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      setParticipants(data.participants || []);
    } catch (error) {
      console.error('Error loading participants:', error);
      Alert.alert('Error', 'Failed to load group information');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const onRefresh = () => {
    loadParticipants(true);
  };

  const addParticipants = () => {
    navigation.navigate('AddParticipants', { 
      conversationId, 
      currentParticipants: participants.map(p => p.user.id) 
    });
  };

  const renderParticipant = ({ item, index }) => {
    const isCurrentUser = item.user.id === user.id;
    const isAdmin = item.isAdmin;
    
    return (
      <View style={[styles.participantCard, index === 0 && styles.firstCard]}>
        <View style={styles.participantHeader}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, isCurrentUser && styles.currentUserAvatar]}>
              <MaterialCommunityIcons 
                name="account" 
                size={24} 
                color={isCurrentUser ? '#FFFFFF' : '#007AFF'} 
              />
            </View>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <MaterialCommunityIcons name="crown" size={12} color="#FFD700" />
              </View>
            )}
          </View>
          <View style={styles.participantInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.participantName}>
                {item.user.username}
              </Text>
              {isCurrentUser && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>You</Text>
                </View>
              )}
            </View>
            <Text style={styles.participantEmail}>{item.user.email}</Text>
            {isAdmin && (
              <Text style={styles.roleText}>Group Admin</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Visual Header Section */}
      <View style={styles.visualHeader}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="account-group" size={64} color="#007AFF" />
        </View>
        <Text style={styles.headerTitle}>Group Chat</Text>
        <Text style={styles.headerSubtitle}>Manage group members and settings</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="account-multiple" size={24} color="#007AFF" />
          <Text style={styles.statNumber}>{participants.length}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="chat" size={24} color="#34C759" />
          <Text style={styles.statNumber}>Active</Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>

      {/* Add Members Button */}
      <TouchableOpacity style={styles.addMembersButton} onPress={addParticipants}>
        <LinearGradient
          colors={['#007AFF', '#0056CC']}
          style={styles.addMembersGradient}
        >
          <MaterialCommunityIcons name="account-plus" size={20} color="#FFFFFF" />
          <Text style={styles.addMembersText}>Add Members</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Members Section Header */}
      <View style={styles.membersHeader}>
        <Text style={styles.membersTitle}>Members</Text>
        <Text style={styles.membersCount}>{participants.length} people</Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="account-group-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyStateTitle}>No Members</Text>
      <Text style={styles.emptyStateText}>Add members to start collaborating</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Group Info" />
      
      <FlatList
        data={participants}
        keyExtractor={item => item.id}
        renderItem={renderParticipant}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[styles.content, participants.length === 0 && styles.emptyContent]}
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

  // Header Styles
  headerContainer: {
    paddingBottom: 24,
  },
  visualHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
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

  // Stats Styles
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 24,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },

  // Add Members Button
  addMembersButton: {
    marginHorizontal: 8,
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addMembersGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  addMembersText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },

  // Members Section
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  membersTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  membersCount: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },

  // Participant Card Styles
  participantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentUserAvatar: {
    backgroundColor: '#007AFF',
  },
  adminBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  participantInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 8,
  },
  youBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  youBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  participantEmail: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 2,
  },
  roleText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
}); 