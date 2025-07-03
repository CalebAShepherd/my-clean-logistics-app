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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { complianceReportingAPI } from '../api/complianceReporting';
import FilterPagination from '../components/FilterPagination';
import { formatDate } from '../utils/formatDate';
import { SafeAreaView } from 'react-native-safe-area-context';
import InternalHeader from '../components/InternalHeader';

const ComplianceReportsScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [pagination, setPagination] = useState({});

  // Filter states
  const [filters, setFilters] = useState({
    reportType: 'all',
    reportPeriod: 'all',
    status: 'all',
    page: 1,
    limit: 20,
  });

  // Generate form states
  const [generateForm, setGenerateForm] = useState({
    title: '',
    description: '',
    reportType: 'SOX_COMPLIANCE',
    reportPeriod: 'MONTHLY',
    periodStartDate: '',
    periodEndDate: '',
    includeMetrics: true,
  });

  useEffect(() => {
    loadReports();
  }, [filters]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await complianceReportingAPI.getReports(filters);
      setReports(data.reports);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading compliance reports:', error);
      Alert.alert('Error', 'Failed to load compliance reports');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters, page: 1 });
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
  };

  const handleGenerate = async () => {
    if (!generateForm.title || !generateForm.reportType) {
      Alert.alert('Error', 'Please fill in title and report type');
      return;
    }

    try {
      setGenerateLoading(true);
      await complianceReportingAPI.generateReport(generateForm);
      Alert.alert('Success', 'Report generated successfully');
      setGenerateModalVisible(false);
      resetGenerateForm();
      loadReports();
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleStatusUpdate = async (report, newStatus) => {
    try {
      await complianceReportingAPI.updateReportStatus(report.id, { status: newStatus });
      Alert.alert('Success', 'Report status updated successfully');
      loadReports();
    } catch (error) {
      Alert.alert('Error', 'Failed to update report status');
    }
  };

  const resetGenerateForm = () => {
    setGenerateForm({
      title: '',
      description: '',
      reportType: 'SOX_COMPLIANCE',
      reportPeriod: 'MONTHLY',
      periodStartDate: '',
      periodEndDate: '',
      includeMetrics: true,
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: '#95a5a6',
      GENERATED: '#3498db',
      REVIEWED: '#f39c12',
      APPROVED: '#27ae60',
      ARCHIVED: '#7f8c8d',
    };
    return colors[status] || '#95a5a6';
  };

  const getReportTypeIcon = (type) => {
    const icons = {
      SOX_COMPLIANCE: 'shield-check',
      INSURANCE_SUMMARY: 'shield-account',
      AUDIT_SUMMARY: 'file-chart',
      DOCUMENT_COMPLIANCE: 'file-document-multiple',
    };
    return icons[type] || 'file-chart';
  };

  const renderReportItem = ({ item }) => (
    <TouchableOpacity style={styles.reportItem}>
      <View style={styles.reportHeader}>
        <Icon
          name={getReportTypeIcon(item.reportType)}
          size={24}
          color="#3498db"
        />
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>{item.title}</Text>
          <Text style={styles.reportSubtitle}>
            {item.reportType.replace('_', ' ')} • {item.reportPeriod}
          </Text>
          <Text style={styles.reportDate}>
            Period: {formatDate(item.periodStartDate)} - {formatDate(item.periodEndDate)}
          </Text>
        </View>
        <View style={styles.reportActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="download" size={20} color="#3498db" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="eye" size={20} color="#27ae60" />
          </TouchableOpacity>
        </View>
      </View>
      
      {item.description && (
        <Text style={styles.reportDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.reportFooter}>
        <View style={styles.reportTags}>
          <View style={[styles.tag, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.tagText}>{item.status}</Text>
          </View>
          {item.metrics && item.metrics.length > 0 && (
            <View style={[styles.tag, { backgroundColor: '#9b59b6' }]}>
              <Text style={styles.tagText}>{item.metrics.length} METRICS</Text>
            </View>
          )}
        </View>
        <View style={styles.statusActions}>
          {item.status === 'GENERATED' && (
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#f39c12' }]}
              onPress={() => handleStatusUpdate(item, 'REVIEWED')}
            >
              <Text style={styles.statusButtonText}>Mark Reviewed</Text>
            </TouchableOpacity>
          )}
          {item.status === 'REVIEWED' && (
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#27ae60' }]}
              onPress={() => handleStatusUpdate(item, 'APPROVED')}
            >
              <Text style={styles.statusButtonText}>Approve</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <Text style={styles.reportCreated}>
        Generated: {formatDate(item.createdAt)} by {item.creator?.username}
      </Text>
    </TouchableOpacity>
  );

  const renderGenerateModal = () => (
    <Modal
      visible={generateModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Generate Compliance Report</Text>
          <TouchableOpacity
            onPress={() => {
              setGenerateModalVisible(false);
              resetGenerateForm();
            }}
          >
            <Icon name="close" size={24} color="#2c3e50" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <TextInput
            style={styles.input}
            placeholder="Report Title *"
            value={generateForm.title}
            onChangeText={(text) => setGenerateForm({ ...generateForm, title: text })}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Report Description"
            value={generateForm.description}
            onChangeText={(text) => setGenerateForm({ ...generateForm, description: text })}
            multiline
            numberOfLines={3}
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Report Type</Text>
            <Picker
              selectedValue={generateForm.reportType}
              onValueChange={(value) => setGenerateForm({ ...generateForm, reportType: value })}
              style={styles.picker}
            >
              <Picker.Item label="SOX Compliance" value="SOX_COMPLIANCE" />
              <Picker.Item label="Insurance Summary" value="INSURANCE_SUMMARY" />
              <Picker.Item label="Audit Summary" value="AUDIT_SUMMARY" />
              <Picker.Item label="Document Compliance" value="DOCUMENT_COMPLIANCE" />
            </Picker>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Report Period</Text>
            <Picker
              selectedValue={generateForm.reportPeriod}
              onValueChange={(value) => setGenerateForm({ ...generateForm, reportPeriod: value })}
              style={styles.picker}
            >
              <Picker.Item label="Monthly" value="MONTHLY" />
              <Picker.Item label="Quarterly" value="QUARTERLY" />
              <Picker.Item label="Annual" value="ANNUAL" />
            </Picker>
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Start Date (YYYY-MM-DD)"
              value={generateForm.periodStartDate}
              onChangeText={(text) => setGenerateForm({ ...generateForm, periodStartDate: text })}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="End Date (YYYY-MM-DD)"
              value={generateForm.periodEndDate}
              onChangeText={(text) => setGenerateForm({ ...generateForm, periodEndDate: text })}
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setGenerateForm({ 
              ...generateForm, 
              includeMetrics: !generateForm.includeMetrics 
            })}
          >
            <Icon
              name={generateForm.includeMetrics ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color="#3498db"
            />
            <Text style={styles.checkboxLabel}>Include automated metrics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerate}
            disabled={generateLoading}
          >
            {generateLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="file-chart" size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Generate Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const filterOptions = [
    {
      key: 'reportType',
      label: 'Report Type',
      options: [
        { label: 'All Types', value: 'all' },
        { label: 'SOX Compliance', value: 'SOX_COMPLIANCE' },
        { label: 'Insurance Summary', value: 'INSURANCE_SUMMARY' },
        { label: 'Audit Summary', value: 'AUDIT_SUMMARY' },
        { label: 'Document Compliance', value: 'DOCUMENT_COMPLIANCE' },
      ],
    },
    {
      key: 'reportPeriod',
      label: 'Period',
      options: [
        { label: 'All Periods', value: 'all' },
        { label: 'Monthly', value: 'MONTHLY' },
        { label: 'Quarterly', value: 'QUARTERLY' },
        { label: 'Annual', value: 'ANNUAL' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'All Statuses', value: 'all' },
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Generated', value: 'GENERATED' },
        { label: 'Reviewed', value: 'REVIEWED' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Archived', value: 'ARCHIVED' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation}
        title="Compliance Reports"
        rightIcon="file-chart"
        onRightPress={() => setGenerateModalVisible(true)}
      />

      <FilterPagination
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      <FlatList
        data={reports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-chart" size={64} color="#bdc3c7" />
            <Text style={styles.emptyText}>No compliance reports found</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setGenerateModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Generate First Report</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {renderGenerateModal()}
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
  reportItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reportInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  reportDate: {
    fontSize: 11,
    color: '#95a5a6',
  },
  reportActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  reportDescription: {
    fontSize: 14,
    color: '#34495e',
    marginTop: 8,
    marginLeft: 36,
    lineHeight: 20,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginLeft: 36,
  },
  reportTags: {
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
  statusActions: {
    flexDirection: 'row',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  statusButtonText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  reportCreated: {
    fontSize: 11,
    color: '#95a5a6',
    marginTop: 8,
    marginLeft: 36,
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
    backgroundColor: '#f39c12',
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 8,
  },
  generateButton: {
    backgroundColor: '#f39c12',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ComplianceReportsScreen; 