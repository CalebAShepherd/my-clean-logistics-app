import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import InternalHeader from '../components/InternalHeader';

const FacilityManagementScreen = ({ navigation }) => {

  const facilityModules = [
    {
      id: 'space-optimization',
      title: 'Space Optimization',
      subtitle: 'Optimize warehouse layout and slotting',
      icon: 'view-grid',
      colors: ['#007AFF', '#0056CC'],
      screen: 'SpaceOptimizationDashboard',
      available: true
    },
    {
      id: 'utility-management',
      title: 'Utility Management',
      subtitle: 'Track and allocate utility costs',
      icon: 'flash',
      colors: ['#FF9500', '#FF8C00'],
      screen: 'UtilityManagement',
      available: true
    },
    {
      id: 'compliance-tracking',
      title: 'Compliance Tracking',
      subtitle: 'Monitor facility compliance and audits',
      icon: 'shield-check',
      colors: ['#34C759', '#30D158'],
      screen: 'FacilityMaintenance',
      available: true
    },
    {
      id: 'facility-analytics',
      title: 'Facility Analytics',
      subtitle: 'Comprehensive facility performance metrics',
      icon: 'chart-line',
      colors: ['#AF52DE', '#BF5AF2'],
      screen: 'FacilityAnalytics',
      available: true
    }
  ];

  const handleModulePress = (module) => {
    if (module.available && module.screen) {
      // Pass the demo facility ID that we created in the demo script
      if (module.screen === 'UtilityManagement' || module.screen === 'FacilityAnalytics') {
        navigation.navigate(module.screen, {
          facilityId: 'demo-facility-1',
          facilityName: 'Demo Distribution Center'
        });
      } else {
        navigation.navigate(module.screen);
      }
    } else {
      // TODO: Show coming soon dialog
      alert('This feature is coming soon!');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#f5f5f5' }]}>
      <InternalHeader navigation={navigation} title="Facility Management" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="domain" size={64} color="#007AFF" />
          </View>
          <Text style={[styles.title, { color: '#000000' }]}>
            Facility Management
          </Text>
          <Text style={[styles.subtitle, { color: '#666666' }]}>
            Comprehensive facility operations and optimization tools
          </Text>
        </View>

        <View style={styles.modulesContainer}>
          {facilityModules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={[styles.moduleCard, !module.available && styles.moduleCardDisabled]}
              onPress={() => handleModulePress(module)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={module.available ? module.colors : ['#E5E5EA', '#D1D1D6']}
                style={styles.moduleGradient}
              >
                <View style={styles.moduleHeader}>
                  <MaterialCommunityIcons 
                    name={module.icon} 
                    size={32} 
                    color={module.available ? 'white' : '#8E8E93'} 
                  />
                  {!module.available && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Soon</Text>
                    </View>
                  )}
                </View>
                <View style={styles.moduleContent}>
                  <Text style={[styles.moduleTitle, { color: module.available ? 'white' : '#8E8E93' }]}>
                    {module.title}
                  </Text>
                  <Text style={[styles.moduleSubtitle, { color: module.available ? 'rgba(255,255,255,0.9)' : '#8E8E93' }]}>
                    {module.subtitle}
                  </Text>
                </View>
                {module.available && (
                  <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.infoTitle, { color: '#000000' }]}>
            About Facility Management
          </Text>
          <Text style={[styles.infoText, { color: '#666666' }]}>
            Our facility management suite provides comprehensive tools for optimizing warehouse space, 
            tracking utility costs, ensuring compliance, and analyzing facility performance. Start with 
            space optimization to maximize your warehouse efficiency.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerSection: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  modulesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  moduleCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  moduleCardDisabled: {
    shadowOpacity: 0.05,
    elevation: 2,
  },
  moduleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    minHeight: 80,
  },
  moduleHeader: {
    position: 'relative',
  },
  moduleContent: {
    flex: 1,
    marginLeft: 16,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  moduleSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  comingSoonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  infoSection: {
    margin: 16,
    padding: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 22,
  },
});

export default FacilityManagementScreen; 