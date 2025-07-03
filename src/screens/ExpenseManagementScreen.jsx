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
import { useAuth } from '../hooks/useAuth';
import { 
  getExpenses, 
  approveExpense, 
  rejectExpense, 
  deleteExpense,
  getPendingApprovals,
  bulkApproveExpenses,
  bulkRejectExpenses
} from '../api/expenses';

const { width } = Dimensions.get('window');

const ExpenseManagementScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);

  const statusOptions = [
    { label: 'All Expenses', value: 'ALL' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Submitted', value: 'SUBMITTED' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Paid', value: 'PAID' },
  ];

  const categoryOptions = [
    { label: 'All Categories', value: 'ALL' },
    { label: 'Travel', value: 'TRAVEL' },
    { label: 'Meals', value: 'MEALS' },
    { label: 'Office Supplies', value: 'OFFICE_SUPPLIES' },
    { label: 'Equipment', value: 'EQUIPMENT' },
    { label: 'Utilities', value: 'UTILITIES' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
    { label: 'Insurance', value: 'INSURANCE' },
    { label: 'Other', value: 'OTHER' },
  ];

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchQuery, selectedStatus, selectedCategory]);

  const loadExpenses = async () => {
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
    setRefreshing(false);
  };

  const filterExpenses = () => {
    let filtered = expenses;

    // Filter by status
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(expense => expense.status === selectedStatus);
    }

    // Filter by category
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(expense => expense.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.merchant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredExpenses(filtered);
  };

  const handleApproveExpense = async (expenseId) => {
    try {
      await approveExpense(expenseId, {
        approvedBy: user.id,
        approvalNotes: 'Approved via mobile app',
      });
      Alert.alert('Success', 'Expense approved successfully');
      loadExpenses();
    } catch (error) {
      console.error('Error approving expense:', error);
      Alert.alert('Error', 'Failed to approve expense');
    }
  };

  const handleRejectExpense = async (expenseId) => {
    Alert.prompt(
      'Reject Expense',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason?.trim()) {
              Alert.alert('Error', 'Please provide a reason for rejection');
              return;
            }
            try {
              await rejectExpense(expenseId, {
                rejectedBy: user.id,
                rejectionReason: reason,
              });
              Alert.alert('Success', 'Expense rejected successfully');
              loadExpenses();
            } catch (error) {
              console.error('Error rejecting expense:', error);
              Alert.alert('Error', 'Failed to reject expense');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleDeleteExpense = async (expenseId) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expenseId);
              Alert.alert('Success', 'Expense deleted successfully');
              loadExpenses();
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const handleBulkApprove = async () => {
    if (selectedExpenses.length === 0) return;
    
    try {
      await bulkApproveExpenses(selectedExpenses, {
        approvedBy: user.id,
        approvalNotes: 'Bulk approved via mobile app',
      });
      Alert.alert('Success', `${selectedExpenses.length} expenses approved successfully`);
      setSelectedExpenses([]);
      setBulkMode(false);
      loadExpenses();
    } catch (error) {
      console.error('Error bulk approving expenses:', error);
      Alert.alert('Error', 'Failed to approve expenses');
    }
  };

  const handleBulkReject = async () => {
    if (selectedExpenses.length === 0) return;
    
    Alert.prompt(
      'Reject Expenses',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason?.trim()) {
              Alert.alert('Error', 'Please provide a reason for rejection');
              return;
            }
            try {
              await bulkRejectExpenses(selectedExpenses, {
                rejectedBy: user.id,
                rejectionReason: reason,
              });
              Alert.alert('Success', `${selectedExpenses.length} expenses rejected successfully`);
              setSelectedExpenses([]);
              setBulkMode(false);
              loadExpenses();
            } catch (error) {
              console.error('Error bulk rejecting expenses:', error);
              Alert.alert('Error', 'Failed to reject expenses');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const toggleExpenseSelection = (expenseId) => {
    setSelectedExpenses(prev =>
      prev.includes(expenseId)
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
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
      case 'SUBMITTED': return '#2196F3';
      case 'APPROVED': return '#4CAF50';
      case 'REJECTED': return '#F44336';
      case 'PAID': return '#8BC34A';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'DRAFT': return 'document-outline';
      case 'SUBMITTED': return 'send';
      case 'APPROVED': return 'checkmark-circle';
      case 'REJECTED': return 'close-circle';
      case 'PAID': return 'card';
      default: return 'document';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'TRAVEL': return 'airplane';
      case 'MEALS': return 'restaurant';
      case 'OFFICE_SUPPLIES': return 'briefcase';
      case 'EQUIPMENT': return 'hardware-chip';
      case 'UTILITIES': return 'flash';
      case 'MAINTENANCE': return 'construct';
      case 'INSURANCE': return 'shield-checkmark';
      default: return 'receipt';
    }
  };

  const ExpenseCard = ({ expense }) => (
    <TouchableOpacity
      style={[
        styles.expenseCard, 
        { backgroundColor: theme.cardBackground },
        bulkMode && selectedExpenses.includes(expense.id) && { borderColor: theme.primary, borderWidth: 2 }
      ]}
      onPress={() => {
        if (bulkMode) {
          toggleExpenseSelection(expense.id);
        } else {
          navigation.navigate('ExpenseDetail', { expenseId: expense.id });
        }
      }}
      onLongPress={() => {
        if (!bulkMode) {
          setBulkMode(true);
          setSelectedExpenses([expense.id]);
        }
      }}
    >
      {bulkMode && (
        <View style={styles.selectionIndicator}>
          <Ionicons 
            name={selectedExpenses.includes(expense.id) ? 'checkmark-circle' : 'ellipse-outline'} 
            size={24} 
            color={selectedExpenses.includes(expense.id) ? theme.primary : theme.textSecondary} 
          />
        </View>
      )}

      <View style={styles.expenseHeader}>
        <View style={styles.expenseInfo}>
          <View style={styles.categoryContainer}>
            <View style={[styles.categoryIcon, { backgroundColor: `${theme.primary}20` }]}>
              <Ionicons name={getCategoryIcon(expense.category)} size={16} color={theme.primary} />
            </View>
            <Text style={[styles.category, { color: theme.textSecondary }]}>
              {expense.category?.replace('_', ' ')}
            </Text>
          </View>
          <Text style={[styles.description, { color: theme.text }]} numberOfLines={2}>
            {expense.description}
          </Text>
          {expense.merchant && (
            <Text style={[styles.merchant, { color: theme.textSecondary }]}>
              {expense.merchant}
            </Text>
          )}
        </View>
        <View style={styles.expenseAmount}>
          <Text style={[styles.amount, { color: theme.text }]}>
            {formatCurrency(expense.amount, expense.currency)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(expense.status)}20` }]}>
            <Ionicons 
              name={getStatusIcon(expense.status)} 
              size={12} 
              color={getStatusColor(expense.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(expense.status) }]}>
              {expense.status}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.expenseDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar" size={14} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            {formatDate(expense.expenseDate)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="person" size={14} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            {expense.user?.name || 'Unknown User'}
          </Text>
        </View>
      </View>

      {!bulkMode && expense.status === 'SUBMITTED' && user.role === 'ADMIN' && (
        <View style={styles.expenseActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF5020' }]}
            onPress={() => handleApproveExpense(expense.id)}
          >
            <Ionicons name="checkmark" size={16} color="#4CAF50" />
            <Text style={[styles.actionText, { color: '#4CAF50' }]}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F4433620' }]}
            onPress={() => handleRejectExpense(expense.id)}
          >
            <Ionicons name="close" size={16} color="#F44336" />
            <Text style={[styles.actionText, { color: '#F44336' }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {!bulkMode && expense.status === 'DRAFT' && expense.userId === user.id && (
        <View style={styles.expenseActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F4433620' }]}
            onPress={() => handleDeleteExpense(expense.id)}
          >
            <Ionicons name="trash" size={16} color="#F44336" />
            <Text style={[styles.actionText, { color: '#F44336' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Expenses</Text>
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
                onPress={() => setSelectedStatus(option.value)}
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

          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: theme.text }]}>Category</Text>
            {categoryOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  selectedCategory === option.value && { backgroundColor: `${theme.primary}20` }
                ]}
                onPress={() => setSelectedCategory(option.value)}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: selectedCategory === option.value ? theme.primary : theme.text }
                ]}>
                  {option.label}
                </Text>
                {selectedCategory === option.value && (
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
      <InternalHeader navigation={navigation} title="Expense Management" />
      <View style={styles.header}>
        {bulkMode ? (
          <View style={styles.bulkHeader}>
            <TouchableOpacity
              style={styles.cancelBulk}
              onPress={() => {
                setBulkMode(false);
                setSelectedExpenses([]);
              }}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.bulkTitle, { color: theme.text }]}>
              {selectedExpenses.length} selected
            </Text>
            <View style={styles.bulkActions}>
              <TouchableOpacity
                style={[styles.bulkActionButton, { backgroundColor: '#4CAF5020' }]}
                onPress={handleBulkApprove}
                disabled={selectedExpenses.length === 0}
              >
                <Ionicons name="checkmark" size={20} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkActionButton, { backgroundColor: '#F4433620' }]}
                onPress={handleBulkReject}
                disabled={selectedExpenses.length === 0}
              >
                <Ionicons name="close" size={20} color="#F44336" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search expenses..."
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
          </>
        )}
      </View>

      {!bulkMode && (
        <View style={styles.statusBar}>
          <Text style={[styles.resultCount, { color: theme.textSecondary }]}>
            {filteredExpenses.length} expenses
          </Text>
          {(selectedStatus !== 'ALL' || selectedCategory !== 'ALL') && (
            <TouchableOpacity
              style={styles.clearFilter}
              onPress={() => {
                setSelectedStatus('ALL');
                setSelectedCategory('ALL');
              }}
            >
              <Text style={[styles.clearFilterText, { color: theme.primary }]}>
                Clear filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExpenseCard expense={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {!bulkMode && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('CreateExpense')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      )}

      <FilterModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    flex: 1,
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
  bulkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelBulk: {
    padding: 8,
  },
  bulkTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  bulkActions: {
    flexDirection: 'row',
  },
  bulkActionButton: {
    padding: 10,
    borderRadius: 8,
    marginLeft: 8,
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
  expenseCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  category: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  merchant: {
    fontSize: 14,
  },
  expenseAmount: {
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
  expenseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    marginLeft: 4,
  },
  expenseActions: {
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

export default ExpenseManagementScreen; 