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
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  updateSupplierStatus,
  fetchSupplierPerformance,
  fetchSupplierAnalytics,
} from '../api/suppliers';

export default function SuppliersScreen({ navigation }) {
  const { user, userToken: token } = useContext(AuthContext);
  const theme = useTheme();
  const [suppliers, setSuppliers] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Form state for creating/editing supplier
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    taxId: '',
    supplierType: 'GOODS',
    status: 'ACTIVE',
    paymentTerms: 'Net 30',
    creditLimit: 0,
    currency: 'USD',
    leadTime: 7,
    minimumOrder: 0,
    contactPerson: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (statusFilter !== 'ALL') filters.status = statusFilter;
      if (typeFilter !== 'ALL') filters.supplierType = typeFilter;
      
      const [suppliersData, analyticsData] = await Promise.all([
        fetchSuppliers(token, filters),
        fetchSupplierAnalytics(token),
      ]);
      
      setSuppliers(suppliersData);
      setAnalytics(analyticsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load suppliers. Please try again.');
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateSupplier = async () => {
    try {
      if (!formData.name.trim() || !formData.email.trim()) {
        Alert.alert('Validation Error', 'Please fill in required fields (Name and Email)');
        return;
      }

      await createSupplier(token, formData);
      setShowCreateModal(false);
      resetForm();
      loadData();
      Alert.alert('Success', 'Supplier created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create supplier');
      console.error('Error creating supplier:', error);
    }
  };

  const handleUpdateSupplier = async () => {
    try {
      if (!formData.name.trim() || !formData.email.trim()) {
        Alert.alert('Validation Error', 'Please fill in required fields (Name and Email)');
        return;
      }

      await updateSupplier(token, selectedSupplier.id, formData);
      setShowEditModal(false);
      resetForm();
      loadData();
      Alert.alert('Success', 'Supplier updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update supplier');
      console.error('Error updating supplier:', error);
    }
  };

  const handleDeleteSupplier = async (supplierId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this supplier? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSupplier(token, supplierId);
              loadData();
              Alert.alert('Success', 'Supplier deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete supplier');
              console.error('Error deleting supplier:', error);
            }
          },
        },
      ]
    );
  };

  const handleStatusChange = async (supplierId, newStatus) => {
    try {
      await updateSupplierStatus(token, supplierId, newStatus);
      loadData();
      Alert.alert('Success', 'Supplier status updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update supplier status');
      console.error('Error updating status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      taxId: '',
      supplierType: 'GOODS',
      status: 'ACTIVE',
      paymentTerms: 'Net 30',
      creditLimit: 0,
      currency: 'USD',
      leadTime: 7,
      minimumOrder: 0,
      contactPerson: '',
      notes: '',
    });
    setSelectedSupplier(null);
  };

  const openEditModal = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      website: supplier.website || '',
      taxId: supplier.taxId || '',
      supplierType: supplier.supplierType || 'GOODS',
      status: supplier.status || 'ACTIVE',
      paymentTerms: supplier.paymentTerms || 'Net 30',
      creditLimit: supplier.creditLimit || 0,
      currency: supplier.currency || 'USD',
      leadTime: supplier.leadTime || 7,
      minimumOrder: supplier.minimumOrder || 0,
      contactPerson: supplier.contactPerson || '',
      notes: supplier.notes || '',
    });
    setShowEditModal(true);
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return '#10B981';
      case 'INACTIVE': return '#6B7280';
      case 'SUSPENDED': return '#EF4444';
      case 'PENDING': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'GOODS': return '#3B82F6';
      case 'SERVICES': return '#8B5CF6';
      case 'MATERIALS': return '#F59E0B';
      case 'EQUIPMENT': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPerformanceIcon = (score) => {
    if (score >= 90) return 'star';
    if (score >= 80) return 'star-half-full';
    if (score >= 70) return 'star-outline';
    return 'alert-circle-outline';
  };

  const getPerformanceColor = (score) => {
    if (score >= 90) return '#10B981';
    if (score >= 80) return '#F59E0B';
    if (score >= 70) return '#EF4444';
    return '#DC2626';
  };

  const AnalyticsCard = ({ title, value, subtitle, icon, color, borderColor }) => (
    <View style={[styles.analyticsCard, { 
      backgroundColor: theme.cardBackground,
      borderColor: borderColor,
      borderWidth: 1,
    }]}>
      <View style={[styles.analyticsIcon, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={28} color={color} />
      </View>
      <Text style={[styles.analyticsValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.analyticsTitle, { color: theme.colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.analyticsSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
  );

  const renderSupplierItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.supplierCard, { backgroundColor: theme.cardBackground }]}
      onPress={() => navigation.navigate('SupplierDetailScreen', { supplierId: item.id })}
    >
      <View style={styles.supplierHeader}>
        <View style={styles.supplierInfo}>
          <Text style={[styles.supplierName, { color: theme.colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.supplierEmail, { color: theme.textSecondary }]}>
            {item.email}
          </Text>
          {item.contactPerson && (
            <Text style={[styles.contactPerson, { color: theme.textSecondary }]}>
              Contact: {item.contactPerson}
            </Text>
          )}
        </View>
        <View style={styles.statusContainer}>
          <StatusBadge status={item.status} color={getStatusColor(item.status)} />
          <StatusBadge status={item.supplierType} color={getTypeColor(item.supplierType)} />
        </View>
      </View>

      <View style={styles.supplierDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="phone" size={16} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            {item.phone || 'No phone'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.address || 'No address'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            Lead time: {item.leadTime || 0} days
          </Text>
        </View>
      </View>

      {item.performanceScore && (
        <View style={styles.performanceContainer}>
          <MaterialCommunityIcons 
            name={getPerformanceIcon(item.performanceScore)} 
            size={16} 
            color={getPerformanceColor(item.performanceScore)} 
          />
          <Text style={[styles.performanceText, { color: getPerformanceColor(item.performanceScore) }]}>
            Performance: {item.performanceScore.toFixed(1)}
          </Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.scorecardButton]}
          onPress={() => navigation.navigate('VendorScorecardScreen', { supplierId: item.id })}
        >
          <MaterialCommunityIcons name="chart-box" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Scorecard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.statusButton]}
          onPress={() => {
            const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            handleStatusChange(item.id, newStatus);
          }}
        >
          <MaterialCommunityIcons 
            name={item.status === 'ACTIVE' ? 'pause' : 'play'} 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.actionButtonText}>
            {item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <InternalHeader 
          navigation={navigation} 
          title="Suppliers" 
          rightIcons={[
            {
              icon: "plus",
              onPress: () => navigation.navigate('Add New Supplier'),
              color: "#10B981"
            },
            {
              icon: "view-dashboard",
              onPress: () => navigation.navigate('ProcurementAnalytics'),
              color: "#3B82F6"
            }
          ]}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading suppliers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InternalHeader
        navigation={navigation}
        title="Suppliers"
        rightIcon="plus"
        onRightPress={() => setShowCreateModal(true)}
      />

      {/* Analytics Overview */}
      <View style={styles.analyticsContainer}>
        <View style={styles.analyticsGrid}>
          <AnalyticsCard
            title="Total Suppliers"
            value={analytics.totalSuppliers || '0'}
            subtitle="Active & Inactive"
            icon="account-group"
            color="#1976D2"
            borderColor="#E1F5FE"
          />
          <AnalyticsCard
            title="Active Suppliers"
            value={analytics.activeSuppliers || '0'}
            subtitle="Currently engaged"
            icon="account-check"
            color="#388E3C"
            borderColor="#E8F5E8"
          />
          <AnalyticsCard
            title="Avg Performance"
            value={analytics.averagePerformance?.toFixed(1) || '0.0'}
            subtitle="Overall rating"
            icon="star"
            color="#F57C00"
            borderColor="#FFF3E0"
          />
          <AnalyticsCard
            title="Total Spend"
            value={`$${analytics.totalSpend?.toLocaleString() || '0'}`}
            subtitle="This year"
            icon="currency-usd"
            color="#7B1FA2"
            borderColor="#F3E5F5"
          />
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.cardBackground }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search suppliers..."
            placeholderTextColor={theme.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {/* Status Filter */}
          {['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'].map(status => (
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
                {status}
              </Text>
            </TouchableOpacity>
          ))}
          
          {/* Type Filter */}
          {['GOODS', 'SERVICES', 'MATERIALS', 'EQUIPMENT'].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                typeFilter === type && { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => setTypeFilter(type)}
            >
              <Text style={[
                styles.filterChipText,
                typeFilter === type && { color: '#fff' }
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Suppliers List */}
      <FlatList
        data={filteredSuppliers}
        renderItem={renderSupplierItem}
        keyExtractor={item => item.id.toString()}
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No suppliers found
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowCreateModal(true)}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add First Supplier</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create/Edit Supplier Modal */}
      <Modal
        visible={showCreateModal || showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetForm();
            }}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {showCreateModal ? 'Add Supplier' : 'Edit Supplier'}
            </Text>
            <TouchableOpacity onPress={showCreateModal ? handleCreateSupplier : handleUpdateSupplier}>
              <Text style={[styles.saveButton, { color: theme.colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Basic Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Company Name *</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter company name"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email *</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                  placeholder="Enter email address"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Phone</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={formData.phone}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                    placeholder="Phone number"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Contact Person</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={formData.contactPerson}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, contactPerson: text }))}
                    placeholder="Contact name"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Address</Text>
                <TextInput
                  style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.address}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                  placeholder="Enter full address"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Website</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={formData.website}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, website: text }))}
                    placeholder="Website URL"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Tax ID</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={formData.taxId}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, taxId: text }))}
                    placeholder="Tax ID"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>
            </View>

            {/* Business Configuration */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Business Configuration</Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Supplier Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionContainer}>
                  {['GOODS', 'SERVICES', 'MATERIALS', 'EQUIPMENT'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionChip,
                        formData.supplierType === type && { backgroundColor: getTypeColor(type) }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, supplierType: type }))}
                    >
                      <Text style={[
                        styles.optionText,
                        formData.supplierType === type && { color: '#fff' }
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionContainer}>
                  {['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.optionChip,
                        formData.status === status && { backgroundColor: getStatusColor(status) }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, status }))}
                    >
                      <Text style={[
                        styles.optionText,
                        formData.status === status && { color: '#fff' }
                      ]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Payment Terms</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={formData.paymentTerms}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, paymentTerms: text }))}
                    placeholder="Net 30"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Currency</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={formData.currency}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, currency: text }))}
                    placeholder="USD"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Credit Limit</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={formData.creditLimit.toString()}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, creditLimit: parseFloat(text) || 0 }))}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Lead Time (days)</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={formData.leadTime.toString()}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, leadTime: parseInt(text) || 0 }))}
                    placeholder="7"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Minimum Order Amount</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.minimumOrder.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, minimumOrder: parseFloat(text) || 0 }))}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Notes</Text>
                <TextInput
                  style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  placeholder="Additional notes about this supplier"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
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
  analyticsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analyticsCard: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    minHeight: 140,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  analyticsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  analyticsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  analyticsSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.2,
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
  supplierCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  supplierInfo: {
    flex: 1,
    marginRight: 12,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  supplierEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  contactPerson: {
    fontSize: 12,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  supplierDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 6,
    fontSize: 12,
    flex: 1,
  },
  performanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  performanceText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 4,
    fontSize: 11,
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  scorecardButton: {
    backgroundColor: '#8B5CF6',
  },
  statusButton: {
    backgroundColor: '#F59E0B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
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
  optionContainer: {
    flexDirection: 'row',
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
}); 