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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import InternalHeader from '../components/InternalHeader';
import StatusBadge from '../components/StatusBadge';
import {
  fetchPurchaseOrders,
  createPurchaseOrder,
  approvePurchaseOrder,
  sendPurchaseOrder,
} from '../api/purchaseOrders';
import { fetchSuppliers } from '../api/suppliers';

export default function PurchaseOrderScreen({ navigation }) {
  const { user, userToken: token } = useContext(AuthContext);
  const theme = useTheme();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form state for creating new order
  const [formData, setFormData] = useState({
    supplierId: '',
    description: '',
    notes: '',
    priority: 'MEDIUM',
    expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, unitPrice: 0, specification: '' }],
    terms: 'Net 30',
    shippingAddress: '',
    billingAddress: '',
  });

  const [actionData, setActionData] = useState({
    comments: '',
    emailMessage: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, suppliersData] = await Promise.all([
        fetchPurchaseOrders(token),
        fetchSuppliers(token),
      ]);
      
      // Handle the response structure - orders are nested in the response
      setOrders(ordersData.purchaseOrders || ordersData.orders || ordersData || []);
      setSuppliers(suppliersData.suppliers || suppliersData || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data. Please try again.');
      console.error('Error loading purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateOrder = async () => {
    try {
      if (!formData.supplierId || !formData.description.trim()) {
        Alert.alert('Validation Error', 'Please fill in required fields');
        return;
      }

      const newOrder = {
        ...formData,
        createdBy: user.id,
        warehouseId: user.warehouseId,
        subtotal: formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
        taxAmount: formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 0.08, // 8% tax
        totalAmount: formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 1.08,
      };

      await createPurchaseOrder(token, newOrder);
      setShowCreateModal(false);
      resetForm();
      loadData();
      Alert.alert('Success', 'Purchase order created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create purchase order');
      console.error('Error creating order:', error);
    }
  };

  const handleApproveOrder = async () => {
    try {
      await approvePurchaseOrder(token, selectedOrder.id, user.id, actionData.comments);
      setShowActionModal(false);
      loadData();
      Alert.alert('Success', 'Purchase order approved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to approve purchase order');
      console.error('Error approving order:', error);
    }
  };

  const handleSendOrder = async () => {
    try {
      await sendPurchaseOrder(token, selectedOrder.id, user.id, actionData.emailMessage);
      setShowActionModal(false);
      loadData();
      Alert.alert('Success', 'Purchase order sent to supplier successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to send purchase order');
      console.error('Error sending order:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      description: '',
      notes: '',
      priority: 'MEDIUM',
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{ description: '', quantity: 1, unitPrice: 0, specification: '' }],
      terms: 'Net 30',
      shippingAddress: '',
      billingAddress: '',
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, specification: '' }]
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

  const filteredOrders = (orders || []).filter(order => {
    const matchesSearch = order.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return '#6B7280';
      case 'PENDING_APPROVAL': return '#F59E0B';
      case 'APPROVED': return '#10B981';
      case 'SENT_TO_SUPPLIER': return '#3B82F6';
      case 'CONFIRMED': return '#8B5CF6';
      case 'PARTIALLY_RECEIVED': return '#F59E0B';
      case 'RECEIVED': return '#10B981';
      case 'CANCELLED': return '#EF4444';
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

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.orderCard, { backgroundColor: theme.cardBackground }]}
      onPress={() => navigation.navigate('PurchaseOrderDetailScreen', { orderId: item.id })}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={[styles.orderNumber, { color: theme.colors.text }]}>
            {item.orderNumber}
          </Text>
          <Text style={[styles.orderDescription, { color: theme.textSecondary }]}>
            {item.description}
          </Text>
          <Text style={[styles.supplierName, { color: theme.colors.primary }]}>
            {item.supplier?.name}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <StatusBadge status={item.status} color={getStatusColor(item.status)} />
          <StatusBadge status={item.priority} color={getPriorityColor(item.priority)} />
        </View>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="currency-usd" size={16} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            ${Number(item.totalAmount || 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar" size={16} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            {item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate).toLocaleDateString() : 'No date set'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="package-variant" size={16} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            {item.lineItems?.length || item.items?.length || 0} items
          </Text>
        </View>
      </View>

      {(item.status === 'PENDING_APPROVAL' || item.status === 'APPROVED') && user.role === 'ADMIN' && (
        <View style={styles.actionButtons}>
          {item.status === 'PENDING_APPROVAL' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => {
                setSelectedOrder(item);
                setShowActionModal(true);
              }}
            >
              <MaterialCommunityIcons name="check" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
          )}
          {item.status === 'APPROVED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.sendButton]}
              onPress={() => {
                setSelectedOrder(item);
                setShowActionModal(true);
              }}
            >
              <MaterialCommunityIcons name="send" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Send to Supplier</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <InternalHeader navigation={navigation} title="Purchase Orders" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InternalHeader
        navigation={navigation}
        title="Purchase Orders"
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
            placeholder="Search orders..."
            placeholderTextColor={theme.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT_TO_SUPPLIER', 'CONFIRMED', 'RECEIVED', 'CANCELLED'].map(status => (
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

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id.toString()}
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No purchase orders found
            </Text>
          </View>
        }
      />

      {/* Create Order Modal */}
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
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Create Purchase Order</Text>
            <TouchableOpacity onPress={handleCreateOrder}>
              <Text style={[styles.saveButton, { color: theme.colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Basic Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Supplier *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.supplierContainer}>
                  {suppliers.map(supplier => (
                    <TouchableOpacity
                      key={supplier.id}
                      style={[
                        styles.supplierOption,
                        formData.supplierId === supplier.id && { backgroundColor: theme.colors.primary }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, supplierId: supplier.id }))}
                    >
                      <Text style={[
                        styles.supplierText,
                        formData.supplierId === supplier.id && { color: '#fff' }
                      ]}>
                        {supplier.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

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
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Delivery Date</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={formData.expectedDeliveryDate}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, expectedDeliveryDate: text }))}
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
                      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Unit Price</Text>
                      <TextInput
                        style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                        value={item.unitPrice.toString()}
                        onChangeText={(text) => updateItem(index, 'unitPrice', parseFloat(text) || 0)}
                        placeholder="0.00"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Order Summary */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Subtotal:</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                  ${formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Tax (8%):</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                  ${(formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 0.08).toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: theme.colors.text }]}>Total:</Text>
                <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
                  ${(formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 1.08).toFixed(2)}
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowActionModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {selectedOrder?.orderNumber}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Actions</Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Comments</Text>
                <TextInput
                  style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={actionData.comments}
                  onChangeText={(text) => setActionData(prev => ({ ...prev, comments: text }))}
                  placeholder="Add comments (optional)"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {selectedOrder?.status === 'APPROVED' && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Message</Text>
                  <TextInput
                    style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={actionData.emailMessage}
                    onChangeText={(text) => setActionData(prev => ({ ...prev, emailMessage: text }))}
                    placeholder="Message to send with purchase order"
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    numberOfLines={4}
                  />
                </View>
              )}

              <View style={styles.actionButtons}>
                {selectedOrder?.status === 'PENDING_APPROVAL' && (
                  <TouchableOpacity
                    style={[styles.fullActionButton, styles.approveButton]}
                    onPress={handleApproveOrder}
                  >
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                    <Text style={styles.fullActionButtonText}>Approve Order</Text>
                  </TouchableOpacity>
                )}

                {selectedOrder?.status === 'APPROVED' && (
                  <TouchableOpacity
                    style={[styles.fullActionButton, styles.sendButton]}
                    onPress={handleSendOrder}
                  >
                    <MaterialCommunityIcons name="send" size={20} color="#fff" />
                    <Text style={styles.fullActionButtonText}>Send to Supplier</Text>
                  </TouchableOpacity>
                )}
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
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  orderCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
    marginRight: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  orderDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  orderDetails: {
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
  sendButton: {
    backgroundColor: '#3B82F6',
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
  summaryContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  fullActionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
}); 