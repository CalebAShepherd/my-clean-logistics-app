import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { getCurrentUser } from '../api/users';
import { fetchDamageReports } from '../api/damageReports';
import InternalHeader from '../components/InternalHeader';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

function DamageReportsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouseId, setWarehouseId] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadReports = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    
    try {
      const user = await getCurrentUser(userToken);
      if (user.warehouseId) {
        setWarehouseId(user.warehouseId);
        const data = await fetchDamageReports(userToken, { warehouseId: user.warehouseId });
        setReports(data);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load incident reports. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const onRefresh = () => {
    loadReports(true);
  };

  const handleExport = async () => {
    if (reports.length === 0) {
      Alert.alert('No Data', 'There are no incident reports to export.');
      return;
    }

    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (warehouseId) params.append('warehouseId', warehouseId);
      const now = Date.now();
      const fileUri = FileSystem.documentDirectory + `incidents-${now}.csv`;
      const downloadRes = await FileSystem.downloadAsync(
        `${API_URL}/damage-reports/export?${params.toString()}`,
        fileUri,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      await Sharing.shareAsync(downloadRes.uri);
      Alert.alert('Success', 'Incident reports exported successfully!');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      Alert.alert('Export Error', 'Failed to export incident reports. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'damage':
        return '#FF3B30';
      case 'loss':
        return '#FF9500';
      case 'theft':
        return '#8E8E93';
      case 'defective':
        return '#5856D6';
      default:
        return '#007AFF';
    }
  };

  const getStatusIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'damage':
        return 'alert-circle';
      case 'loss':
        return 'package-variant-closed-remove';
      case 'theft':
        return 'shield-alert';
      case 'defective':
        return 'wrench';
      default:
        return 'information';
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.reportCard}
      activeOpacity={0.7}
      onPress={() => {
        // Navigation to report detail if exists
        // navigation.navigate('ReportDetail', { id: item.id });
      }}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleSection}>
          <Text style={styles.reportTitle} numberOfLines={1}>
            {item.InventoryItem.name}
          </Text>
          <Text style={styles.reportSku}>SKU: {item.InventoryItem.sku}</Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.type) + '20' }]}>
          <MaterialCommunityIcons 
            name={getStatusIcon(item.type)} 
            size={16} 
            color={getStatusColor(item.type)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.type) }]}>
            {item.type}
          </Text>
        </View>
      </View>
      
      <View style={styles.reportDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>
            {new Date(item.reportedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="package" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>Quantity: {item.quantity}</Text>
        </View>
        
        {item.reasonCode && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clipboard-text" size={16} color="#8E8E93" />
            <Text style={styles.detailText}>Reason: {item.reasonCode}</Text>
          </View>
        )}
      </View>
      
      {item.description && (
        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionText} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      )}
      
      <View style={styles.reportFooter}>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#C7C7CC" />
      </View>
      <Text style={styles.emptyTitle}>No Incident Reports</Text>
      <Text style={styles.emptySubtitle}>
        No damage or loss incidents have been reported yet. 
        Tap the button below to log your first incident.
      </Text>
      <TouchableOpacity 
        style={styles.emptyAction}
        onPress={() => navigation.navigate('Log Incident')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#007AFF', '#5856D6']}
          style={styles.emptyActionGradient}
        >
          <MaterialCommunityIcons name="plus-circle" size={20} color="white" />
          <Text style={styles.emptyActionText}>Log First Incident</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="clipboard-text" size={24} color="#007AFF" />
          <Text style={styles.statNumber}>{reports.length}</Text>
          <Text style={styles.statLabel}>Total Reports</Text>
        </View>
        
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="alert-circle" size={24} color="#FF3B30" />
          <Text style={styles.statNumber}>
            {reports.filter(r => r.type?.toLowerCase() === 'damage').length}
          </Text>
          <Text style={styles.statLabel}>Damage</Text>
        </View>
        
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="package-variant-closed-remove" size={24} color="#FF9500" />
          <Text style={styles.statNumber}>
            {reports.filter(r => r.type?.toLowerCase() === 'loss').length}
          </Text>
          <Text style={styles.statLabel}>Loss</Text>
        </View>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.primaryAction}
          onPress={() => navigation.navigate('Log Incident')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#007AFF', '#5856D6']}
            style={styles.primaryActionGradient}
          >
            <MaterialCommunityIcons name="plus-circle" size={20} color="white" />
            <Text style={styles.primaryActionText}>Log Incident</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.secondaryAction, exporting && styles.secondaryActionDisabled]}
          onPress={handleExport}
          disabled={exporting}
          activeOpacity={0.7}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <MaterialCommunityIcons name="download" size={20} color="#007AFF" />
          )}
          <Text style={[styles.secondaryActionText, exporting && styles.secondaryActionTextDisabled]}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Incident Reports" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading incident reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Incident Reports" />
      
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListHeaderComponent={reports.length > 0 ? renderListHeader : null}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={reports.length === 0 ? styles.emptyListContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      />
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
  
  // List Container
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  emptyListContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Header Section
  headerContainer: {
    marginBottom: 24,
  },
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 8,
    marginBottom: 4,
  },
  
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Actions Container
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  
  primaryAction: {
    flex: 1,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  
  primaryActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  
  secondaryActionDisabled: {
    opacity: 0.6,
  },
  
  secondaryActionText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  secondaryActionTextDisabled: {
    color: '#8E8E93',
  },
  
  // Report Card Styles
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  
  reportTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  
  reportSku: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  
  // Report Details
  reportDetails: {
    marginBottom: 12,
  },
  
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  detailText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 8,
    fontWeight: '500',
  },
  
  // Description Section
  descriptionSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  
  descriptionText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // Report Footer
  reportFooter: {
    alignItems: 'flex-end',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  
  emptyAction: {
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  
  emptyActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default DamageReportsScreen; 