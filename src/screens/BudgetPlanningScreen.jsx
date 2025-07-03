import React, { useState, useEffect } from 'react';
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

const BudgetPlanningScreen = ({ navigation }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budgetType: 'ANNUAL',
    startDate: new Date(),
    endDate: new Date(new Date().getFullYear() + 1, 11, 31),
    status: 'DRAFT',
    budgetItems: []
  });

  const budgetPeriods = [
    { value: 'MONTHLY', label: 'Monthly Budget', months: 1 },
    { value: 'QUARTERLY', label: 'Quarterly Budget', months: 3 },
    { value: 'SEMI_ANNUAL', label: 'Semi-Annual Budget', months: 6 },
    { value: 'ANNUAL', label: 'Annual Budget', months: 12 }
  ];

  const budgetCategories = [
    { 
      id: 'revenue',
      name: 'Revenue',
      icon: 'trending-up',
      color: '#4CAF50',
      subcategories: [
        { id: 'storage_revenue', name: 'Storage Revenue', budgetAmount: '' },
        { id: 'fulfillment_revenue', name: 'Fulfillment Revenue', budgetAmount: '' },
        { id: 'transport_revenue', name: 'Transportation Revenue', budgetAmount: '' },
        { id: 'other_revenue', name: 'Other Revenue', budgetAmount: '' }
      ]
    },
    {
      id: 'operating_expenses',
      name: 'Operating Expenses',
      icon: 'business',
      color: '#FF9800',
      subcategories: [
        { id: 'salaries_wages', name: 'Salaries & Wages', budgetAmount: '' },
        { id: 'rent_utilities', name: 'Rent & Utilities', budgetAmount: '' },
        { id: 'equipment_maintenance', name: 'Equipment & Maintenance', budgetAmount: '' },
        { id: 'insurance', name: 'Insurance', budgetAmount: '' },
        { id: 'fuel_transportation', name: 'Fuel & Transportation', budgetAmount: '' }
      ]
    },
    {
      id: 'administrative',
      name: 'Administrative',
      icon: 'briefcase',
      color: '#2196F3',
      subcategories: [
        { id: 'office_supplies', name: 'Office Supplies', budgetAmount: '' },
        { id: 'professional_services', name: 'Professional Services', budgetAmount: '' },
        { id: 'marketing_advertising', name: 'Marketing & Advertising', budgetAmount: '' },
        { id: 'technology', name: 'Technology & Software', budgetAmount: '' }
      ]
    },
    {
      id: 'capital_expenditures',
      name: 'Capital Expenditures',
      icon: 'construct',
      color: '#9C27B0',
      subcategories: [
        { id: 'equipment_purchases', name: 'Equipment Purchases', budgetAmount: '' },
        { id: 'facility_improvements', name: 'Facility Improvements', budgetAmount: '' },
        { id: 'technology_upgrades', name: 'Technology Upgrades', budgetAmount: '' }
      ]
    }
  ];

  const [budgetData, setBudgetData] = useState(budgetCategories);

  useEffect(() => {
    // Set default end date based on budget type
    const startDate = formData.startDate;
    const selectedPeriod = budgetPeriods.find(p => p.value === formData.budgetType);
    if (selectedPeriod) {
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + selectedPeriod.months);
      endDate.setDate(endDate.getDate() - 1);
      
      setFormData(prev => ({
        ...prev,
        endDate
      }));
    }
  }, [formData.budgetType, formData.startDate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (type, event, selectedDate) => {
    if (type === 'start') {
      setShowStartDatePicker(false);
    } else {
      setShowEndDatePicker(false);
    }
    
    if (selectedDate) {
      handleInputChange(type === 'start' ? 'startDate' : 'endDate', selectedDate);
    }
  };

  const handleBudgetAmountChange = (categoryId, subcategoryId, amount) => {
    setBudgetData(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          subcategories: category.subcategories.map(sub => {
            if (sub.id === subcategoryId) {
              return { ...sub, budgetAmount: amount };
            }
            return sub;
          })
        };
      }
      return category;
    }));
  };

  const calculateCategoryTotal = (category) => {
    return category.subcategories.reduce((total, sub) => {
      return total + (parseFloat(sub.budgetAmount) || 0);
    }, 0);
  };

  const calculateGrandTotal = () => {
    return budgetData.reduce((total, category) => {
      return total + calculateCategoryTotal(category);
    }, 0);
  };

  const handlePeriodSelect = (period) => {
    handleInputChange('budgetType', period.value);
    setShowPeriodModal(false);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'Please enter a budget name');
      return;
    }

    // Validate that at least some budget amounts are entered
    const hasAmounts = budgetData.some(category => 
      category.subcategories.some(sub => parseFloat(sub.budgetAmount) > 0)
    );

    if (!hasAmounts) {
      Alert.alert('Error', 'Please enter at least one budget amount');
      return;
    }

    setLoading(true);
    try {
      // Prepare budget items for submission
      const budgetItems = [];
      budgetData.forEach(category => {
        category.subcategories.forEach(sub => {
          if (parseFloat(sub.budgetAmount) > 0) {
            budgetItems.push({
              category: category.name,
              subcategory: sub.name,
              budgetAmount: parseFloat(sub.budgetAmount),
              actualAmount: 0
            });
          }
        });
      });

      const budgetPayload = {
        ...formData,
        budgetItems
      };

      // Here you would typically call your API
      // await financialAPI.createBudget(budgetPayload);
      
      Alert.alert('Success', 'Budget created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create budget');
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
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

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
      paddingVertical: 20,
      paddingHorizontal: 10,
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
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16
    },
    inputGroup: {
      marginBottom: 16
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 8
    },
    requiredLabel: {
      color: '#F44336'
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.background
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top'
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      backgroundColor: theme.colors.background
    },
    dateText: {
      fontSize: 16,
      color: theme.colors.text
    },
    periodButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      backgroundColor: theme.colors.background
    },
    periodText: {
      fontSize: 16,
      color: theme.colors.text
    },
    dateRange: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    dateRangeItem: {
      flex: 1,
      marginHorizontal: 4
    },
    categorySection: {
      marginBottom: 20
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8
    },
    categoryIcon: {
      marginRight: 12
    },
    categoryInfo: {
      flex: 1
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text
    },
    categoryTotal: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2
    },
    subcategoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border
    },
    subcategoryName: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text
    },
    budgetInput: {
      width: 120,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 6,
      padding: 8,
      fontSize: 14,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      textAlign: 'right'
    },
    totalSection: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 2,
      borderColor: '#4CAF50'
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text
    },
    totalAmount: {
      fontSize: 24,
      fontWeight: '700',
      color: '#4CAF50'
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
      backgroundColor: '#9CA3AF',
      opacity: 0.6,
      shadowOpacity: 0.1
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5
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
      maxHeight: '60%'
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center'
    },
    periodItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border
    },
    periodItemText: {
      fontSize: 16,
      color: theme.colors.text,
      flex: 1
    },
    closeModalButton: {
      alignSelf: 'center',
      marginTop: 16,
      padding: 12
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Budget Planning" />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Budget Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, styles.requiredLabel]}>
              Budget Name *
            </Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Enter budget name (e.g., 2024 Annual Budget)"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Enter budget description..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, styles.requiredLabel]}>
              Budget Period *
            </Text>
            <TouchableOpacity
              style={styles.periodButton}
              onPress={() => setShowPeriodModal(true)}
            >
              <Text style={styles.periodText}>
                {budgetPeriods.find(p => p.value === formData.budgetType)?.label || 'Select Period'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, styles.requiredLabel]}>
              Date Range *
            </Text>
            <View style={styles.dateRange}>
              <View style={styles.dateRangeItem}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {formatDate(formData.startDate)}
                  </Text>
                  <Ionicons name="calendar" size={16} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateRangeItem}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {formatDate(formData.endDate)}
                  </Text>
                  <Ionicons name="calendar" size={16} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={formData.startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => handleDateChange('start', event, date)}
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={formData.endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => handleDateChange('end', event, date)}
            />
          )}
        </View>

        {/* Budget Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Categories</Text>
          
          {budgetData.map((category) => (
            <View key={category.id} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Ionicons
                  name={category.icon}
                  size={24}
                  color={category.color}
                  style={styles.categoryIcon}
                />
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryTotal}>
                    Total: {formatCurrency(calculateCategoryTotal(category))}
                  </Text>
                </View>
              </View>

              {category.subcategories.map((subcategory) => (
                <View key={subcategory.id} style={styles.subcategoryItem}>
                  <Text style={styles.subcategoryName}>{subcategory.name}</Text>
                  <TextInput
                    style={styles.budgetInput}
                    value={subcategory.budgetAmount}
                    onChangeText={(value) => handleBudgetAmountChange(category.id, subcategory.id, value)}
                    placeholder="$0"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Total Budget */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Budget:</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(calculateGrandTotal())}
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            loading && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Create Budget'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Period Selection Modal */}
      <Modal
        visible={showPeriodModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Budget Period</Text>
            
            {budgetPeriods.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={styles.periodItem}
                onPress={() => handlePeriodSelect(period)}
              >
                <Text style={styles.periodItemText}>{period.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowPeriodModal(false)}
            >
              <Text style={{ color: theme.colors.text, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default BudgetPlanningScreen; 