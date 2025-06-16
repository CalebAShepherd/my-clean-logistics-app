import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  StatusBar
} from 'react-native';
import { Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { hasWaveManagement, canCreateWaves } from '../utils/featureFlags';
import { useSettings } from '../context/SettingsContext';

const WaveManagementScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [waves, setWaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWave, setSelectedWave] = useState(null);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    warehouseId: '',
    assignedPickerId: ''
  });

  const [newWave, setNewWave] = useState({
    warehouseId: '',
    priority: 1,
    plannedStartTime: '',
    plannedEndTime: '',
    notes: ''
  });

  useEffect(() => {
    // Check if wave management feature is enabled
    if (!hasWaveManagement(settings)) {
      Alert.alert(
        'Feature Not Available',
        'Wave Management is not enabled for your organization.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    fetchWaves();
    fetchStats();
  }, [settings]);

  const fetchWaves = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/waves?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWaves(data.waves || []);
      } else {
        Alert.alert('Error', 'Failed to fetch waves');
      }
    } catch (error) {
      console.error('Error fetching waves:', error);
      Alert.alert('Error', 'Network error while fetching waves');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/waves/stats', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching wave stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchWaves(), fetchStats()]);
    setRefreshing(false);
  };

  const createWave = async () => {
    try {
      if (!newWave.warehouseId) {
        Alert.alert('Error', 'Please select a warehouse');
        return;
      }

      const response = await fetch('/waves', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newWave)
      });

      if (response.ok) {
        const wave = await response.json();
        setWaves(prev => [wave, ...prev]);
        setModalVisible(false);
        setNewWave({
          warehouseId: '',
          priority: 1,
          plannedStartTime: '',
          plannedEndTime: '',
          notes: ''
        });
        Alert.alert('Success', 'Wave created successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to create wave');
      }
    } catch (error) {
      console.error('Error creating wave:', error);
      Alert.alert('Error', 'Network error while creating wave');
    }
  };

  const releaseWave = async (waveId) => {
    try {
      Alert.alert(
        'Release Wave',
        'Are you sure you want to release this wave for picking?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Release',
            onPress: async () => {
              const response = await fetch(`/waves/${waveId}/release`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${user.token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  pickingMethod: 'BATCH',
                  assignedPickerId: null
                })
              });

              if (response.ok) {
                fetchWaves();
                Alert.alert('Success', 'Wave released successfully');
              } else {
                const error = await response.json();
                Alert.alert('Error', error.error || 'Failed to release wave');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error releasing wave:', error);
      Alert.alert('Error', 'Network error while releasing wave');
    }
  };

  const updateWaveStatus = async (waveId, status) => {
    try {
      const response = await fetch(`/waves/${waveId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchWaves();
        Alert.alert('Success', 'Wave status updated successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to update wave status');
      }
    } catch (error) {
      console.error('Error updating wave status:', error);
      Alert.alert('Error', 'Network error while updating wave status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'CREATED': '#6c757d',
      'PLANNED': '#007bff',
      'RELEASED': '#28a745',
      'IN_PROGRESS': '#ffc107',
      'COMPLETED': '#17a2b8',
      'CANCELLED': '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  const getStatusActions = (wave) => {
    const actions = [];
    
    switch (wave.status) {
      case 'CREATED':
      case 'PLANNED':
        actions.push(
          <TouchableOpacity
            key="release"
            style={[styles.actionButton, { backgroundColor: '#28a745' }]}
            onPress={() => releaseWave(wave.id)}
          >
            <Icon name="play-arrow" size={16} color="white" />
            <Text style={styles.actionButtonText}>Release</Text>
          </TouchableOpacity>
        );
        break;
      case 'RELEASED':
        actions.push(
          <TouchableOpacity
            key="start"
            style={[styles.actionButton, { backgroundColor: '#ffc107' }]}
            onPress={() => updateWaveStatus(wave.id, 'IN_PROGRESS')}
          >
            <Icon name="play-circle-filled" size={16} color="white" />
            <Text style={styles.actionButtonText}>Start</Text>
          </TouchableOpacity>
        );
        break;
      case 'IN_PROGRESS':
        actions.push(
          <TouchableOpacity
            key="complete"
            style={[styles.actionButton, { backgroundColor: '#17a2b8' }]}
            onPress={() => updateWaveStatus(wave.id, 'COMPLETED')}
          >
            <Icon name="check-circle" size={16} color="white" />
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
        );
        break;
    }

    return actions;
  };

  const renderWaveCard = (wave) => (
    <Card key={wave.id} style={styles.waveCard}>
      <View style={styles.waveHeader}>
        <View style={styles.waveInfo}>
          <Text style={styles.waveNumber}>{wave.waveNumber}</Text>
          <Text style={styles.warehouseName}>{wave.warehouse?.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(wave.status) }]}>
          <Text style={styles.statusText}>{wave.status}</Text>
        </View>
      </View>

      <View style={styles.waveDetails}>
        <View style={styles.waveMetric}>
          <Icon name="list-alt" size={20} color="#666" />
          <Text style={styles.metricText}>{wave.totalOrders} Orders</Text>
        </View>
        <View style={styles.waveMetric}>
          <Icon name="inventory" size={20} color="#666" />
          <Text style={styles.metricText}>{wave.totalItems} Items</Text>
        </View>
        <View style={styles.waveMetric}>
          <Icon name="person" size={20} color="#666" />
          <Text style={styles.metricText}>
            {wave.assignedPicker?.username || 'Unassigned'}
          </Text>
        </View>
      </View>

      <View style={styles.waveProgress}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${(wave.completedItems / Math.max(wave.totalItems, 1)) * 100}%`,
                backgroundColor: getStatusColor(wave.status)
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {wave.completedItems}/{wave.totalItems} items
        </Text>
      </View>

      <View style={styles.waveActions}>
        {getStatusActions(wave)}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#007bff' }]}
          onPress={() => navigation.navigate('WaveDetails', { waveId: wave.id })}
        >
          <Icon name="visibility" size={16} color="white" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderStats = () => (
    <Card style={styles.statsCard}>
      <Text style={styles.statsTitle}>Wave Statistics</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totals?.totalWaves || 0}</Text>
          <Text style={styles.statLabel}>Total Waves</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {Math.round(stats.totals?.avgOrdersPerWave || 0)}
          </Text>
          <Text style={styles.statLabel}>Avg Orders</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {Math.round(stats.totals?.avgCompletionRate || 0)}%
          </Text>
          <Text style={styles.statLabel}>Completion Rate</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wave Management</Text>
        {canCreateWaves(settings) && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="add" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderStats()}
        
        <View style={styles.wavesSection}>
          <Text style={styles.sectionTitle}>Active Waves</Text>
          {waves.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No waves found</Text>
            </Card>
          ) : (
            waves.map(renderWaveCard)
          )}
        </View>
      </ScrollView>

      {/* Create Wave Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Wave</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Warehouse ID"
              value={newWave.warehouseId}
              onChangeText={(text) => setNewWave(prev => ({ ...prev, warehouseId: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Priority (1-10)"
              value={newWave.priority.toString()}
              onChangeText={(text) => setNewWave(prev => ({ ...prev, priority: parseInt(text) || 1 }))}
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notes"
              value={newWave.notes}
              onChangeText={(text) => setNewWave(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={createWave}
              >
                <Text style={styles.createButtonText}>Create Wave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  addButton: {
    backgroundColor: '#007bff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    flex: 1
  },
  statsCard: {
    margin: 20,
    padding: 20
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333'
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  wavesSection: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333'
  },
  waveCard: {
    marginBottom: 15,
    padding: 15
  },
  waveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  waveInfo: {
    flex: 1
  },
  waveNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  warehouseName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  waveDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  waveMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  metricText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666'
  },
  waveProgress: {
    marginBottom: 15
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    marginBottom: 5
  },
  progressFill: {
    height: '100%',
    borderRadius: 3
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right'
  },
  waveActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#666'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    marginRight: 10
  },
  createButton: {
    backgroundColor: '#007bff',
    marginLeft: 10
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600'
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600'
  }
});

export default WaveManagementScreen; 