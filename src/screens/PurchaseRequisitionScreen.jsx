import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import InternalHeader from '../components/InternalHeader';
import StatusBadge from '../components/StatusBadge';
import {
  fetchPurchaseRequisitions,
  createPurchaseRequisition,
  approvePurchaseRequisition,
  rejectPurchaseRequisition,
  convertToPurchaseOrder,
  fetchPendingApprovals,
} from '../api/purchaseRequisitions';
import { fetchSuppliers } from '../api/suppliers';

export default function PurchaseRequisitionScreen({ navigation }) {
  const { user, userToken: token } = useContext(AuthContext);
  const theme = useTheme();
  const [requisitions, setRequisitions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form state for creating new requisition
  const [formData, setFormData] = useState({
    description: '',
    justification: '',
    priority: 'MEDIUM',
    requestedDate: new Date().toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, estimatedPrice: 0, specification: '' }],
  });

  const [approvalData, setApprovalData] = useState({
    comments: '',
    rejectionReason: '',
    selectedSupplierId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requisitionsData, suppliersData, pendingData] = await Promise.all([
        fetchPurchaseRequisitions(token),
        fetchSuppliers(token),
        fetchPendingApprovals(token, user.id),
      ]);
      
      // Handle the response structure - requisitions are nested in the response
      setRequisitions(requisitionsData.requisitions || []);
      setSuppliers(suppliersData.suppliers || suppliersData || []);
      setPendingApprovals(pendingData.approvals || pendingData || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data. Please try again.');
      console.error('Error loading purchase requisitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateRequisition = async () => {
    try {
      if (!formData.description.trim()) {
        Alert.alert('Validation Error', 'Please enter a description');
        return;
      }

      const newRequisition = {
        ...formData,
        createdBy: user.id,
        warehouseId: user.warehouseId,
        totalAmount: formData.items.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0),
      };

      await createPurchaseRequisition(token, newRequisition);
      setShowCreateModal(false);
      resetForm();
      loadData();
      Alert.alert('Success', 'Purchase requisition created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create purchase requisition');
      console.error('Error creating requisition:', error);
    }
  };

  const handleApprove = async () => {
    try {
      await approvePurchaseRequisition(token, selectedRequisition.id, user.id, approvalData.comments);
      setShowApprovalModal(false);
      loadData();
      Alert.alert('Success', 'Purchase requisition approved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to approve purchase requisition');
      console.error('Error approving requisition:', error);
    }
  };

  const handleReject = async () => {
    try {
      if (!approvalData.rejectionReason.trim()) {
        Alert.alert('Validation Error', 'Please provide a rejection reason');
        return;
      }
      
      await rejectPurchaseRequisition(token, selectedRequisition.id, user.id, approvalData.rejectionReason);
      setShowApprovalModal(false);
      loadData();
      Alert.alert('Success', 'Purchase requisition rejected');
    } catch (error) {
      Alert.alert('Error', 'Failed to reject purchase requisition');
      console.error('Error rejecting requisition:', error);
    }
  };

  const handleConvertToPO = async () => {
    try {
      if (!approvalData.selectedSupplierId) {
        Alert.alert('Validation Error', 'Please select a supplier');
        return;
      }
      
      await convertToPurchaseOrder(token, selectedRequisition.id, user.id, approvalData.selectedSupplierId, approvalData.comments);
      setShowApprovalModal(false);
      loadData();
      Alert.alert('Success', 'Purchase order created successfully');
      navigation.navigate('PurchaseOrderScreen');
    } catch (error) {
      Alert.alert('Error', 'Failed to convert to purchase order');
      console.error('Error converting to PO:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      justification: '',
      priority: 'MEDIUM',
      requestedDate: new Date().toISOString().split('T')[0],
      items: [{ description: '', quantity: 1, estimatedPrice: 0, specification: '' }],
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, estimatedPrice: 0, specification: '' }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const filteredRequisitions = (requisitions || []).filter(req => {
    const matchesSearch = req.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.requisitionNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return '#6B7280';
      case 'PENDING_APPROVAL': return '#F59E0B';
      case 'APPROVED': return '#10B981';
      case 'REJECTED': return '#EF4444';
      case 'CONVERTED_TO_PO': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'LOW': return '#10B981';
      case 'MEDIUM': return '#F59E0B';
      case 'HIGH': return '#EF4444';
      case 'URGENT': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const renderRequisitionItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.requisitionCard, { backgroundColor: theme.cardBackground }]}
      onPress={() => navigation.navigate('PurchaseRequisitionDetailScreen', { requisitionId: item.id })}
    >
      <View style={styles.requisitionHeader}>
        <View style={styles.requisitionInfo}>
          <Text style={[styles.requisitionNumber, { color: theme.colors.text }]}>
            {item.requisitionNumber}
          </Text>
          <Text style={[styles.requisitionDescription, { color: theme.textSecondary }]}>
            {item.description}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <StatusBadge status={item.status} color={getStatusColor(item.status)} />
          <StatusBadge status={item.priority} color={getPriorityColor(item.priority)} />
        </View>
      </View>
      
      <View style={styles.requisitionDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="currency-usd" size={16} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            ${item.totalAmount?.toFixed(2) || '0.00'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar" size={16} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            {new Date(item.requestedDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="account" size={16} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            {item.createdBy?.name || 'Unknown'}
          </Text>
        </View>
      </View>

      {item.status === 'PENDING_APPROVAL' && user.role === 'ADMIN' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => {
              setSelectedRequisition(item);
              setShowApprovalModal(true);
            }}
          >
            <MaterialCommunityIcons name="check" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => {
              setSelectedRequisition(item);
              setShowApprovalModal(true);
            }}
          >
            <MaterialCommunityIcons name="close" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <InternalHeader navigation={navigation} title="Purchase Requisitions" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading requisitions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InternalHeader
        navigation={navigation}
        title="Purchase Requisitions"
        rightIcons={[
          {
            icon: "plus",
            onPress: () => setShowCreateModal(true),
            color: "#10B981"
          },
          {
            icon: "view-dashboard",
            onPress: () => navigation.navigate('ProcurementAnalytics'),
            color: "#3B82F6"
          }
        ]}
      />

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.cardBackground }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search requisitions..."
            placeholderTextColor={theme.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CONVERTED_TO_PO'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[
                styles.filterChipText,
                statusFilter === status && { color: '#fff' }
              ]}>
                {status.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Pending Approvals Alert */}
      {pendingApprovals.length > 0 && user.role === 'ADMIN' && (
        <View style={styles.pendingAlert}>
          <MaterialCommunityIcons name="alert-circle" size={20} color="#F59E0B" />
          <Text style={styles.pendingAlertText}>
            You have {pendingApprovals.length} requisition(s) pending approval
          </Text>
        </View>
      )}

      {/* Requisitions List */}
      <FlatList
        data={filteredRequisitions}
        renderItem={renderRequisitionItem}
        keyExtractor={item => item.id.toString()}
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No purchase requisitions found
            </Text>
          </View>
        }
      />

      {/* Create Requisition Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Create Requisition</Text>
            <TouchableOpacity onPress={handleCreateRequisition}>
              <Text style={[styles.saveButton, { color: theme.colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Basic Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description *</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Enter description"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Justification</Text>
                <TextInput
                  style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.justification}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, justification: text }))}
                  placeholder="Enter justification"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Priority</Text>
                  <View style={[styles.pickerContainer, { borderColor: theme.colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(priority => (
                        <TouchableOpacity
                          key={priority}
                          style={[
                            styles.priorityOption,
                            formData.priority === priority && { backgroundColor: getPriorityColor(priority) }
                          ]}
                          onPress={() => setFormData(prev => ({ ...prev, priority }))}
                        >
                          <Text style={[
                            styles.priorityText,
                            formData.priority === priority && { color: '#fff' }
                          ]}>
                            {priority}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Requested Date</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={formData.requestedDate}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, requestedDate: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>
            </View>

            {/* Items */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Items</Text>
                <TouchableOpacity onPress={addItem} style={styles.addItemButton}>
                  <MaterialCommunityIcons name="plus" size={20} color={theme.colors.primary} />
                  <Text style={[styles.addItemText, { color: theme.colors.primary }]}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {formData.items.map((item, index) => (
                <View key={index} style={[styles.itemCard, { backgroundColor: theme.cardBackground }]}>
                  <View style={styles.itemHeader}>
                    <Text style={[styles.itemTitle, { color: theme.colors.text }]}>Item {index + 1}</Text>
                    {formData.items.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(index)}>
                        <MaterialCommunityIcons name="delete" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description *</Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                      value={item.description}
                      onChangeText={(text) => updateItem(index, 'description', text)}
                      placeholder="Item description"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Quantity</Text>
                      <TextInput
                        style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                        value={item.quantity.toString()}
                        onChangeText={(text) => updateItem(index, 'quantity', parseInt(text) || 0)}
                        placeholder="1"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Estimated Price</Text>
                      <TextInput
                        style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                        value={item.estimatedPrice.toString()}
                        onChangeText={(text) => updateItem(index, 'estimatedPrice', parseFloat(text) || 0)}
                        placeholder="0.00"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Specification</Text>
                    <TextInput
                      style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                      value={item.specification}
                      onChangeText={(text) => updateItem(index, 'specification', text)}
                      placeholder="Technical specifications, requirements, etc."
                      placeholderTextColor={theme.textSecondary}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Total Amount */}
            <View style={styles.totalContainer}>
              <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total Estimated Amount:</Text>
              <Text style={[styles.totalAmount, { color: theme.colors.primary }]}>
                ${formData.items.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0).toFixed(2)}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Approval Modal */}
      <Modal
        visible={showApprovalModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowApprovalModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {selectedRequisition?.requisitionNumber}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Approval Actions</Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Comments</Text>
                <TextInput
                  style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={approvalData.comments}
                  onChangeText={(text) => setApprovalData(prev => ({ ...prev, comments: text }))}
                  placeholder="Add comments (optional)"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Rejection Reason</Text>
                <TextInput
                  style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={approvalData.rejectionReason}
                  onChangeText={(text) => setApprovalData(prev => ({ ...prev, rejectionReason: text }))}
                  placeholder="Required if rejecting"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Convert to PO - Select Supplier</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.supplierContainer}>
                  {suppliers.map(supplier => (
                    <TouchableOpacity
                      key={supplier.id}
                      style={[
                        styles.supplierOption,
                        approvalData.selectedSupplierId === supplier.id && { backgroundColor: theme.colors.primary }
                      ]}
                      onPress={() => setApprovalData(prev => ({ ...prev, selectedSupplierId: supplier.id }))}
                    >
                      <Text style={[
                        styles.supplierText,
                        approvalData.selectedSupplierId === supplier.id && { color: '#fff' }
                      ]}>
                        {supplier.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.approvalButtons}>
                <TouchableOpacity
                  style={[styles.approvalButton, styles.approveButton]}
                  onPress={handleApprove}
                >
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  <Text style={styles.approvalButtonText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.approvalButton, styles.rejectButton]}
                  onPress={handleReject}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#fff" />
                  <Text style={styles.approvalButtonText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.approvalButton, styles.convertButton]}
                  onPress={handleConvertToPO}
                >
                  <MaterialCommunityIcons name="swap-horizontal" size={20} color="#fff" />
                  <Text style={styles.approvalButtonText}>Convert to PO</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  pendingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  pendingAlertText: {
    marginLeft: 8,
    color: '#92400E',
    fontWeight: '500',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  requisitionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  requisitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requisitionInfo: {
    flex: 1,
    marginRight: 12,
  },
  requisitionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  requisitionDescription: {
    fontSize: 14,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  requisitionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 4,
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 4,
    fontSize: 12,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addItemText: {
    marginLeft: 4,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  priorityOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  itemCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  supplierContainer: {
    flexDirection: 'row',
  },
  supplierOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  supplierText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  approvalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  approvalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  approvalButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  convertButton: {
    backgroundColor: '#8B5CF6',
  },
}); 