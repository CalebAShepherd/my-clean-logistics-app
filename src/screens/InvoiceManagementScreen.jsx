import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import InternalHeader from '../components/InternalHeader';
import { getInvoicesEnhanced, sendInvoice, voidInvoice, recordPayment } from '../api/billing';

const { width } = Dimensions.get('window');

const InvoiceManagementScreen = ({ navigation }) => {
  const theme = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const statusOptions = [
    { label: 'All Invoices', value: 'ALL' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Sent', value: 'SENT' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Overdue', value: 'OVERDUE' },
    { label: 'Void', value: 'VOID' },
  ];

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchQuery, selectedStatus]);

  const loadInvoices = async () => {
    try {
      const data = await getInvoicesEnhanced();
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
      Alert.alert('Error', 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const filterInvoices = () => {
    let filtered = invoices;

    // Filter by status
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(invoice => invoice.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredInvoices(filtered);
  };

  const handleSendInvoice = async (invoiceId) => {
    try {
      await sendInvoice(invoiceId);
      Alert.alert('Success', 'Invoice sent successfully');
      loadInvoices();
    } catch (error) {
      console.error('Error sending invoice:', error);
      Alert.alert('Error', 'Failed to send invoice');
    }
  };

  const handleMarkAsPaid = async (invoiceId) => {
    Alert.alert(
      'Mark as Paid',
      'Are you sure you want to mark this invoice as paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            try {
              await recordPayment({
                invoiceId: invoiceId,
                amount: 0, // This would need to be passed from the invoice
                paymentMethod: 'MANUAL',
                paymentDate: new Date().toISOString(),
              });
              Alert.alert('Success', 'Invoice marked as paid');
              loadInvoices();
            } catch (error) {
              console.error('Error marking invoice as paid:', error);
              Alert.alert('Error', 'Failed to mark invoice as paid');
            }
          },
        },
      ]
    );
  };

  const handleVoidInvoice = async (invoiceId) => {
    Alert.alert(
      'Void Invoice',
      'Are you sure you want to void this invoice? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void',
          style: 'destructive',
          onPress: async () => {
            try {
              await voidInvoice(invoiceId, 'Voided by user');
              Alert.alert('Success', 'Invoice voided successfully');
              loadInvoices();
            } catch (error) {
              console.error('Error voiding invoice:', error);
              Alert.alert('Error', 'Failed to void invoice');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return '#9E9E9E';
      case 'SENT': return '#2196F3';
      case 'PAID': return '#4CAF50';
      case 'OVERDUE': return '#F44336';
      case 'VOID': return '#FF5722';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'DRAFT': return 'document-outline';
      case 'SENT': return 'mail';
      case 'PAID': return 'checkmark-circle';
      case 'OVERDUE': return 'warning';
      case 'VOID': return 'close-circle';
      default: return 'document';
    }
  };

  const InvoiceCard = ({ invoice }) => (
    <TouchableOpacity
      style={[styles.invoiceCard, { backgroundColor: theme.cardBackground }]}
      onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: invoice.id })}
    >
      <View style={styles.invoiceHeader}>
        <View style={styles.invoiceInfo}>
          <Text style={[styles.invoiceNumber, { color: theme.text }]}>
            {invoice.invoiceNumber}
          </Text>
          <Text style={[styles.customerName, { color: theme.textSecondary }]}>
            {invoice.customer?.name || 'Unknown Customer'}
          </Text>
        </View>
        <View style={styles.invoiceAmount}>
          <Text style={[styles.amount, { color: theme.text }]}>
            {formatCurrency(invoice.totalAmount, invoice.currency)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(invoice.status)}20` }]}>
            <Ionicons 
              name={getStatusIcon(invoice.status)} 
              size={12} 
              color={getStatusColor(invoice.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
              {invoice.status}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.invoiceDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar" size={14} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            Due: {formatDate(invoice.dueDate)}
          </Text>
        </View>
        {invoice.description && (
          <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={1}>
            {invoice.description}
          </Text>
        )}
      </View>

      <View style={styles.invoiceActions}>
        {invoice.status === 'DRAFT' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${theme.primary}20` }]}
            onPress={() => handleSendInvoice(invoice.id)}
          >
            <Ionicons name="send" size={16} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.primary }]}>Send</Text>
          </TouchableOpacity>
        )}
        {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF5020' }]}
            onPress={() => handleMarkAsPaid(invoice.id)}
          >
            <Ionicons name="checkmark" size={16} color="#4CAF50" />
            <Text style={[styles.actionText, { color: '#4CAF50' }]}>Mark Paid</Text>
          </TouchableOpacity>
        )}
        {invoice.status !== 'PAID' && invoice.status !== 'VOID' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F4433620' }]}
            onPress={() => handleVoidInvoice(invoice.id)}
          >
            <Ionicons name="close" size={16} color="#F44336" />
            <Text style={[styles.actionText, { color: '#F44336' }]}>Void</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Invoices</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: theme.text }]}>Status</Text>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  selectedStatus === option.value && { backgroundColor: `${theme.primary}20` }
                ]}
                onPress={() => {
                  setSelectedStatus(option.value);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: selectedStatus === option.value ? theme.primary : theme.text }
                ]}>
                  {option.label}
                </Text>
                {selectedStatus === option.value && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InternalHeader navigation={navigation} title="Invoice Management" />
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search invoices..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.cardBackground }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusBar}>
        <Text style={[styles.resultCount, { color: theme.textSecondary }]}>
          {filteredInvoices.length} invoices
        </Text>
        {selectedStatus !== 'ALL' && (
          <TouchableOpacity
            style={styles.clearFilter}
            onPress={() => setSelectedStatus('ALL')}
          >
            <Text style={[styles.clearFilterText, { color: theme.primary }]}>
              Clear filter
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <InvoiceCard invoice={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('CreateInvoice')}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      <FilterModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterButton: {
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultCount: {
    fontSize: 14,
  },
  clearFilter: {
    padding: 4,
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  invoiceCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
  },
  invoiceAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  invoiceDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    marginLeft: 4,
  },
  description: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  invoiceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionText: {
    fontSize: 16,
  },
});

export default InvoiceManagementScreen; 