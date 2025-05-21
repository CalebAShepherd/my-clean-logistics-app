//import withScreenLayout from '../components/withScreenLayout';
import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';

function TransportManagementScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const role = user?.role;
  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Transport Management" />
      
      <View style={styles.grid}>
        {['admin', 'dispatcher'].includes(role) && (
          <>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Drivers')}
            >
              <MaterialCommunityIcons name="account-group" size={40} />
              <Text style={styles.cardText}>Manage Transporters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Assign Transporters')}
            >
              <MaterialCommunityIcons name="account-switch" size={40} />
              <Text style={styles.cardText}>Assign Transporters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Vehicle Tracking')}
            >
              <MaterialCommunityIcons name="map-marker-path" size={40} />
              <Text style={styles.cardText}>Vehicle Tracking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Route Optimization')}
            >
              <MaterialCommunityIcons name="directions" size={40} />
              <Text style={styles.cardText}>Route Optimization</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Inspection Logs')}
            >
              <MaterialCommunityIcons name="clipboard-check" size={40} />
              <Text style={styles.cardText}>Inspection Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Transporter Documents')}
            >
              <MaterialCommunityIcons name="file-document" size={40} />
              <Text style={styles.cardText}>Transporter Documents</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16
  },  
  title: {
    fontSize: 24,
    marginBottom: 20,
  },  
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 16
  },  
  card: {
    width: 172,
    height: 120,
    flex: 0,
    backgroundColor: '#ffffff',
    shadowColor: '#171717',
    shadowOffset: {width: -2, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 3,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },  
  cardText: {
    marginTop: 8,
    textAlign: 'center',
  },  
}); 
// export default withScreenLayout(TransportManagementScreen, { title: 'TransportManagement' });
export default TransportManagementScreen;
