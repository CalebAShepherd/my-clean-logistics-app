// import withScreenLayout from '../components/withScreenLayout';
import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, View, Text, ScrollView, ActivityIndicator, StyleSheet, Dimensions, Button, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { fetchStockTurnover, fetchSpaceUsage, fetchReceivingSpeed, fetchInventoryAging, fetchABCAnalysis, fetchSlowMovers } from '../api/warehouseAnalytics';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import InternalHeader from '../components/InternalHeader';
import { useSettings } from '../context/SettingsContext';

const screenWidth = Dimensions.get('window').width - 32;
const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
  strokeWidth: 2,
  decimalPlaces: 0,
};

function WarehouseAnalyticsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [turnover, setTurnover] = useState([]);
  const [usage, setUsage] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [aging, setAging] = useState([]);
  const [abc, setAbc] = useState([]);
  const [slow, setSlow] = useState([]);

  const updatePeriod = (p) => {
    setPeriod(p);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [t, u, s, a, b, sm] = await Promise.all([
          fetchStockTurnover(userToken, period),
          fetchSpaceUsage(userToken),
          fetchReceivingSpeed(userToken),
          fetchInventoryAging(userToken),
          fetchABCAnalysis(userToken),
          fetchSlowMovers(userToken)
        ]);
        setTurnover(t);
        setUsage(u);
        setSpeed(s);
        setAging(a);
        setAbc(b);
        setSlow(sm);
      } catch (err) {
        console.error('Warehouse analytics error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userToken, period]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator style={styles.center} size='large' />
      </SafeAreaView>
    );
  }

  const turnoverLabels = turnover.map(pt => pt.period);
  const turnoverData = turnover.map(pt => pt.count);
  const agingLabels = aging.map(item => item.bucket);
  const agingData = aging.map(item => item.total);
  const bucketCounts = abc.reduce((acc, item) => {
    acc[item.bucket] = (acc[item.bucket] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(bucketCounts).map(([bucket, count], idx) => ({
    name: bucket,
    population: count,
    color: ['#ff6384','#36a2eb','#ffce56'][idx % 3],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  return (
    <SafeAreaView style={styles.screen}>
      <InternalHeader navigation={navigation} title='Warehouse Analytics' />
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
          <Text style={styles.cardTitle}>Slow Movers (Low Movement Count)</Text>
          {slow.length > 0 ? (
            slow.slice(0, 10).map(item => (
              <Text key={item.itemId}>{item.itemId}: {item.movementCount}</Text>
            ))
          ) : (
            <Text>No slow movers</Text>
          )}
        </View>
        {settings.enableWarehouseHeatmap ? (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('WarehouseHeatmap')}
          >
            <Text style={styles.cardTitle}>Space Usage</Text>
            <Text>Total SKUs: {usage?.totalSkus}</Text>
            <Text>Total Quantity: {usage?.totalQuantity}</Text>
            <Text style={{ marginTop: 8, color: '#007AFF' }}>View Heatmap</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Space Usage</Text>
            <Text>Total SKUs: {usage?.totalSkus}</Text>
            <Text>Total Quantity: {usage?.totalQuantity}</Text>
          </View>
        )}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Receiving Speed</Text>
          <Text>Avg Processing Time: {speed?.averageTime}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  chart: { borderRadius: 8 },
}); 
// export default withScreenLayout(WarehouseAnalyticsScreen, { title: 'WarehouseAnalytics' });
export default WarehouseAnalyticsScreen;
