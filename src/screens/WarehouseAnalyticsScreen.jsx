import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, View, Text, ScrollView, ActivityIndicator, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { fetchStockTurnover, fetchSpaceUsage, fetchReceivingSpeed, fetchInventoryAging, fetchABCAnalysis, fetchSlowMovers } from '../api/warehouseAnalytics';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import InternalHeader from '../components/InternalHeader';
import { useSettings } from '../context/SettingsContext';

const screenWidth = Dimensions.get('window').width - 40;

const chartConfig = {
  backgroundGradientFrom: '#F8F9FA',
  backgroundGradientTo: '#FFFFFF',
  backgroundGradientFromOpacity: 0,
  backgroundGradientToOpacity: 0,
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  strokeWidth: 3,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  propsForDots: {
    r: "4",
    strokeWidth: "2",
    stroke: "#007AFF"
  },
  propsForBackgroundLines: {
    strokeDasharray: "",
    stroke: "#E1E5E9",
    strokeWidth: 1
  },
  propsForLabels: {
    fontSize: 12,
    fontFamily: "System"
  }
};

const pieChartConfig = {
  backgroundColor: 'transparent',
  backgroundGradientFrom: 'transparent',
  backgroundGradientTo: 'transparent',
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
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
        {/* Enhanced Period Selector */}
        <View style={styles.periodSelectorContainer}>
          <Text style={styles.sectionTitle}>Analytics Period</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodSelector}>
            {['day', 'week', 'month', 'year', 'all'].map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.periodButton, period === p && styles.periodButtonActive]}
                onPress={() => updatePeriod(p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {/* KPI Cards Row */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconContainer}>
              <MaterialCommunityIcons name="package-variant" size={24} color="#007AFF" />
            </View>
            <Text style={styles.kpiValue}>{usage?.totalSkus || 0}</Text>
            <Text style={styles.kpiLabel}>Total SKUs</Text>
          </View>
          
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconContainer}>
              <MaterialCommunityIcons name="cube-outline" size={24} color="#34C759" />
            </View>
            <Text style={styles.kpiValue}>{usage?.totalQuantity || 0}</Text>
            <Text style={styles.kpiLabel}>Total Quantity</Text>
          </View>
          
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconContainer}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9500" />
            </View>
            <Text style={styles.kpiValue}>{speed?.averageTime || 'N/A'}</Text>
            <Text style={styles.kpiLabel}>Avg Processing</Text>
          </View>
        </View>

        {/* Stock Turnover Chart */}
        <View style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="chart-line" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Stock Turnover</Text>
          </View>
          {turnoverLabels.length > 0 ? (
            <View style={styles.chartContainer}>
              <LineChart
                data={{ 
                  labels: turnoverLabels.slice(-6), // Show last 6 data points
                  datasets: [{ 
                    data: turnoverData.slice(-6),
                    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                    strokeWidth: 3
                  }] 
                }}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={false}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="chart-line-variant" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No turnover data available</Text>
              <Text style={styles.emptyStateSubtext}>Data will appear as inventory moves</Text>
            </View>
          )}
        </View>

        {/* ABC Analysis */}
        {pieData.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="chart-pie" size={20} color="#FF9500" />
              <Text style={styles.cardTitle}>ABC Analysis</Text>
            </View>
            <View style={styles.chartContainer}>
              <PieChart
                data={pieData}
                width={screenWidth - 32}
                height={200}
                chartConfig={pieChartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          </View>
        )}

        {/* Slow Movers */}
        <View style={styles.listCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="snail" size={20} color="#FF3B30" />
            <Text style={styles.cardTitle}>Slow Moving Items</Text>
          </View>
          {slow.length > 0 ? (
            <View style={styles.slowMoversContainer}>
              {slow.slice(0, 5).map((item, index) => (
                <View key={item.itemId} style={styles.slowMoverItem}>
                  <View style={styles.slowMoverRank}>
                    <Text style={styles.slowMoverRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.slowMoverInfo}>
                    <Text style={styles.slowMoverItemId}>{item.itemId}</Text>
                    <Text style={styles.slowMoverCount}>
                      {item.movementCount} movement{item.movementCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              ))}
              {slow.length > 5 && (
                <Text style={styles.moreItemsText}>+{slow.length - 5} more items</Text>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="check-circle-outline" size={48} color="#34C759" />
              <Text style={styles.emptyStateText}>No slow movers detected</Text>
              <Text style={styles.emptyStateSubtext}>All items are moving well</Text>
            </View>
          )}
        </View>

        {/* Space Usage (Enhanced) */}
        {settings.enableWarehouseHeatmap ? (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Warehouse3DHeatmapView')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#007AFF', '#0056CC']}
              style={styles.actionCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.actionCardContent}>
                <MaterialCommunityIcons name="view-grid-plus" size={32} color="white" />
                <View style={styles.actionCardText}>
                  <Text style={styles.actionCardTitle}>Warehouse Heatmap</Text>
                  <Text style={styles.actionCardSubtitle}>View 3D space utilization</Text>
                </View>
                <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Main Container
  screen: { 
    flex: 1, 
    backgroundColor: '#F8F9FA',
  },
  container: { 
    padding: 20,
    paddingBottom: 40,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },

  // Section Titles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },

  // Period Selector
  periodSelectorContainer: {
    marginBottom: 24,
  },
  periodSelector: {
    flexDirection: 'row',
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  periodButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },

  // KPI Cards
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  kpiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Chart Cards
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  listCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  chart: {
    borderRadius: 12,
    marginVertical: 8,
  },

  // Empty States
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },

  // Slow Movers
  slowMoversContainer: {
    marginTop: 8,
  },
  slowMoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  slowMoverRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  slowMoverRankText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  slowMoverInfo: {
    flex: 1,
  },
  slowMoverItemId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  slowMoverCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  moreItemsText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },

  // Action Card (Heatmap)
  actionCard: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  actionCardGradient: {
    padding: 20,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCardText: {
    flex: 1,
    marginLeft: 16,
  },
  actionCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  actionCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default WarehouseAnalyticsScreen;
