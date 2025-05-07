// import withScreenLayout from '../components/withScreenLayout';
import React, { useState, useContext, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Button, ScrollView, Dimensions } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { fetchOnTimeLate, fetchCompletedCount, fetchDeliveryTrends } from '../api/analytics';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width - 32;
const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
  strokeWidth: 2,
  decimalPlaces: 0,
};

function AnalyticsScreen() {
  const { userToken } = useContext(AuthContext);
  const [range, setRange] = useState('week'); // 'week'|'month'|'year'|'all'
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7*24*60*60*1000));
  const [endDate, setEndDate] = useState(new Date());
  const [stats, setStats] = useState(null);
  const [completed, setCompleted] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  const updateDates = (r) => {
    let start;
    switch(r) {
      case 'week': start = new Date(Date.now() - 7*24*60*60*1000); break;
      case 'month': start = new Date(Date.now() - 30*24*60*60*1000); break;
      case 'year': start = new Date(Date.now() - 365*24*60*60*1000); break;
      default: start = new Date(0);
    }
    setRange(r);
    setStartDate(start);
    setEndDate(new Date());
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, c, t] = await Promise.all([
          fetchOnTimeLate(userToken, startDate, endDate),
          fetchCompletedCount(userToken, startDate, endDate),
          fetchDeliveryTrends(userToken, startDate, endDate, range)
        ]);
        setStats(s);
        setCompleted(c);
        setTrends(t);
      } catch (e) {
        console.error('Analytics load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userToken, startDate, endDate, range]);

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  const labels = trends.map(item => item.period);
  const dataPoints = trends.map(item => item.count);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.buttonRow}>
        {['week','month','year','all'].map(r => (
          <Button key={r} title={r.charAt(0).toUpperCase()+r.slice(1)} onPress={() => updateDates(r)} />
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>On-Time vs Late</Text>
        <Text>On-Time: {stats.onTime}</Text>
        <Text>Late: {stats.late}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Completed Deliveries</Text>
        <Text>Total: {completed.total}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Delivery Trends</Text>
        {labels.length > 0 ? (
          <LineChart
            data={{ labels, datasets: [{ data: dataPoints }] }}
            width={screenWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: 8 }}
          />
        ) : <Text>No data</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
}); 
// export default withScreenLayout(AnalyticsScreen, { title: 'Analytics' });
