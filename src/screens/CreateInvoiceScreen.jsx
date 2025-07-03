import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import InternalHeader from '../components/InternalHeader';
import { createInvoiceEnhanced } from '../api/billing';

const CreateInvoiceScreen = ({ navigation }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    invoiceNumber: '',
    description: '',
    dueDate: '',
    currency: 'USD',
    taxRate: 0,
    notes: '',
  });
  const [lineItems, setLineItems] = useState([
    { description: '', quantity: 1, unitPrice: 0, amount: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Mock customers - in real app, this would come from API
  const customers = [
    { id: '1', name: 'Acme Corporation', email: 'billing@acme.com' },
    { id: '2', name: 'Tech Solutions Inc', email: 'accounts@techsolutions.com' },
    { id: '3', name: 'Global Logistics LLC', email: 'finance@globallogistics.com' },
  ];

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLineItem = (index, field, value) => {
    const updatedItems = [...lineItems];
    updatedItems[index][field] = value;
    
    // Calculate amount for quantity and unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setLineItems(updatedItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (formData.taxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const selectCustomer = (customer) => {
    updateFormData('customerId', customer.id);
    updateFormData('customerName', customer.name);
    setShowCustomerModal(false);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.customerId) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }
    if (!formData.description) {
      Alert.alert('Error', 'Please enter invoice description');
      return;
    }
    if (!formData.dueDate) {
      Alert.alert('Error', 'Please select due date');
      return;
    }
    if (lineItems.some(item => !item.description || item.quantity <= 0 || item.unitPrice <= 0)) {
      Alert.alert('Error', 'Please complete all line items');
      return;
    }

    setLoading(true);
    try {
      const invoiceData = {
        ...formData,
        lineItems,
        subtotal: calculateSubtotal(),
        taxAmount: calculateTax(),
        totalAmount: calculateTotal(),
      };

      await createInvoiceEnhanced(invoiceData);
      Alert.alert('Success', 'Invoice created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creating invoice:', error);
      Alert.alert('Error', 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency,
    }).format(amount || 0);
  };

  const CustomerModal = () => (
    <Modal
      visible={showCustomerModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCustomerModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Customer</Text>
            <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={customers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.customerOption, { borderBottomColor: theme.border }]}
                onPress={() => selectCustomer(item)}
              >
                <Text style={[styles.customerName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.customerEmail, { color: theme.textSecondary }]}>{item.email}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InternalHeader navigation={navigation} title="Create Invoice" />
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.form}>
        {/* Customer Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Customer Information</Text>
          <TouchableOpacity
            style={[styles.input, styles.customerInput, { backgroundColor: theme.cardBackground }]}
            onPress={() => setShowCustomerModal(true)}
          >
            <Text style={[styles.customerText, { color: formData.customerName ? theme.text : theme.textSecondary }]}>
              {formData.customerName || 'Select Customer'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Invoice Details</Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text }]}
            placeholder="Invoice Number (auto-generated if empty)"
            placeholderTextColor={theme.textSecondary}
            value={formData.invoiceNumber}
            onChangeText={(value) => updateFormData('invoiceNumber', value)}
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text }]}
            placeholder="Description"
            placeholderTextColor={theme.textSecondary}
            value={formData.description}
            onChangeText={(value) => updateFormData('description', value)}
            multiline
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text }]}
            placeholder="Due Date (YYYY-MM-DD)"
            placeholderTextColor={theme.textSecondary}
            value={formData.dueDate}
            onChangeText={(value) => updateFormData('dueDate', value)}
          />

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput, { backgroundColor: theme.cardBackground, color: theme.text }]}
              placeholder="Currency"
              placeholderTextColor={theme.textSecondary}
              value={formData.currency}
              onChangeText={(value) => updateFormData('currency', value)}
            />
            <TextInput
              style={[styles.input, styles.halfInput, { backgroundColor: theme.cardBackground, color: theme.text }]}
              placeholder="Tax Rate (%)"
              placeholderTextColor={theme.textSecondary}
              value={formData.taxRate.toString()}
              onChangeText={(value) => updateFormData('taxRate', parseFloat(value) || 0)}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Line Items</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={addLineItem}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {lineItems.map((item, index) => (
            <View key={index} style={[styles.lineItem, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.lineItemHeader}>
                <Text style={[styles.lineItemTitle, { color: theme.text }]}>Item {index + 1}</Text>
                {lineItems.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeLineItem(index)}
                  >
                    <Ionicons name="trash" size={16} color="#F44336" />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                placeholder="Description"
                placeholderTextColor={theme.textSecondary}
                value={item.description}
                onChangeText={(value) => updateLineItem(index, 'description', value)}
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.quarterInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                  placeholder="Qty"
                  placeholderTextColor={theme.textSecondary}
                  value={item.quantity.toString()}
                  onChangeText={(value) => updateLineItem(index, 'quantity', parseInt(value) || 0)}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.quarterInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                  placeholder="Unit Price"
                  placeholderTextColor={theme.textSecondary}
                  value={item.unitPrice.toString()}
                  onChangeText={(value) => updateLineItem(index, 'unitPrice', parseFloat(value) || 0)}
                  keyboardType="numeric"
                />
                <View style={[styles.amountDisplay, { backgroundColor: theme.colors.background }]}>
                  <Text style={[styles.amountText, { color: theme.text }]}>
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={[styles.totalsSection, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>Subtotal:</Text>
            <Text style={[styles.totalValue, { color: theme.text }]}>
              {formatCurrency(calculateSubtotal())}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>
              Tax ({formData.taxRate}%):
            </Text>
            <Text style={[styles.totalValue, { color: theme.text }]}>
              {formatCurrency(calculateTax())}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={[styles.totalLabel, styles.grandTotalText, { color: theme.text }]}>
              Total:
            </Text>
            <Text style={[styles.totalValue, styles.grandTotalText, { color: theme.text }]}>
              {formatCurrency(calculateTotal())}
            </Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.cardBackground, color: theme.text }]}
            placeholder="Additional notes..."
            placeholderTextColor={theme.textSecondary}
            value={formData.notes}
            onChangeText={(value) => updateFormData('notes', value)}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: theme.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Create Invoice'}
          </Text>
        </TouchableOpacity>
      </View>

        <CustomerModal />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  customerInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerText: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  quarterInput: {
    width: '30%',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lineItemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  amountDisplay: {
    width: '30%',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  totalsSection: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginTop: 8,
    paddingTop: 16,
  },
  grandTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '70%',
    borderRadius: 12,
    padding: 20,
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
  customerOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
  },
});

export default CreateInvoiceScreen; 