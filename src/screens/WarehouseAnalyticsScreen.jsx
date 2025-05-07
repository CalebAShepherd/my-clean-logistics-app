// import withScreenLayout from '../components/withScreenLayout';
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Dimensions, Button } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { fetchStockTurnover, fetchSpaceUsage, fetchReceivingSpeed } from '../api/warehouseAnalytics';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width - 32;
const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
  strokeWidth: 2,
  decimalPlaces: 0,
};

function WarehouseAnalyticsScreen() {
  const { userToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [turnover, setTurnover] = useState([]);
  const [usage, setUsage] = useState(null);
  const [speed, setSpeed] = useState(null);

  const updatePeriod = (p) => {
    setPeriod(p);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [t, u, s] = await Promise.all([
          fetchStockTurnover(userToken, period),
          fetchSpaceUsage(userToken),
          fetchReceivingSpeed(userToken)
        ]);
        setTurnover(t);
        setUsage(u);
        setSpeed(s);
      } catch (err) {
        console.error('Warehouse analytics error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userToken, period]);

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  const turnoverLabels = turnover.map(pt => pt.period);
  const turnoverData = turnover.map(pt => pt.count);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.buttonRow}>
        {['day', 'week', 'month', 'year', 'all'].map(p => (
          <Button key={p} title={p.charAt(0).toUpperCase() + p.slice(1)} onPress={() => updatePeriod(p)} />
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Stock Turnover ({period.charAt(0).toUpperCase() + period.slice(1)})</Text>
        {turnoverLabels.length > 0 ? (
          <LineChart
            data={{ labels: turnoverLabels, datasets: [{ data: turnoverData }] }}
            width={screenWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        ) : <Text>No data available</Text>}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Space Usage</Text>
        <Text>Total SKUs: {usage?.totalSkus}</Text>
        <Text>Total Quantity: {usage?.totalQuantity}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Receiving Speed</Text>
        <Text>Avg Processing Time: {speed?.averageTime}</Text>
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
  chart: { borderRadius: 8 },
}); 
// export default withScreenLayout(WarehouseAnalyticsScreen, { title: 'WarehouseAnalytics' });
export default WarehouseAnalyticsScreen;
