import React, { useContext, useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InternalHeader from '../components/InternalHeader';
import { fetchAnnouncements } from '../api/announcements';
import { AuthContext } from '../context/AuthContext';

export default function AnnouncementsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAnnouncements(userToken);
        setAnnouncements(data);
      } catch (err) {
        console.error('Error loading announcements:', err);
      } finally {
        setLoading(false);
      }
    }
    if (userToken) load();
  }, [userToken]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader
          navigation={navigation}
          title="Announcements"
          rightIcon="plus"
          onRightPress={() => navigation.navigate('New Announcement')}
        />
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      </SafeAreaView>
    );
  }

  const colorMap = {
    client: '#0074D9',
    transporter: '#FFD700',
    warehouse_admin: '#28A745',
    dispatcher: '#FFA500',
    all: '#DC3545'
  };

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader
        navigation={navigation}
        title="Announcements"
        rightIcon="plus"
        onRightPress={() => navigation.navigate('New Announcement')}
      />
      <FlatList
        data={announcements}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const roles = item.roles && item.roles.length ? item.roles : item.userId ? ['individual'] : ['all'];
          const roleLabel = item.userId ? 'Individual' : roles.length === 1 ? roles[0] : 'All';
          const badgeColor = item.userId
            ? '#6c757d'
            : roles.length === 1
            ? colorMap[roles[0]]
            : colorMap['all'];
          const time = new Date(item.createdAt).toLocaleString();
          return (
            <View style={[styles.card, { borderLeftColor: badgeColor }]}>  
              <Text style={styles.title}>{item.title}</Text>
              {item.message && <Text style={styles.message}>{item.message}</Text>}
              <View style={styles.footer}>
                <Text style={[styles.role, { color: badgeColor }]}>{roleLabel}</Text>
                <Text style={styles.time}>{time}</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  message: { fontSize: 14, color: '#333', marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  role: { fontSize: 12, fontWeight: '600' },
  time: { fontSize: 12, color: '#999' },
}); 