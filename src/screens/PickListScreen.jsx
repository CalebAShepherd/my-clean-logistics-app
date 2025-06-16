import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Modal,
  RefreshControl,
  StatusBar,
  TextInput
} from 'react-native';
import { Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { hasPickListManagement, canOptimizeRoutes, hasQualityControl } from '../utils/featureFlags';
import { useSettings } from '../context/SettingsContext';

const PickListScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { waveId } = route.params || {};
  
  const [pickLists, setPickLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPickList, setSelectedPickList] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [stats, setStats] = useState({});

  useEffect(() => {
    // Check if pick list feature is enabled
    if (!hasPickListManagement(settings)) {
      Alert.alert(
        'Feature Not Available',
        'Pick List Management is not enabled for your organization.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    fetchPickLists();
    fetchStats();
  }, [waveId, settings]);

  const fetchPickLists = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (waveId) queryParams.append('waveId', waveId);

      const response = await fetch(`/pick-lists?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPickLists(data.pickLists || []);
      } else {
        Alert.alert('Error', 'Failed to fetch pick lists');
      }
    } catch (error) {
      console.error('Error fetching pick lists:', error);
      Alert.alert('Error', 'Network error while fetching pick lists');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/pick-lists/stats', {
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
      console.error('Error fetching pick list stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPickLists(), fetchStats()]);
    setRefreshing(false);
  };

  const startPicking = async (pickListId) => {
    try {
      const response = await fetch(`/pick-lists/${pickListId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchPickLists();
        Alert.alert('Success', 'Pick list started successfully');
        navigation.navigate('PickingInterface', { pickListId });
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to start picking');
      }
    } catch (error) {
      console.error('Error starting pick list:', error);
      Alert.alert('Error', 'Network error while starting pick list');
    }
  };

  const optimizeRoute = async (pickListId) => {
    try {
      const response = await fetch(`/pick-lists/${pickListId}/optimize-route`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchPickLists();
        Alert.alert('Success', 'Pick route optimized successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to optimize route');
      }
    } catch (error) {
      console.error('Error optimizing route:', error);
      Alert.alert('Error', 'Network error while optimizing route');
    }
  };

  const performQC = async (pickListId, qcData) => {
    try {
      const response = await fetch(`/pick-lists/${pickListId}/qc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(qcData)
      });

      if (response.ok) {
        fetchPickLists();
        Alert.alert('Success', 'Quality control completed successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to complete QC');
      }
    } catch (error) {
      console.error('Error performing QC:', error);
      Alert.alert('Error', 'Network error while performing QC');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': '#6c757d',
      'ASSIGNED': '#007bff',
      'IN_PROGRESS': '#ffc107',
      'PICKING_COMPLETE': '#28a745',
      'QC_PENDING': '#fd7e14',
      'QC_COMPLETE': '#20c997',
      'COMPLETED': '#17a2b8',
      'CANCELLED': '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  const getStatusActions = (pickList) => {
    const actions = [];
    
    switch (pickList.status) {
      case 'PENDING':
      case 'ASSIGNED':
        actions.push(
          <TouchableOpacity
            key="start"
            style={[styles.actionButton, { backgroundColor: '#28a745' }]}
            onPress={() => startPicking(pickList.id)}
          >
            <Icon name="play-arrow" size={16} color="white" />
            <Text style={styles.actionButtonText}>Start Picking</Text>
          </TouchableOpacity>
        );
        
                 if (canOptimizeRoutes(settings)) {
           actions.push(
             <TouchableOpacity
               key="optimize"
               style={[styles.actionButton, { backgroundColor: '#17a2b8' }]}
               onPress={() => optimizeRoute(pickList.id)}
             >
               <Icon name="route" size={16} color="white" />
               <Text style={styles.actionButtonText}>Optimize</Text>
             </TouchableOpacity>
           );
         }
        break;
        
      case 'IN_PROGRESS':
        actions.push(
          <TouchableOpacity
            key="continue"
            style={[styles.actionButton, { backgroundColor: '#ffc107' }]}
            onPress={() => navigation.navigate('PickingInterface', { pickListId: pickList.id })}
          >
            <Icon name="play-circle-filled" size={16} color="white" />
            <Text style={styles.actionButtonText}>Continue</Text>
          </TouchableOpacity>
        );
        break;
        
             case 'PICKING_COMPLETE':
         if (hasQualityControl(settings)) {
           actions.push(
             <TouchableOpacity
               key="qc"
               style={[styles.actionButton, { backgroundColor: '#fd7e14' }]}
               onPress={() => setSelectedPickList(pickList)}
             >
               <Icon name="fact-check" size={16} color="white" />
               <Text style={styles.actionButtonText}>QC Check</Text>
             </TouchableOpacity>
           );
         }
        break;
        
      case 'QC_COMPLETE':
        actions.push(
          <TouchableOpacity
            key="pack"
            style={[styles.actionButton, { backgroundColor: '#20c997' }]}
            onPress={() => navigation.navigate('PackingScreen', { pickListId: pickList.id })}
          >
            <Icon name="inventory-2" size={16} color="white" />
            <Text style={styles.actionButtonText}>Pack</Text>
          </TouchableOpacity>
        );
        break;
    }

    return actions;
  };

  const renderPickListCard = (pickList) => (
    <Card key={pickList.id} style={styles.pickListCard}>
      <View style={styles.pickListHeader}>
        <View style={styles.pickListInfo}>
          <Text style={styles.listNumber}>{pickList.listNumber}</Text>
          <Text style={styles.waveNumber}>Wave: {pickList.wave?.waveNumber}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pickList.status) }]}>
          <Text style={styles.statusText}>{pickList.status.replace('_', ' ')}</Text>
        </View>
      </View>

      <View style={styles.pickListDetails}>
        <View style={styles.pickListMetric}>
          <Icon name="list" size={20} color="#666" />
          <Text style={styles.metricText}>{pickList.totalTasks} Tasks</Text>
        </View>
        <View style={styles.pickListMetric}>
          <Icon name="check-circle" size={20} color="#666" />
          <Text style={styles.metricText}>{pickList.completedTasks} Done</Text>
        </View>
        <View style={styles.pickListMetric}>
          <Icon name="person" size={20} color="#666" />
          <Text style={styles.metricText}>
            {pickList.assignedPicker?.username || 'Unassigned'}
          </Text>
        </View>
      </View>

      <View style={styles.pickListProgress}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${(pickList.completedTasks / Math.max(pickList.totalTasks, 1)) * 100}%`,
                backgroundColor: getStatusColor(pickList.status)
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round((pickList.completedTasks / Math.max(pickList.totalTasks, 1)) * 100)}% Complete
        </Text>
      </View>

      <View style={styles.pickListActions}>
        {getStatusActions(pickList)}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#007bff' }]}
          onPress={() => navigation.navigate('PickListDetails', { pickListId: pickList.id })}
        >
          <Icon name="visibility" size={16} color="white" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderStats = () => (
    <Card style={styles.statsCard}>
      <Text style={styles.statsTitle}>Pick List Statistics</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totals?.totalPickLists || 0}</Text>
          <Text style={styles.statLabel}>Total Lists</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {Math.round(stats.totals?.avgTasksPerList || 0)}
          </Text>
          <Text style={styles.statLabel}>Avg Tasks</Text>
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

  const QCModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={!!selectedPickList}
      onRequestClose={() => setSelectedPickList(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Quality Control Check</Text>
          <Text style={styles.modalSubtitle}>
            Pick List: {selectedPickList?.listNumber}
          </Text>
          
          <View style={styles.qcButtons}>
            <TouchableOpacity
              style={[styles.qcButton, { backgroundColor: '#dc3545' }]}
              onPress={() => {
                performQC(selectedPickList.id, { qcPassed: false, qcNotes: 'QC Failed' });
                setSelectedPickList(null);
              }}
            >
              <Icon name="close" size={24} color="white" />
              <Text style={styles.qcButtonText}>Fail QC</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.qcButton, { backgroundColor: '#28a745' }]}
              onPress={() => {
                performQC(selectedPickList.id, { qcPassed: true, qcNotes: 'QC Passed' });
                setSelectedPickList(null);
              }}
            >
              <Icon name="check" size={24} color="white" />
              <Text style={styles.qcButtonText}>Pass QC</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: '#6c757d' }]}
            onPress={() => setSelectedPickList(null)}
          >
            <Text style={styles.modalButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {waveId ? 'Wave Pick Lists' : 'Pick Lists'}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderStats()}
        
        <View style={styles.pickListsSection}>
          <Text style={styles.sectionTitle}>Active Pick Lists</Text>
          {pickLists.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No pick lists found</Text>
            </Card>
          ) : (
            pickLists.map(renderPickListCard)
          )}
        </View>
      </ScrollView>

      <QCModal />
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
  pickListsSection: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333'
  },
  pickListCard: {
    marginBottom: 15,
    padding: 15
  },
  pickListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  pickListInfo: {
    flex: 1
  },
  listNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  waveNumber: {
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
  pickListDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  pickListMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  metricText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666'
  },
  pickListProgress: {
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
  pickListActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
    marginBottom: 4
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
    maxWidth: 400,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center'
  },
  qcButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20
  },
  qcButton: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    width: '40%'
  },
  qcButtonText: {
    color: 'white',
    fontWeight: '600',
    marginTop: 8
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%'
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600'
  }
});

export default PickListScreen; 