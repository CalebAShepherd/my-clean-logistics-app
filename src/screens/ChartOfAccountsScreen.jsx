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
import { getChartOfAccounts, createAccount, updateAccount, deleteAccount } from '../api/financial';

const { width } = Dimensions.get('window');

const ChartOfAccountsScreen = ({ navigation }) => {
  const theme = useTheme();
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());

  const accountTypes = [
    { label: 'All Types', value: 'ALL' },
    { label: 'Assets', value: 'ASSET' },
    { label: 'Liabilities', value: 'LIABILITY' },
    { label: 'Equity', value: 'EQUITY' },
    { label: 'Revenue', value: 'REVENUE' },
    { label: 'Expenses', value: 'EXPENSE' },
  ];

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [accounts, searchQuery, selectedType]);

  const loadAccounts = async () => {
    try {
      const data = await getChartOfAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
      Alert.alert('Error', 'Failed to load chart of accounts');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  };

  const filterAccounts = () => {
    let filtered = accounts;

    // Filter by type
    if (selectedType !== 'ALL') {
      filtered = filtered.filter(account => account.type === selectedType);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(account =>
        account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredAccounts(filtered);
  };

  const toggleAccountExpansion = (accountId) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const handleDeleteAccount = async (accountId) => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(accountId);
              Alert.alert('Success', 'Account deleted successfully');
              loadAccounts();
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account');
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

  const getAccountTypeColor = (type) => {
    switch (type) {
      case 'ASSET': return '#4CAF50';
      case 'LIABILITY': return '#F44336';
      case 'EQUITY': return '#2196F3';
      case 'REVENUE': return '#8BC34A';
      case 'EXPENSE': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getAccountTypeIcon = (type) => {
    switch (type) {
      case 'ASSET': return 'trending-up';
      case 'LIABILITY': return 'trending-down';
      case 'EQUITY': return 'pie-chart';
      case 'REVENUE': return 'cash';
      case 'EXPENSE': return 'receipt';
      default: return 'document';
    }
  };

  const getBalanceTypeIcon = (balanceType) => {
    return balanceType === 'DEBIT' ? 'add-circle' : 'remove-circle';
  };

  const buildAccountHierarchy = (accounts) => {
    const accountMap = {};
    const rootAccounts = [];

    // Create a map of all accounts
    accounts.forEach(account => {
      accountMap[account.id] = { ...account, children: [] };
    });

    // Build the hierarchy
    accounts.forEach(account => {
      if (account.parentId && accountMap[account.parentId]) {
        accountMap[account.parentId].children.push(accountMap[account.id]);
      } else {
        rootAccounts.push(accountMap[account.id]);
      }
    });

    return rootAccounts;
  };

  const renderAccount = (account, level = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);
    const indentWidth = level * 20;

    return (
      <View key={account.id}>
        <TouchableOpacity
          style={[styles.accountCard, { backgroundColor: theme.cardBackground, marginLeft: indentWidth }]}
          onPress={() => navigation.navigate('AccountDetail', { accountId: account.id })}
        >
          <View style={styles.accountHeader}>
            <View style={styles.accountInfo}>
              <View style={styles.accountTitleRow}>
                {hasChildren && (
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => toggleAccountExpansion(account.id)}
                  >
                    <Ionicons
                      name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                      size={16}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                )}
                <View style={[styles.typeIcon, { backgroundColor: `${getAccountTypeColor(account.type)}20` }]}>
                  <Ionicons
                    name={getAccountTypeIcon(account.type)}
                    size={16}
                    color={getAccountTypeColor(account.type)}
                  />
                </View>
                <View style={styles.accountDetails}>
                  <Text style={[styles.accountName, { color: theme.text }]}>
                    {account.name}
                  </Text>
                  <View style={styles.accountMeta}>
                    {account.code && (
                      <Text style={[styles.accountCode, { color: theme.textSecondary }]}>
                        {account.code}
                      </Text>
                    )}
                    <Text style={[styles.accountType, { color: getAccountTypeColor(account.type) }]}>
                      {account.type}
                    </Text>
                  </View>
                </View>
              </View>
              {account.description && (
                <Text style={[styles.accountDescription, { color: theme.textSecondary }]} numberOfLines={1}>
                  {account.description}
                </Text>
              )}
            </View>
            <View style={styles.accountBalance}>
              <Text style={[styles.balance, { color: theme.text }]}>
                {formatCurrency(account.balance)}
              </Text>
              <View style={styles.balanceTypeContainer}>
                <Ionicons
                  name={getBalanceTypeIcon(account.balanceType)}
                  size={12}
                  color={account.balanceType === 'DEBIT' ? '#4CAF50' : '#F44336'}
                />
                <Text style={[
                  styles.balanceType,
                  { color: account.balanceType === 'DEBIT' ? '#4CAF50' : '#F44336' }
                ]}>
                  {account.balanceType}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.accountActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${theme.primary}20` }]}
              onPress={() => navigation.navigate('EditAccount', { accountId: account.id })}
            >
              <Ionicons name="pencil" size={14} color={theme.primary} />
              <Text style={[styles.actionText, { color: theme.primary }]}>Edit</Text>
            </TouchableOpacity>
            {hasChildren && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#4CAF5020' }]}
                onPress={() => navigation.navigate('CreateAccount', { parentId: account.id })}
              >
                <Ionicons name="add" size={14} color="#4CAF50" />
                <Text style={[styles.actionText, { color: '#4CAF50' }]}>Add Sub</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F4433620' }]}
              onPress={() => handleDeleteAccount(account.id)}
            >
              <Ionicons name="trash" size={14} color="#F44336" />
              <Text style={[styles.actionText, { color: '#F44336' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {hasChildren && isExpanded && (
          <View style={styles.childrenContainer}>
            {account.children.map(child => renderAccount(child, level + 1))}
          </View>
        )}
      </View>
    );
  };

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
            <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Accounts</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: theme.text }]}>Account Type</Text>
            {accountTypes.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  selectedType === option.value && { backgroundColor: `${theme.primary}20` }
                ]}
                onPress={() => {
                  setSelectedType(option.value);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: selectedType === option.value ? theme.primary : theme.text }
                ]}>
                  {option.label}
                </Text>
                {selectedType === option.value && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  const hierarchicalAccounts = buildAccountHierarchy(filteredAccounts);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InternalHeader navigation={navigation} title="Chart of Accounts" />
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search accounts..."
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
          {filteredAccounts.length} accounts
        </Text>
        {selectedType !== 'ALL' && (
          <TouchableOpacity
            style={styles.clearFilter}
            onPress={() => setSelectedType('ALL')}
          >
            <Text style={[styles.clearFilterText, { color: theme.primary }]}>
              Clear filter
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={hierarchicalAccounts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderAccount(item)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('CreateAccount')}
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
  accountCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  accountInfo: {
    flex: 1,
    marginRight: 12,
  },
  accountTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  expandButton: {
    padding: 4,
    marginRight: 8,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountCode: {
    fontSize: 12,
    marginRight: 8,
  },
  accountType: {
    fontSize: 12,
    fontWeight: '500',
  },
  accountDescription: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  accountBalance: {
    alignItems: 'flex-end',
  },
  balance: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceType: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  accountActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  childrenContainer: {
    marginTop: 8,
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
    maxHeight: '60%',
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

export default ChartOfAccountsScreen; 