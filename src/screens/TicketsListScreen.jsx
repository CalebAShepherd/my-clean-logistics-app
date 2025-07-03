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
import { fetchTickets, createTicket, updateTicket, deleteTicket } from '../api/crm/tickets';
import InternalHeader from '../components/InternalHeader';

const TICKET_STATUSES = [
  { key: 'ALL', label: 'All', icon: 'ticket-outline' },
  { key: 'OPEN', label: 'Open', icon: 'ticket-outline', color: '#007AFF' },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: 'progress-clock', color: '#FF9500' },
  { key: 'CLOSED', label: 'Closed', icon: 'ticket-confirmation-outline', color: '#34C759' },
  { key: 'ON_HOLD', label: 'On Hold', icon: 'pause-circle-outline', color: '#8E8E93' },
];

const PRIORITY_CONFIG = {
  LOW: { label: 'Low', color: '#34C759', icon: 'arrow-down-circle' },
  NORMAL: { label: 'Normal', color: '#007AFF', icon: 'minus-circle' },
  HIGH: { label: 'High', color: '#FF9500', icon: 'arrow-up-circle' },
  URGENT: { label: 'Urgent', color: '#FF3B30', icon: 'alert-circle' },
};

export default function TicketsListScreen({ navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'NORMAL'
  });

  const loadTickets = async () => {
    try {
      const data = await fetchTickets();
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets', err);
      Alert.alert('Error', 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      await updateTicket(ticketId, { status: newStatus });
      loadTickets();
    } catch (err) {
      console.error('Failed to update ticket', err);
      Alert.alert('Error', 'Failed to update ticket status');
    }
  };

  const handleAddTicket = async () => {
    if (!newTicket.subject.trim()) {
      Alert.alert('Validation', 'Ticket subject is required');
      return;
    }

    try {
      const ticketData = {
        subject: newTicket.subject.trim(),
        description: newTicket.description.trim() || null,
        priority: newTicket.priority
      };
      
      await createTicket(ticketData);
      setNewTicket({ subject: '', description: '', priority: 'NORMAL' });
      setShowAddForm(false);
      loadTickets();
    } catch (err) {
      console.error('Failed to create ticket', err);
      Alert.alert('Error', 'Failed to create ticket');
    }
  };

  const handleDeleteTicket = (ticket) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ticket "${ticket.subject}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTicket(ticket.id);
              loadTickets();
            } catch (err) {
              console.error('Failed to delete ticket', err);
              Alert.alert('Error', 'Failed to delete ticket');
            }
          },
        },
      ]
    );
  };

  const getFilteredTickets = () => {
    let filtered = tickets;
    
    // Apply status filter
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(ticket => ticket.status === selectedStatus);
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(ticket =>
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.description && ticket.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Sort by priority and creation date
    return filtered.sort((a, b) => {
      // Priority order: URGENT > HIGH > NORMAL > LOW
      const priorityOrder = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  };

  const renderStatusFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.statusFilterContainer}
      contentContainerStyle={styles.statusFilterContent}
    >
      {TICKET_STATUSES.map((status) => {
        let count = tickets.length;
        if (status.key !== 'ALL') {
          count = tickets.filter(ticket => ticket.status === status.key).length;
        }
        
        return (
          <TouchableOpacity
            key={status.key}
            style={[
              styles.statusFilterButton,
              selectedStatus === status.key && styles.statusFilterButtonActive,
              status.color && { borderColor: status.color }
            ]}
            onPress={() => setSelectedStatus(status.key)}
          >
            <MaterialCommunityIcons 
              name={status.icon} 
              size={16} 
              color={selectedStatus === status.key ? 'white' : (status.color || '#007AFF')} 
              style={styles.statusFilterIcon}
            />
            <Text style={[
              styles.statusFilterText,
              selectedStatus === status.key && styles.statusFilterTextActive,
              status.color && !selectedStatus === status.key && { color: status.color }
            ]}>
              {status.label} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderTicket = ({ item }) => {
    const statusConfig = TICKET_STATUSES.find(s => s.key === item.status);
    const priorityConfig = PRIORITY_CONFIG[item.priority];
    
    return (
      <TouchableOpacity
        style={[
          styles.ticketCard,
          item.priority === 'URGENT' && styles.ticketCardUrgent
        ]}
        onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.ticketIconContainer}>
            <View style={[
              styles.ticketIcon, 
              { backgroundColor: statusConfig?.color ? statusConfig.color + '20' : '#007AFF20' }
            ]}>
              <MaterialCommunityIcons 
                name={statusConfig?.icon || 'ticket-outline'} 
                size={24} 
                color={statusConfig?.color || '#007AFF'} 
              />
            </View>
            <View style={[
              styles.priorityBadge, 
              { backgroundColor: priorityConfig.color }
            ]}>
              <MaterialCommunityIcons 
                name={priorityConfig.icon} 
                size={12} 
                color="white" 
              />
            </View>
          </View>
          
          <View style={styles.ticketInfo}>
            <Text style={styles.ticketSubject} numberOfLines={2}>
              {item.subject}
            </Text>
            
            {item.description && (
              <Text style={styles.ticketDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            
            <View style={styles.ticketMeta}>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: statusConfig?.color || '#007AFF' }
              ]}>
                <Text style={styles.statusBadgeText}>
                  {statusConfig?.label || item.status}
                </Text>
              </View>
              
              <Text style={styles.priorityText}>
                {priorityConfig.label} Priority
              </Text>
              
              {item.assignee && (
                <View style={styles.assigneeContainer}>
                  <MaterialCommunityIcons name="account" size={14} color="#8E8E93" />
                  <Text style={styles.assigneeText}>
                    {item.assignee.firstName} {item.assignee.lastName}
                  </Text>
                </View>
              )}
              
              <Text style={styles.ticketDate}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.ticketActions}>
            {(user.role === 'crm_admin' || user.role === 'dev') && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteTicket(item);
                }}
                style={styles.deleteButton}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
            <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
          </View>
        </View>
        
        {/* Quick Actions */}
        {item.status === 'OPEN' && (user.role === 'crm_admin' || user.role === 'dev') && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF9500' }]}
              onPress={(e) => {
                e.stopPropagation();
                handleUpdateStatus(item.id, 'IN_PROGRESS');
              }}
            >
              <MaterialCommunityIcons name="play" size={16} color="white" />
              <Text style={styles.actionButtonText}>Start</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#34C759' }]}
              onPress={(e) => {
                e.stopPropagation();
                handleUpdateStatus(item.id, 'CLOSED');
              }}
            >
              <MaterialCommunityIcons name="check" size={16} color="white" />
              <Text style={styles.actionButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {item.status === 'IN_PROGRESS' && (user.role === 'crm_admin' || user.role === 'dev') && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#34C759' }]}
              onPress={(e) => {
                e.stopPropagation();
                handleUpdateStatus(item.id, 'CLOSED');
              }}
            >
              <MaterialCommunityIcons name="check" size={16} color="white" />
              <Text style={styles.actionButtonText}>Close</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#8E8E93' }]}
              onPress={(e) => {
                e.stopPropagation();
                handleUpdateStatus(item.id, 'ON_HOLD');
              }}
            >
              <MaterialCommunityIcons name="pause" size={16} color="white" />
              <Text style={styles.actionButtonText}>Hold</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderAddForm = () => (
    <View style={styles.addForm}>
      <Text style={styles.addFormTitle}>Create New Ticket</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Ticket Subject"
        value={newTicket.subject}
        onChangeText={(text) => setNewTicket({...newTicket, subject: text})}
        autoCapitalize="sentences"
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description (optional)"
        value={newTicket.description}
        onChangeText={(text) => setNewTicket({...newTicket, description: text})}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        autoCapitalize="sentences"
      />
      
      <Text style={styles.inputLabel}>Priority</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.prioritySelector}>
        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.priorityOption,
              { borderColor: config.color },
              newTicket.priority === key && { backgroundColor: config.color }
            ]}
            onPress={() => setNewTicket({...newTicket, priority: key})}
          >
            <MaterialCommunityIcons 
              name={config.icon} 
              size={16} 
              color={newTicket.priority === key ? 'white' : config.color} 
            />
            <Text style={[
              styles.priorityOptionText,
              { color: newTicket.priority === key ? 'white' : config.color }
            ]}>
              {config.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <View style={styles.formButtons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => {
            setShowAddForm(false);
            setNewTicket({ subject: '', description: '', priority: 'NORMAL' });
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.addButton]}
          onPress={handleAddTicket}
        >
          <Text style={styles.addButtonText}>Create Ticket</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Support Tickets" />
        <ActivityIndicator style={styles.center} size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  const filteredTickets = getFilteredTickets();
  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  const urgentCount = tickets.filter(t => t.priority === 'URGENT' && t.status !== 'CLOSED').length;

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Support Tickets"
        rightIcon={(user.role === 'crm_admin' || user.role === 'account_manager' || user.role === 'dev') ? "plus" : null}
        onRightPress={() => setShowAddForm(!showAddForm)}
      />

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Add Form */}
        {showAddForm && renderAddForm()}

        {/* Quick Stats */}
        {(openCount > 0 || urgentCount > 0) && (
          <View style={styles.statsContainer}>
            {openCount > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{openCount}</Text>
                <Text style={styles.statLabel}>Open</Text>
              </View>
            )}
            {urgentCount > 0 && (
              <View style={[styles.statItem, styles.statItemUrgent]}>
                <Text style={[styles.statNumber, styles.statNumberUrgent]}>{urgentCount}</Text>
                <Text style={[styles.statLabel, styles.statLabelUrgent]}>Urgent</Text>
              </View>
            )}
          </View>
        )}

        {/* Status Filters */}
        {renderStatusFilter()}

        {/* Tickets List */}
        <FlatList
          data={filteredTickets}
          renderItem={renderTicket}
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
              <MaterialCommunityIcons name="ticket-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No Tickets Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedStatus !== 'ALL' 
                  ? 'Try adjusting your filters' 
                  : 'All tickets are handled! Great job.'
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
    height: 100,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  prioritySelector: {
    marginBottom: 16,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
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
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    marginRight: 32,
  },
  statItemUrgent: {
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 0,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  statNumberUrgent: {
    color: '#FF3B30',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  statLabelUrgent: {
    color: '#FF3B30',
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
  ticketCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketCardUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  ticketIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  ticketIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  ticketInfo: {
    flex: 1,
  },
  ticketSubject: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  ticketDescription: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 8,
    lineHeight: 20,
  },
  ticketMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
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
  priorityText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  ticketDate: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  ticketActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginRight: 4,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionButtonText: {
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