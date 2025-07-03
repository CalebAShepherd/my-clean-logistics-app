import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Share,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { fetchTicket, updateTicket, deleteTicket } from '../api/crm/tickets';
import InternalHeader from '../components/InternalHeader';

const TICKET_STATUSES = {
  OPEN: { label: 'Open', color: '#007AFF', icon: 'ticket-outline' },
  IN_PROGRESS: { label: 'In Progress', color: '#FF9500', icon: 'progress-clock' },
  CLOSED: { label: 'Closed', color: '#34C759', icon: 'ticket-confirmation-outline' },
  ON_HOLD: { label: 'On Hold', color: '#8E8E93', icon: 'pause-circle-outline' },
};

const PRIORITY_CONFIG = {
  LOW: { label: 'Low', color: '#34C759', icon: 'arrow-down-circle' },
  NORMAL: { label: 'Normal', color: '#007AFF', icon: 'minus-circle' },
  HIGH: { label: 'High', color: '#FF9500', icon: 'arrow-up-circle' },
  URGENT: { label: 'Urgent', color: '#FF3B30', icon: 'alert-circle' },
};

export default function TicketDetailScreen({ route, navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const { ticketId } = route.params;

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const data = await fetchTicket(ticketId);
      setTicket(data);
      setEditForm({
        subject: data.subject,
        description: data.description || '',
        status: data.status,
        priority: data.priority
      });
    } catch (error) {
      console.error('Failed to load ticket:', error);
      Alert.alert('Error', 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTicket();
    setRefreshing(false);
  };

  const handleSaveEdit = async () => {
    if (!editForm.subject.trim()) {
      Alert.alert('Validation', 'Subject is required');
      return;
    }

    try {
      setUpdating(true);
      const updatedTicket = await updateTicket(ticketId, editForm);
      setTicket(updatedTicket);
      setEditMode(false);
      Alert.alert('Success', 'Ticket updated successfully');
    } catch (error) {
      console.error('Failed to update ticket:', error);
      Alert.alert('Error', 'Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
      const updatedTicket = await updateTicket(ticketId, { status: newStatus });
      setTicket(updatedTicket);
      setEditForm(prev => ({ ...prev, status: newStatus }));
      setShowStatusModal(false);
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('Error', 'Failed to update ticket status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    try {
      setUpdating(true);
      const updatedTicket = await updateTicket(ticketId, { priority: newPriority });
      setTicket(updatedTicket);
      setEditForm(prev => ({ ...prev, priority: newPriority }));
      setShowPriorityModal(false);
    } catch (error) {
      console.error('Failed to update priority:', error);
      Alert.alert('Error', 'Failed to update ticket priority');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Ticket',
      'Are you sure you want to delete this ticket? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTicket(ticketId);
              navigation.goBack();
              Alert.alert('Success', 'Ticket deleted successfully');
            } catch (error) {
              console.error('Failed to delete ticket:', error);
              Alert.alert('Error', 'Failed to delete ticket');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      const message = `Support Ticket: ${ticket.subject}\n\nStatus: ${TICKET_STATUSES[ticket.status]?.label}\nPriority: ${PRIORITY_CONFIG[ticket.priority]?.label}\n\n${ticket.description || 'No description provided'}`;
      
      await Share.share({
        message,
        title: `Ticket #${ticket.id.slice(-8)}`,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleContactCustomer = () => {
    if (ticket.account?.contacts?.length > 0) {
      const contact = ticket.account.contacts[0];
      Alert.alert(
        'Contact Customer',
        `Contact ${contact.firstName} ${contact.lastName}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: () => contact.phone && Linking.openURL(`tel:${contact.phone}`)
          },
          {
            text: 'Email',
            onPress: () => contact.email && Linking.openURL(`mailto:${contact.email}`)
          },
        ]
      );
    }
  };

  const renderDetailSection = (title, content, icon) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name={icon} size={20} color="#007AFF" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {content}
      </View>
    </View>
  );

  const renderDetailRow = (label, value, icon, onPress = null) => (
    <TouchableOpacity 
      style={[styles.detailRow, !onPress && styles.detailRowDisabled]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.detailLeft}>
        <MaterialCommunityIcons name={icon} size={16} color="#8E8E93" />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <View style={styles.detailRight}>
        <Text style={[styles.detailValue, onPress && styles.detailValueClickable]}>
          {value || 'Not specified'}
        </Text>
        {onPress && <MaterialCommunityIcons name="chevron-right" size={16} color="#C7C7CC" />}
      </View>
    </TouchableOpacity>
  );

  const renderStatusModal = () => (
    <Modal
      visible={showStatusModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowStatusModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Status</Text>
          {Object.entries(TICKET_STATUSES).map(([key, config]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.modalOption,
                ticket.status === key && styles.modalOptionSelected
              ]}
              onPress={() => handleStatusChange(key)}
            >
              <MaterialCommunityIcons 
                name={config.icon} 
                size={20} 
                color={config.color} 
              />
              <Text style={[
                styles.modalOptionText,
                { color: config.color }
              ]}>
                {config.label}
              </Text>
              {ticket.status === key && (
                <MaterialCommunityIcons name="check" size={20} color={config.color} />
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowStatusModal(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderPriorityModal = () => (
    <Modal
      visible={showPriorityModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPriorityModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Priority</Text>
          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.modalOption,
                ticket.priority === key && styles.modalOptionSelected
              ]}
              onPress={() => handlePriorityChange(key)}
            >
              <MaterialCommunityIcons 
                name={config.icon} 
                size={20} 
                color={config.color} 
              />
              <Text style={[
                styles.modalOptionText,
                { color: config.color }
              ]}>
                {config.label}
              </Text>
              {ticket.priority === key && (
                <MaterialCommunityIcons name="check" size={20} color={config.color} />
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowPriorityModal(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Ticket Details" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading ticket details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Ticket Details" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="ticket-outline" size={64} color="#C7C7CC" />
          <Text style={styles.errorTitle}>Ticket Not Found</Text>
          <Text style={styles.errorMessage}>The requested ticket could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = TICKET_STATUSES[ticket.status];
  const priorityConfig = PRIORITY_CONFIG[ticket.priority];
  const canEdit = user.role === 'crm_admin' || user.role === 'dev' || ticket.assigneeId === user.id;
  const canDelete = user.role === 'crm_admin' || user.role === 'dev';

  return (
    <LinearGradient
      colors={['#F0F8FF', '#E6F3FF', '#F0F8FF']}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <InternalHeader 
          navigation={navigation} 
          title="Ticket Details"
          rightIcon={canEdit ? (editMode ? "check" : "pencil") : null}
          onRightPress={editMode ? handleSaveEdit : () => setEditMode(true)}
          rightIcon2="share-variant"
          onRightPress2={handleShare}
        />

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          }
        >
          {/* Header Card */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
            style={[
              styles.headerCard,
              ticket.priority === 'URGENT' && styles.headerCardUrgent
            ]}
          >
            <View style={styles.headerTop}>
              <View style={styles.ticketIconContainer}>
                <View style={[
                  styles.ticketIcon,
                  { backgroundColor: statusConfig.color + '20' }
                ]}>
                  <MaterialCommunityIcons 
                    name={statusConfig.icon} 
                    size={32} 
                    color={statusConfig.color} 
                  />
                </View>
                <View style={[
                  styles.priorityBadge,
                  { backgroundColor: priorityConfig.color }
                ]}>
                  <MaterialCommunityIcons 
                    name={priorityConfig.icon} 
                    size={16} 
                    color="white" 
                  />
                </View>
              </View>

              <View style={styles.headerInfo}>
                <Text style={styles.ticketId}>#{ticket.id.slice(-8)}</Text>
                {editMode ? (
                  <TextInput
                    style={styles.subjectInput}
                    value={editForm.subject}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, subject: text }))}
                    placeholder="Ticket subject"
                    multiline
                  />
                ) : (
                  <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                )}
              </View>
            </View>

            <View style={styles.headerMeta}>
              <TouchableOpacity
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusConfig.color }
                ]}
                onPress={canEdit ? () => setShowStatusModal(true) : null}
              >
                <Text style={styles.statusText}>{statusConfig.label}</Text>
                {canEdit && <MaterialCommunityIcons name="chevron-down" size={14} color="white" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.priorityBadgeHorizontal,
                  { borderColor: priorityConfig.color }
                ]}
                onPress={canEdit ? () => setShowPriorityModal(true) : null}
              >
                <MaterialCommunityIcons 
                  name={priorityConfig.icon} 
                  size={14} 
                  color={priorityConfig.color} 
                />
                <Text style={[
                  styles.priorityText,
                  { color: priorityConfig.color }
                ]}>
                  {priorityConfig.label}
                </Text>
                {canEdit && <MaterialCommunityIcons name="chevron-down" size={14} color={priorityConfig.color} />}
              </TouchableOpacity>

              <Text style={styles.createdDate}>
                Created {new Date(ticket.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </LinearGradient>

          {/* Description Section */}
          {renderDetailSection('Description', (
            editMode ? (
              <TextInput
                style={styles.descriptionInput}
                value={editForm.description}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, description: text }))}
                placeholder="Add ticket description..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.description}>
                {ticket.description || 'No description provided'}
              </Text>
            )
          ), 'text-box-outline')}

          {/* Account Information */}
          {ticket.account && renderDetailSection('Customer Account', (
            <>
              {renderDetailRow(
                'Company Name', 
                ticket.account.name, 
                'domain',
                () => navigation.navigate('AccountDetail', { accountId: ticket.account.id })
              )}
              {renderDetailRow('Account Type', ticket.account.type, 'tag')}
              {ticket.account.contacts?.length > 0 && (
                <>
                  {renderDetailRow(
                    'Primary Contact',
                    `${ticket.account.contacts[0].firstName} ${ticket.account.contacts[0].lastName}`,
                    'account',
                    handleContactCustomer
                  )}
                  {ticket.account.contacts[0].email && renderDetailRow(
                    'Email',
                    ticket.account.contacts[0].email,
                    'email',
                    () => Linking.openURL(`mailto:${ticket.account.contacts[0].email}`)
                  )}
                  {ticket.account.contacts[0].phone && renderDetailRow(
                    'Phone',
                    ticket.account.contacts[0].phone,
                    'phone',
                    () => Linking.openURL(`tel:${ticket.account.contacts[0].phone}`)
                  )}
                </>
              )}
            </>
          ), 'domain')}

          {/* Assignment Information */}
          {renderDetailSection('Assignment', (
            <>
              {ticket.assignee ? (
                <>
                  {renderDetailRow(
                    'Assigned To',
                    `${ticket.assignee.firstName} ${ticket.assignee.lastName}`,
                    'account'
                  )}
                  {renderDetailRow('Role', ticket.assignee.role, 'shield-account')}
                  {ticket.assignee.email && renderDetailRow(
                    'Email',
                    ticket.assignee.email,
                    'email',
                    () => Linking.openURL(`mailto:${ticket.assignee.email}`)
                  )}
                </>
              ) : (
                <View style={styles.unassignedContainer}>
                  <MaterialCommunityIcons name="account-question" size={24} color="#8E8E93" />
                  <Text style={styles.unassignedText}>Unassigned</Text>
                  <Text style={styles.unassignedSubtext}>This ticket needs to be assigned to a team member</Text>
                </View>
              )}
            </>
          ), 'account-group')}

          {/* Timeline */}
          {renderDetailSection('Activity Timeline', (
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineIcon, { backgroundColor: '#34C759' }]}>
                  <MaterialCommunityIcons name="plus" size={16} color="white" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Ticket Created</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(ticket.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>

              {ticket.updatedAt !== ticket.createdAt && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineIcon, { backgroundColor: '#007AFF' }]}>
                    <MaterialCommunityIcons name="pencil" size={16} color="white" />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Last Updated</Text>
                    <Text style={styles.timelineDate}>
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}

              {ticket.status === 'CLOSED' && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineIcon, { backgroundColor: '#34C759' }]}>
                    <MaterialCommunityIcons name="check" size={16} color="white" />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Ticket Resolved</Text>
                    <Text style={styles.timelineDate}>Status changed to Closed</Text>
                  </View>
                </View>
              )}
            </View>
          ), 'timeline')}

          {/* Quick Actions */}
          {canEdit && (
            <View style={styles.actionsContainer}>
              <Text style={styles.actionsTitle}>Quick Actions</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#007AFF' }]}
                  onPress={() => setShowStatusModal(true)}
                >
                  <MaterialCommunityIcons name="swap-horizontal" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Change Status</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FF9500' }]}
                  onPress={() => setShowPriorityModal(true)}
                >
                  <MaterialCommunityIcons name="priority-high" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Priority</Text>
                </TouchableOpacity>

                {ticket.account?.contacts?.length > 0 && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#34C759' }]}
                    onPress={handleContactCustomer}
                  >
                    <MaterialCommunityIcons name="phone" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Contact</Text>
                  </TouchableOpacity>
                )}

                {canDelete && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                    onPress={handleDelete}
                  >
                    <MaterialCommunityIcons name="delete" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Edit Mode Actions */}
          {editMode && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditMode(false);
                  setEditForm({
                    subject: ticket.subject,
                    description: ticket.description || '',
                    status: ticket.status,
                    priority: ticket.priority
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEdit}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {renderStatusModal()}
        {renderPriorityModal()}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerCardUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ticketIconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  ticketIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  headerInfo: {
    flex: 1,
  },
  ticketId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
  },
  ticketSubject: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    lineHeight: 28,
  },
  subjectInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  priorityBadgeHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  createdDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  sectionContent: {
    padding: 16,
  },
  description: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 24,
  },
  descriptionInput: {
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
    minHeight: 100,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  detailRowDisabled: {
    opacity: 1,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailValue: {
    fontSize: 14,
    color: '#1C1C1E',
    textAlign: 'right',
    marginRight: 8,
  },
  detailValueClickable: {
    color: '#007AFF',
  },
  unassignedContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  unassignedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 8,
  },
  unassignedSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 4,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: '48%',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalOptionSelected: {
    backgroundColor: '#F2F2F7',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
}); 