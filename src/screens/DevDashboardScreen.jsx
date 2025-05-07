// import withScreenLayout from '../components/withScreenLayout';
import React, { useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

function DevDashboardScreen({ navigation }) {
  const { settings } = useSettings();

  // Wait for settings to load
  if (!settings) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dev</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <MaterialCommunityIcons name="account-circle" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionList}>
        <Text style={styles.placeholder}>
          Welcome, Developer!{"\n"}
          This dashboard is under construction.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#004080',
    padding: 16,
    borderBottomEndRadius: 16,
    borderBottomStartRadius: 16,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  sectionList: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  placeholder: { fontSize: 18, color: '#666', textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
}); 
//  export default withScreenLayout(DevDashboardScreen, { title: 'DevDashboard' });
export default DevDashboardScreen;
