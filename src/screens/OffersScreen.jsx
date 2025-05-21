// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Button, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { listOffers, updateOffer } from '../api/offers';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import InternalHeader from '../components/InternalHeader';

function OffersScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const data = await listOffers(userToken);
        setOffers(data);
      } catch (e) {
        console.error('Error fetching offers:', e);
        Alert.alert('Error', 'Failed to load offers.');
      } finally {
        setLoading(false);
      }
    };
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
        navigation.navigate('RouteDetail', { routeId: offer?.Route?.id });
      }
    } catch (e) {
      console.error('Error updating offer:', e);
      Alert.alert('Error', 'Failed to update offer.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  if (offers.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Offers" />
        <View style={styles.center}>
          <Text>No pending offers.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Offers" />
      <FlatList
        data={offers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const route = item.Route;
          const createdAt = route?.createdAt ? new Date(route.createdAt).toLocaleString() : 'Unknown';
          const stops = Array.isArray(route?.RouteShipment) ? route.RouteShipment.length : 0;
          return (
            <View style={styles.card}>
              <Text style={styles.title}>Route from {createdAt}</Text>
              <Text>Stops: {stops}</Text>
              <View style={styles.buttons}>
                <Button
                  title="Accept"
                  onPress={() => handleDecision(item.id, 'accepted')}
                  disabled={updatingId === item.id}
                />
                <Button
                  title="Decline"
                  onPress={() => handleDecision(item.id, 'declined')}
                  disabled={updatingId === item.id}
                />
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 12, backgroundColor: '#fff', borderRadius: 6, elevation: 2 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  separator: { height: 12 }
}); 
// export default withScreenLayout(OffersScreen, { title: 'Offers' });
export default OffersScreen;
