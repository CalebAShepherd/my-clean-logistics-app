import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  SafeAreaView,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import InternalHeader from '../components/InternalHeader';
import DateTimePicker from '@react-native-community/datetimepicker';

const JournalEntryScreen = ({ navigation }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedEntryIndex, setSelectedEntryIndex] = useState(null);
  
  const [formData, setFormData] = useState({
    description: '',
    transactionDate: new Date(),
    referenceType: '',
    referenceId: '',
    ledgerEntries: [
      { accountId: '', accountName: '', debitAmount: '', creditAmount: '', description: '' },
      { accountId: '', accountName: '', debitAmount: '', creditAmount: '', description: '' }
    ]
  });

  // Mock chart of accounts
  const chartOfAccounts = [
    { id: '1', accountCode: '1000', accountName: 'Cash', accountType: 'ASSET' },
    { id: '2', accountCode: '1200', accountName: 'Accounts Receivable', accountType: 'ASSET' },
    { id: '3', accountCode: '1500', accountName: 'Inventory', accountType: 'ASSET' },
    { id: '4', accountCode: '1600', accountName: 'Equipment', accountType: 'ASSET' },
    { id: '5', accountCode: '2000', accountName: 'Accounts Payable', accountType: 'LIABILITY' },
    { id: '6', accountCode: '3000', accountName: 'Owner\'s Equity', accountType: 'EQUITY' },
    { id: '7', accountCode: '4000', accountName: 'Service Revenue', accountType: 'REVENUE' },
    { id: '8', accountCode: '5000', accountName: 'Operating Expenses', accountType: 'EXPENSE' },
    { id: '9', accountCode: '5100', accountName: 'Rent Expense', accountType: 'EXPENSE' },
    { id: '10', accountCode: '5200', accountName: 'Utilities Expense', accountType: 'EXPENSE' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange('transactionDate', selectedDate);
    }
  };

  const handleLedgerEntryChange = (index, field, value) => {
    const updatedEntries = [...formData.ledgerEntries];
    updatedEntries[index][field] = value;
    
    if (field === 'debitAmount' && value) {
      updatedEntries[index]['creditAmount'] = '';
    } else if (field === 'creditAmount' && value) {
      updatedEntries[index]['debitAmount'] = '';
    }
    
    setFormData(prev => ({
      ...prev,
      ledgerEntries: updatedEntries
    }));
  };

  const handleAccountSelect = (account) => {
    if (selectedEntryIndex !== null) {
      const updatedEntries = [...formData.ledgerEntries];
      updatedEntries[selectedEntryIndex].accountId = account.id;
      updatedEntries[selectedEntryIndex].accountName = `${account.accountCode} - ${account.accountName}`;
      
      setFormData(prev => ({
        ...prev,
        ledgerEntries: updatedEntries
      }));
    }
    setShowAccountModal(false);
    setSelectedEntryIndex(null);
  };

  const addLedgerEntry = () => {
    setFormData(prev => ({
      ...prev,
      ledgerEntries: [
        ...prev.ledgerEntries,
        { accountId: '', accountName: '', debitAmount: '', creditAmount: '', description: '' }
      ]
    }));
  };

  const removeLedgerEntry = (index) => {
    if (formData.ledgerEntries.length > 2) {
      const updatedEntries = formData.ledgerEntries.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        ledgerEntries: updatedEntries
      }));
    }
  };

  const calculateTotals = () => {
    let totalDebits = 0;
    let totalCredits = 0;
    
    formData.ledgerEntries.forEach(entry => {
      if (entry.debitAmount) {
        totalDebits += parseFloat(entry.debitAmount) || 0;
      }
      if (entry.creditAmount) {
        totalCredits += parseFloat(entry.creditAmount) || 0;
      }
    });
    
    return { totalDebits, totalCredits };
  };

  const handleSubmit = async () => {
    if (!formData.description) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    const { totalDebits, totalCredits } = calculateTotals();
    
    if (totalDebits === 0 || totalCredits === 0) {
      Alert.alert('Error', 'Please enter at least one debit and one credit entry');
      return;
    }

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      Alert.alert('Error', 'Total debits must equal total credits');
      return;
    }

    const incompleteEntries = formData.ledgerEntries.filter(entry => 
      !entry.accountId || (!entry.debitAmount && !entry.creditAmount)
    );
    
    if (incompleteEntries.length > 0) {
      Alert.alert('Error', 'Please complete all ledger entries');
      return;
    }

    setLoading(true);
    try {
      Alert.alert('Success', 'Journal entry created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create journal entry');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const { totalDebits, totalCredits } = calculateTotals();
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC'
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 20
    },
    section: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: '#E2E8F0'
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1E293B',
      marginBottom: 20,
      letterSpacing: -0.5
    },
    inputGroup: {
      marginBottom: 20
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: '#374151',
      marginBottom: 10,
      letterSpacing: -0.2
    },
    requiredLabel: {
      color: '#F44336'
    },
    input: {
      borderWidth: 2,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: '#1F2937',
      backgroundColor: '#FFFFFF',
      fontWeight: '500'
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 2,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 16,
      backgroundColor: '#FFFFFF'
    },
    dateText: {
      fontSize: 16,
      color: theme.colors.text
    },
    ledgerEntry: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      backgroundColor: theme.colors.background
    },
    entryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12
    },
    entryTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text
    },
    removeButton: {
      padding: 4
    },
    accountButton: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      backgroundColor: theme.colors.background
    },
    accountText: {
      fontSize: 14,
      color: theme.colors.text
    },
    accountPlaceholder: {
      color: theme.colors.textSecondary
    },
    amountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8
    },
    amountInput: {
      flex: 1,
      marginHorizontal: 4
    },
    addEntryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      borderRadius: 8,
      padding: 16,
      backgroundColor: theme.colors.background
    },
    addEntryText: {
      fontSize: 16,
      color: theme.colors.text,
      marginLeft: 8
    },
    totalsSection: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text
    },
    totalAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text
    },
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border
    },
    balanceLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text
    },
    balanceStatus: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    balanceText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 4
    },
    balanced: {
      color: '#4CAF50'
    },
    unbalanced: {
      color: '#F44336'
    },
    submitButton: {
      backgroundColor: '#10B981',
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 40,
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6
    },
    submitButtonDisabled: {
      backgroundColor: theme.colors.border,
      opacity: 0.6
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600'
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      width: '90%',
      maxHeight: '80%'
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center'
    },
    accountItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border
    },
    accountDetails: {
      flex: 1
    },
    accountCode: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text
    },
    accountName: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2
    },
    accountType: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginTop: 4
    },
    closeModalButton: {
      alignSelf: 'center',
      marginTop: 16,
      padding: 12
    }
  });

  return (
    <SafeAreaView style={styles.container}>
              <InternalHeader navigation={navigation} title="Journal Entry" />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entry Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, styles.requiredLabel]}>
              Description *
            </Text>
            <TextInput
              style={styles.input}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Enter journal entry description"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, styles.requiredLabel]}>
              Transaction Date *
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {formatDate(formData.transactionDate)}
              </Text>
              <Ionicons name="calendar" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reference Type</Text>
            <TextInput
              style={styles.input}
              value={formData.referenceType}
              onChangeText={(value) => handleInputChange('referenceType', value)}
              placeholder="e.g., Invoice, Receipt, Adjustment"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reference ID</Text>
            <TextInput
              style={styles.input}
              value={formData.referenceId}
              onChangeText={(value) => handleInputChange('referenceId', value)}
              placeholder="e.g., INV-001, REC-001"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={formData.transactionDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ledger Entries</Text>
          
          {formData.ledgerEntries.map((entry, index) => (
            <View key={index} style={styles.ledgerEntry}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>Entry {index + 1}</Text>
                {formData.ledgerEntries.length > 2 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeLedgerEntry(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#F44336" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.accountButton}
                onPress={() => {
                  setSelectedEntryIndex(index);
                  setShowAccountModal(true);
                }}
              >
                <Text style={[
                  styles.accountText,
                  !entry.accountName && styles.accountPlaceholder
                ]}>
                  {entry.accountName || 'Select Account'}
                </Text>
              </TouchableOpacity>

              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  value={entry.debitAmount}
                  onChangeText={(value) => handleLedgerEntryChange(index, 'debitAmount', value)}
                  placeholder="Debit Amount"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  value={entry.creditAmount}
                  onChangeText={(value) => handleLedgerEntryChange(index, 'creditAmount', value)}
                  placeholder="Credit Amount"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <TextInput
                style={styles.input}
                value={entry.description}
                onChangeText={(value) => handleLedgerEntryChange(index, 'description', value)}
                placeholder="Entry description (optional)"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          ))}

          <TouchableOpacity
            style={styles.addEntryButton}
            onPress={addLedgerEntry}
          >
            <Ionicons name="add-circle" size={24} color={theme.colors.text} />
            <Text style={styles.addEntryText}>Add Another Entry</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Debits:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(totalDebits)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Credits:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(totalCredits)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Status:</Text>
            <View style={styles.balanceStatus}>
              <Ionicons
                name={isBalanced ? "checkmark-circle" : "warning"}
                size={20}
                color={isBalanced ? "#4CAF50" : "#F44336"}
              />
              <Text style={[
                styles.balanceText,
                isBalanced ? styles.balanced : styles.unbalanced
              ]}>
                {isBalanced ? 'Balanced' : 'Unbalanced'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (loading || !isBalanced) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading || !isBalanced}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Create Journal Entry'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showAccountModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Account</Text>
            
            <ScrollView style={{ maxHeight: 400 }}>
              {chartOfAccounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={styles.accountItem}
                  onPress={() => handleAccountSelect(account)}
                >
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountCode}>{account.accountCode}</Text>
                    <Text style={styles.accountName}>{account.accountName}</Text>
                    <Text style={styles.accountType}>{account.accountType}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowAccountModal(false)}
            >
              <Text style={{ color: theme.colors.text, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default JournalEntryScreen; 