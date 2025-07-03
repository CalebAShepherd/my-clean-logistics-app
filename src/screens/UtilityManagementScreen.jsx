import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import InternalHeader from '../components/InternalHeader';
import facilityAPI from '../api/facilities';
import { AuthContext } from '../context/AuthContext';

const UtilityManagementScreen = ({ navigation, route }) => {
  const { user, userToken } = useContext(AuthContext);
  const { facilityId, facilityName } = route.params || {};

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');

  // Data states
  const [utilityBills, setUtilityBills] = useState([]);
  const [allocationRules, setAllocationRules] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [varianceAnalysis, setVarianceAnalysis] = useState([]);
  const [allocationSummary, setAllocationSummary] = useState({});
  const [selectedUtilityType, setSelectedUtilityType] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Form states
  const [formData, setFormData] = useState({});

  const utilityTypes = [
    { value: 'all', label: 'All Utilities' },
    { value: 'ELECTRICITY', label: 'Electricity' },
    { value: 'NATURAL_GAS', label: 'Natural Gas' },
    { value: 'WATER', label: 'Water' },
    { value: 'SEWER', label: 'Sewer' },
    { value: 'INTERNET', label: 'Internet' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'SECURITY', label: 'Security' },
    { value: 'WASTE_MANAGEMENT', label: 'Waste Management' }
  ];

  const tabs = [
    { key: 'overview', title: 'Overview', icon: 'analytics' },
    { key: 'bills', title: 'Bills', icon: 'receipt' },
    { key: 'allocation', title: 'Rules', icon: 'pie-chart' },
    { key: 'budgets', title: 'Budgets', icon: 'trending-up' },
    { key: 'variance', title: 'Analysis', icon: 'bar-chart' }
  ];

  useEffect(() => {
    loadData();
  }, [facilityId, selectedUtilityType, selectedYear]);

  const loadData = async () => {
    console.log('loadData called with facilityId:', facilityId);
    if (!facilityId) {
      console.log('No facilityId provided, skipping data load');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = {
        utilityType: selectedUtilityType,
        year: selectedYear
      };

      console.log('Making API calls with params:', params);

      const [billsResponse, rulesResponse, budgetsResponse, summaryResponse] = await Promise.all([
        facilityAPI.getUtilityBills(userToken, facilityId, params),
        facilityAPI.getAllocationRules(userToken, facilityId, params),
        facilityAPI.getUtilityBudgets(userToken, facilityId, params),
        facilityAPI.getAllocationSummary(userToken, facilityId, params)
      ]);

      console.log('API responses:', {
        bills: billsResponse,
        rules: rulesResponse,
        budgets: budgetsResponse,
        summary: summaryResponse
      });

      setUtilityBills(billsResponse.bills || []);
      setAllocationRules(rulesResponse.rules || []);
      setBudgets(budgetsResponse.budgets || []);
      setAllocationSummary(summaryResponse);

      if (activeTab === 'variance') {
        const varianceResponse = await facilityAPI.getVarianceAnalysis(userToken, facilityId, params);
        setVarianceAnalysis(varianceResponse.variances || []);
      }
    } catch (error) {
      console.error('Error loading utility data:', error);
      Alert.alert('Error', 'Failed to load utility data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [facilityId, selectedUtilityType, selectedYear]);

  const handleAllocateCosts = async (billId) => {
    try {
      setLoading(true);
      await facilityAPI.allocateUtilityCosts(userToken, billId);
      Alert.alert('Success', 'Utility costs allocated successfully');
      await loadData();
    } catch (error) {
      console.error('Error allocating costs:', error);
      Alert.alert('Error', 'Failed to allocate utility costs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAllocationRule = () => {
    setModalType('allocationRule');
    setFormData({
      ruleName: '',
      utilityType: 'ELECTRICITY',
      allocationType: 'WAREHOUSE',
      allocationMethod: 'FIXED_PERCENTAGE',
      fixedPercentage: 0,
      priority: 1
    });
    setModalVisible(true);
  };

  const handleCreateBudget = () => {
    setModalType('budget');
    setFormData({
      utilityType: 'ELECTRICITY',
      budgetYear: selectedYear,
      budgetedAmount: 0,
      budgetedUsage: 0
    });
    setModalVisible(true);
  };

  const handleSubmitForm = async () => {
    try {
      setLoading(true);
      
      if (modalType === 'allocationRule') {
        await facilityAPI.createAllocationRule(userToken, facilityId, formData);
        Alert.alert('Success', 'Allocation rule created successfully');
      } else if (modalType === 'budget') {
        await facilityAPI.createUtilityBudget(userToken, facilityId, formData);
        Alert.alert('Success', 'Budget created successfully');
      }

      setModalVisible(false);
      await loadData();
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', 'Failed to save data');
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: '#ffffff' }]}>
          <MaterialCommunityIcons name="flash" size={32} color="#FF9500" />
          <Text style={[styles.metricValue, { color: '#000000' }]}>
            ${allocationSummary.totalAmount?.toLocaleString() || '0'}
          </Text>
          <Text style={[styles.metricLabel, { color: '#666666' }]}>
            Total Utility Costs
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: '#ffffff' }]}>
          <MaterialCommunityIcons name="pie-chart" size={32} color="#34C759" />
          <Text style={[styles.metricValue, { color: '#000000' }]}>
            ${allocationSummary.totalAllocated?.toLocaleString() || '0'}
          </Text>
          <Text style={[styles.metricLabel, { color: '#666666' }]}>
            Allocated Costs
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: '#ffffff' }]}>
          <MaterialCommunityIcons name="alert-circle" size={32} color="#FF3B30" />
          <Text style={[styles.metricValue, { color: '#000000' }]}>
            ${allocationSummary.totalUnallocated?.toLocaleString() || '0'}
          </Text>
          <Text style={[styles.metricLabel, { color: '#666666' }]}>
            Unallocated Costs
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: '#ffffff' }]}>
          <MaterialCommunityIcons name="chart-line" size={32} color="#007AFF" />
          <Text style={[styles.metricValue, { color: '#000000' }]}>
            {allocationSummary.totalBills || '0'}
          </Text>
          <Text style={[styles.metricLabel, { color: '#666666' }]}>
            Total Bills
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: '#ffffff' }]}>
        <Text style={[styles.sectionTitle, { color: '#000000' }]}>
          Allocation Breakdown
        </Text>
        {allocationSummary.allocations?.map((allocation, index) => (
          <View key={index} style={styles.allocationItem}>
            <Text style={[styles.allocationType, { color: '#000000' }]}>
              {allocation.type}
            </Text>
            <Text style={[styles.allocationAmount, { color: '#007AFF' }]}>
              ${allocation.amount?.toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderBills = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: '#007AFF' }]}
        onPress={() => navigation.navigate('AddUtilityBill', { facilityId })}
      >
        <MaterialCommunityIcons name="plus" size={20} color="white" />
        <Text style={styles.addButtonText}>Add Bill</Text>
      </TouchableOpacity>

      {utilityBills.map((bill) => (
        <View key={bill.id} style={[styles.billCard, { backgroundColor: '#ffffff' }]}>
          <View style={styles.billHeader}>
            <Text style={[styles.billType, { color: '#000000' }]}>
              {bill.utilityType}
            </Text>
            <Text style={[styles.billDate, { color: '#666666' }]}>
              {new Date(bill.billDate).toLocaleDateString()}
            </Text>
          </View>
          <Text style={[styles.billAmount, { color: '#007AFF' }]}>
            ${bill.amount?.toLocaleString()}
          </Text>
          <TouchableOpacity
            style={[styles.allocateButton, { backgroundColor: '#007AFF' }]}
            onPress={() => handleAllocateCosts(bill.id)}
          >
            <Text style={styles.allocateButtonText}>
              {bill.isAllocated ? 'Reallocate' : 'Allocate'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderAllocation = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: '#007AFF' }]}
        onPress={handleCreateAllocationRule}
      >
        <MaterialCommunityIcons name="plus" size={20} color="white" />
        <Text style={styles.addButtonText}>Add Rule</Text>
      </TouchableOpacity>

      {allocationRules.map((rule) => (
        <View key={rule.id} style={[styles.ruleCard, { backgroundColor: '#ffffff' }]}>
          <Text style={[styles.ruleName, { color: '#000000' }]}>
            {rule.ruleName}
          </Text>
          <View style={[styles.priorityBadge, { backgroundColor: '#007AFF' }]}>
            <Text style={styles.priorityText}>
              Priority {rule.priority}
            </Text>
          </View>
          <Text style={[styles.ruleDetail, { color: '#666666' }]}>
            {rule.utilityType} → {rule.allocationType}
          </Text>
          <Text style={[styles.ruleMethod, { color: '#000000' }]}>
            {rule.allocationMethod}
          </Text>
          {rule.fixedPercentage && (
            <Text style={[styles.rulePercentage, { color: '#007AFF' }]}>
              {rule.fixedPercentage}%
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  const renderBudgets = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: '#007AFF' }]}
        onPress={handleCreateBudget}
      >
        <MaterialCommunityIcons name="plus" size={20} color="white" />
        <Text style={styles.addButtonText}>Add Budget</Text>
      </TouchableOpacity>

      {budgets.map((budget) => (
        <View key={budget.id} style={[styles.budgetCard, { backgroundColor: '#ffffff' }]}>
          <Text style={[styles.budgetType, { color: '#000000' }]}>
            {budget.utilityType}
          </Text>
          <Text style={[styles.budgetYear, { color: '#666666' }]}>
            {budget.budgetYear}
            {budget.budgetMonth && ` - ${budget.budgetMonth}`}
          </Text>
          <View style={styles.budgetDetails}>
            <Text style={[styles.budgetAmount, { color: '#007AFF' }]}>
              ${budget.budgetedAmount?.toLocaleString()}
            </Text>
            <Text style={[styles.budgetUsage, { color: '#666666' }]}>
              {budget.budgetedUsage} kWh
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderVariance = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: '#007AFF' }]}
        onPress={() => {
          // Generate variance analysis
          facilityAPI.generateVarianceAnalysis(userToken, facilityId, {
            year: selectedYear,
            utilityType: selectedUtilityType
          }).then(() => {
            loadData();
            Alert.alert('Success', 'Variance analysis generated');
          }).catch(error => {
            console.error('Error generating variance:', error);
            Alert.alert('Error', 'Failed to generate variance analysis');
          });
        }}
      >
        <MaterialCommunityIcons name="chart-line" size={20} color="white" />
        <Text style={styles.addButtonText}>Generate Analysis</Text>
      </TouchableOpacity>

      {varianceAnalysis.map((variance) => (
        <View key={variance.id} style={[styles.varianceCard, { backgroundColor: '#ffffff' }]}>
          <Text style={[styles.varianceType, { color: '#000000' }]}>
            {variance.utilityType}
          </Text>
          <Text style={[styles.varianceDate, { color: '#666666' }]}>
            {new Date(variance.analysisDate).toLocaleDateString()}
          </Text>
          
          <View style={styles.varianceDetails}>
            <View style={styles.varianceRow}>
              <Text style={[styles.varianceLabel, { color: '#666666' }]}>
                Actual:
              </Text>
              <Text style={[styles.varianceValue, { color: '#000000' }]}>
                ${variance.actualAmount?.toLocaleString()}
              </Text>
            </View>
            <View style={styles.varianceRow}>
              <Text style={[styles.varianceLabel, { color: '#666666' }]}>
                Budget:
              </Text>
              <Text style={[styles.varianceValue, { color: '#000000' }]}>
                ${variance.budgetedAmount?.toLocaleString()}
              </Text>
            </View>
            <View style={styles.varianceRow}>
              <Text style={[styles.varianceLabel, { color: '#666666' }]}>
                Variance:
              </Text>
              <Text style={[
                styles.varianceValue,
                { color: variance.variance > 0 ? '#FF3B30' : '#34C759' }
              ]}>
                {variance.variance > 0 ? '+' : ''}${variance.variance?.toLocaleString()} 
                ({variance.variancePercent?.toFixed(1)}%)
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: '#ffffff' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: '#000000' }]}>
              {modalType === 'allocationRule' ? 'Add Allocation Rule' : 'Add Budget'}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          {modalType === 'allocationRule' ? (
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.modalInput, { borderColor: '#E0E0E0', color: '#000000' }]}
                placeholder="Rule Name"
                placeholderTextColor="#666666"
                value={formData.ruleName}
                onChangeText={(text) => setFormData({...formData, ruleName: text})}
              />
              <TextInput
                style={[styles.modalInput, { borderColor: '#E0E0E0', color: '#000000' }]}
                placeholder="Fixed Percentage"
                placeholderTextColor="#666666"
                keyboardType="numeric"
                value={formData.fixedPercentage?.toString()}
                onChangeText={(text) => setFormData({...formData, fixedPercentage: parseFloat(text) || 0})}
              />
            </View>
          ) : (
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.modalInput, { borderColor: '#E0E0E0', color: '#000000' }]}
                placeholder="Budget Amount"
                placeholderTextColor="#666666"
                keyboardType="numeric"
                value={formData.budgetedAmount?.toString()}
                onChangeText={(text) => setFormData({...formData, budgetedAmount: parseFloat(text) || 0})}
              />
            </View>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { borderColor: '#E0E0E0' }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.cancelButtonText, { color: '#000000' }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton, { backgroundColor: '#007AFF' }]}
              onPress={handleSubmitForm}
            >
              <Text style={styles.submitButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderFilters = () => (
    <View style={[styles.filtersContainer, { backgroundColor: '#ffffff' }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {utilityTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.filterButton,
              selectedUtilityType === type.value && { backgroundColor: '#007AFF' }
            ]}
            onPress={() => setSelectedUtilityType(type.value)}
          >
            <Text style={[
              styles.filterButtonText,
              { color: selectedUtilityType === type.value ? 'white' : '#000000' }
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'bills':
        return renderBills();
      case 'allocation':
        return renderAllocation();
      case 'budgets':
        return renderBudgets();
      case 'variance':
        return renderVariance();
      default:
        return renderOverview();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#f5f5f5' }]}>
      <InternalHeader 
        title="Utility Management"
        subtitle={facilityName}
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
      />

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                activeTab === tab.key && [styles.activeTab, { borderBottomColor: '#007AFF' }]
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons 
                name={tab.icon} 
                size={20} 
                color={activeTab === tab.key ? '#007AFF' : '#666666'}
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.key ? '#007AFF' : '#666666' }
              ]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {renderFilters()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading utility data...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
            />
          }
        >
          {renderTabContent()}
        </ScrollView>
      )}

      {renderModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
  },
  tabButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 70,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666666',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  allocationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  allocationType: {
    fontSize: 16,
    fontWeight: '500',
  },
  allocationAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  billCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billType: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  billDate: {
    fontSize: 14,
  },
  billAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  allocateButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  allocateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  ruleCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ruleName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  priorityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  ruleDetail: {
    fontSize: 14,
    marginBottom: 4,
  },
  ruleMethod: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  rulePercentage: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  budgetCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  budgetType: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  budgetYear: {
    fontSize: 14,
    marginBottom: 12,
  },
  budgetDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  budgetUsage: {
    fontSize: 16,
  },
  varianceCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  varianceType: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  varianceDate: {
    fontSize: 14,
    marginBottom: 12,
  },
  varianceDetails: {
    gap: 8,
  },
  varianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  varianceLabel: {
    fontSize: 16,
  },
  varianceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 12,
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
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UtilityManagementScreen; 