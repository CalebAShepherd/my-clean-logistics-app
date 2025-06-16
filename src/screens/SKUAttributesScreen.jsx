import React, { useEffect, useState, useContext } from 'react';
import { SafeAreaView, View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { fetchSKUAttributes } from '../api/skuAttributes';
import InternalHeader from '../components/InternalHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TYPE_CONFIG = {
  STRING: { icon: 'format-text', color: '#007AFF', label: 'Text' },
  NUMBER: { icon: 'numeric', color: '#34C759', label: 'Number' },
  BOOLEAN: { icon: 'toggle-switch', color: '#FF9500', label: 'Yes/No' },
  DATE: { icon: 'calendar', color: '#AF52DE', label: 'Date' }
};

function SKUAttributesScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [attributes, setAttributes] = useState([]);
  const [filteredAttributes, setFilteredAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAttributes = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
    setLoading(true);
    }
    
    try {
      const data = await fetchSKUAttributes(userToken);
      setAttributes(data || []);
      setFilteredAttributes(data || []);
    } catch (error) {
      console.error('Error loading attributes:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
      setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadAttributes();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = attributes.filter(attr =>
        attr.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attr.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attr.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAttributes(filtered);
    } else {
      setFilteredAttributes(attributes);
    }
  }, [searchQuery, attributes]);

  const onRefresh = () => {
    loadAttributes(true);
  };

  const renderAttributeCard = ({ item, index }) => {
    const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.STRING;
    
    return (
      <TouchableOpacity
        style={[styles.attributeCard, index === 0 && styles.firstCard]}
        onPress={() => navigation.navigate('Edit SKU Attribute', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: typeConfig.color + '20' }]}>
            <MaterialCommunityIcons 
              name={typeConfig.icon} 
              size={24} 
              color={typeConfig.color} 
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.attributeLabel}>{item.label}</Text>
            <Text style={styles.attributeKey}>{item.key}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
        </View>
        
        <View style={styles.cardFooter}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '15' }]}>
            <MaterialCommunityIcons 
              name={typeConfig.icon} 
              size={14} 
              color={typeConfig.color} 
            />
            <Text style={[styles.typeText, { color: typeConfig.color }]}>
              {typeConfig.label}
            </Text>
          </View>
          
          <Text style={styles.editHint}>Tap to edit</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Visual Header Section */}
      <View style={styles.visualHeader}>
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons name="tag-multiple" size={48} color="#007AFF" />
        </View>
        <Text style={styles.headerTitle}>SKU Attributes</Text>
        <Text style={styles.headerSubtitle}>
          Manage custom attributes for your product catalog
        </Text>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{attributes.length}</Text>
          <Text style={styles.statLabel}>Total Attributes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {Object.keys(TYPE_CONFIG).reduce((acc, type) => {
              return acc + attributes.filter(attr => attr.type === type).length;
            }, 0) > 0 ? Object.keys(TYPE_CONFIG).filter(type => 
              attributes.some(attr => attr.type === type)
            ).length : 0}
          </Text>
          <Text style={styles.statLabel}>Types Used</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('Create SKU Attribute')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#007AFF', '#0056CC']}
            style={styles.addGradient}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Attribute</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search attributes..."
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results Header */}
      {searchQuery.length > 0 && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsText}>
            {filteredAttributes.length} result{filteredAttributes.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="tag-plus-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyStateTitle}>
        {searchQuery.length > 0 ? 'No Matches Found' : 'No Attributes Yet'}
      </Text>
      <Text style={styles.emptyStateText}>
        {searchQuery.length > 0 
          ? 'Try adjusting your search terms'
          : 'Create your first SKU attribute to get started'
        }
      </Text>
      {searchQuery.length === 0 && (
        <TouchableOpacity 
          style={styles.emptyActionButton}
          onPress={() => navigation.navigate('Create SKU Attribute')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#007AFF', '#0056CC']}
            style={styles.emptyActionGradient}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.emptyActionText}>Add First Attribute</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="SKU Attributes" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading attributes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="SKU Attributes" />
      
      <FlatList
        data={filteredAttributes}
        keyExtractor={(item) => item.id}
        renderItem={renderAttributeCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.content, 
          filteredAttributes.length === 0 && styles.emptyContent
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F2F2F7' 
  },
  content: {
    paddingHorizontal: 16,
  },
  emptyContent: {
    flexGrow: 1,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },

  // Header Styles
  headerContainer: {
    paddingBottom: 16,
  },
  visualHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
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
    marginHorizontal: 8,
    marginBottom: 24,
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

  // Action Buttons
  actionButtons: {
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  addButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  resultsHeader: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },

  // Attribute Cards
  attributeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 8,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  firstCard: {
    marginTop: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  attributeLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  attributeKey: {
    fontSize: 15,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editHint: {
    fontSize: 13,
    color: '#C7C7CC',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyActionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default SKUAttributesScreen; 