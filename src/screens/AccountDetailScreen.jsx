import React, { useEffect, useState, useContext } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl, 
  Alert,
  Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { fetchAccount, updateAccount, deleteAccount } from '../api/crm/accounts';
import InternalHeader from '../components/InternalHeader';

export default function AccountDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useContext(AuthContext);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const loadAccount = async () => {
    try {
      const data = await fetchAccount(id);
      setAccount(data);
    } catch (err) {
      console.error('Failed to load account', err);
      Alert.alert('Error', 'Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccount();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAccount();
    setRefreshing(false);
  };

  const handleDeleteAccount = () => {
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
              navigation.goBack();
            } catch (err) {
              console.error('Failed to delete account', err);
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = (email) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const handleWebsite = (website) => {
    if (website) {
      const url = website.startsWith('http') ? website : `https://${website}`;
      Linking.openURL(url);
    }
  };

  const renderTabBar = () => {
    const tabs = [
      { key: 'overview', label: 'Overview', icon: 'information-outline' },
      { key: 'contacts', label: 'Contacts', icon: 'account-group' },
      { key: 'deals', label: 'Deals', icon: 'handshake' },
      { key: 'activity', label: 'Activity', icon: 'timeline-clock' },
    ];

    return (
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                activeTab === tab.key && styles.tabButtonActive
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialCommunityIcons 
                name={tab.icon} 
                size={20} 
                color={activeTab === tab.key ? 'white' : '#007AFF'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderAccountHeader = () => (
    <View style={styles.headerCard}>
      <View style={styles.accountHeaderContent}>
        <View style={styles.accountIcon}>
          <MaterialCommunityIcons name="domain" size={32} color="#007AFF" />
        </View>
        <View style={styles.accountHeaderInfo}>
          <Text style={styles.accountName}>{account.name}</Text>
          {account.description && (
            <Text style={styles.accountDescription}>{account.description}</Text>
          )}
          <Text style={styles.accountDate}>
            Created {new Date(account.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {account.phone && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleCall(account.phone)}
          >
            <MaterialCommunityIcons name="phone" size={20} color="#34C759" />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>
        )}
        
        {account.email && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEmail(account.email)}
          >
            <MaterialCommunityIcons name="email" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Email</Text>
          </TouchableOpacity>
        )}
        
        {account.website && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleWebsite(account.website)}
          >
            <MaterialCommunityIcons name="web" size={20} color="#FF9500" />
            <Text style={styles.actionButtonText}>Website</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="account-group" size={24} color="#007AFF" />
          <Text style={styles.statNumber}>{account.contacts?.length || 0}</Text>
          <Text style={styles.statLabel}>Contacts</Text>
        </View>
        
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="handshake" size={24} color="#34C759" />
          <Text style={styles.statNumber}>{account.deals?.length || 0}</Text>
          <Text style={styles.statLabel}>Deals</Text>
        </View>
        
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="format-list-checks" size={24} color="#FF9500" />
          <Text style={styles.statNumber}>{account.tasks?.length || 0}</Text>
          <Text style={styles.statLabel}>Tasks</Text>
        </View>
        
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="ticket" size={24} color="#FF3B30" />
          <Text style={styles.statNumber}>{account.tickets?.length || 0}</Text>
          <Text style={styles.statLabel}>Tickets</Text>
        </View>
      </View>

      {/* Account Information */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="domain" size={20} color="#8E8E93" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Company Name</Text>
            <Text style={styles.infoValue}>{account.name}</Text>
          </View>
        </View>
        
        {account.description && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="text" size={20} color="#8E8E93" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Description</Text>
              <Text style={styles.infoValue}>{account.description}</Text>
            </View>
          </View>
        )}
        
        {account.phone && (
          <TouchableOpacity 
            style={styles.infoRow}
            onPress={() => handleCall(account.phone)}
          >
            <MaterialCommunityIcons name="phone" size={20} color="#34C759" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={[styles.infoValue, styles.infoValueLink]}>{account.phone}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        )}
        
        {account.email && (
          <TouchableOpacity 
            style={styles.infoRow}
            onPress={() => handleEmail(account.email)}
          >
            <MaterialCommunityIcons name="email" size={20} color="#007AFF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={[styles.infoValue, styles.infoValueLink]}>{account.email}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        )}
        
        {account.website && (
          <TouchableOpacity 
            style={styles.infoRow}
            onPress={() => handleWebsite(account.website)}
          >
            <MaterialCommunityIcons name="web" size={20} color="#FF9500" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Website</Text>
              <Text style={[styles.infoValue, styles.infoValueLink]}>{account.website}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        )}
        
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="calendar" size={20} color="#8E8E93" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {new Date(account.createdAt).toLocaleDateString()} at {new Date(account.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="update" size={20} color="#8E8E93" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>
              {new Date(account.updatedAt).toLocaleDateString()} at {new Date(account.updatedAt).toLocaleTimeString()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderContactsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.emptySection}>
        <MaterialCommunityIcons name="account-group-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptySectionTitle}>No Contacts Yet</Text>
        <Text style={styles.emptySectionSubtitle}>
          Contacts will appear here when they are added to this account
        </Text>
      </View>
    </View>
  );

  const renderDealsTab = () => (
    <View style={styles.tabContent}>
      {account.deals && account.deals.length > 0 ? (
        account.deals.map((deal, index) => (
          <View key={deal.id || index} style={styles.dealCard}>
            <View style={styles.dealHeader}>
              <MaterialCommunityIcons name="handshake" size={24} color="#34C759" />
              <View style={styles.dealInfo}>
                <Text style={styles.dealTitle}>{deal.title}</Text>
                <Text style={styles.dealAmount}>${deal.amount?.toLocaleString()}</Text>
              </View>
              <View style={[styles.dealStage, { backgroundColor: getDealStageColor(deal.stage) }]}>
                <Text style={styles.dealStageText}>{deal.stage}</Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptySection}>
          <MaterialCommunityIcons name="handshake-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptySectionTitle}>No Deals Yet</Text>
          <Text style={styles.emptySectionSubtitle}>
            Business opportunities will appear here when they are created
          </Text>
        </View>
      )}
    </View>
  );

  const renderActivityTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.emptySection}>
        <MaterialCommunityIcons name="timeline-clock-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptySectionTitle}>Activity Timeline</Text>
        <Text style={styles.emptySectionSubtitle}>
          Recent activities and interactions will be shown here
        </Text>
      </View>
    </View>
  );

  const getDealStageColor = (stage) => {
    const colors = {
      'PROSPECTING': '#007AFF',
      'QUALIFICATION': '#FF9500',
      'PROPOSAL': '#FF3B30',
      'NEGOTIATION': '#AF52DE',
      'CLOSED_WON': '#34C759',
      'CLOSED_LOST': '#8E8E93'
    };
    return colors[stage] || '#007AFF';
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'contacts':
        return renderContactsTab();
      case 'deals':
        return renderDealsTab();
      case 'activity':
        return renderActivityTab();
      default:
        return renderOverviewTab();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Account Details" />
        <ActivityIndicator style={styles.center} size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Account Details" />
        <View style={styles.center}>
          <MaterialCommunityIcons name="domain-off" size={64} color="#C7C7CC" />
          <Text style={styles.notFoundTitle}>Account Not Found</Text>
          <Text style={styles.notFoundSubtitle}>
            This account may have been deleted or you don't have permission to view it
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title={account.name}
        rightIcon={(user.role === 'crm_admin' || user.role === 'dev') ? "delete-outline" : null}
        onRightPress={handleDeleteAccount}
      />

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderAccountHeader()}
        {renderTabBar()}
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  accountIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  accountHeaderInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  accountDescription: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 4,
    lineHeight: 22,
  },
  accountDate: {
    fontSize: 14,
    color: '#C7C7CC',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    fontWeight: '500',
  },
  tabBar: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 6,
  },
  tabTextActive: {
    color: 'white',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  infoValueLink: {
    color: '#007AFF',
  },
  dealCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dealInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dealTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  dealAmount: {
    fontSize: 15,
    color: '#34C759',
    fontWeight: '600',
  },
  dealStage: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dealStageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptySectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySectionSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  notFoundTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  notFoundSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
}); 