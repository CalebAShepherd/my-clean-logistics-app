import React, { useState, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { spaceOptimizationAPI } from '../api/spaceOptimization';
import InternalHeader from '../components/InternalHeader';
import StatusBadge from '../components/StatusBadge';

const { width } = Dimensions.get('window');

export default function SpaceTrendAnalysisScreen({ navigation, route }) {
  const { userToken } = useContext(AuthContext);
  const { warehouseId, facilityId } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trendsData, setTrendsData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('6months');

  const timeframes = [
    { key: '3months', label: '3 Months', value: 3 },
    { key: '6months', label: '6 Months', value: 6 },
    { key: '1year', label: '1 Year', value: 12 },
    { key: '2years', label: '2 Years', value: 24 }
  ];

  const loadTrendsData = async () => {
    try {
      setError(null);
      let data;
      try {
        data = await spaceOptimizationAPI.getSpaceTrendAnalysis({
          warehouseId,
          facilityId,
          timeframe: selectedTimeframe
        });
             } catch (apiError) {
         console.info('Using demo data - Space trends API not yet implemented');
        
        // Mock data for development
        data = {
          overallTrend: {
            growthRate: 8.5
          },
          projections: {
            monthsToCapacity: 4,
            forecasts: [
              {
                date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                projectedUtilization: 78.5,
                estimatedItems: 15750
              },
              {
                date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                projectedUtilization: 82.3,
                estimatedItems: 16400
              },
              {
                date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                projectedUtilization: 87.1,
                estimatedItems: 17200
              }
            ]
          },
          historicalData: [
            {
              period: 'Last Month',
              changePercent: 5.2,
              averageUtilization: 72.5,
              peakUtilization: 89.3,
              totalItems: 14250
            },
            {
              period: '2 Months Ago',
              changePercent: 3.8,
              averageUtilization: 68.9,
              peakUtilization: 85.1,
              totalItems: 13850
            }
          ],
          recommendations: [
            {
              title: 'Capacity Expansion Planning',
              description: 'Current growth trends indicate expansion will be needed within 6 months.',
              impact: 'Prevent capacity bottlenecks',
              priority: 'HIGH'
            }
          ]
        };
      }
      
      setTrendsData(data);
    } catch (error) {
      console.error('Error loading trends data:', error);
      setError('Failed to load capacity trend analysis');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadTrendsData();
      setLoading(false);
    };
    initialize();
  }, [selectedTimeframe]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrendsData();
    setRefreshing(false);
  };

  const getTrendColor = (trend) => {
    if (trend > 10) return '#FF453A';
    if (trend > 5) return '#FF9500';
    if (trend > 0) return '#34C759';
    return '#8E8E93';
  };

  const getTrendIcon = (trend) => {
    if (trend > 5) return 'trending-up';
    if (trend > 0) return 'trending-neutral';
    return 'trending-down';
  };

  const formatProjection = (percentage) => {
    if (percentage > 85) return { text: 'Critical', color: '#FF453A' };
    if (percentage > 70) return { text: 'Warning', color: '#FF9500' };
    if (percentage > 50) return { text: 'Stable', color: '#34C759' };
    return { text: 'Optimal', color: '#00C7BE' };
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Capacity Trends" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="chart-line-variant" size={64} color="#FF453A" />
          <Text style={styles.errorTitle}>Analysis Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setError(null);
            loadTrendsData();
          }}>
            <Text style={styles.retryButtonText}>Retry Analysis</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Capacity Trends" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Analyzing capacity trends...</Text>
          <Text style={styles.loadingSubtext}>Processing historical data patterns</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Capacity Trends" />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          <Text style={styles.sectionTitle}>Analysis Period</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.timeframeScroll}
          >
            {timeframes.map((timeframe) => (
              <TouchableOpacity
                key={timeframe.key}
                style={[
                  styles.timeframeButton,
                  selectedTimeframe === timeframe.key && styles.timeframeButtonActive
                ]}
                onPress={() => setSelectedTimeframe(timeframe.key)}
              >
                <Text style={[
                  styles.timeframeButtonText,
                  selectedTimeframe === timeframe.key && styles.timeframeButtonTextActive
                ]}>
                  {timeframe.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {trendsData && (
          <>
            {/* Key Metrics */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <LinearGradient
                  colors={['#007AFF', '#0056CC']}
                  style={styles.metricGradient}
                >
                  <MaterialCommunityIcons name="chart-line" size={32} color="white" />
                  <View style={styles.metricContent}>
                    <Text style={styles.metricValue}>
                      {trendsData.overallTrend.growthRate.toFixed(1)}%
                    </Text>
                    <Text style={styles.metricLabel}>Growth Rate</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={getTrendIcon(trendsData.overallTrend.growthRate)} 
                    size={24} 
                    color="white" 
                  />
                </LinearGradient>
              </View>

              <View style={styles.metricCard}>
                <LinearGradient
                  colors={['#34C759', '#30D158']}
                  style={styles.metricGradient}
                >
                  <MaterialCommunityIcons name="calendar-month" size={32} color="white" />
                  <View style={styles.metricContent}>
                    <Text style={styles.metricValue}>
                      {trendsData.projections.monthsToCapacity || 'N/A'}
                    </Text>
                    <Text style={styles.metricLabel}>Months to 85%</Text>
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* Capacity Projections */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Capacity Projections</Text>
              
              {trendsData.projections.forecasts.map((forecast, index) => {
                const projection = formatProjection(forecast.projectedUtilization);
                return (
                  <View key={index} style={styles.projectionCard}>
                    <View style={styles.projectionHeader}>
                      <Text style={styles.projectionDate}>
                        {new Date(forecast.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </Text>
                      <StatusBadge status={projection.text} color={projection.color} />
                    </View>
                    
                    <View style={styles.projectionContent}>
                      <View style={styles.projectionMetric}>
                        <Text style={styles.projectionValue}>
                          {forecast.projectedUtilization.toFixed(1)}%
                        </Text>
                        <Text style={styles.projectionLabel}>Projected Utilization</Text>
                      </View>
                      
                      <View style={styles.projectionMetric}>
                        <Text style={styles.projectionValue}>
                          {forecast.estimatedItems.toLocaleString()}
                        </Text>
                        <Text style={styles.projectionLabel}>Est. Items</Text>
                      </View>
                    </View>
                    
                    <View style={styles.projectionBar}>
                      <View 
                        style={[
                          styles.projectionBarFill,
                          { 
                            width: `${Math.min(forecast.projectedUtilization, 100)}%`,
                            backgroundColor: projection.color
                          }
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Historical Trends */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Historical Analysis</Text>
              
              {trendsData.historicalData.map((period, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyPeriod}>{period.period}</Text>
                    <View style={styles.historyTrend}>
                      <MaterialCommunityIcons 
                        name={getTrendIcon(period.changePercent)} 
                        size={20} 
                        color={getTrendColor(period.changePercent)} 
                      />
                      <Text style={[
                        styles.historyTrendText,
                        { color: getTrendColor(period.changePercent) }
                      ]}>
                        {period.changePercent > 0 ? '+' : ''}{period.changePercent.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.historyStats}>
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatValue}>
                        {period.averageUtilization.toFixed(1)}%
                      </Text>
                      <Text style={styles.historyStatLabel}>Avg Utilization</Text>
                    </View>
                    
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatValue}>
                        {period.peakUtilization.toFixed(1)}%
                      </Text>
                      <Text style={styles.historyStatLabel}>Peak Utilization</Text>
                    </View>
                    
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatValue}>
                        {period.totalItems.toLocaleString()}
                      </Text>
                      <Text style={styles.historyStatLabel}>Items</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Recommendations */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Capacity Recommendations</Text>
              
              {trendsData.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationCard}>
                  <View style={styles.recommendationHeader}>
                    <MaterialCommunityIcons 
                      name="lightbulb-outline" 
                      size={24} 
                      color="#FF9500" 
                    />
                    <Text style={styles.recommendationTitle}>{rec.title}</Text>
                  </View>
                  
                  <Text style={styles.recommendationText}>{rec.description}</Text>
                  
                  {rec.impact && (
                    <View style={styles.recommendationImpact}>
                      <MaterialCommunityIcons name="trending-up" size={16} color="#34C759" />
                      <Text style={styles.recommendationImpactText}>{rec.impact}</Text>
                    </View>
                  )}
                  
                  {rec.priority && (
                    <View style={styles.recommendationFooter}>
                      <StatusBadge 
                        status={rec.priority} 
                        color={rec.priority === 'HIGH' ? '#FF453A' : '#FF9500'}
                      />
                      <TouchableOpacity style={styles.recommendationAction}>
                        <Text style={styles.recommendationActionText}>View Details</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Export Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Export & Share</Text>
              
              <View style={styles.exportContainer}>
                <TouchableOpacity style={styles.exportButton} onPress={() => {
                  Alert.alert('Export', 'PDF export will be available soon.');
                }}>
                  <MaterialCommunityIcons name="file-pdf-box" size={24} color="#FF453A" />
                  <Text style={styles.exportButtonText}>Export PDF</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.exportButton} onPress={() => {
                  Alert.alert('Export', 'Excel export will be available soon.');
                }}>
                  <MaterialCommunityIcons name="microsoft-excel" size={24} color="#34C759" />
                  <Text style={styles.exportButtonText}>Export Excel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7'
  },
  scrollView: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '600'
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 12
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  timeframeContainer: {
    margin: 16,
    marginBottom: 8
  },
  timeframeScroll: {
    marginTop: 12
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  timeframeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  timeframeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E'
  },
  timeframeButtonTextActive: {
    color: 'white'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12
  },
  section: {
    margin: 16,
    marginTop: 0
  },
  metricsContainer: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 8
  },
  metricCard: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 12,
    overflow: 'hidden'
  },
  metricGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  metricContent: {
    flex: 1,
    marginLeft: 12
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white'
  },
  metricLabel: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginTop: 2
  },
  projectionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  projectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  projectionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  projectionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  projectionMetric: {
    alignItems: 'center'
  },
  projectionValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E'
  },
  projectionLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2
  },
  projectionBar: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3
  },
  projectionBarFill: {
    height: '100%',
    borderRadius: 3
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  historyPeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  historyTrend: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  historyTrendText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4
  },
  historyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  historyStat: {
    alignItems: 'center'
  },
  historyStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E'
  },
  historyStatLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2
  },
  recommendationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8
  },
  recommendationText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 12
  },
  recommendationImpact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  recommendationImpactText: {
    fontSize: 14,
    color: '#34C759',
    marginLeft: 4,
    fontWeight: '500'
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  recommendationAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6
  },
  recommendationActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500'
  },
  exportContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginLeft: 8
  }
}); 