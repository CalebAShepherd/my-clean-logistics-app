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

const SafetyIncidentsScreen = ({ navigation, route }) => {
  const { facilityId, facilityName } = route.params || {};
  const { userToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSafetyIncidents();
  }, [facilityId]);

  const loadSafetyIncidents = async () => {
    try {
      const params = {
        facilityId: facilityId || 'all',
        limit: 50
      };
      
      const response = await facilityMaintenanceAPI.getSafetyIncidents(params, userToken);
      setIncidents(response.incidents || []);
    } catch (error) {
      console.error('Error loading safety incidents:', error);
      Alert.alert('Error', 'Failed to load safety incidents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateIncident = () => {
    navigation.navigate('CreateSafetyIncident', { facilityId, facilityName });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'LOW': return '#10B981';
      case 'MODERATE': return '#F59E0B';
      case 'HIGH': return '#EF4444';
      case 'CRITICAL': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'REPORTED': return '#F59E0B';
      case 'INVESTIGATING': return '#3B82F6';
      case 'RESOLVED': return '#10B981';
      case 'CLOSED': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getIncidentTypeIcon = (type) => {
    switch (type) {
      case 'INJURY': return 'medical';
      case 'NEAR_MISS': return 'warning';
      case 'PROPERTY_DAMAGE': return 'construct';
      case 'FIRE': return 'flame';
      case 'CHEMICAL_SPILL': return 'water';
      case 'EQUIPMENT_FAILURE': return 'cog';
      default: return 'alert-circle';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not reported';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderIncident = (incident) => (
    <TouchableOpacity
      key={incident.id}
      style={styles.incidentCard}
      onPress={() => navigation.navigate('SafetyIncidentDetails', { incidentId: incident.id })}
      activeOpacity={0.8}
    >
      <View style={styles.incidentHeader}>
        <View style={styles.incidentIconContainer}>
          <View style={[
            styles.incidentIcon, 
            { backgroundColor: getSeverityColor(incident.severity) + '20' }
          ]}>
            <Ionicons 
              name={getIncidentTypeIcon(incident.incidentType)} 
              size={24} 
              color={getSeverityColor(incident.severity)} 
            />
          </View>
        </View>
        
        <View style={styles.incidentInfo}>
          <Text style={styles.incidentTitle}>{incident.title}</Text>
          <View style={styles.incidentBadges}>
            <StatusBadge
              status={incident.severity}
              color={getSeverityColor(incident.severity)}
              size="small"
            />
            <StatusBadge
              status={incident.status}
              color={getStatusColor(incident.status)}
              size="small"
            />
          </View>
        </View>
      </View>

      <Text style={styles.incidentDescription} numberOfLines={2}>
        {incident.description || 'No description provided'}
      </Text>

      <View style={styles.incidentDetails}>
        <View style={styles.incidentDetailItem}>
          <Ionicons name="time" size={16} color="#6B7280" />
          <Text style={styles.incidentDetailText}>
            {formatDate(incident.incidentDate)}
          </Text>
        </View>
        
        {incident.location && (
          <View style={styles.incidentDetailItem}>
            <Ionicons name="location" size={16} color="#6B7280" />
            <Text style={styles.incidentDetailText}>
              {incident.location}
            </Text>
          </View>
        )}
      </View>

      {incident.injuriesCount > 0 && (
        <View style={styles.injuryAlert}>
          <MaterialCommunityIcons name="medical-bag" size={16} color="#DC2626" />
          <Text style={styles.injuryText}>
            {incident.injuriesCount} {incident.injuriesCount === 1 ? 'injury' : 'injuries'} reported
          </Text>
        </View>
      )}

      <View style={styles.incidentFooter}>
        <Text style={styles.incidentType}>
          {incident.incidentType?.replace('_', ' ')}
        </Text>
        
        {incident.status === 'REPORTED' && (
          <View style={styles.urgentIndicator}>
            <MaterialCommunityIcons name="clock-alert" size={16} color="#F59E0B" />
            <Text style={styles.urgentText}>Needs attention</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="shield-check" size={64} color="#E5E7EB" />
      <Text style={styles.emptyTitle}>No Safety Incidents</Text>
      <Text style={styles.emptyText}>
        No safety incidents reported for this facility
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleCreateIncident}>
        <Text style={styles.emptyButtonText}>Report Incident</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Safety Incidents" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading safety incidents...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Safety Incidents"
        rightIcons={[
          {
            icon: 'add',
            onPress: handleCreateIncident,
            color: '#DC2626'
          }
        ]}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search safety incidents..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadSafetyIncidents} />
        }
        showsVerticalScrollIndicator={false}
      >
        {incidents.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.incidentsContainer}>
            {incidents.map(renderIncident)}
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
  incidentsContainer: {
    padding: 20
  },
  incidentCard: {
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
  incidentHeader: {
    flexDirection: 'row',
    marginBottom: 12
  },
  incidentIconContainer: {
    marginRight: 16
  },
  incidentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  incidentInfo: {
    flex: 1
  },
  incidentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  incidentBadges: {
    flexDirection: 'row',
    gap: 8
  },
  incidentDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16
  },
  incidentDetails: {
    marginBottom: 16
  },
  incidentDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  incidentDetailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8
  },
  injuryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16
  },
  injuryText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
    marginLeft: 8
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  incidentType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  urgentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  urgentText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
    marginLeft: 4
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
    backgroundColor: '#DC2626',
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

export default SafetyIncidentsScreen; 