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

const ComplianceAuditsScreen = ({ navigation, route }) => {
  const { facilityId, facilityName } = route.params || {};
  const { userToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [audits, setAudits] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadComplianceAudits();
  }, [facilityId]);

  const loadComplianceAudits = async () => {
    try {
      const params = {
        facilityId: facilityId || 'all',
        limit: 50
      };
      
      const response = await facilityMaintenanceAPI.getAudits(params, userToken);
      setAudits(response.audits || []);
    } catch (error) {
      console.error('Error loading compliance audits:', error);
      Alert.alert('Error', 'Failed to load compliance audits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateAudit = () => {
    navigation.navigate('CreateComplianceAudit', { facilityId, facilityName });
  };

  const getAuditTypeColor = (auditType) => {
    switch (auditType) {
      case 'INTERNAL': return '#3B82F6';
      case 'EXTERNAL': return '#8B5CF6';
      case 'REGULATORY': return '#EF4444';
      case 'FOLLOW_UP': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'PASS': return '#10B981';
      case 'FAIL': return '#EF4444';
      case 'CONDITIONAL': return '#F59E0B';
      case 'PENDING': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getAuditTypeIcon = (auditType) => {
    switch (auditType) {
      case 'INTERNAL': return 'business';
      case 'EXTERNAL': return 'globe';
      case 'REGULATORY': return 'shield';
      case 'FOLLOW_UP': return 'checkmark-circle';
      default: return 'clipboard';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderAudit = (audit) => (
    <TouchableOpacity
      key={audit.id}
      style={styles.auditCard}
      onPress={() => navigation.navigate('ComplianceAuditDetails', { auditId: audit.id })}
      activeOpacity={0.8}
    >
      <View style={styles.auditHeader}>
        <View style={styles.auditIconContainer}>
          <View style={[
            styles.auditIcon, 
            { backgroundColor: getAuditTypeColor(audit.auditType) + '20' }
          ]}>
            <Ionicons 
              name={getAuditTypeIcon(audit.auditType)} 
              size={24} 
              color={getAuditTypeColor(audit.auditType)} 
            />
          </View>
        </View>
        
        <View style={styles.auditInfo}>
          <Text style={styles.auditTitle}>{audit.complianceRequirement || 'Audit'}</Text>
          <View style={styles.auditBadges}>
            <StatusBadge
              status={audit.auditType}
              color={getAuditTypeColor(audit.auditType)}
              size="small"
            />
            {audit.result && (
              <StatusBadge
                status={audit.result}
                color={getResultColor(audit.result)}
                size="small"
              />
            )}
          </View>
        </View>
      </View>

      <View style={styles.auditDetails}>
        <View style={styles.auditDetailItem}>
          <Ionicons name="calendar" size={16} color="#6B7280" />
          <Text style={styles.auditDetailText}>
            Scheduled: {formatDate(audit.auditDate)}
          </Text>
        </View>
        
        {audit.completedDate && (
          <View style={styles.auditDetailItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.auditDetailText}>
              Completed: {formatDate(audit.completedDate)}
            </Text>
          </View>
        )}

        {audit.auditor && (
          <View style={styles.auditDetailItem}>
            <Ionicons name="person" size={16} color="#6B7280" />
            <Text style={styles.auditDetailText}>
              Auditor: {audit.auditor.username}
            </Text>
          </View>
        )}
      </View>

      {audit.findings && (
        <View style={styles.findingsContainer}>
          <Text style={styles.findingsLabel}>Findings:</Text>
          <Text style={styles.findingsText} numberOfLines={2}>
            {audit.findings}
          </Text>
        </View>
      )}

      {audit.correctiveActions && (
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsLabel}>Corrective Actions:</Text>
          <Text style={styles.actionsText} numberOfLines={2}>
            {audit.correctiveActions}
          </Text>
        </View>
      )}

      <View style={styles.auditFooter}>
        <View style={styles.auditScore}>
          {audit.score && (
            <Text style={styles.scoreText}>Score: {audit.score}%</Text>
          )}
        </View>
        
        {audit.followUpRequired && (
          <View style={styles.followUpIndicator}>
            <MaterialCommunityIcons name="clock-alert" size={16} color="#F59E0B" />
            <Text style={styles.followUpText}>Follow-up required</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="clipboard-check" size={64} color="#E5E7EB" />
      <Text style={styles.emptyTitle}>No Compliance Audits</Text>
      <Text style={styles.emptyText}>
        No compliance audits scheduled for this facility
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleCreateAudit}>
        <Text style={styles.emptyButtonText}>Schedule Audit</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Compliance Audits" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading compliance audits...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Compliance Audits"
        rightIcons={[
          {
            icon: 'add',
            onPress: handleCreateAudit,
            color: '#8B5CF6'
          }
        ]}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search compliance audits..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadComplianceAudits} />
        }
        showsVerticalScrollIndicator={false}
      >
        {audits.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.auditsContainer}>
            {audits.map(renderAudit)}
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
  auditsContainer: {
    padding: 20
  },
  auditCard: {
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
  auditHeader: {
    flexDirection: 'row',
    marginBottom: 16
  },
  auditIconContainer: {
    marginRight: 16
  },
  auditIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  auditInfo: {
    flex: 1
  },
  auditTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  auditBadges: {
    flexDirection: 'row',
    gap: 8
  },
  auditDetails: {
    marginBottom: 16
  },
  auditDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  auditDetailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8
  },
  findingsContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  findingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4
  },
  findingsText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20
  },
  actionsContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  actionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 4
  },
  actionsText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20
  },
  auditFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  auditScore: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669'
  },
  followUpIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  followUpText: {
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
    backgroundColor: '#8B5CF6',
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

export default ComplianceAuditsScreen; 