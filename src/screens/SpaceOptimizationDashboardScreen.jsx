import React, { useState, useEffect, useContext, useCallback } from 'react';
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
  RefreshControl,
  Modal,
  FlatList,
  Platform,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { spaceOptimizationAPI } from '../api/spaceOptimization';
import { fetchWarehouses } from '../api/warehouses';
import { fetchFacilities } from '../api/facilities';
import InternalHeader from '../components/InternalHeader';
import StatusBadge from '../components/StatusBadge';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function SpaceOptimizationDashboardScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { settings } = useSettings();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [error, setError] = useState(null);
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [selectorType, setSelectorType] = useState('warehouse'); // 'warehouse' or 'facility'
  const [lastUpdated, setLastUpdated] = useState(null);
  const [capacityTrends, setCapacityTrends] = useState([]);
  const [criticalAlerts, setCriticalAlerts] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      
      // Load warehouses first
      const warehousesData = await fetchWarehouses(userToken);
      const validWarehouses = Array.isArray(warehousesData) ? warehousesData : [];
      setWarehouses(validWarehouses);
      
      // Auto-select first warehouse if none selected
      if (!selectedWarehouse && validWarehouses.length > 0) {
        setSelectedWarehouse(validWarehouses[0].id);
      }
      
      // Try to load facilities, with fallback if it fails
      try {
        const facilitiesData = await fetchFacilities(userToken);
        const validFacilities = Array.isArray(facilitiesData) ? facilitiesData : [];
        setFacilities(validFacilities);
        
        // Auto-select first facility if none selected
        if (!selectedFacility && validFacilities.length > 0) {
          setSelectedFacility(validFacilities[0].id);
        }
      } catch (facilityError) {
        console.info('Facilities API not available, continuing without facilities');
        setFacilities([]);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load warehouse and facility data');
    }
  }, [userToken, selectedWarehouse, selectedFacility]);

  const loadDashboardData = useCallback(async () => {
    if (!selectedWarehouse && !selectedFacility) return;
    
    try {
      setError(null);
      
      // Try to load data with fallbacks
      let dashboard, recommendationsData, trendsData;
      
      try {
        [dashboard, recommendationsData, trendsData] = await Promise.all([
          spaceOptimizationAPI.getSpaceOptimizationDashboard({
            warehouseId: selectedWarehouse,
            facilityId: selectedFacility
          }),
          spaceOptimizationAPI.getOptimizationRecommendations({
            warehouseId: selectedWarehouse,
            facilityId: selectedFacility,
            priority: 'all'
          }),
          spaceOptimizationAPI.getSpaceTrendAnalysis({
            warehouseId: selectedWarehouse,
            facilityId: selectedFacility
          })
        ]);
      } catch (apiError) {
        console.info('Using demo data - Space optimization API endpoints not yet implemented');
        
        // Provide mock data for development
        dashboard = {
          kpis: {
            totalFacilities: 1,
            totalWarehouses: Array.isArray(warehouses) ? warehouses.length : 0,
            averageUtilization: 75.8,
            totalSquareFeet: 50000,
            occupancyRate: 82.3,
            capacityGrowth: 12.5,
            layoutEfficiency: 78
          },
          trends: {
            capacityAlert: true,
            growthTrend: 8.2
          },
          spaceAnalysis: {
            zoneUtilization: [
              { zone: 'Zone A', utilizationPercent: 85.2, totalItems: 1250, totalValue: 125000 },
              { zone: 'Zone B', utilizationPercent: 72.1, totalItems: 980, totalValue: 98000 },
              { zone: 'Zone C', utilizationPercent: 91.3, totalItems: 1560, totalValue: 156000 }
            ]
          },
          slottingInsights: {
            needRelocation: 45
          },
          longestRoute: {
            from: 'Zone A1',
            to: 'Zone C5',
            distance: 250,
            time: 4.2
          },
          busiestZone: {
            name: 'Zone B',
            movements: 1250
          },
          topRecommendation: {
            title: 'Relocate high-velocity items',
            timeSavings: 15
          }
        };
        
        recommendationsData = {
          recommendations: [
            {
              id: 1,
              title: 'Optimize Zone A Layout',
              category: 'LAYOUT_OPTIMIZATION',
              priority: 'HIGH',
              description: 'Reorganize Zone A to reduce travel distances.',
              impact: 'Estimated 15% improvement in pick efficiency'
            },
            {
              id: 2,
              title: 'Capacity Expansion Required',
              category: 'CAPACITY_PLANNING', 
              priority: 'CRITICAL',
              description: 'Current growth trends indicate capacity will be exceeded within 3 months.',
              impact: 'Prevent operational disruptions'
            }
          ]
        };
        
        trendsData = {
          trends: []
        };
      }
      
      setDashboardData(dashboard);
      setRecommendations(recommendationsData.recommendations || []);
      setCapacityTrends(trendsData.trends || []);
      setCriticalAlerts(recommendationsData.recommendations?.filter(r => r.priority === 'CRITICAL') || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load space optimization data');
    }
  }, [selectedWarehouse, selectedFacility, warehouses?.length]);

  // Focus effect for real-time updates
  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        setLoading(true);
        await loadData();
        setLoading(false);
      };
      initialize();
      
      // Set up auto-refresh every 30 seconds when screen is focused
      const interval = setInterval(() => {
        if (selectedWarehouse || selectedFacility) {
          loadDashboardData();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }, [loadData, loadDashboardData, selectedWarehouse, selectedFacility])
  );

  useEffect(() => {
    if (selectedWarehouse || selectedFacility) {
      loadDashboardData();
    }
  }, [selectedWarehouse, selectedFacility, loadDashboardData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (selectedWarehouse || selectedFacility) {
      await loadDashboardData();
    }
    setRefreshing(false);
  };

  const openSelector = (type) => {
    setSelectorType(type);
    setShowSelectorModal(true);
  };

  const selectItem = (item) => {
    if (selectorType === 'warehouse') {
      setSelectedWarehouse(item.id);
    } else {
      setSelectedFacility(item.id);
    }
    setShowSelectorModal(false);
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const now = new Date();
    const diff = Math.floor((now - lastUpdated) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return lastUpdated.toLocaleDateString();
  };

  const getSelectedWarehouseName = () => {
    if (!Array.isArray(warehouses)) return 'All Warehouses';
    return warehouses.find(w => w.id === selectedWarehouse)?.name || 'All Warehouses';
  };

  const getSelectedFacilityName = () => {
    if (!Array.isArray(facilities)) return 'All Facilities';
    return facilities.find(f => f.id === selectedFacility)?.name || 'All Facilities';
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL': return '#FF453A';
      case 'HIGH': return '#FF9500';
      case 'MEDIUM': return '#FFD60A';
      case 'LOW': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'SPACE_UTILIZATION': return 'view-grid';
      case 'CAPACITY_PLANNING': return 'chart-line';
      case 'LAYOUT_OPTIMIZATION': return 'floor-plan';
      case 'SLOTTING': return 'package-variant';
      default: return 'information';
    }
  };

  const getUtilizationColor = (utilization) => {
    if (utilization > 90) return '#FF453A';
    if (utilization > 70) return '#FF9500';
    if (utilization > 50) return '#FFD60A';
    return '#34C759';
  };

  if (!settings?.hasWarehouses) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Space Optimization" />
        <View style={styles.featureDisabledContainer}>
          <MaterialCommunityIcons name="view-grid" size={64} color="#C7C7CC" />
          <Text style={styles.featureDisabledTitle}>Space Optimization Disabled</Text>
          <Text style={styles.featureDisabledText}>
            The space optimization feature requires warehouse functionality. Contact your administrator to enable it.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Space Optimization" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#FF453A" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setError(null);
            loadData();
          }}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Space Optimization" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading optimization data...</Text>
          <Text style={styles.loadingSubtext}>Analyzing space utilization patterns...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Space Optimization" />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Development Notice */}
        {__DEV__ && (
          <View style={styles.devNoticeContainer}>
            <View style={styles.devNotice}>
              <MaterialCommunityIcons name="information" size={20} color="#007AFF" />
              <Text style={styles.devNoticeText}>
                Demo Mode: Using sample data while space optimization APIs are being implemented
              </Text>
            </View>
          </View>
        )}

        {/* Enhanced Facility/Warehouse Selector */}
        <View style={styles.selectorContainer}>
          <View style={styles.selectorHeader}>
            <Text style={styles.selectorLabel}>Location & Scope</Text>
            <View style={styles.lastUpdatedContainer}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#8E8E93" />
              <Text style={styles.lastUpdatedText}>Updated {formatLastUpdated()}</Text>
            </View>
          </View>
          
          <View style={styles.selectorRow}>
            <TouchableOpacity 
              style={[styles.selectorButton, { marginRight: 8 }]} 
              onPress={() => openSelector('facility')}
            >
              <MaterialCommunityIcons name="domain" size={20} color="#007AFF" />
              <Text style={styles.selectorButtonText} numberOfLines={1}>
                {getSelectedFacilityName()}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#8E8E93" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.selectorButton, { marginLeft: 8 }]} 
              onPress={() => openSelector('warehouse')}
            >
              <MaterialCommunityIcons name="warehouse" size={20} color="#007AFF" />
              <Text style={styles.selectorButtonText} numberOfLines={1}>
                {getSelectedWarehouseName()}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </View>

        {dashboardData && (
          <>
            {/* KPI Cards */}
            <View style={styles.kpiContainer}>
              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <MaterialCommunityIcons name="domain" size={24} color="#007AFF" />
                  <Text style={styles.kpiValue}>{dashboardData.kpis.totalFacilities}</Text>
                  <Text style={styles.kpiLabel}>Facilities</Text>
                </View>
                <View style={styles.kpiCard}>
                  <MaterialCommunityIcons name="warehouse" size={24} color="#34C759" />
                  <Text style={styles.kpiValue}>{dashboardData.kpis.totalWarehouses}</Text>
                  <Text style={styles.kpiLabel}>Warehouses</Text>
                </View>
              </View>
              
              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <MaterialCommunityIcons name="gauge" size={24} color="#FF9500" />
                  <Text style={styles.kpiValue}>{dashboardData.kpis.averageUtilization?.toFixed(1)}%</Text>
                  <Text style={styles.kpiLabel}>Avg Utilization</Text>
                </View>
                <View style={styles.kpiCard}>
                  <MaterialCommunityIcons name="floor-plan" size={24} color="#AF52DE" />
                  <Text style={styles.kpiValue}>{Math.round(dashboardData.kpis.totalSquareFeet || 0).toLocaleString()}</Text>
                  <Text style={styles.kpiLabel}>Total Sq Ft</Text>
                </View>
              </View>

              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <MaterialCommunityIcons name="map-marker" size={24} color="#FF453A" />
                  <Text style={styles.kpiValue}>{dashboardData.kpis.occupancyRate?.toFixed(1)}%</Text>
                  <Text style={styles.kpiLabel}>Occupancy Rate</Text>
                </View>
                <View style={styles.kpiCard}>
                  <MaterialCommunityIcons name="trending-up" size={24} color="#00C7BE" />
                  <Text style={styles.kpiValue}>{dashboardData.kpis.capacityGrowth?.toFixed(1)}%</Text>
                  <Text style={styles.kpiLabel}>Growth Trend</Text>
                </View>
              </View>
            </View>

            {/* Critical Alerts */}
            {(dashboardData.trends.capacityAlert || criticalAlerts.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Critical Alerts</Text>
                
                {dashboardData.trends.capacityAlert && (
                  <View style={styles.alertCard}>
                    <LinearGradient
                      colors={['#FF453A', '#FF6B6B']}
                      style={styles.alertGradient}
                    >
                      <MaterialCommunityIcons name="alert" size={24} color="white" />
                      <View style={styles.alertContent}>
                        <Text style={styles.alertTitle}>Capacity Alert</Text>
                        <Text style={styles.alertMessage}>
                          Projected capacity utilization will exceed 85% within 6 months. Consider expansion planning.
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.alertAction}
                        onPress={() => navigation.navigate('SpaceTrendAnalysisScreen', {
                          warehouseId: selectedWarehouse,
                          facilityId: selectedFacility
                        })}
                      >
                        <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                )}

                {criticalAlerts.slice(0, 2).map((alert, index) => (
                  <View key={index} style={styles.criticalAlertCard}>
                    <View style={styles.criticalAlertHeader}>
                      <MaterialCommunityIcons 
                        name="alert-circle" 
                        size={20} 
                        color="#FF453A" 
                      />
                      <Text style={styles.criticalAlertTitle}>{alert.title}</Text>
                      <StatusBadge status="CRITICAL" color="#FF453A" />
                    </View>
                    <Text style={styles.criticalAlertText}>{alert.description}</Text>
                    <TouchableOpacity 
                      style={styles.criticalAlertAction}
                      onPress={() => navigation.navigate('SpaceOptimizationRecommendations', {
                        warehouseId: selectedWarehouse,
                        facilityId: selectedFacility
                      })}
                    >
                      <Text style={styles.criticalAlertActionText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Top Recommendations */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Critical Recommendations</Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('SpaceOptimizationRecommendations', {
                    warehouseId: selectedWarehouse,
                    facilityId: selectedFacility
                  })}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              
              {recommendations.slice(0, 3).map((rec, index) => (
                <View key={index} style={styles.recommendationCard}>
                  <View style={styles.recommendationHeader}>
                    <MaterialCommunityIcons 
                      name={getCategoryIcon(rec.category)} 
                      size={20} 
                      color={getPriorityColor(rec.priority)} 
                    />
                    <StatusBadge 
                      status={rec.priority} 
                      color={getPriorityColor(rec.priority)}
                    />
                  </View>
                  <Text style={styles.recommendationText}>{rec.recommendation}</Text>
                  {rec.impact && (
                    <Text style={styles.recommendationImpact}>{rec.impact}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Zone Utilization */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Zone Utilization</Text>
              {dashboardData.spaceAnalysis.zoneUtilization.slice(0, 5).map((zone, index) => (
                <View key={index} style={styles.zoneCard}>
                  <View style={styles.zoneHeader}>
                    <Text style={styles.zoneName}>{zone.zone}</Text>
                    <Text style={[styles.zoneUtilization, { color: getUtilizationColor(zone.utilizationPercent) }]}>
                      {zone.utilizationPercent.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.zoneBar}>
                    <View 
                      style={[
                        styles.zoneBarFill, 
                        { 
                          width: `${Math.min(zone.utilizationPercent, 100)}%`,
                          backgroundColor: getUtilizationColor(zone.utilizationPercent)
                        }
                      ]} 
                    />
                  </View>
                  <View style={styles.zoneStats}>
                    <Text style={styles.zoneStatText}>{zone.totalItems} items</Text>
                    <Text style={styles.zoneStatText}>${zone.totalValue?.toFixed(0) || 0} value</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Space Optimization Tools</Text>
              
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => navigation.navigate('SlottingOptimizationScreen', {
                  warehouseId: selectedWarehouse
                })}
              >
                <LinearGradient
                  colors={['#007AFF', '#0056CC']}
                  style={styles.actionGradient}
                >
                  <MaterialCommunityIcons name="package-variant" size={32} color="white" />
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Slotting Optimization</Text>
                    <Text style={styles.actionSubtitle}>
                      {dashboardData.slottingInsights.needRelocation} items need relocation
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => navigation.navigate('SpaceTrendAnalysisScreen', {
                  warehouseId: selectedWarehouse,
                  facilityId: selectedFacility
                })}
              >
                <LinearGradient
                  colors={['#34C759', '#30D158']}
                  style={styles.actionGradient}
                >
                  <MaterialCommunityIcons name="chart-line" size={32} color="white" />
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Capacity Planning</Text>
                    <Text style={styles.actionSubtitle}>
                      {dashboardData.trends.growthTrend > 0 ? 'Growing' : 'Stable'} inventory trends
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => navigation.navigate('LayoutOptimizationScreen', {
                  warehouseId: selectedWarehouse
                })}
              >
                <LinearGradient
                  colors={['#AF52DE', '#BF5AF2']}
                  style={styles.actionGradient}
                >
                  <MaterialCommunityIcons name="floor-plan" size={32} color="white" />
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Layout Optimization</Text>
                    <Text style={styles.actionSubtitle}>
                      Efficiency Score: {dashboardData.kpis.layoutEfficiency?.toFixed(0)}%
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Selector Modal */}
      <Modal
        visible={showSelectorModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSelectorModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSelectorModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Select {selectorType === 'warehouse' ? 'Warehouse' : 'Facility'}
            </Text>
            <View style={{ width: 60 }} />
          </View>
          
          <FlatList
                            data={selectorType === 'warehouse' ? 
                  (Array.isArray(warehouses) ? warehouses : []) : 
                  (Array.isArray(facilities) ? facilities : [])
                }
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  (selectorType === 'warehouse' ? selectedWarehouse : selectedFacility) === item.id && styles.modalItemSelected
                ]}
                onPress={() => selectItem(item)}
              >
                <View style={styles.modalItemContent}>
                  <MaterialCommunityIcons 
                    name={selectorType === 'warehouse' ? 'warehouse' : 'domain'} 
                    size={24} 
                    color="#007AFF" 
                  />
                  <View style={styles.modalItemText}>
                    <Text style={styles.modalItemName}>{item.name}</Text>
                    {item.address && (
                      <Text style={styles.modalItemAddress}>{item.address}</Text>
                    )}
                  </View>
                </View>
                {(selectorType === 'warehouse' ? selectedWarehouse : selectedFacility) === item.id && (
                  <MaterialCommunityIcons name="check" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
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
  featureDisabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  featureDisabledTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8
  },
  featureDisabledText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22
  },
  selectorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4
  },
  selectorRow: {
    flexDirection: 'row'
  },
  selectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8
  },
  selectorButtonText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500'
  },
  kpiContainer: {
    margin: 16,
    marginTop: 0
  },
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  kpiCard: {
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
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 8
  },
  kpiLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center'
  },
  alertCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    overflow: 'hidden'
  },
  alertGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  alertContent: {
    flex: 1,
    marginLeft: 12
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  alertMessage: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginTop: 4
  },
  alertAction: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  criticalAlertCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF453A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  criticalAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  criticalAlertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginLeft: 8
  },
  criticalAlertText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 12
  },
  criticalAlertAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF453A',
    borderRadius: 6
  },
  criticalAlertActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500'
  },
  section: {
    margin: 16,
    marginTop: 0
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  viewAllText: {
    fontSize: 16,
    color: '#007AFF'
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  recommendationText: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 22
  },
  recommendationImpact: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
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
  zoneUtilization: {
    fontSize: 16,
    fontWeight: '700'
  },
  zoneBar: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    marginBottom: 8
  },
  zoneBarFill: {
    height: '100%',
    borderRadius: 3
  },
  zoneStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  zoneStatText: {
    fontSize: 14,
    color: '#8E8E93'
  },
  actionCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden'
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  actionContent: {
    flex: 1,
    marginLeft: 16
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginTop: 4
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  modalCancelText: {
    fontSize: 16,
    color: '#007AFF'
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  modalItemSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  modalItemText: {
    marginLeft: 12,
    flex: 1
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  modalItemAddress: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2
  },
  // Development Notice Styles
  devNoticeContainer: {
    margin: 16,
    marginBottom: 0
  },
  devNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF'
  },
  devNoticeText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500'
  }
}); 