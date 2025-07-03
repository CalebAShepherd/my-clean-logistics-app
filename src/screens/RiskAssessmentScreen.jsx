import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { riskAssessmentAPI } from '../api/riskAssessment';
import FilterPagination from '../components/FilterPagination';
import { formatDate } from '../utils/formatDate';
import InternalHeader from '../components/InternalHeader';

const RiskAssessmentScreen = ({ navigation }) => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [pagination, setPagination] = useState({});

  // Filter states
  const [filters, setFilters] = useState({
    category: 'all',
    riskLevel: 'all',
    status: 'all',
    page: 1,
    limit: 20,
  });

  // Create form states
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'OPERATIONAL',
    riskLevel: 'MEDIUM',
    probability: '',
    impact: '',
    mitigation: '',
    dueDate: '',
  });

  useEffect(() => {
    loadAssessments();
  }, [filters]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const data = await riskAssessmentAPI.getAssessments(filters);
      setAssessments(data.assessments);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading risk assessments:', error);
      Alert.alert('Error', 'Failed to load risk assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAssessments();
    setRefreshing(false);
  };

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters, page: 1 });
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
  };

  const handleCreate = async () => {
    if (!createForm.title || !createForm.description) {
      Alert.alert('Error', 'Please fill in title and description');
      return;
    }

    try {
      setCreateLoading(true);
      await riskAssessmentAPI.createAssessment(createForm);
      Alert.alert('Success', 'Risk assessment created successfully');
      setCreateModalVisible(false);
      resetCreateForm();
      loadAssessments();
    } catch (error) {
      console.error('Error creating risk assessment:', error);
      Alert.alert('Error', 'Failed to create risk assessment');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = (assessment) => {
    Alert.alert(
      'Delete Risk Assessment',
      `Are you sure you want to delete "${assessment.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await riskAssessmentAPI.deleteAssessment(assessment.id);
              Alert.alert('Success', 'Risk assessment deleted successfully');
              loadAssessments();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete risk assessment');
            }
          },
        },
      ]
    );
  };

  const resetCreateForm = () => {
    setCreateForm({
      title: '',
      description: '',
      category: 'OPERATIONAL',
      riskLevel: 'MEDIUM',
      probability: '',
      impact: '',
      mitigation: '',
      dueDate: '',
    });
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      LOW: '#27ae60',
      MEDIUM: '#f39c12',
      HIGH: '#e74c3c',
      CRITICAL: '#8e44ad',
    };
    return colors[level] || '#95a5a6';
  };

  const getStatusColor = (status) => {
    const colors = {
      IDENTIFIED: '#3498db',
      ASSESSED: '#f39c12',
      MITIGATED: '#27ae60',
      RESOLVED: '#2ecc71',
      CLOSED: '#95a5a6',
    };
    return colors[status] || '#95a5a6';
  };

  const renderAssessmentItem = ({ item }) => (
    <TouchableOpacity style={styles.assessmentItem}>
      <View style={styles.assessmentHeader}>
        <View style={styles.assessmentInfo}>
          <Text style={styles.assessmentTitle}>{item.title}</Text>
          <Text style={styles.assessmentSubtitle}>
            {item.category} • {formatDate(item.assessmentDate)}
          </Text>
          {item.description && (
            <Text style={styles.assessmentDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.deleteButton}
        >
          <Icon name="delete" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.assessmentFooter}>
        <View style={styles.assessmentTags}>
          <View style={[styles.tag, { backgroundColor: getRiskLevelColor(item.riskLevel) }]}>
            <Text style={styles.tagText}>{item.riskLevel} RISK</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.tagText}>{item.status}</Text>
          </View>
        </View>
        {item.riskScore && (
          <Text style={styles.riskScore}>
            Score: {Number(item.riskScore).toFixed(1)}
          </Text>
        )}
      </View>
      
      {item.mitigation && (
        <View style={styles.mitigationContainer}>
          <Text style={styles.mitigationLabel}>Mitigation:</Text>
          <Text style={styles.mitigationText}>{item.mitigation}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderCreateModal = () => (
    <Modal
      visible={createModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Risk Assessment</Text>
          <TouchableOpacity
            onPress={() => {
              setCreateModalVisible(false);
              resetCreateForm();
            }}
          >
            <Icon name="close" size={24} color="#2c3e50" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <TextInput
            style={styles.input}
            placeholder="Risk Title *"
            value={createForm.title}
            onChangeText={(text) => setCreateForm({ ...createForm, title: text })}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Risk Description *"
            value={createForm.description}
            onChangeText={(text) => setCreateForm({ ...createForm, description: text })}
            multiline
            numberOfLines={3}
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Category</Text>
            <Picker
              selectedValue={createForm.category}
              onValueChange={(value) => setCreateForm({ ...createForm, category: value })}
              style={styles.picker}
            >
              <Picker.Item label="Operational" value="OPERATIONAL" />
              <Picker.Item label="Financial" value="FINANCIAL" />
              <Picker.Item label="Strategic" value="STRATEGIC" />
              <Picker.Item label="Compliance" value="COMPLIANCE" />
              <Picker.Item label="Technology" value="TECHNOLOGY" />
              <Picker.Item label="Reputational" value="REPUTATIONAL" />
            </Picker>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Risk Level</Text>
            <Picker
              selectedValue={createForm.riskLevel}
              onValueChange={(value) => setCreateForm({ ...createForm, riskLevel: value })}
              style={styles.picker}
            >
              <Picker.Item label="Low" value="LOW" />
              <Picker.Item label="Medium" value="MEDIUM" />
              <Picker.Item label="High" value="HIGH" />
              <Picker.Item label="Critical" value="CRITICAL" />
            </Picker>
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Probability (1-5)"
              value={createForm.probability}
              onChangeText={(text) => setCreateForm({ ...createForm, probability: text })}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Impact (1-5)"
              value={createForm.impact}
              onChangeText={(text) => setCreateForm({ ...createForm, impact: text })}
              keyboardType="numeric"
            />
          </View>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Mitigation Strategy"
            value={createForm.mitigation}
            onChangeText={(text) => setCreateForm({ ...createForm, mitigation: text })}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={createLoading}
          >
            {createLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="plus" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Create Assessment</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const filterOptions = [
    {
      key: 'category',
      label: 'Category',
      options: [
        { label: 'All Categories', value: 'all' },
        { label: 'Operational', value: 'OPERATIONAL' },
        { label: 'Financial', value: 'FINANCIAL' },
        { label: 'Strategic', value: 'STRATEGIC' },
        { label: 'Compliance', value: 'COMPLIANCE' },
        { label: 'Technology', value: 'TECHNOLOGY' },
        { label: 'Reputational', value: 'REPUTATIONAL' },
      ],
    },
    {
      key: 'riskLevel',
      label: 'Risk Level',
      options: [
        { label: 'All Levels', value: 'all' },
        { label: 'Low', value: 'LOW' },
        { label: 'Medium', value: 'MEDIUM' },
        { label: 'High', value: 'HIGH' },
        { label: 'Critical', value: 'CRITICAL' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'All Statuses', value: 'all' },
        { label: 'Identified', value: 'IDENTIFIED' },
        { label: 'Assessed', value: 'ASSESSED' },
        { label: 'Mitigated', value: 'MITIGATED' },
        { label: 'Resolved', value: 'RESOLVED' },
        { label: 'Closed', value: 'CLOSED' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation}
        title="Risk Assessment"
        rightIcon="plus"
        onRightPress={() => setCreateModalVisible(true)}
      />

      <FilterPagination
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      <FlatList
        data={assessments}
        renderItem={renderAssessmentItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="alert-circle" size={64} color="#bdc3c7" />
            <Text style={styles.emptyText}>No risk assessments found</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setCreateModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Create First Assessment</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {renderCreateModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  assessmentItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  assessmentInfo: {
    flex: 1,
  },
  assessmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  assessmentSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  assessmentDescription: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  deleteButton: {
    padding: 8,
  },
  assessmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  assessmentTags: {
    flexDirection: 'row',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  tagText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  riskScore: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  mitigationContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  mitigationLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  mitigationText: {
    fontSize: 12,
    color: '#34495e',
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
  },
  createButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default RiskAssessmentScreen; 