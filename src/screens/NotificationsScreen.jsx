import React, { useState, useEffect, useContext } from 'react';
import InternalHeader from '../components/InternalHeader';
import { fetchNotifications, markNotificationAsRead } from '../api/notifications';
import { AuthContext } from '../context/AuthContext';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function NotificationsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications(userToken);
      // Filter out message notifications since they have their own dedicated interface
      setNotifications(data.filter(n => n.type !== 'message'));
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userToken) loadNotifications();
  }, [userToken]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Notifications" />
      
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="bell-off-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySubtitle}>You're all caught up! New notifications will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          }
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            // Render offers separately with special styling
            if (item.type === 'offer') {
              return (
                <View style={styles.offerCard}>
                  <LinearGradient
                    colors={['#007AFF', '#5856D6']}
                    style={styles.offerGradient}
                  >
                    <View style={styles.offerHeader}>
                      <View style={styles.offerIconContainer}>
                        <MaterialCommunityIcons name="handshake" size={24} color="white" />
                      </View>
                      <View style={styles.offerContent}>
                        <Text style={styles.offerTitle}>{item.title}</Text>
                        <Text style={styles.offerTime}>{item.timestamp}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.offerDetails}>
                      <Text style={styles.offerRoute}>{item.pickup}</Text>
                      <MaterialCommunityIcons name="arrow-down" size={16} color="rgba(255,255,255,0.8)" style={styles.arrowIcon} />
                      <Text style={styles.offerRoute}>{item.dropoff}</Text>
                      <Text style={styles.offerDate}>{item.date}</Text>
                    </View>
                    
                    <View style={styles.offerButtons}>
                      <TouchableOpacity style={styles.acceptButton} activeOpacity={0.8}>
                        <Text style={styles.acceptText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.declineButton} activeOpacity={0.8}>
                        <Text style={styles.declineText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              );
            }

            // General notifications with elegant card design
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
              shipment_status: '#007AFF',
              late_shipment: '#FF9500',
              delivery_confirmed: '#34C759',
              inventory_low: '#FF3B30',
              broadcast: '#5856D6',
              update: '#007AFF',
              notice: '#00C7BE'
            };

            const iconName = iconMap[item.type] || 'bell-outline';
            const iconColor = colorMap[item.type] || '#007AFF';
            const time = new Date(item.createdAt).toLocaleString();
            const orderId = item.metadata?.shipmentId;

            return (
              <TouchableOpacity
                style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
                onPress={() => {
                  handleMarkRead(item.id);
                  if (orderId) navigation.navigate('Shipment Details', { id: orderId });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                    <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
                  </View>
                  
                  <View style={styles.textContainer}>
                    <View style={styles.headerRow}>
                      <Text style={[styles.cardTitle, !item.isRead && styles.unreadTitle]}>
                        {item.title}
                      </Text>
                      <Text style={styles.timeText}>{time}</Text>
                    </View>
                    
                    {orderId && (
                      <Text style={styles.orderText}>Order #{orderId}</Text>
                    )}
                    
                    {item.message && (
                      <Text style={styles.messageText}>{item.message}</Text>
                    )}
                  </View>
                </View>
                
                {!item.isRead && <View style={styles.unreadIndicator} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // List
  list: { 
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  
  // Offer Card Styles
  offerCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  offerGradient: {
    borderRadius: 16,
    padding: 20,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  offerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  offerContent: {
    flex: 1,
  },
  offerTitle: { 
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  offerTime: { 
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  offerDetails: {
    marginBottom: 20,
  },
  offerRoute: { 
    fontSize: 16,
    color: 'white',
    marginBottom: 4,
    fontWeight: '500',
  },
  arrowIcon: {
    alignSelf: 'flex-start',
    marginLeft: 8,
    marginBottom: 4,
  },
  offerDate: { 
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    fontWeight: '500',
  },
  offerButtons: { 
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  acceptButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  acceptText: { 
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  declineText: { 
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Notification Card Styles
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    position: 'relative',
  },
  unreadCard: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  cardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  // Icon Container
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  
  // Text Container
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#000',
  },
  timeText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  orderText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  
  // Unread Indicator
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
}); 