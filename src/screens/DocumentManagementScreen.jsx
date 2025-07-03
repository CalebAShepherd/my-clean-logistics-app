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
import * as DocumentPicker from 'expo-document-picker';
import { documentManagementAPI } from '../api/documentManagement';
import FilterPagination from '../components/FilterPagination';
import { formatDate } from '../utils/formatDate';
import { SafeAreaView } from 'react-native-safe-area-context';
import InternalHeader from '../components/InternalHeader';

const DocumentManagementScreen = ({ navigation }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [pagination, setPagination] = useState({});

  // Filter states
  const [filters, setFilters] = useState({
    documentType: 'all',
    category: 'all',
    accessLevel: 'all',
    isExpired: undefined,
    page: 1,
    limit: 20,
  });

  // Upload form states
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    documentType: 'POLICY',
    category: 'COMPLIANCE',
    retentionPeriod: '',
    isConfidential: false,
    accessLevel: 'INTERNAL',
  });

  useEffect(() => {
    loadDocuments();
  }, [filters]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentManagementAPI.getDocuments(filters);
      setDocuments(data.documents);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading documents:', error);
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters, page: 1 });
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        copyToCacheDirectory: true,
        multiple: false,
      });
      
      let asset = null;
      if (result.type === 'success') {
        asset = result;
      } else if (result.assets?.length > 0 && result.canceled === false) {
        asset = result.assets[0];
      }
      
      if (!asset) {
        console.log('DocumentPicker canceled or no assets:', result);
        return;
      }
      
      const uri = asset.uri;
      const name = asset.name || uri.split('/').pop();
      const ext = name.split('.').pop().toLowerCase();
      let mimeType = asset.mimeType;
      
      if (!mimeType) {
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'csv') mimeType = 'text/csv';
        else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else mimeType = 'application/octet-stream';
      }
      
      setSelectedDocument({ uri, name, type: mimeType, size: asset.size });
    } catch (error) {
      console.log('pickDocument error:', error);
      Alert.alert('Error', 'Failed to pick document: ' + error.message);
    }
  };

  const handleUpload = async () => {
    if (!selectedDocument || !uploadForm.title) {
      Alert.alert('Error', 'Please select a document and enter a title');
      return;
    }

    try {
      setUploadLoading(true);
      const formData = new FormData();
      
      formData.append('document', {
        uri: selectedDocument.uri,
        type: selectedDocument.type,
        name: selectedDocument.name,
      });
      
      Object.keys(uploadForm).forEach(key => {
        if (uploadForm[key] !== '') {
          formData.append(key, uploadForm[key].toString());
        }
      });

      await documentManagementAPI.uploadDocument(formData);
      Alert.alert('Success', 'Document uploaded successfully');
      setUploadModalVisible(false);
      resetUploadForm();
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownload = async (document) => {
    try {
      const response = await documentManagementAPI.downloadDocument(document.id);
      // Handle blob download for React Native
      Alert.alert('Download', 'Download feature would be implemented here');
    } catch (error) {
      Alert.alert('Error', 'Failed to download document');
    }
  };

  const handleDelete = (document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await documentManagementAPI.deleteDocument(document.id);
              Alert.alert('Success', 'Document deleted successfully');
              loadDocuments();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const resetUploadForm = () => {
    setUploadForm({
      title: '',
      description: '',
      documentType: 'POLICY',
      category: 'COMPLIANCE',
      retentionPeriod: '',
      isConfidential: false,
      accessLevel: 'INTERNAL',
    });
    setSelectedDocument(null);
  };

  const getDocumentIcon = (type) => {
    const icons = {
      POLICY: 'shield-check',
      PROCEDURE: 'clipboard-list',
      AUDIT_REPORT: 'file-chart',
      CERTIFICATE: 'certificate',
      CONTRACT: 'file-document',
      INSURANCE_POLICY: 'shield-account',
      OTHER: 'file',
    };
    return icons[type] || 'file';
  };

  const getStatusColor = (isExpired) => {
    return isExpired ? '#e74c3c' : '#27ae60';
  };

  const renderDocumentItem = ({ item }) => (
    <TouchableOpacity style={styles.documentItem}>
      <View style={styles.documentHeader}>
        <Icon
          name={getDocumentIcon(item.documentType)}
          size={24}
          color="#3498db"
        />
        <View style={styles.documentInfo}>
          <Text style={styles.documentTitle}>{item.title}</Text>
          <Text style={styles.documentSubtitle}>
            {item.documentType.replace('_', ' ')} • {item.category}
          </Text>
          <Text style={styles.documentDate}>
            Uploaded: {formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={styles.documentActions}>
          <TouchableOpacity
            onPress={() => handleDownload(item)}
            style={styles.actionButton}
          >
            <Icon name="download" size={20} color="#3498db" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={styles.actionButton}
          >
            <Icon name="delete" size={20} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
      
      {item.description && (
        <Text style={styles.documentDescription}>{item.description}</Text>
      )}
      
      <View style={styles.documentFooter}>
        <View style={styles.documentTags}>
          {item.isConfidential && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Confidential</Text>
            </View>
          )}
          <View style={[styles.tag, { backgroundColor: getStatusColor(item.isExpired) }]}>
            <Text style={styles.tagText}>
              {item.isExpired ? 'Expired' : 'Active'}
            </Text>
          </View>
        </View>
        {item.expiryDate && (
          <Text style={styles.expiryDate}>
            Expires: {formatDate(item.expiryDate)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderUploadModal = () => (
    <Modal
      visible={uploadModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Upload Document</Text>
          <TouchableOpacity
            onPress={() => {
              setUploadModalVisible(false);
              resetUploadForm();
            }}
          >
            <Icon name="close" size={24} color="#2c3e50" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.filePicker} onPress={pickDocument}>
            <Icon
              name={selectedDocument ? "file-check" : "file-plus"}
              size={32}
              color={selectedDocument ? "#27ae60" : "#3498db"}
            />
            <Text style={styles.filePickerText}>
              {selectedDocument ? selectedDocument.name : 'Select Document'}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Document Title *"
            value={uploadForm.title}
            onChangeText={(text) => setUploadForm({ ...uploadForm, title: text })}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            value={uploadForm.description}
            onChangeText={(text) => setUploadForm({ ...uploadForm, description: text })}
            multiline
            numberOfLines={3}
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Document Type</Text>
            <Picker
              selectedValue={uploadForm.documentType}
              onValueChange={(value) => setUploadForm({ ...uploadForm, documentType: value })}
              style={styles.picker}
            >
              <Picker.Item label="Policy" value="POLICY" />
              <Picker.Item label="Procedure" value="PROCEDURE" />
              <Picker.Item label="Audit Report" value="AUDIT_REPORT" />
              <Picker.Item label="Certificate" value="CERTIFICATE" />
              <Picker.Item label="Contract" value="CONTRACT" />
              <Picker.Item label="Insurance Policy" value="INSURANCE_POLICY" />
              <Picker.Item label="Other" value="OTHER" />
            </Picker>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Category</Text>
            <Picker
              selectedValue={uploadForm.category}
              onValueChange={(value) => setUploadForm({ ...uploadForm, category: value })}
              style={styles.picker}
            >
              <Picker.Item label="Compliance" value="COMPLIANCE" />
              <Picker.Item label="Financial" value="FINANCIAL" />
              <Picker.Item label="Operational" value="OPERATIONAL" />
              <Picker.Item label="Legal" value="LEGAL" />
              <Picker.Item label="HR" value="HR" />
              <Picker.Item label="IT" value="IT" />
            </Picker>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Retention Period (years)"
            value={uploadForm.retentionPeriod}
            onChangeText={(text) => setUploadForm({ ...uploadForm, retentionPeriod: text })}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUpload}
            disabled={uploadLoading}
          >
            {uploadLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="upload" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>Upload Document</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const filterOptions = [
    {
      key: 'documentType',
      label: 'Document Type',
      options: [
        { label: 'All Types', value: 'all' },
        { label: 'Policy', value: 'POLICY' },
        { label: 'Procedure', value: 'PROCEDURE' },
        { label: 'Audit Report', value: 'AUDIT_REPORT' },
        { label: 'Certificate', value: 'CERTIFICATE' },
        { label: 'Contract', value: 'CONTRACT' },
        { label: 'Insurance Policy', value: 'INSURANCE_POLICY' },
        { label: 'Other', value: 'OTHER' },
      ],
    },
    {
      key: 'category',
      label: 'Category',
      options: [
        { label: 'All Categories', value: 'all' },
        { label: 'Compliance', value: 'COMPLIANCE' },
        { label: 'Financial', value: 'FINANCIAL' },
        { label: 'Operational', value: 'OPERATIONAL' },
        { label: 'Legal', value: 'LEGAL' },
        { label: 'HR', value: 'HR' },
        { label: 'IT', value: 'IT' },
      ],
    },
    {
      key: 'accessLevel',
      label: 'Access Level',
      options: [
        { label: 'All Levels', value: 'all' },
        { label: 'Public', value: 'PUBLIC' },
        { label: 'Internal', value: 'INTERNAL' },
        { label: 'Confidential', value: 'CONFIDENTIAL' },
        { label: 'Restricted', value: 'RESTRICTED' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation}
        title="Document Management"
        rightIcon="plus"
        onRightPress={() => setUploadModalVisible(true)}
      />

      <FilterPagination
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      <FlatList
        data={documents}
        renderItem={renderDocumentItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-document" size={64} color="#bdc3c7" />
            <Text style={styles.emptyText}>No documents found</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setUploadModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Upload First Document</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {renderUploadModal()}
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
  documentItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  documentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  documentSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  documentDate: {
    fontSize: 11,
    color: '#95a5a6',
  },
  documentActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  documentDescription: {
    fontSize: 14,
    color: '#34495e',
    marginTop: 8,
    marginLeft: 36,
  },
  documentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginLeft: 36,
  },
  documentTags: {
    flexDirection: 'row',
  },
  tag: {
    backgroundColor: '#3498db',
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
  expiryDate: {
    fontSize: 11,
    color: '#f39c12',
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
    backgroundColor: '#3498db',
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
  filePicker: {
    borderWidth: 2,
    borderColor: '#bdc3c7',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  filePickerText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 8,
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
  uploadButton: {
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default DocumentManagementScreen; 