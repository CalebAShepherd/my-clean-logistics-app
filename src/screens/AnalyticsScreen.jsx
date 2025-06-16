// import withScreenLayout from '../components/withScreenLayout';
import React, { useState, useContext, useEffect } from 'react';
import { SafeAreaView, View, Text, ActivityIndicator, StyleSheet, ScrollView, Dimensions, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { fetchOnTimeLate, fetchCompletedCount, fetchDeliveryTrends, fetchForecast, fetchDeliveryAnomalies } from '../api/analytics';
import { LineChart } from 'react-native-chart-kit';
import InternalHeader from '../components/InternalHeader';

const screenWidth = Dimensions.get('window').width - 40;
const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  strokeWidth: 3,
  decimalPlaces: 0,
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#007AFF',
    fill: '#007AFF'
  },
  propsForBackgroundLines: {
    strokeDasharray: '',
    stroke: '#E1E5E9',
    strokeWidth: 1
  },
  propsForLabels: {
    fontSize: 12,
    fontWeight: '500'
  }
};

function AnalyticsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [range, setRange] = useState('week');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7*24*60*60*1000));
  const [endDate, setEndDate] = useState(new Date());
  const [stats, setStats] = useState(null);
  const [completed, setCompleted] = useState(null);
  const [trends, setTrends] = useState([]);
  const [forecastData, setForecastData] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const loadAnalytics = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    
    try {
      const [s, c, t, f, a] = await Promise.all([
        fetchOnTimeLate(userToken, startDate, endDate),
        fetchCompletedCount(userToken, startDate, endDate),
        fetchDeliveryTrends(userToken, startDate, endDate, range),
        fetchForecast(userToken, startDate, endDate, range),
        fetchDeliveryAnomalies(userToken, startDate, endDate)
      ]);
      setStats(s);
      setCompleted(c);
      setTrends(t);
      setForecastData(f);
      setAnomalies(a);
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [userToken, startDate, endDate, range]);

  const onRefresh = () => {
    loadAnalytics(true);
  };

  const getTimeRangeLabel = () => {
    switch(range) {
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case 'year': return 'Last Year';
      case 'all': return 'All Time';
      default: return 'Custom Range';
    }
  };

  const calculateOnTimePercentage = () => {
    if (!stats || (!stats.onTime && !stats.late)) return 0;
    const total = stats.onTime + stats.late;
    return total > 0 ? Math.round((stats.onTime / total) * 100) : 0;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Analytics" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const labels = trends.map(item => item.period);
  const dataPoints = trends.map(item => item.count);
  const onTimePercentage = calculateOnTimePercentage();

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Analytics" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="chart-line" size={32} color="#007AFF" />
          </View>
          <Text style={styles.headerTitle}>Delivery Analytics</Text>
          <Text style={styles.headerSubtitle}>Track performance and identify trends</Text>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <View style={styles.timeRangeButtons}>
            {['week', 'month', 'year', 'all'].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.timeButton, range === r && styles.timeButtonActive]}
                onPress={() => updateDates(r)}
                activeOpacity={0.7}
              >
                {range === r && (
                  <LinearGradient
                    colors={['#007AFF', '#5856D6']}
                    style={styles.timeButtonGradient}
                  />
                )}
                <Text style={[styles.timeButtonText, range === r && styles.timeButtonTextActive]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.selectedRange}>{getTimeRangeLabel()}</Text>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>Key Performance Metrics</Text>
          
          <View style={styles.metricsGrid}>
            {/* On-Time Performance */}
            <View style={styles.metricCard}>
              <LinearGradient
                colors={['#34C759', '#30D158']}
                style={styles.metricIconContainer}
              >
                <MaterialCommunityIcons name="check-circle" size={24} color="white" />
              </LinearGradient>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{onTimePercentage}%</Text>
                <Text style={styles.metricLabel}>On-Time Rate</Text>
                <Text style={styles.metricDetail}>
                  {stats?.onTime || 0} of {(stats?.onTime || 0) + (stats?.late || 0)} deliveries
                </Text>
              </View>
            </View>

            {/* Total Deliveries */}
            <View style={styles.metricCard}>
              <LinearGradient
                colors={['#007AFF', '#5856D6']}
                style={styles.metricIconContainer}
              >
                <MaterialCommunityIcons name="truck-delivery" size={24} color="white" />
              </LinearGradient>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{completed?.total || 0}</Text>
                <Text style={styles.metricLabel}>Total Completed</Text>
                <Text style={styles.metricDetail}>Deliveries completed</Text>
              </View>
            </View>

            {/* Late Deliveries */}
            <View style={styles.metricCard}>
              <LinearGradient
                colors={['#FF3B30', '#FF6B6B']}
                style={styles.metricIconContainer}
              >
                <MaterialCommunityIcons name="clock-alert" size={24} color="white" />
              </LinearGradient>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{stats?.late || 0}</Text>
                <Text style={styles.metricLabel}>Late Deliveries</Text>
                <Text style={styles.metricDetail}>Behind schedule</Text>
              </View>
            </View>

            {/* Anomalies */}
            <View style={styles.metricCard}>
              <LinearGradient
                colors={['#FF9500', '#FFAD33']}
                style={styles.metricIconContainer}
              >
                <MaterialCommunityIcons name="alert-circle" size={24} color="white" />
              </LinearGradient>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{anomalies?.length || 0}</Text>
                <Text style={styles.metricLabel}>Anomalies</Text>
                <Text style={styles.metricDetail}>Detected issues</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Delivery Trends Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <MaterialCommunityIcons name="trending-up" size={20} color="#007AFF" />
            <Text style={styles.chartTitle}>Delivery Trends</Text>
          </View>
          
          {labels.length > 0 ? (
            <View style={styles.chartWrapper}>
              <LineChart
                data={{ 
                  labels: labels.slice(-7), // Show last 7 data points
                  datasets: [{ 
                    data: dataPoints.slice(-7),
                    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                    strokeWidth: 3
                  }] 
                }}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withHorizontalLabels={true}
                withVerticalLabels={true}
                withDots={true}
                withShadow={false}
              />
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialCommunityIcons name="chart-line" size={48} color="#C7C7CC" />
              <Text style={styles.noDataText}>No trend data available</Text>
              <Text style={styles.noDataSubtext}>Data will appear once deliveries are recorded</Text>
            </View>
          )}
        </View>

        {/* Forecast */}
        <View style={styles.forecastContainer}>
          <View style={styles.forecastHeader}>
            <MaterialCommunityIcons name="crystal-ball" size={20} color="#5856D6" />
            <Text style={styles.forecastTitle}>Forecast</Text>
          </View>
          
          {forecastData?.forecast ? (
            <View style={styles.forecastCard}>
              <LinearGradient
                colors={['#5856D6', '#8B5CF6']}
                style={styles.forecastGradient}
              >
                <View style={styles.forecastContent}>
                  <Text style={styles.forecastValue}>{forecastData.forecast.count}</Text>
                  <Text style={styles.forecastLabel}>
                    Expected deliveries next {forecastData.forecast.period}
                  </Text>
                </View>
                <MaterialCommunityIcons name="trending-up" size={32} color="white" />
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.noForecastContainer}>
              <MaterialCommunityIcons name="crystal-ball" size={32} color="#C7C7CC" />
              <Text style={styles.noForecastText}>No forecast available</Text>
              <Text style={styles.noForecastSubtext}>Need more historical data</Text>
            </View>
          )}
        </View>

        {/* Anomalies Section */}
        <View style={styles.anomaliesContainer}>
          <View style={styles.anomaliesHeader}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF9500" />
            <Text style={styles.anomaliesTitle}>Delivery Anomalies</Text>
          </View>
          
          {anomalies && anomalies.length > 0 ? (
            <View style={styles.anomaliesList}>
              {anomalies.slice(0, 5).map((item, index) => (
                <View key={item.id || index} style={styles.anomalyItem}>
                  <View style={styles.anomalyIcon}>
                    <MaterialCommunityIcons name="alert" size={16} color="#FF9500" />
                  </View>
                  <View style={styles.anomalyContent}>
                    <Text style={styles.anomalyId}>Delivery #{item.id}</Text>
                    <Text style={styles.anomalyTime}>
                      Transit time: {(+item.transitsecs/3600).toFixed(1)}h ({'>'}2σ above mean)
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={16} color="#C7C7CC" />
                </View>
              ))}
              
              {anomalies.length > 5 && (
                <TouchableOpacity style={styles.viewMoreButton} activeOpacity={0.7}>
                  <Text style={styles.viewMoreText}>View {anomalies.length - 5} more anomalies</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noAnomaliesContainer}>
              <MaterialCommunityIcons name="check-circle" size={32} color="#34C759" />
              <Text style={styles.noAnomaliesText}>No anomalies detected</Text>
              <Text style={styles.noAnomaliesSubtext}>All deliveries are performing normally</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Section Titles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  
  // Time Range Section
  timeRangeContainer: {
    marginBottom: 32,
  },
  
  timeRangeButtons: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  
  timeButton: {
    flex: 1,
    position: 'relative',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  
  timeButtonActive: {
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  timeButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },
  
  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    zIndex: 1,
  },
  
  timeButtonTextActive: {
    color: 'white',
  },
  
  selectedRange: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Metrics Section
  metricsContainer: {
    marginBottom: 32,
  },
  
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  metricCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  metricContent: {
    // Content styling
  },
  
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  
  metricDetail: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  // Chart Section
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  
  chartWrapper: {
    alignItems: 'center',
  },
  
  chart: {
    borderRadius: 12,
  },
  
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 12,
    marginBottom: 4,
  },
  
  noDataSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },
  
  // Forecast Section
  forecastContainer: {
    marginBottom: 32,
  },
  
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  forecastTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  
  forecastCard: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  
  forecastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderRadius: 16,
  },
  
  forecastContent: {
    flex: 1,
  },
  
  forecastValue: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  
  forecastLabel: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
    opacity: 0.9,
  },
  
  noForecastContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  
  noForecastText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 12,
    marginBottom: 4,
  },
  
  noForecastSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },
  
  // Anomalies Section
  anomaliesContainer: {
    marginBottom: 32,
  },
  
  anomaliesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  anomaliesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  
  anomaliesList: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  
  anomalyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  
  anomalyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  anomalyContent: {
    flex: 1,
  },
  
  anomalyId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  
  anomalyTime: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  
  viewMoreText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 4,
  },
  
  noAnomaliesContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  
  noAnomaliesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 12,
    marginBottom: 4,
  },
  
  noAnomaliesSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },
});
// export default withScreenLayout(AnalyticsScreen, { title: 'Analytics' });
export default AnalyticsScreen;
