// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useContext, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { fetchDeliveryTrends, fetchCompletedCount } from '../api/analytics';

function DispatcherDashboardScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [completedCount, setCompletedCount] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCompletedCount(userToken),
      fetchDeliveryTrends(userToken)
    ])
      .then(([completed, trends]) => {
        setCompletedCount(completed.count);
        setTrendData(trends);
      })
      .catch(err => console.error('Error loading dispatcher metrics:', err))
      .finally(() => setLoading(false));
  }, [userToken]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dispatch</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <MaterialCommunityIcons name="account-circle" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.center} size="large" />
      ) : (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statNumber}>{completedCount}</Text>
            <Text style={styles.statSub}>Shipments</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Trends</Text>
            {/* You could render a sparkline or summary count here */}
            <Text style={styles.statNumber}>{trendData.length}</Text>
            <Text style={styles.statSub}>Entries</Text>
          </View>
        </View>
      )}

      <View style={styles.sectionList}>
        <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Shipments')}>
          <MaterialCommunityIcons name="package-variant" size={24} color="#333" />
          <Text style={styles.listText}>View Shipments</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.analyticsRow} onPress={() => navigation.navigate('Analytics')}>
        <MaterialCommunityIcons name="chart-line" size={24} color="#333" />
        <Text style={styles.analyticsText}>Analytics</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#004080', padding: 16, borderBottomEndRadius: 16, borderBottomStartRadius: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', marginHorizontal: 4, borderRadius: 8, padding: 16, alignItems: 'center' },
  statLabel: { fontSize: 16, color: '#666' },
  statNumber: { fontSize: 36, fontWeight: 'bold', marginVertical: 8 },
  statSub: { fontSize: 14, color: '#999' },
  sectionList: { marginHorizontal: 16 },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff', paddingHorizontal: 16 },
  listText: { fontSize: 16, marginLeft: 8 },
  analyticsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff', borderRadius: 8, width: '100%' },
  analyticsText: { fontSize: 16, marginLeft: 8 },
}); 
// export default withScreenLayout(DispatcherDashboardScreen, { title: 'DispatcherDashboard' });
export default DispatcherDashboardScreen;
