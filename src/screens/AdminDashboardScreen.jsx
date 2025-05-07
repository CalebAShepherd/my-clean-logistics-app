// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useContext, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { fetchCompletedCount, fetchOnTimeLate } from '../api/analytics';

function AdminDashboardScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [completedCount, setCompletedCount] = useState(null);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [onTimeLate, setOnTimeLate] = useState(null);
  const [loadingOnTimeLate, setLoadingOnTimeLate] = useState(false);

  useEffect(() => {
    setLoadingCompleted(true);
    fetchCompletedCount(userToken)
      .then(data => setCompletedCount(data.count))
      .catch(err => console.error('Error loading completed count:', err))
      .finally(() => setLoadingCompleted(false));

    setLoadingOnTimeLate(true);
    fetchOnTimeLate(userToken)
      .then(data => setOnTimeLate(data))
      .catch(err => console.error('Error loading on-time stats:', err))
      .finally(() => setLoadingOnTimeLate(false));
  }, [userToken]);

  if (!settings) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <MaterialCommunityIcons name="account-circle" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Completed</Text>
          {loadingCompleted ? (
            <ActivityIndicator size="large" color="#333" />
          ) : (
            <Text style={styles.statNumber}>{completedCount ?? '-'}</Text>
          )}
          <Text style={styles.statSub}>Shipments</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>On-Time</Text>
          {loadingOnTimeLate ? (
            <ActivityIndicator size="large" color="#333" />
          ) : (
            <Text style={styles.statNumber}>
              {onTimeLate ? Math.round((onTimeLate.onTime / (onTimeLate.onTime + onTimeLate.late)) * 100) + '%' : '-'}
            </Text>
          )}
          <Text style={styles.statSub}>Rate</Text>
        </View>
      </View>

      <View style={styles.sectionList}>
        <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Shipments')}>
          <MaterialCommunityIcons name="package-variant" size={24} color="#333" />
          <Text style={styles.listText}>View Shipments</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('User Management')}>
          <MaterialCommunityIcons name="account-group" size={24} color="#333" />
          <Text style={styles.listText}>Manage Users</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} />
        </TouchableOpacity>
        {settings.useThirdPartyCarriers && (
          <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Carrier Management')}>
            <MaterialCommunityIcons name="truck" size={24} color="#333" />
            <Text style={styles.listText}>Manage Carriers</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} />
          </TouchableOpacity>
        )}
        {settings.ownTransporters && (
          <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Transport Management')}>
            <MaterialCommunityIcons name="truck" size={24} color="#333" />
            <Text style={styles.listText}>Transport Management</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Analytics')}>
          <MaterialCommunityIcons name="chart-line" size={24} color="#333" />
          <Text style={styles.analyticsText}>Analytics</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} />
        </TouchableOpacity>
      </View>

      
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#004080', 
    padding: 16, 
    borderBottomEndRadius: 16, 
    borderBottomStartRadius: 16 
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginHorizontal: 16, 
    marginTop: 16,
    marginBottom: 16
  },
  statCard: { 
    flex: 1, 
    backgroundColor: '#fff', 
    marginHorizontal: 4, 
    borderRadius: 8, 
    padding: 16, 
    alignItems: 'center' 
  },
  statLabel: { 
    fontSize: 16, 
    color: '#666' 
  },
  statNumber: { 
    fontSize: 36, 
    fontWeight: 'bold', 
    marginVertical: 8 
  },
  statSub: { 
    fontSize: 14, 
    color: '#999' 
  },
  sectionList: { 
    marginHorizontal: 16 
  },
  listItem: { 
    flexDirection: 'row', 
    
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee', 
    backgroundColor: '#fff', 
    paddingHorizontal: 16 
  },
  listText: { 
    fontSize: 16, 
    marginLeft: 8 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  analyticsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#eee', 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    width: '100%' 
  },
  analyticsText: { 
    fontSize: 16, 
    marginLeft: 8 
  },
}); 
export default AdminDashboardScreen;
