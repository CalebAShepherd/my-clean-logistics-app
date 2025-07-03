import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from '../components/StatusBadge';
import InternalHeader from '../components/InternalHeader';
import { assetAPI } from '../api/assets';
import { maintenanceAPI } from '../api/maintenance';

const AssetDetailsScreen = ({ route, navigation }) => {
  const { assetId } = route.params;
  const [asset, setAsset] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAssetDetails = async () => {
    try {
      const [assetData, historyData, upcomingData] = await Promise.all([
        assetAPI.getAsset(assetId),
        maintenanceAPI.getMaintenanceHistory(assetId),
        maintenanceAPI.getUpcomingMaintenance(assetId)
      ]);
      
      setAsset(assetData);
      setMaintenanceHistory(historyData);
      setUpcomingMaintenance(upcomingData);
    } catch (error) {
      console.error('Error fetching asset details:', error);
      Alert.alert('Error', 'Failed to load asset details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssetDetails();
  }, [assetId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssetDetails();
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'EXCELLENT': return '#22C55E';
      case 'GOOD': return '#84CC16';
      case 'FAIR': return '#F59E0B';
      case 'POOR': return '#EF4444';
      case 'CRITICAL': return '#DC2626';
      default: return '#374151';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Asset Details" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            Loading asset details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!asset) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Asset Details" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>
            Asset not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Asset Details"
        rightIcon="construct"
        onRightPress={() => navigation.navigate('CreateWorkOrder', { assetId: asset.id })}
      />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerInfo}>
              <Text style={styles.assetName}>
                {asset.name}
              </Text>
              <Text style={styles.assetTag}>
                {asset.assetTag}
              </Text>
            </View>
            <StatusBadge status={asset.status} />
          </View>
          
          <View style={styles.conditionRow}>
            <Text style={styles.conditionLabel}>
              Condition:
            </Text>
            <View style={[styles.conditionBadge, { backgroundColor: getConditionColor(asset.condition) + '20' }]}>
              <Text style={[styles.conditionText, { color: getConditionColor(asset.condition) }]}>
                {asset.condition}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(asset.purchasePrice || 0)}
            </Text>
            <Text style={styles.statLabel}>
              Purchase Price
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(asset.currentValue || 0)}
            </Text>
            <Text style={styles.statLabel}>
              Current Value
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {asset.warrantyExpiryDate ? formatDate(asset.warrantyExpiryDate) : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>
              Warranty Expires
            </Text>
          </View>
        </View>

        {/* Asset Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Asset Information
          </Text>
          
          <View style={styles.infoGrid}>
            <InfoItem label="Category" value={asset.category} />
            <InfoItem label="Model" value={asset.model} />
            <InfoItem label="Serial Number" value={asset.serialNumber} />
            <InfoItem label="Location" value={asset.location?.name} />
            <InfoItem label="Purchase Date" value={asset.purchaseDate ? formatDate(asset.purchaseDate) : 'N/A'} />
            <InfoItem label="Supplier" value={asset.supplier?.name} />
          </View>
        </View>

        {/* Upcoming Maintenance */}
        {upcomingMaintenance.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Upcoming Maintenance
            </Text>
            {upcomingMaintenance.map((maintenance) => (
              <View key={maintenance.id} style={styles.maintenanceItem}>
                <Text style={styles.maintenanceType}>
                  {maintenance.maintenanceType}
                </Text>
                <Text style={styles.maintenanceDate}>
                  Due: {formatDate(maintenance.nextDueDate)}
                </Text>
                <Text style={styles.maintenanceDesc}>
                  {maintenance.description}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Maintenance History */}
        {maintenanceHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Maintenance History
            </Text>
            {maintenanceHistory.map((maintenance) => (
              <View key={maintenance.id} style={styles.historyItem}>
                <Text style={styles.historyType}>
                  {maintenance.maintenanceType}
                </Text>
                <Text style={styles.historyDate}>
                  Completed: {formatDate(maintenance.completedDate)}
                </Text>
                {maintenance.cost && (
                  <Text style={styles.historyCost}>
                    Cost: {formatCurrency(maintenance.cost)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateWorkOrder', { assetId: asset.id })}
          >
            <Ionicons name="construct" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Create Work Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('AssetAnalytics', { assetId: asset.id })}
          >
            <Ionicons name="analytics" size={20} color="#007AFF" />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>View Analytics</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoItem = ({ label, value }) => {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>
      <Text style={styles.infoValue}>
        {value || 'N/A'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#374151',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
    marginRight: 16,
  },
  assetName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  assetTag: {
    fontSize: 16,
    color: '#6B7280',
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conditionLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 12,
  },
  conditionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  maintenanceItem: {
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    marginBottom: 12,
  },
  maintenanceType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  maintenanceDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  maintenanceDesc: {
    fontSize: 14,
    color: '#6B7280',
  },
  historyItem: {
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    marginBottom: 12,
  },
  historyType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  historyCost: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
});

export default AssetDetailsScreen; 