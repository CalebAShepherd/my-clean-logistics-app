import React, { useEffect, useContext, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, ToastAndroid, Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import Constants from 'expo-constants';
import InternalHeader from '../components/InternalHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

export default function NewConversationScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [conversationName, setConversationName] = useState('');
  const [existingConversation, setExistingConversation] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(`${API_URL}/api/users?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
      .then(res => res.json())
      .then(data => setResults(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query]);

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  // Check for existing conversation when selection changes
  useEffect(() => {
    if (selectedUsers.length === 0) {
      setExistingConversation(null);
      return;
    }

    const checkExistingConversation = async () => {
      try {
        const participantIds = selectedUsers.map(u => u.id);
        const res = await fetch(`${API_URL}/api/conversations/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
          body: JSON.stringify({ participantIds }),
        });
        const data = await res.json();
        
        if (data.exists) {
          setExistingConversation(data.conversation);
        } else {
          setExistingConversation(null);
        }
      } catch (error) {
        // Ignore errors in check, will handle in actual creation
        setExistingConversation(null);
      }
    };

    // Debounce the check to avoid too many API calls
    const timeoutId = setTimeout(checkExistingConversation, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedUsers, userToken]);

  const removeSelectedUser = (userId) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const showToast = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      // For iOS, we could use a toast library or just skip the toast
      console.log('Toast:', message);
    }
  };

  const createConversation = () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user to start a conversation.');
      return;
    }

    const participantIds = selectedUsers.map(u => u.id);
    
    fetch(`${API_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ 
        participantIds,
        name: selectedUsers.length > 1 ? conversationName.trim() : undefined
      }),
    })
      .then(res => res.json())
      .then(conv => {
        // Create display name for the conversation
        let displayName;
        if (selectedUsers.length === 1) {
          displayName = selectedUsers[0].username;
        } else if (conversationName.trim()) {
          displayName = conversationName.trim();
        } else {
          displayName = selectedUsers.map(u => u.username).join(', ');
        }
        
        // Show feedback if opening existing conversation
        if (conv.isExisting) {
          showToast('Opening existing conversation');
        }
        
        // Navigate to the conversation (existing or new)
        navigation.navigate('Chat', { 
          conversationId: conv.id, 
          name: displayName,
          isGroup: selectedUsers.length > 1 
        });
      })
      .catch(err => {
        console.error('Error creating conversation:', err);
        Alert.alert('Error', 'Failed to create conversation. Please try again.');
      });
  };

  const renderSearchItem = ({ item }) => {
    const isSelected = selectedUsers.some(u => u.id === item.id);
    return (
      <TouchableOpacity 
        style={[styles.item, isSelected && styles.selectedItem]} 
        onPress={() => toggleUserSelection(item)}
      >
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username} ({item.role})</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        {isSelected && (
          <MaterialCommunityIcons name="check-circle" size={24} color="#007AFF" />
        )}
      </TouchableOpacity>
    );
  };

  const renderSelectedUser = ({ item }) => (
    <View style={styles.selectedUser}>
      <Text style={styles.selectedUserText}>{item.username}</Text>
      <TouchableOpacity onPress={() => removeSelectedUser(item.id)}>
        <MaterialCommunityIcons name="close-circle" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="New Conversation" />
      
      {/* Selected Users Section */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.sectionTitle}>
            Selected ({selectedUsers.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedScrollView}>
            <FlatList
              data={selectedUsers}
              keyExtractor={item => item.id}
              renderItem={renderSelectedUser}
              horizontal
              ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
            />
          </ScrollView>
          
          {/* Group Name Input (only show if more than 1 user selected) */}
          {selectedUsers.length > 1 && (
            <TextInput
              style={styles.groupNameInput}
              placeholder="Group name (optional)"
              value={conversationName}
              onChangeText={setConversationName}
            />
          )}
          
          {/* Existing Conversation Warning */}
          {existingConversation && (
            <View style={styles.existingConversationWarning}>
              <MaterialCommunityIcons name="information" size={16} color="#FF9500" />
              <Text style={styles.existingConversationText}>
                You already have a conversation with {selectedUsers.length === 1 ? 'this person' : 'these people'}
              </Text>
            </View>
          )}

          {/* Create Button */}
          <TouchableOpacity style={styles.createButton} onPress={createConversation}>
            <MaterialCommunityIcons 
              name={existingConversation ? "message-text-outline" : "message-plus"} 
              size={20} 
              color="white" 
            />
            <Text style={styles.createButtonText}>
              {existingConversation 
                ? 'Open Existing Chat' 
                : (selectedUsers.length === 1 ? 'Start Chat' : 'Create Group')
              }
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Section */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by username..."
        value={query}
        onChangeText={setQuery}
      />
      
      {loading ? (
        <ActivityIndicator style={styles.center} size="large" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={renderSearchItem}
          ListEmptyComponent={query.trim() ? <Text style={styles.empty}>No users found.</Text> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  selectedSection: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectedScrollView: {
    maxHeight: 40,
  },
  selectedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedUserText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  groupNameInput: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    fontSize: 16,
  },
  existingConversationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  existingConversationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#856404',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchInput: { 
    margin: 16, 
    padding: 12, 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8,
    fontSize: 16,
  },
  item: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  selectedItem: {
    backgroundColor: '#EAF4FF',
  },
  userInfo: {
    flex: 1,
  },
  username: { 
    fontSize: 16, 
    fontWeight: '500',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', marginTop: 20, color: '#666' },
}); 