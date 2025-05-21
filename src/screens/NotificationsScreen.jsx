import React, { useState, useEffect, useContext } from 'react';
import InternalHeader from '../components/InternalHeader';
import { fetchNotifications, markNotificationAsRead } from '../api/notifications';
import { AuthContext } from '../context/AuthContext';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const data = await fetchNotifications(userToken);
        setNotifications(data);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    }
    if (userToken) loadNotifications();
  }, [userToken]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(userToken, id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Notifications" />
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Notifications" />
      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          // Render offers separately
          if (item.type === 'offer') {
            return (
              <View style={styles.offerCard}>
                <View style={styles.offerHeader}>
                  <Text style={styles.offerTitle}>{item.title}</Text>
                  <Text style={styles.offerTime}>{item.timestamp}</Text>
                </View>
                <Text style={styles.offerRoute}>{item.pickup}</Text>
                <Text style={styles.offerRoute}>{item.dropoff}</Text>
                <Text style={styles.offerDate}>{item.date}</Text>
                <View style={styles.offerButtons}>
                  <TouchableOpacity style={styles.acceptButton}>
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineButton}>
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }
          // General notifications: elegant card
          const iconMap = {
            shipment_status: 'truck-check',
            late_shipment: 'truck-alert',
            delivery_confirmed: 'truck-delivery',
            inventory_low: 'alert-circle',
            broadcast: 'bullhorn',
            update: 'bell-outline',
            notice: 'information-outline'
          };
          const colorMap = {
            shipment_status: '#0074D9',
            late_shipment: '#FF8C00',
            delivery_confirmed: '#28A745',
            inventory_low: '#DC3545',
            broadcast: '#6F42C1',
            update: '#0074D9',
            notice: '#17A2B8'
          };
          const iconName = iconMap[item.type] || 'bell-outline';
          const iconColor = colorMap[item.type] || '#0074D9';
          const time = new Date(item.createdAt).toLocaleString();
          const orderId = item.metadata?.shipmentId;
          return (
            <TouchableOpacity
              style={[styles.card, !item.isRead && styles.unread]}
              onPress={() => {
                handleMarkRead(item.id);
                if (orderId) navigation.navigate('Shipment Details', { id: orderId });
              }}
            >
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
                <Text style={styles.cardTitle}>{item.title}</Text>
              </View>
              {orderId && <Text style={styles.cardSubtitle}>Order #{orderId}</Text>}
              {item.message && <Text style={styles.cardMessage}>{item.message}</Text>}
              <Text style={[styles.cardTime, { marginTop: 8, alignSelf: 'flex-end' }]}>{time}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  list: { 
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: 16
  },
  offerCard: {
    borderWidth: 1,
    borderColor: '#0074D9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  offerTitle: { fontSize: 16, fontWeight: 'bold' },
  offerTime: { fontSize: 12, color: '#666' },
  offerRoute: { fontSize: 14, marginBottom: 4 },
  offerDate: { fontSize: 14, marginBottom: 4, color: '#0074D9' },
  offerPrice: { fontSize: 14, marginBottom: 12, fontWeight: '600' },
  offerButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  acceptButton: {
    borderColor: '#0074D9',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  acceptText: { color: '#0074D9', fontWeight: '500' },
  declineButton: {
    borderColor: '#0074D9',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  declineText: { color: '#0074D9', fontWeight: '500' },
  notificationTime: { fontSize: 12, color: '#999' },
  // Card styles for notifications
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  unread: {
    borderLeftWidth: 4,
    borderLeftColor: '#0074D9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardTime: {
    fontSize: 12,
    color: '#999',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  cardMessage: {
    fontSize: 14,
    color: '#333',
  },
}); 