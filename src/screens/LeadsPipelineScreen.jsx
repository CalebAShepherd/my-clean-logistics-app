import React, { useEffect, useState, useContext } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  RefreshControl, 
  Alert, 
  TextInput,
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { fetchLeads, convertLead, updateLead, createLead, deleteLead } from '../api/crm/leads';
import InternalHeader from '../components/InternalHeader';

const LEAD_STATUSES = [
  { key: 'NEW', label: 'New', color: '#007AFF', icon: 'account-plus' },
  { key: 'QUALIFIED', label: 'Qualified', color: '#FF9500', icon: 'account-check' },
  { key: 'CONVERTED', label: 'Converted', color: '#34C759', icon: 'account-convert' },
  { key: 'DISQUALIFIED', label: 'Lost', color: '#FF3B30', icon: 'account-remove' },
];

export default function LeadsPipelineScreen({ navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLead, setNewLead] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    source: ''
  });

  const loadLeads = async () => {
    try {
      const data = await fetchLeads();
      setLeads(data);
    } catch (e) {
      console.error('Failed to fetch leads', e);
      Alert.alert('Error', 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeads();
    setRefreshing(false);
  };

  const handleConvert = async (id) => {
    Alert.alert(
      'Convert Lead',
      'Are you sure you want to convert this lead to an account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert',
          onPress: async () => {
            try {
              await convertLead(id);
              loadLeads();
              Alert.alert('Success', 'Lead converted successfully!');
            } catch (e) {
              console.error('Convert failed', e);
              Alert.alert('Error', 'Failed to convert lead');
            }
          }
        }
      ]
    );
  };

  const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      await updateLead(leadId, { status: newStatus });
      loadLeads();
    } catch (e) {
      console.error('Status update failed', e);
      Alert.alert('Error', 'Failed to update lead status');
    }
  };

  const handleAddLead = async () => {
    if (!newLead.firstName.trim() || !newLead.lastName.trim() || !newLead.email.trim()) {
      Alert.alert('Validation', 'First name, last name, and email are required');
      return;
    }

    try {
      await createLead(newLead);
      setNewLead({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        companyName: '',
        source: ''
      });
      setShowAddForm(false);
      loadLeads();
    } catch (err) {
      console.error('Failed to create lead', err);
      Alert.alert('Error', 'Failed to create lead');
    }
  };

  const handleDeleteLead = (lead) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${lead.firstName} ${lead.lastName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLead(lead.id);
              loadLeads();
            } catch (err) {
              console.error('Failed to delete lead', err);
              Alert.alert('Error', 'Failed to delete lead');
            }
          },
        },
      ]
    );
  };

  const getFilteredLeads = () => {
    let filtered = leads;
    
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(lead => lead.status === selectedStatus);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(lead =>
        `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  };

  const getStatusConfig = (status) => {
    return LEAD_STATUSES.find(s => s.key === status) || LEAD_STATUSES[0];
  };

  const renderStatusFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.statusFilterContainer}
      contentContainerStyle={styles.statusFilterContent}
    >
      <TouchableOpacity
        style={[
          styles.statusFilterButton,
          selectedStatus === 'ALL' && styles.statusFilterButtonActive
        ]}
        onPress={() => setSelectedStatus('ALL')}
      >
        <Text style={[
          styles.statusFilterText,
          selectedStatus === 'ALL' && styles.statusFilterTextActive
        ]}>
          All ({leads.length})
        </Text>
      </TouchableOpacity>
      
      {LEAD_STATUSES.map((status) => {
        const count = leads.filter(lead => lead.status === status.key).length;
        return (
          <TouchableOpacity
            key={status.key}
            style={[
              styles.statusFilterButton,
              selectedStatus === status.key && styles.statusFilterButtonActive,
              { borderColor: status.color }
            ]}
            onPress={() => setSelectedStatus(status.key)}
          >
            <MaterialCommunityIcons 
              name={status.icon} 
              size={16} 
              color={selectedStatus === status.key ? 'white' : status.color} 
              style={styles.statusFilterIcon}
            />
            <Text style={[
              styles.statusFilterText,
              selectedStatus === status.key && styles.statusFilterTextActive,
              { color: selectedStatus === status.key ? 'white' : status.color }
            ]}>
              {status.label} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderLead = ({ item }) => {
    const statusConfig = getStatusConfig(item.status);
    
    return (
      <View style={styles.leadCard}>
        <View style={styles.leadHeader}>
          <View style={[styles.leadIcon, { backgroundColor: statusConfig.color + '20' }]}>
            <MaterialCommunityIcons 
              name={statusConfig.icon} 
              size={24} 
              color={statusConfig.color} 
            />
          </View>
          <View style={styles.leadInfo}>
            <Text style={styles.leadName}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.leadEmail}>{item.email}</Text>
            {item.companyName && (
              <Text style={styles.leadCompany}>{item.companyName}</Text>
            )}
            {item.phone && (
              <Text style={styles.leadPhone}>{item.phone}</Text>
            )}
          </View>
          <View style={styles.leadActions}>
            {(user.role === 'crm_admin' || user.role === 'sales_rep' || user.role === 'dev') && (
              <TouchableOpacity
                onPress={() => handleDeleteLead(item)}
                style={styles.deleteButton}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={styles.leadFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
            <Text style={styles.statusBadgeText}>{statusConfig.label}</Text>
          </View>
          
          {item.source && (
            <Text style={styles.leadSource}>Source: {item.source}</Text>
          )}
          
          {item.status === 'NEW' && (user.role === 'crm_admin' || user.role === 'sales_rep' || user.role === 'dev') && (
            <TouchableOpacity
              style={styles.convertButton}
              onPress={() => handleConvert(item.id)}
            >
              <MaterialCommunityIcons name="account-convert" size={16} color="white" />
              <Text style={styles.convertButtonText}>Convert</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderAddForm = () => (
    <View style={styles.addForm}>
      <Text style={styles.addFormTitle}>Add New Lead</Text>
      
      <View style={styles.formRow}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="First Name"
          value={newLead.firstName}
          onChangeText={(text) => setNewLead({...newLead, firstName: text})}
          autoCapitalize="words"
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Last Name"
          value={newLead.lastName}
          onChangeText={(text) => setNewLead({...newLead, lastName: text})}
          autoCapitalize="words"
        />
      </View>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={newLead.email}
        onChangeText={(text) => setNewLead({...newLead, email: text})}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Phone (optional)"
        value={newLead.phone}
        onChangeText={(text) => setNewLead({...newLead, phone: text})}
        keyboardType="phone-pad"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Company Name (optional)"
        value={newLead.companyName}
        onChangeText={(text) => setNewLead({...newLead, companyName: text})}
        autoCapitalize="words"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Source (optional)"
        value={newLead.source}
        onChangeText={(text) => setNewLead({...newLead, source: text})}
        autoCapitalize="words"
      />
      
      <View style={styles.formButtons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => {
            setShowAddForm(false);
            setNewLead({
              firstName: '',
              lastName: '',
              email: '',
              phone: '',
              companyName: '',
              source: ''
            });
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.addButton]}
          onPress={handleAddLead}
        >
          <Text style={styles.addButtonText}>Add Lead</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Leads Pipeline" />
        <ActivityIndicator style={styles.center} size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  const filteredLeads = getFilteredLeads();

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Leads Pipeline"
        rightIcon={(user.role === 'crm_admin' || user.role === 'sales_rep' || user.role === 'dev') ? "plus" : null}
        onRightPress={() => setShowAddForm(!showAddForm)}
      />

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Add Form */}
        {showAddForm && renderAddForm()}

        {/* Status Filters */}
        {renderStatusFilter()}

        {/* Leads List */}
        <FlatList
          data={filteredLeads}
          renderItem={renderLead}
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
              <MaterialCommunityIcons name="account-search" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No Leads Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedStatus !== 'ALL' 
                  ? 'Try adjusting your filters' 
                  : 'Get started by adding your first lead'
                }
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
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  halfInput: {
    width: '48%',
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
  statusFilterContainer: {
    marginBottom: 16,
  },
  statusFilterContent: {
    paddingHorizontal: 4,
  },
  statusFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: 'white',
    marginRight: 8,
  },
  statusFilterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusFilterIcon: {
    marginRight: 4,
  },
  statusFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  statusFilterTextActive: {
    color: 'white',
  },
  listContainer: {
    paddingBottom: 20,
  },
  leadCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  leadIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  leadEmail: {
    fontSize: 15,
    color: '#007AFF',
    marginBottom: 2,
  },
  leadCompany: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  leadPhone: {
    fontSize: 14,
    color: '#8E8E93',
  },
  leadActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
  },
  leadFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  leadSource: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  convertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  convertButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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