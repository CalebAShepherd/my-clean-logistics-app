// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { listOffers, updateOffer } from '../api/offers';
import { SafeAreaView } from 'react-native-safe-area-context';
import InternalHeader from '../components/InternalHeader';

function OffersScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOffers = async () => {
    try {
      const data = await listOffers(userToken);
      setOffers(data);
    } catch (e) {
      console.error('Error fetching offers:', e);
      Alert.alert('Error', 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOffers();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchOffers();
  }, [userToken]);

  const handleDecision = async (offerId, status) => {
    setUpdatingId(offerId);
    try {
      await updateOffer(userToken, offerId, status);
      // Remove or update the offer in the list
      setOffers(prev => prev.filter(o => o.id !== offerId));
      
      if (status === 'accepted') {
        const offer = offers.find(o => o.id === offerId);
        Alert.alert(
          'Offer Accepted',
          'You have successfully accepted this offer. Redirecting to route details...',
          [
            {
              text: 'OK',
              onPress: () => {
                if (offer?.Route?.id) {
                  navigation.navigate('RouteDetail', { routeId: offer.Route.id });
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Offer Declined', 'You have declined this offer.');
      }
    } catch (e) {
      console.error('Error updating offer:', e);
      Alert.alert('Error', 'Failed to update offer');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Route Offers" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading offers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (offers.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Route Offers" />
        
        {/* Visual Header */}
        <View style={styles.headerCard}>
          <LinearGradient
            colors={['#007AFF', '#5856D6']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <MaterialCommunityIcons name="handshake" size={32} color="white" />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Route Offers</Text>
                <Text style={styles.headerSubtitle}>Manage delivery route assignments</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="handshake-outline" size={80} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No Pending Offers</Text>
          <Text style={styles.emptySubtitle}>
            You don't have any route offers at the moment. New offers will appear here when available.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchOffers}>
            <LinearGradient
              colors={['#007AFF', '#5856D6']}
              style={styles.refreshButtonGradient}
            >
              <MaterialCommunityIcons name="refresh" size={16} color="white" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Route Offers" />
      
      {/* Visual Header */}
      <View style={styles.headerCard}>
        <LinearGradient
          colors={['#007AFF', '#5856D6']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <MaterialCommunityIcons name="handshake" size={32} color="white" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Route Offers</Text>
              <Text style={styles.headerSubtitle}>Review and respond to delivery assignments</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={20} color="#007AFF" />
          <Text style={styles.statsTitle}>Pending Offers</Text>
        </View>
        
        <View style={styles.statsContent}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{offers.length}</Text>
            <Text style={styles.statLabel}>Total Offers</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {offers.reduce((sum, offer) => sum + (offer.Route?.RouteShipment?.length || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Total Deliveries</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <Text style={styles.statsNote}>
            Review each offer carefully before accepting or declining
          </Text>
        </View>
      </View>

      <FlatList
        data={offers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
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
          const route = item.Route;
          const createdAt = route?.createdAt ? new Date(route.createdAt).toLocaleDateString() : 'Unknown';
          const stops = Array.isArray(route?.RouteShipment) ? route.RouteShipment.length : 0;
          const isUpdating = updatingId === item.id;
          
          return (
            <View style={styles.offerCard}>
              {/* Offer Header */}
              <View style={styles.offerHeader}>
                <View style={styles.offerInfo}>
                  <Text style={styles.offerTitle}>Route Assignment</Text>
                  <Text style={styles.offerDate}>Created on {createdAt}</Text>
                </View>
                
                <View style={styles.offerBadge}>
                  <MaterialCommunityIcons name="clock-outline" size={12} color="#FF9500" />
                  <Text style={styles.offerBadgeText}>Pending</Text>
                </View>
              </View>

              {/* Route Details */}
              <View style={styles.routeDetails}>
                <View style={styles.routeMetric}>
                  <MaterialCommunityIcons name="map-marker-multiple" size={16} color="#007AFF" />
                  <Text style={styles.routeMetricLabel}>Delivery Stops</Text>
                  <Text style={styles.routeMetricValue}>{stops}</Text>
                </View>
                
                <View style={styles.routeMetric}>
                  <MaterialCommunityIcons name="calendar" size={16} color="#007AFF" />
                  <Text style={styles.routeMetricLabel}>Route Date</Text>
                  <Text style={styles.routeMetricValue}>
                    {route?.scheduledDate 
                      ? new Date(route.scheduledDate).toLocaleDateString()
                      : 'Not scheduled'}
                  </Text>
                </View>
              </View>

              {/* Route Preview */}
              {route?.RouteShipment?.length > 0 && (
                <View style={styles.routePreview}>
                  <Text style={styles.routePreviewTitle}>Delivery Locations:</Text>
                  <View style={styles.locationsList}>
                    {route.RouteShipment.slice(0, 3).map((routeShipment, index) => (
                      <View key={index} style={styles.locationItem}>
                        <MaterialCommunityIcons 
                          name={index === 0 ? "circle" : "map-marker"} 
                          size={8} 
                          color={index === 0 ? "#34C759" : "#FF3B30"} 
                        />
                        <Text style={styles.locationText} numberOfLines={1}>
                          {routeShipment.shipment?.destination || 'Unknown location'}
                        </Text>
                      </View>
                    ))}
                    {route.RouteShipment.length > 3 && (
                      <Text style={styles.moreLocationsText}>
                        +{route.RouteShipment.length - 3} more locations
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.offerActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.declineButton]}
                  onPress={() => handleDecision(item.id, 'declined')}
                  disabled={isUpdating}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons 
                    name={isUpdating ? "loading" : "close-circle"} 
                    size={16} 
                    color="#FF3B30" 
                  />
                  <Text style={[styles.actionButtonText, styles.declineButtonText]}>
                    {isUpdating ? 'Processing...' : 'Decline'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleDecision(item.id, 'accepted')}
                  disabled={isUpdating}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isUpdating ? ['#8E8E93', '#8E8E93'] : ['#34C759', '#30B855']}
                    style={styles.acceptButtonGradient}
                  >
                    <MaterialCommunityIcons 
                      name={isUpdating ? "loading" : "check-circle"} 
                      size={16} 
                      color="white" 
                    />
                    <Text style={styles.acceptButtonText}>
                      {isUpdating ? 'Processing...' : 'Accept'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              
              {/* Additional Info */}
              <View style={styles.offerFooter}>
                <MaterialCommunityIcons name="information-outline" size={14} color="#8E8E93" />
                <Text style={styles.offerFooterText}>
                  Accepting this offer will assign you to complete all deliveries in this route
                </Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  // Loading State
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
  
  // Visual Header
  headerCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  headerGradient: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Stats Card
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  statsContent: {
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statDivider: {
    width: 60,
    height: 1,
    backgroundColor: '#E1E5E9',
    marginVertical: 12,
  },
  statsNote: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 16,
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
    marginTop: 20,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  refreshButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  refreshButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  
  // Offer Cards
  offerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  
  // Offer Header
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  offerInfo: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  offerDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFECB3',
  },
  offerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 4,
  },
  
  // Route Details
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  routeMetric: {
    alignItems: 'center',
    flex: 1,
  },
  routeMetricLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
    marginBottom: 2,
    textAlign: 'center',
  },
  routeMetricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  
  // Route Preview
  routePreview: {
    marginBottom: 20,
  },
  routePreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  locationsList: {
    gap: 6,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 8,
    flex: 1,
  },
  moreLocationsText: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
    marginLeft: 16,
    marginTop: 4,
  },
  
  // Actions
  offerActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  declineButton: {
    backgroundColor: 'white',
    borderColor: '#FF3B30',
  },
  acceptButton: {
    borderWidth: 0,
    overflow: 'hidden',
  },
  acceptButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  declineButtonText: {
    color: '#FF3B30',
  },
  acceptButtonText: {
    color: 'white',
  },
  
  // Footer
  offerFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
  },
  offerFooterText: {
    fontSize: 11,
    color: '#8E8E93',
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
}); 
// export default withScreenLayout(OffersScreen, { title: 'Offers' });
export default OffersScreen;
