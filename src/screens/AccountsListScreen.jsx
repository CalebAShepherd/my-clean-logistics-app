import React, { useEffect, useState, useContext } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  RefreshControl,
  TextInput,
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { fetchAccounts, createAccount, deleteAccount } from '../api/crm/accounts';
import InternalHeader from '../components/InternalHeader';

export default function AccountsListScreen({ navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountDescription, setNewAccountDescription] = useState('');

  const loadAccounts = async () => {
    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts', err);
      Alert.alert('Error', 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [userToken]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) {
      Alert.alert('Validation', 'Account name is required');
      return;
    }

    try {
      await createAccount({
        name: newAccountName.trim(),
        description: newAccountDescription.trim() || null
      });
      setNewAccountName('');
      setNewAccountDescription('');
      setShowAddForm(false);
      loadAccounts();
    } catch (err) {
      console.error('Failed to create account', err);
      Alert.alert('Error', 'Failed to create account');
    }
  };

  const handleDeleteAccount = (account) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${account.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(account.id);
              loadAccounts();
            } catch (err) {
              console.error('Failed to delete account', err);
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (account.description && account.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderAccount = ({ item }) => (
    <TouchableOpacity
      style={styles.accountCard}
      onPress={() => navigation.navigate('AccountDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.accountHeader}>
        <View style={styles.accountIcon}>
          <MaterialCommunityIcons name="domain" size={24} color="#007AFF" />
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.accountDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={styles.accountDate}>
            Created {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.accountActions}>
          {(user.role === 'crm_admin' || user.role === 'dev') && (
            <TouchableOpacity
              onPress={() => handleDeleteAccount(item)}
              style={styles.deleteButton}
            >
              <MaterialCommunityIcons name="delete-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}
          <MaterialCommunityIcons name="chevron-right" size={24} color="#C7C7CC" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAddForm = () => (
    <View style={styles.addForm}>
      <Text style={styles.addFormTitle}>Add New Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Account Name"
        value={newAccountName}
        onChangeText={setNewAccountName}
        autoCapitalize="words"
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description (optional)"
        value={newAccountDescription}
        onChangeText={setNewAccountDescription}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
      <View style={styles.formButtons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => {
            setShowAddForm(false);
            setNewAccountName('');
            setNewAccountDescription('');
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.addButton]}
          onPress={handleAddAccount}
        >
          <Text style={styles.addButtonText}>Add Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Accounts" />
        <ActivityIndicator style={styles.center} size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Accounts"
        rightIcon={user.role === 'crm_admin' || user.role === 'dev' ? "plus" : null}
        onRightPress={() => setShowAddForm(!showAddForm)}
      />

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search accounts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Add Form */}
        {showAddForm && renderAddForm()}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {filteredAccounts.length} of {accounts.length} accounts
          </Text>
        </View>

        {/* Accounts List */}
        <FlatList
          data={filteredAccounts}
          renderItem={renderAccount}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="domain-off" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No Accounts Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first account'}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  addForm: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addFormTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1C1C1E',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  accountDescription: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 4,
    lineHeight: 20,
  },
  accountDate: {
    fontSize: 13,
    color: '#C7C7CC',
  },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
}); 