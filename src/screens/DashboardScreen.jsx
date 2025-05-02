import React, { useContext } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function DashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const role = user?.role;
  const { settings } = useSettings();
  if (!settings) {
    return null;
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <View style={styles.grid}>
        {['admin','dispatcher'].includes(role) && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Shipments')}
          >
            <MaterialCommunityIcons name="package-variant" size={40} />
            <Text style={styles.cardText}>View Shipments</Text>
          </TouchableOpacity>
        )}
        {['admin'].includes(role) && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('User Management')}
          >
            <MaterialCommunityIcons name="account-group" size={40} />
            <Text style={styles.cardText}>Manage Users</Text>
          </TouchableOpacity>
        )}
        {role === 'dev' && settings.useThirdPartyCarriers && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Carrier Management')}
          >
            <MaterialCommunityIcons name="truck" size={40} />
            <Text style={styles.cardText}>Manage Carriers</Text>
          </TouchableOpacity>
        )}
        {role === 'dev' && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Company Settings')}
          >
            <MaterialCommunityIcons name="cog-box" size={40} />
            <Text style={styles.cardText}>Company Settings</Text>
          </TouchableOpacity>
        )}
        {['client','admin','dispatcher'].includes(role) && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Create Shipment')}
          >
            <MaterialCommunityIcons name="plus-box" size={40} />
            <Text style={styles.cardText}>Create Shipment</Text>
          </TouchableOpacity>
        )}
        {role === 'client' && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('My Shipments')}
          >
            <MaterialCommunityIcons name="format-list-bulleted" size={40} />
            <Text style={styles.cardText}>My Shipments</Text>
          </TouchableOpacity>
        )}
        {['client','admin','dispatcher'].includes(role) && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Track Shipment')}
          >
            <MaterialCommunityIcons name="map" size={40} />
            <Text style={styles.cardText}>Track Shipment</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Settings')}
        >
          <MaterialCommunityIcons name="cog" size={40} />
          <Text style={styles.cardText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
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
    padding: '6',
  },
  cardText: {
    marginTop: 8,
    textAlign: 'center',
  },
});
