import React, { useState, useEffect, useContext } from 'react';
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
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import InternalHeader from '../components/InternalHeader';
import StatusBadge from '../components/StatusBadge';
import { facilityMaintenanceAPI } from '../api/facilityMaintenance';
import { AuthContext } from '../context/AuthContext';

const EnvironmentalMonitoringScreen = ({ navigation, route }) => {
  const { facilityId, facilityName } = route.params || {};
  const { userToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readings, setReadings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEnvironmentalReadings();
  }, [facilityId]);

  const loadEnvironmentalReadings = async () => {
    try {
      const params = {
        facilityId: facilityId || 'all',
        limit: 50
      };
      
      const response = await facilityMaintenanceAPI.getEnvironmentalMonitoring(params, userToken);
      setReadings(response.readings || []);
    } catch (error) {
      console.error('Error loading environmental readings:', error);
      Alert.alert('Error', 'Failed to load environmental readings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateReading = () => {
    navigation.navigate('CreateEnvironmentalReading', { facilityId, facilityName });
  };

  const getAlertColor = (alertLevel) => {
    switch (alertLevel) {
      case 'NORMAL': return '#10B981';
      case 'WARNING': return '#F59E0B';
      case 'CRITICAL': return '#EF4444';
      case 'EMERGENCY': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'TEMPERATURE': return 'thermometer';
      case 'HUMIDITY': return 'water';
      case 'AIR_QUALITY': return 'leaf';
      case 'NOISE_LEVEL': return 'volume-high';
      case 'LIGHT_LEVEL': return 'sunny';
      case 'PRESSURE': return 'speedometer';
      case 'VIBRATION': return 'pulse';
      default: return 'analytics';
    }
  };

  const getUnitSymbol = (type) => {
    switch (type) {
      case 'TEMPERATURE': return '°F';
      case 'HUMIDITY': return '%';
      case 'AIR_QUALITY': return 'AQI';
      case 'NOISE_LEVEL': return 'dB';
      case 'LIGHT_LEVEL': return 'lux';
      case 'PRESSURE': return 'PSI';
      case 'VIBRATION': return 'mm/s';
      default: return '';
    }
  };

  const formatValue = (value, type) => {
    const symbol = getUnitSymbol(type);
    return `${value}${symbol}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not recorded';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderReading = (reading) => (
    <TouchableOpacity
      key={reading.id}
      style={styles.readingCard}
      onPress={() => navigation.navigate('EnvironmentalReadingDetails', { readingId: reading.id })}
      activeOpacity={0.8}
    >
      <View style={styles.readingHeader}>
        <View style={styles.readingIconContainer}>
          <View style={[
            styles.readingIcon, 
            { backgroundColor: getAlertColor(reading.alertLevel) + '20' }
          ]}>
            <Ionicons 
              name={getTypeIcon(reading.type)} 
              size={24} 
              color={getAlertColor(reading.alertLevel)} 
            />
          </View>
        </View>
        
        <View style={styles.readingInfo}>
          <Text style={styles.readingType}>
            {reading.type?.replace('_', ' ')}
          </Text>
          <View style={styles.readingValue}>
            <Text style={styles.readingValueText}>
              {formatValue(reading.value, reading.type)}
            </Text>
            <StatusBadge
              status={reading.alertLevel}
              color={getAlertColor(reading.alertLevel)}
              size="small"
            />
          </View>
        </View>
      </View>

      <View style={styles.readingDetails}>
        <View style={styles.readingDetailItem}>
          <Ionicons name="time" size={16} color="#6B7280" />
          <Text style={styles.readingDetailText}>
            {formatDate(reading.recordedAt)}
          </Text>
        </View>
        
        {reading.location && (
          <View style={styles.readingDetailItem}>
            <Ionicons name="location" size={16} color="#6B7280" />
            <Text style={styles.readingDetailText}>
              {reading.location}
            </Text>
          </View>
        )}
      </View>

      {reading.thresholdMin && reading.thresholdMax && (
        <View style={styles.thresholdContainer}>
          <Text style={styles.thresholdLabel}>Normal Range:</Text>
          <Text style={styles.thresholdValue}>
            {formatValue(reading.thresholdMin, reading.type)} - {formatValue(reading.thresholdMax, reading.type)}
          </Text>
        </View>
      )}

      {reading.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText} numberOfLines={2}>
            {reading.notes}
          </Text>
        </View>
      )}

      {reading.alertLevel !== 'NORMAL' && (
        <View style={styles.alertBanner}>
          <MaterialCommunityIcons 
            name="alert" 
            size={16} 
            color={getAlertColor(reading.alertLevel)} 
          />
          <Text style={[styles.alertText, { color: getAlertColor(reading.alertLevel) }]}>
            {reading.alertLevel} - Requires attention
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="leaf" size={64} color="#E5E7EB" />
      <Text style={styles.emptyTitle}>No Environmental Readings</Text>
      <Text style={styles.emptyText}>
        No environmental readings recorded for this facility
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleCreateReading}>
        <Text style={styles.emptyButtonText}>Record Reading</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Environmental Monitoring" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading environmental readings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Environmental Monitoring"
        rightIcons={[
          {
            icon: 'add',
            onPress: handleCreateReading,
            color: '#10B981'
          }
        ]}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search environmental readings..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadEnvironmentalReadings} />
        }
        showsVerticalScrollIndicator={false}
      >
        {readings.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.readingsContainer}>
            {readings.map(renderReading)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280'
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16
  },
  searchIcon: {
    marginRight: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#111827'
  },
  scrollView: {
    flex: 1
  },
  readingsContainer: {
    padding: 20
  },
  readingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  readingHeader: {
    flexDirection: 'row',
    marginBottom: 16
  },
  readingIconContainer: {
    marginRight: 16
  },
  readingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  readingInfo: {
    flex: 1
  },
  readingType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  readingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  readingValueText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827'
  },
  readingDetails: {
    marginBottom: 16
  },
  readingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  readingDetailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8
  },
  thresholdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12
  },
  thresholdLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8
  },
  thresholdValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669'
  },
  notesContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  notesText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  alertText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24
  },
  emptyButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default EnvironmentalMonitoringScreen; 