import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InternalHeader from '../components/InternalHeader';
import { AuthContext } from '../context/AuthContext';
import { listUsers } from '../api/users';
import { createAnnouncement } from '../api/announcements';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function NewAnnouncementScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [roles, setRoles] = useState([]);
  const [userId, setUserId] = useState(null);
  const [showUserList, setShowUserList] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

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
      setFilteredUsers(users.filter(u => u.username.toLowerCase().includes(search.toLowerCase())));
    } else {
      setFilteredUsers(users);
    }
  }, [search, users]);

  const handleSubmit = async () => {
    if (!title) {
      Alert.alert('Title required');
      return;
    }
    try {
      const payload = { title, message, metadata: {}, roles: userId ? [] : roles, userId };
      await createAnnouncement(userToken, payload);
      Alert.alert('Announcement sent');
      navigation.goBack();
    } catch (err) {
      console.error('Error creating announcement:', err);
      Alert.alert('Failed to send announcement');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader
        navigation={navigation}
        title="New Announcement"
        rightIcon="check"
        onRightPress={handleSubmit}
      />
      <View style={styles.form}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Announcement title"
        />
        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Message (optional)"
          multiline
        />
        <Text style={styles.label}>Target Roles</Text>
        <View style={styles.rolesRow}>
          {['client','transporter','warehouse_admin','dispatcher'].map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.roleChip, roles.includes(r) && styles.roleChipSelected]}
              onPress={() => {
                setUserId(null);
                if (roles.includes(r)) setRoles(roles.filter(x => x !== r));
                else setRoles([...roles, r]);
              }}
            >
              <Text style={[styles.roleText, roles.includes(r) && styles.roleTextSelected]}>{r}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.roleChip, userId && styles.roleChipSelected]}
            onPress={() => {
              setRoles([]);
              setShowUserList(!showUserList);
            }}
          >
            <Text style={[styles.roleText, userId && styles.roleTextSelected]}>Individual</Text>
          </TouchableOpacity>
        </View>
        {showUserList && (
          <View style={styles.userList}>
            <TextInput
              style={styles.input}
              value={search}
              onChangeText={setSearch}
              placeholder="Search clients..."
            />
            {loadingUsers ? (
              <ActivityIndicator style={{ marginTop: 10 }} />
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => { setUserId(item.id); setShowUserList(false); }}
                  >
                    <Text style={styles.userText}>{item.username}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
  rolesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  roleChip: { borderWidth: 1, borderColor: '#0074D9', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
  roleChipSelected: { backgroundColor: '#0074D9' },
  roleText: { color: '#0074D9', fontSize: 12 },
  roleTextSelected: { color: '#fff' },
  userList: { marginTop: 8, maxHeight: 200, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  userItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  userText: { fontSize: 14 },
}); 