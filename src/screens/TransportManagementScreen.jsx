//import withScreenLayout from '../components/withScreenLayout';
import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import InternalHeader from '../components/InternalHeader';

const TRANSPORT_FEATURES = [
  {
    id: 'manage_transporters',
    title: 'Manage Transporters',
    subtitle: 'View and manage transporter accounts',
    icon: 'account-group',
    color: '#007AFF',
    lightColor: '#EAF4FF',
    route: 'Drivers',
    roles: ['admin', 'dispatcher']
  },
  {
    id: 'assign_transporters',
    title: 'Assign Transporters',
    subtitle: 'Assign transporters to shipments',
    icon: 'account-switch',
    color: '#34C759',
    lightColor: '#E8F8EA',
    route: 'Assign Transporters',
    roles: ['admin', 'dispatcher']
  },
  {
    id: 'vehicle_tracking',
    title: 'Vehicle Tracking',
    subtitle: 'Real-time vehicle location tracking',
    icon: 'map-marker-path',
    color: '#FF9500',
    lightColor: '#FFF3E8',
    route: 'Vehicle Tracking',
    roles: ['admin', 'dispatcher']
  },
  {
    id: 'route_optimization',
    title: 'Route Optimization',
    subtitle: 'Optimize delivery routes and paths',
    icon: 'directions',
    color: '#AF52DE',
    lightColor: '#F3EAFF',
    route: 'Route Optimization',
    roles: ['admin', 'dispatcher']
  },
  {
    id: 'inspection_logs',
    title: 'Inspection Logs',
    subtitle: 'Vehicle inspection records',
    icon: 'clipboard-check',
    color: '#FF3B30',
    lightColor: '#FFE8E8',
    route: 'Inspection Logs',
    roles: ['admin', 'dispatcher']
  },
  {
    id: 'transporter_documents',
    title: 'Transporter Documents',
    subtitle: 'Manage transporter documentation',
    icon: 'file-document',
    color: '#00D4AA',
    lightColor: '#E8FAF6',
    route: 'Transporter Documents',
    roles: ['admin', 'dispatcher']
  }
];

function TransportManagementScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const role = user?.role;

  const availableFeatures = TRANSPORT_FEATURES.filter(feature =>
    feature.roles.includes(role)
  );

  const renderFeatureCard = (feature, index) => (
    <TouchableOpacity
      key={feature.id}
      style={[styles.featureCard, index % 2 === 0 ? styles.leftCard : styles.rightCard]}
      onPress={() => navigation.navigate(feature.route)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: feature.lightColor }]}>
        <MaterialCommunityIcons 
          name={feature.icon} 
          size={32} 
          color={feature.color} 
        />
      </View>
      <Text style={styles.featureTitle}>{feature.title}</Text>
      <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
      <View style={styles.cardFooter}>
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={16} 
          color="#C7C7CC" 
        />
      </View>
    </TouchableOpacity>
  );

  const renderAccessDenied = () => (
    <View style={styles.accessDeniedContainer}>
      <MaterialCommunityIcons name="lock" size={64} color="#C7C7CC" />
      <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
      <Text style={styles.accessDeniedText}>
        Transport management features are only available to administrators and dispatchers.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Transport Management" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Visual Header Section */}
        <View style={styles.visualHeader}>
          <View style={styles.headerIconContainer}>
            <MaterialCommunityIcons name="truck-delivery" size={48} color="#007AFF" />
          </View>
          <Text style={styles.headerTitle}>Transport Management</Text>
          <Text style={styles.headerSubtitle}>
            Comprehensive transportation and logistics management
          </Text>
        </View>

        {availableFeatures.length > 0 ? (
          <>
            {/* Stats Card */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{availableFeatures.length}</Text>
                <Text style={styles.statLabel}>Available Features</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {role === 'admin' ? 'Full' : 'Limited'}
                </Text>
                <Text style={styles.statLabel}>Access Level</Text>
              </View>
            </View>

            {/* Features Grid */}
            <View style={styles.featuresSection}>
              <Text style={styles.sectionTitle}>Management Features</Text>
              <Text style={styles.sectionSubtitle}>
                Select a feature to manage your transportation operations
              </Text>
              
              <View style={styles.featuresGrid}>
                {availableFeatures.map(renderFeatureCard)}
              </View>
            </View>

            {/* Quick Actions Card */}
            <View style={styles.quickActionsCard}>
              <View style={styles.quickActionsHeader}>
                <MaterialCommunityIcons name="flash" size={20} color="#FF9500" />
                <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => navigation.navigate('Route Optimization')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#007AFF', '#0056CC']}
                  style={styles.quickActionGradient}
                >
                  <MaterialCommunityIcons name="directions" size={20} color="#FFFFFF" />
                  <Text style={styles.quickActionText}>Optimize Routes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          renderAccessDenied()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7'
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Visual Header
  visualHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 20,
  },

  // Features Section
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 24,
    lineHeight: 22,
  },

  // Features Grid
  featuresGrid: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 140,
    textAlign: 'center',
  },
  leftCard: {
    // marginRight: 8,
    // marginLeft: 8,
  },
  rightCard: {
    // marginLeft: 8,
    // marginRight: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
    lineHeight: 20,
  },
  featureSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    flex: 1,
  },
  cardFooter: {
    alignItems: 'flex-end',
    marginTop: 12,
  },

  // Quick Actions Card
  quickActionsCard: {
    backgroundColor: '#FFF8E8',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  quickActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  quickActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Access Denied
  accessDeniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
}); 
// export default withScreenLayout(TransportManagementScreen, { title: 'TransportManagement' });
export default TransportManagementScreen;
