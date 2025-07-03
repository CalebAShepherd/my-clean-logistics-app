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

export default function LayoutOptimizationScreen({ navigation, route }) {
  const { userToken } = useContext(AuthContext);
  const { warehouseId } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [layoutData, setLayoutData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState('overview'); // overview, movements, efficiency, recommendations

  const viewOptions = [
    { key: 'overview', label: 'Overview', icon: 'view-dashboard' },
    { key: 'movements', label: 'Movement Patterns', icon: 'swap-horizontal' },
    { key: 'efficiency', label: 'Zone Efficiency', icon: 'speedometer' },
    { key: 'recommendations', label: 'Recommendations', icon: 'lightbulb-outline' }
  ];

  const loadLayoutData = async () => {
    try {
      setError(null);
      let data;
      try {
        data = await spaceOptimizationAPI.getLayoutOptimization({ warehouseId });
             } catch (apiError) {
         console.info('Using demo data - Layout optimization API not yet implemented');
        
        // Mock data for development
        data = {
          overallEfficiency: 78.5,
          averageTravelDistance: 185,
          averagePickTime: 3.2,
          totalMovements: 1850,
          longestRoute: {
            from: 'Zone A1',
            to: 'Zone C5',
            distance: 280,
            time: 4.8
          },
          busiestZone: {
            name: 'Zone B',
            movements: 1250
          },
          topRecommendation: {
            title: 'Optimize Zone A Layout',
            timeSavings: 15
          },
          movementPatterns: [
            {
              fromZone: 'Zone A',
              toZone: 'Zone B',
              frequency: 125,
              distance: 150,
              averageTime: 2.5,
              efficiencyScore: 82,
              optimizationOpportunity: 'Consider relocating high-frequency items closer'
            },
            {
              fromZone: 'Zone B',
              toZone: 'Zone C',
              frequency: 98,
              distance: 200,
              averageTime: 3.1,
              efficiencyScore: 75
            }
          ],
          zoneEfficiency: [
            {
              name: 'Zone A',
              efficiencyScore: 85.2,
              dailyPicks: 450,
              avgTravelDistance: 120,
              avgPickTime: 2.8,
              bottlenecks: ['Narrow aisles', 'High shelf access']
            },
            {
              name: 'Zone B', 
              efficiencyScore: 78.9,
              dailyPicks: 380,
              avgTravelDistance: 165,
              avgPickTime: 3.2,
              bottlenecks: []
            },
            {
              name: 'Zone C',
              efficiencyScore: 72.1,
              dailyPicks: 290,
              avgTravelDistance: 210,
              avgPickTime: 3.8,
              bottlenecks: ['Long travel distances']
            }
          ],
          recommendations: [
            {
              title: 'Reorganize Zone A Layout',
              type: 'RELOCATION',
              priority: 'HIGH',
              description: 'Reduce aisle congestion and optimize item placement for better flow.',
              timeSavings: 18,
              efficiencyImprovement: 12,
              detailedAnalysis: 'Current layout causes bottlenecks during peak hours.'
            },
            {
              title: 'Install Zone B Express Lane',
              type: 'LAYOUT_OPTIMIZATION',
              priority: 'MEDIUM',
              description: 'Create dedicated express picking lane for high-velocity items.',
              timeSavings: 25,
              efficiencyImprovement: 8
            }
          ]
        };
      }
      
      setLayoutData(data);
    } catch (error) {
      console.error('Error loading layout data:', error);
      setError('Failed to load layout optimization data');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadLayoutData();
      setLoading(false);
    };
    initialize();
  }, [warehouseId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLayoutData();
    setRefreshing(false);
  };

  const getEfficiencyColor = (score) => {
    if (score >= 90) return '#34C759';
    if (score >= 75) return '#FFD60A';
    if (score >= 60) return '#FF9500';
    return '#FF453A';
  };

  const getEfficiencyRating = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  const formatDistance = (distance) => {
    if (distance < 1000) return `${distance.toFixed(0)}ft`;
    return `${(distance / 1000).toFixed(1)}k ft`;
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes.toFixed(0)}min`;
    return `${(minutes / 60).toFixed(1)}h`;
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Layout Optimization" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="floor-plan" size={64} color="#FF453A" />
          <Text style={styles.errorTitle}>Analysis Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setError(null);
            loadLayoutData();
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
        <InternalHeader navigation={navigation} title="Layout Optimization" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Analyzing warehouse layout...</Text>
          <Text style={styles.loadingSubtext}>Processing movement patterns and efficiency metrics</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderOverview = () => (
    <>
      {/* Key Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="speedometer" size={24} color="#007AFF" />
            <Text style={styles.metricValue}>{layoutData.overallEfficiency.toFixed(0)}%</Text>
            <Text style={styles.metricLabel}>Layout Efficiency</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="walk" size={24} color="#34C759" />
            <Text style={styles.metricValue}>{formatDistance(layoutData.averageTravelDistance)}</Text>
            <Text style={styles.metricLabel}>Avg Travel</Text>
          </View>
        </View>
        
        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9500" />
            <Text style={styles.metricValue}>{formatTime(layoutData.averagePickTime)}</Text>
            <Text style={styles.metricLabel}>Avg Pick Time</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="chart-line" size={24} color="#AF52DE" />
            <Text style={styles.metricValue}>{layoutData.totalMovements.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Daily Movements</Text>
          </View>
        </View>
      </View>

      {/* Efficiency Rating */}
      <View style={styles.ratingCard}>
        <LinearGradient
          colors={['#007AFF', '#0056CC']}
          style={styles.ratingGradient}
        >
          <View style={styles.ratingContent}>
            <Text style={styles.ratingTitle}>Overall Layout Rating</Text>
            <Text style={styles.ratingScore}>
              {getEfficiencyRating(layoutData.overallEfficiency)}
            </Text>
            <Text style={styles.ratingDescription}>
              Your warehouse layout is performing {getEfficiencyRating(layoutData.overallEfficiency).toLowerCase()}. 
              There are {layoutData.recommendations.length} optimization opportunities identified.
            </Text>
          </View>
          <View style={styles.ratingIcon}>
            <MaterialCommunityIcons 
              name={layoutData.overallEfficiency >= 75 ? 'thumb-up' : 'thumb-down'} 
              size={48} 
              color="white" 
            />
          </View>
        </LinearGradient>
      </View>

      {/* Quick Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Insights</Text>
        
        <View style={styles.insightCard}>
          <MaterialCommunityIcons name="map-marker-distance" size={24} color="#FF453A" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Longest Travel Route</Text>
            <Text style={styles.insightText}>
              {layoutData.longestRoute.from} → {layoutData.longestRoute.to}
            </Text>
            <Text style={styles.insightValue}>
              {formatDistance(layoutData.longestRoute.distance)} • {formatTime(layoutData.longestRoute.time)}
            </Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <MaterialCommunityIcons name="fire" size={24} color="#FF9500" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Busiest Zone</Text>
            <Text style={styles.insightText}>{layoutData.busiestZone.name}</Text>
            <Text style={styles.insightValue}>
              {layoutData.busiestZone.movements.toLocaleString()} movements/day
            </Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <MaterialCommunityIcons name="target" size={24} color="#34C759" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Top Optimization</Text>
            <Text style={styles.insightText}>
              {layoutData.topRecommendation.title}
            </Text>
            <Text style={styles.insightValue}>
              Est. {layoutData.topRecommendation.timeSavings} min/day savings
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderMovements = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Movement Pattern Analysis</Text>
      
      {layoutData.movementPatterns.map((pattern, index) => (
        <View key={index} style={styles.movementCard}>
          <View style={styles.movementHeader}>
            <View style={styles.movementRoute}>
              <View style={styles.movementZone}>
                <Text style={styles.movementZoneText}>{pattern.fromZone}</Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#8E8E93" />
              <View style={styles.movementZone}>
                <Text style={styles.movementZoneText}>{pattern.toZone}</Text>
              </View>
            </View>
            <Text style={styles.movementFrequency}>
              {pattern.frequency.toLocaleString()}/day
            </Text>
          </View>
          
          <View style={styles.movementStats}>
            <View style={styles.movementStat}>
              <MaterialCommunityIcons name="map-marker-distance" size={16} color="#8E8E93" />
              <Text style={styles.movementStatText}>{formatDistance(pattern.distance)}</Text>
            </View>
            <View style={styles.movementStat}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#8E8E93" />
              <Text style={styles.movementStatText}>{formatTime(pattern.averageTime)}</Text>
            </View>
            <View style={styles.movementStat}>
              <MaterialCommunityIcons name="percent" size={16} color="#8E8E93" />
              <Text style={styles.movementStatText}>{pattern.efficiencyScore.toFixed(0)}%</Text>
            </View>
          </View>
          
          {pattern.optimizationOpportunity && (
            <View style={styles.movementOpportunity}>
              <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#FF9500" />
              <Text style={styles.movementOpportunityText}>
                {pattern.optimizationOpportunity}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const renderEfficiency = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Zone Efficiency Analysis</Text>
      
      {layoutData.zoneEfficiency.map((zone, index) => (
        <View key={index} style={styles.zoneCard}>
          <View style={styles.zoneHeader}>
            <Text style={styles.zoneName}>{zone.name}</Text>
            <View style={styles.zoneScore}>
              <Text style={[
                styles.zoneScoreText,
                { color: getEfficiencyColor(zone.efficiencyScore) }
              ]}>
                {zone.efficiencyScore.toFixed(0)}%
              </Text>
              <StatusBadge 
                status={getEfficiencyRating(zone.efficiencyScore)} 
                color={getEfficiencyColor(zone.efficiencyScore)} 
              />
            </View>
          </View>
          
          <View style={styles.zoneBar}>
            <View 
              style={[
                styles.zoneBarFill,
                { 
                  width: `${zone.efficiencyScore}%`,
                  backgroundColor: getEfficiencyColor(zone.efficiencyScore)
                }
              ]}
            />
          </View>
          
          <View style={styles.zoneMetrics}>
            <View style={styles.zoneMetric}>
              <Text style={styles.zoneMetricValue}>{zone.dailyPicks.toLocaleString()}</Text>
              <Text style={styles.zoneMetricLabel}>Daily Picks</Text>
            </View>
            <View style={styles.zoneMetric}>
              <Text style={styles.zoneMetricValue}>{formatDistance(zone.avgTravelDistance)}</Text>
              <Text style={styles.zoneMetricLabel}>Avg Travel</Text>
            </View>
            <View style={styles.zoneMetric}>
              <Text style={styles.zoneMetricValue}>{formatTime(zone.avgPickTime)}</Text>
              <Text style={styles.zoneMetricLabel}>Avg Time</Text>
            </View>
          </View>
          
          {zone.bottlenecks.length > 0 && (
            <View style={styles.zoneBottlenecks}>
              <Text style={styles.zoneBottlenecksTitle}>Bottlenecks:</Text>
              {zone.bottlenecks.map((bottleneck, idx) => (
                <View key={idx} style={styles.zoneBottleneck}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color="#FF453A" />
                  <Text style={styles.zoneBottleneckText}>{bottleneck}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const renderRecommendations = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Layout Optimization Recommendations</Text>
      
      {layoutData.recommendations.map((rec, index) => (
        <View key={index} style={styles.recommendationCard}>
          <View style={styles.recommendationHeader}>
            <MaterialCommunityIcons 
              name={rec.type === 'RELOCATION' ? 'swap-horizontal' : 'floor-plan'} 
              size={24} 
              color="#007AFF" 
            />
            <View style={styles.recommendationTitle}>
              <Text style={styles.recommendationTitleText}>{rec.title}</Text>
              <StatusBadge 
                status={rec.priority} 
                color={rec.priority === 'HIGH' ? '#FF453A' : '#FF9500'} 
              />
            </View>
          </View>
          
          <Text style={styles.recommendationDescription}>{rec.description}</Text>
          
          <View style={styles.recommendationMetrics}>
            <View style={styles.recommendationMetric}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#34C759" />
              <Text style={styles.recommendationMetricText}>
                {rec.timeSavings} min/day savings
              </Text>
            </View>
            <View style={styles.recommendationMetric}>
              <MaterialCommunityIcons name="trending-up" size={16} color="#34C759" />
              <Text style={styles.recommendationMetricText}>
                {rec.efficiencyImprovement}% efficiency gain
              </Text>
            </View>
          </View>
          
          <View style={styles.recommendationActions}>
            <TouchableOpacity 
              style={styles.recommendationAction}
              onPress={() => Alert.alert('Implementation', 'Implementation planning will be available soon.')}
            >
              <Text style={styles.recommendationActionText}>Implement</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.recommendationSecondaryAction}
              onPress={() => Alert.alert('Details', rec.detailedAnalysis || 'Detailed analysis not available.')}
            >
              <Text style={styles.recommendationSecondaryActionText}>View Analysis</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Layout Optimization" />
      
      {/* View Selector */}
      <View style={styles.viewSelectorContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.viewSelector}
        >
          {viewOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.viewOption,
                selectedView === option.key && styles.viewOptionActive
              ]}
              onPress={() => setSelectedView(option.key)}
            >
              <MaterialCommunityIcons 
                name={option.icon} 
                size={20} 
                color={selectedView === option.key ? 'white' : '#8E8E93'} 
              />
              <Text style={[
                styles.viewOptionText,
                selectedView === option.key && styles.viewOptionTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {layoutData && (
          <>
            {selectedView === 'overview' && renderOverview()}
            {selectedView === 'movements' && renderMovements()}
            {selectedView === 'efficiency' && renderEfficiency()}
            {selectedView === 'recommendations' && renderRecommendations()}
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
  viewSelectorContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  viewSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  viewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    marginRight: 8
  },
  viewOptionActive: {
    backgroundColor: '#007AFF'
  },
  viewOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 6
  },
  viewOptionTextActive: {
    color: 'white'
  },
  section: {
    margin: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12
  },
  metricsContainer: {
    margin: 16
  },
  metricRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
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
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 8
  },
  metricLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center'
  },
  ratingCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    overflow: 'hidden'
  },
  ratingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20
  },
  ratingContent: {
    flex: 1
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  ratingScore: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginTop: 4
  },
  ratingDescription: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginTop: 8,
    lineHeight: 20
  },
  ratingIcon: {
    marginLeft: 16
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  insightContent: {
    flex: 1,
    marginLeft: 12
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  insightText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginTop: 4
  },
  movementCard: {
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
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  movementRoute: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  movementZone: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 8
  },
  movementZoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF'
  },
  movementFrequency: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  movementStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  movementStat: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  movementStatText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4
  },
  movementOpportunity: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8
  },
  movementOpportunityText: {
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 8,
    fontStyle: 'italic'
  },
  zoneCard: {
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
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  zoneScore: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  zoneScoreText: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8
  },
  zoneBar: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    marginBottom: 12
  },
  zoneBarFill: {
    height: '100%',
    borderRadius: 3
  },
  zoneMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  zoneMetric: {
    alignItems: 'center'
  },
  zoneMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E'
  },
  zoneMetricLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2
  },
  zoneBottlenecks: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8
  },
  zoneBottlenecksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF453A',
    marginBottom: 8
  },
  zoneBottleneck: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  zoneBottleneckText: {
    fontSize: 14,
    color: '#FF453A',
    marginLeft: 8
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
    marginBottom: 12
  },
  recommendationTitle: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 12
  },
  recommendationTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 12
  },
  recommendationMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  recommendationMetric: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  recommendationMetricText: {
    fontSize: 14,
    color: '#34C759',
    marginLeft: 4,
    fontWeight: '500'
  },
  recommendationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  recommendationAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  recommendationActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  recommendationSecondaryAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8
  },
  recommendationSecondaryActionText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500'
  }
}); 