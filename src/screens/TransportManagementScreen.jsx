//import withScreenLayout from '../components/withScreenLayout';
import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

function TransportManagementScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const role = user?.role;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transport Management</Text>
      <View style={styles.grid}>
        {['admin', 'dispatcher'].includes(role) && (
          <>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Manage Transporters')}
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
              <MaterialCommunityIcons name="history" size={40} />
              <Text style={styles.cardText}>Route Optimization & History</Text>
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
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Analytics')}
            >
              <MaterialCommunityIcons name="chart-line" size={40} />
              <Text style={styles.cardText}>Analytics & Reports</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },  
  title: {
    fontSize: 24,
    marginBottom: 20,
  },  
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },  
  card: {
    width: 120,
    height: 120,
    backgroundColor: '#ffffff',
    shadowColor: '#171717',
    shadowOffset: {width: -2, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 3,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
    padding: 6,
  },  
  cardText: {
    marginTop: 8,
    textAlign: 'center',
  },  
}); 
// export default withScreenLayout(TransportManagementScreen, { title: 'TransportManagement' });
