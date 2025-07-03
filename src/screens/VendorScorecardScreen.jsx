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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import InternalHeader from '../components/InternalHeader';
import {
  fetchVendorScorecards,
  createVendorScorecard,
  fetchSupplierScorecards,
  fetchTopPerformingVendors,
  fetchVendorPerformanceTrends,
} from '../api/vendorScorecards';
import { fetchSuppliers } from '../api/suppliers';

const { width } = Dimensions.get('window');

export default function VendorScorecardScreen({ navigation }) {
  const { user, userToken: token } = useContext(AuthContext);
  const theme = useTheme();
  const [scorecards, setScorecards] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTrendsModal, setShowTrendsModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [trends, setTrends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('ALL');

  // Form state for creating new scorecard
  const [formData, setFormData] = useState({
    supplierId: '',
    evaluationPeriod: new Date().toISOString().slice(0, 7), // YYYY-MM format
    qualityScore: 85,
    deliveryScore: 90,
    serviceScore: 88,
    costScore: 82,
    qualityComments: '',
    deliveryComments: '',
    serviceComments: '',
    costComments: '',
    overallComments: '',
    actionItems: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [scorecardsData, suppliersData, topPerformersData] = await Promise.all([
        fetchVendorScorecards(token),
        fetchSuppliers(token),
        fetchTopPerformingVendors(token, 10),
      ]);
      
      setScorecards(scorecardsData);
      setSuppliers(suppliersData);
      setTopPerformers(topPerformersData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data. Please try again.');
      console.error('Error loading vendor scorecards:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateScorecard = async () => {
    try {
      if (!formData.supplierId) {
        Alert.alert('Validation Error', 'Please select a supplier');
        return;
      }

      const newScorecard = {
        ...formData,
        evaluatedBy: user.id,
        evaluationDate: new Date().toISOString(),
      };

      await createVendorScorecard(token, newScorecard);
      setShowCreateModal(false);
      resetForm();
      loadData();
      Alert.alert('Success', 'Vendor scorecard created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create vendor scorecard');
      console.error('Error creating scorecard:', error);
    }
  };

  const loadTrends = async (supplierId) => {
    try {
      const trendsData = await fetchVendorPerformanceTrends(token, supplierId, 12);
      setTrends(trendsData);
      setShowTrendsModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load performance trends');
      console.error('Error loading trends:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      evaluationPeriod: new Date().toISOString().slice(0, 7),
      qualityScore: 85,
      deliveryScore: 90,
      serviceScore: 88,
      costScore: 82,
      qualityComments: '',
      deliveryComments: '',
      serviceComments: '',
      costComments: '',
      overallComments: '',
      actionItems: '',
    });
  };

  const filteredScorecards = scorecards.filter(scorecard => {
    const matchesSearch = scorecard.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scorecard.evaluationPeriod.includes(searchTerm);
    const matchesSupplier = selectedSupplierFilter === 'ALL' || scorecard.supplierId.toString() === selectedSupplierFilter;
    return matchesSearch && matchesSupplier;
  });

  const getScoreColor = (score) => {
    if (score >= 90) return '#10B981'; // Green
    if (score >= 80) return '#F59E0B'; // Yellow
    if (score >= 70) return '#EF4444'; // Red
    return '#DC2626'; // Dark Red
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Poor';
  };

  const ScoreCard = ({ title, score, color, comments }) => (
    <View style={[styles.scoreCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.scoreHeader}>
        <Text style={[styles.scoreTitle, { color: theme.colors.text }]}>{title}</Text>
        <View style={[styles.scoreBadge, { backgroundColor: color }]}>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>
      <Text style={[styles.scoreLabel, { color }]}>{getScoreLabel(score)}</Text>
      {comments && (
        <Text style={[styles.scoreComments, { color: theme.textSecondary }]} numberOfLines={2}>
          {comments}
        </Text>
      )}
    </View>
  );

  const ProgressBar = ({ score, color }) => (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <View 
          style={[
            styles.progressBarFill, 
            { width: `${score}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );

  const renderScorecardItem = ({ item }) => {
    const overallScore = Math.round((item.qualityScore + item.deliveryScore + item.serviceScore + item.costScore) / 4);
    const scoreColor = getScoreColor(overallScore);

    return (
      <TouchableOpacity
        style={[styles.scorecardCard, { backgroundColor: theme.cardBackground }]}
        onPress={() => navigation.navigate('VendorScorecardDetailScreen', { scorecardId: item.id })}
      >
        <View style={styles.scorecardHeader}>
          <View style={styles.supplierInfo}>
            <Text style={[styles.supplierName, { color: theme.colors.text }]}>
              {item.supplier?.name}
            </Text>
            <Text style={[styles.evaluationPeriod, { color: theme.textSecondary }]}>
              {item.evaluationPeriod}
            </Text>
          </View>
          <View style={styles.overallScoreContainer}>
            <View style={[styles.overallScoreBadge, { backgroundColor: scoreColor }]}>
              <Text style={styles.overallScoreText}>{overallScore}</Text>
            </View>
            <Text style={[styles.overallScoreLabel, { color: scoreColor }]}>
              {getScoreLabel(overallScore)}
            </Text>
          </View>
        </View>

        <View style={styles.scoresGrid}>
          <View style={styles.scoreItem}>
            <Text style={[styles.scoreItemLabel, { color: theme.textSecondary }]}>Quality</Text>
            <View style={styles.scoreItemContainer}>
              <Text style={[styles.scoreItemValue, { color: theme.colors.text }]}>{item.qualityScore}</Text>
              <ProgressBar score={item.qualityScore} color={getScoreColor(item.qualityScore)} />
            </View>
          </View>
          
          <View style={styles.scoreItem}>
            <Text style={[styles.scoreItemLabel, { color: theme.textSecondary }]}>Delivery</Text>
            <View style={styles.scoreItemContainer}>
              <Text style={[styles.scoreItemValue, { color: theme.colors.text }]}>{item.deliveryScore}</Text>
              <ProgressBar score={item.deliveryScore} color={getScoreColor(item.deliveryScore)} />
            </View>
          </View>

          <View style={styles.scoreItem}>
            <Text style={[styles.scoreItemLabel, { color: theme.textSecondary }]}>Service</Text>
            <View style={styles.scoreItemContainer}>
              <Text style={[styles.scoreItemValue, { color: theme.colors.text }]}>{item.serviceScore}</Text>
              <ProgressBar score={item.serviceScore} color={getScoreColor(item.serviceScore)} />
            </View>
          </View>

          <View style={styles.scoreItem}>
            <Text style={[styles.scoreItemLabel, { color: theme.textSecondary }]}>Cost</Text>
            <View style={styles.scoreItemContainer}>
              <Text style={[styles.scoreItemValue, { color: theme.colors.text }]}>{item.costScore}</Text>
              <ProgressBar score={item.costScore} color={getScoreColor(item.costScore)} />
            </View>
          </View>
        </View>

        <View style={styles.scorecardFooter}>
          <View style={styles.evaluatorInfo}>
            <MaterialCommunityIcons name="account" size={16} color={theme.textSecondary} />
            <Text style={[styles.evaluatorText, { color: theme.textSecondary }]}>
              {item.evaluatedBy?.name || 'Unknown'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.trendsButton}
            onPress={() => {
              setSelectedSupplier(item.supplier);
              loadTrends(item.supplierId);
            }}
          >
            <MaterialCommunityIcons name="chart-line" size={16} color={theme.colors.primary} />
            <Text style={[styles.trendsButtonText, { color: theme.colors.primary }]}>Trends</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTopPerformer = ({ item, index }) => (
    <View style={[styles.topPerformerCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>
      <View style={styles.performerInfo}>
        <Text style={[styles.performerName, { color: theme.colors.text }]}>{item.name}</Text>
        <Text style={[styles.performerScore, { color: getScoreColor(item.performanceScore) }]}>
          {item.performanceScore?.toFixed(1) || 'N/A'}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <InternalHeader navigation={navigation} title="Vendor Scorecards" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading scorecards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InternalHeader
        navigation={navigation}
        title="Vendor Scorecards"
        rightIcons={[
          {
            icon: "plus",
            onPress: () => setShowCreateModal(true),
            color: "#10B981"
          },
          {
            icon: "view-dashboard",
            onPress: () => navigation.navigate('ProcurementAnalytics'),
            color: "#3B82F6"
          }
        ]}
      />

      {/* Top Performers Section */}
      {topPerformers.length > 0 && (
        <View style={styles.topPerformersSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Top Performers</Text>
          <FlatList
            data={topPerformers.slice(0, 5)}
            renderItem={renderTopPerformer}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.topPerformersList}
          />
        </View>
      )}

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
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedSupplierFilter === 'ALL' && { backgroundColor: theme.colors.primary }
            ]}
            onPress={() => setSelectedSupplierFilter('ALL')}
          >
            <Text style={[
              styles.filterChipText,
              selectedSupplierFilter === 'ALL' && { color: '#fff' }
            ]}>
              All Suppliers
            </Text>
          </TouchableOpacity>
          {suppliers.slice(0, 5).map(supplier => (
            <TouchableOpacity
              key={supplier.id}
              style={[
                styles.filterChip,
                selectedSupplierFilter === supplier.id.toString() && { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => setSelectedSupplierFilter(supplier.id.toString())}
            >
              <Text style={[
                styles.filterChipText,
                selectedSupplierFilter === supplier.id.toString() && { color: '#fff' }
              ]}>
                {supplier.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Scorecards List */}
      <FlatList
        data={filteredScorecards}
        renderItem={renderScorecardItem}
        keyExtractor={item => item.id.toString()}
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chart-box-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No vendor scorecards found
            </Text>
          </View>
        }
      />

      {/* Create Scorecard Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Create Scorecard</Text>
            <TouchableOpacity onPress={handleCreateScorecard}>
              <Text style={[styles.saveButton, { color: theme.colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Basic Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Supplier *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.supplierContainer}>
                  {suppliers.map(supplier => (
                    <TouchableOpacity
                      key={supplier.id}
                      style={[
                        styles.supplierOption,
                        formData.supplierId === supplier.id.toString() && { backgroundColor: theme.colors.primary }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, supplierId: supplier.id.toString() }))}
                    >
                      <Text style={[
                        styles.supplierText,
                        formData.supplierId === supplier.id.toString() && { color: '#fff' }
                      ]}>
                        {supplier.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Evaluation Period (YYYY-MM) *</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.evaluationPeriod}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, evaluationPeriod: text }))}
                  placeholder="2024-01"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>

            {/* Scoring */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Performance Scores (0-100)</Text>
              
              {/* Quality Score */}
              <View style={styles.scoreInputContainer}>
                <Text style={[styles.scoreInputLabel, { color: theme.colors.text }]}>
                  Quality Score: {formData.qualityScore}
                </Text>
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderTrack}>
                    <View 
                      style={[
                        styles.sliderFill, 
                        { 
                          width: `${formData.qualityScore}%`,
                          backgroundColor: getScoreColor(formData.qualityScore)
                        }
                      ]} 
                    />
                  </View>
                  <View style={styles.sliderButtons}>
                    <TouchableOpacity 
                      onPress={() => setFormData(prev => ({ ...prev, qualityScore: Math.max(0, prev.qualityScore - 5) }))}
                      style={styles.sliderButton}
                    >
                      <MaterialCommunityIcons name="minus" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setFormData(prev => ({ ...prev, qualityScore: Math.min(100, prev.qualityScore + 5) }))}
                      style={styles.sliderButton}
                    >
                      <MaterialCommunityIcons name="plus" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <TextInput
                  style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.qualityComments}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, qualityComments: text }))}
                  placeholder="Quality comments..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Delivery Score */}
              <View style={styles.scoreInputContainer}>
                <Text style={[styles.scoreInputLabel, { color: theme.colors.text }]}>
                  Delivery Score: {formData.deliveryScore}
                </Text>
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderTrack}>
                    <View 
                      style={[
                        styles.sliderFill, 
                        { 
                          width: `${formData.deliveryScore}%`,
                          backgroundColor: getScoreColor(formData.deliveryScore)
                        }
                      ]} 
                    />
                  </View>
                  <View style={styles.sliderButtons}>
                    <TouchableOpacity 
                      onPress={() => setFormData(prev => ({ ...prev, deliveryScore: Math.max(0, prev.deliveryScore - 5) }))}
                      style={styles.sliderButton}
                    >
                      <MaterialCommunityIcons name="minus" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setFormData(prev => ({ ...prev, deliveryScore: Math.min(100, prev.deliveryScore + 5) }))}
                      style={styles.sliderButton}
                    >
                      <MaterialCommunityIcons name="plus" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <TextInput
                  style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.deliveryComments}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, deliveryComments: text }))}
                  placeholder="Delivery comments..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Service Score */}
              <View style={styles.scoreInputContainer}>
                <Text style={[styles.scoreInputLabel, { color: theme.colors.text }]}>
                  Service Score: {formData.serviceScore}
                </Text>
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderTrack}>
                    <View 
                      style={[
                        styles.sliderFill, 
                        { 
                          width: `${formData.serviceScore}%`,
                          backgroundColor: getScoreColor(formData.serviceScore)
                        }
                      ]} 
                    />
                  </View>
                  <View style={styles.sliderButtons}>
                    <TouchableOpacity 
                      onPress={() => setFormData(prev => ({ ...prev, serviceScore: Math.max(0, prev.serviceScore - 5) }))}
                      style={styles.sliderButton}
                    >
                      <MaterialCommunityIcons name="minus" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setFormData(prev => ({ ...prev, serviceScore: Math.min(100, prev.serviceScore + 5) }))}
                      style={styles.sliderButton}
                    >
                      <MaterialCommunityIcons name="plus" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <TextInput
                  style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.serviceComments}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, serviceComments: text }))}
                  placeholder="Service comments..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Cost Score */}
              <View style={styles.scoreInputContainer}>
                <Text style={[styles.scoreInputLabel, { color: theme.colors.text }]}>
                  Cost Score: {formData.costScore}
                </Text>
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderTrack}>
                    <View 
                      style={[
                        styles.sliderFill, 
                        { 
                          width: `${formData.costScore}%`,
                          backgroundColor: getScoreColor(formData.costScore)
                        }
                      ]} 
                    />
                  </View>
                  <View style={styles.sliderButtons}>
                    <TouchableOpacity 
                      onPress={() => setFormData(prev => ({ ...prev, costScore: Math.max(0, prev.costScore - 5) }))}
                      style={styles.sliderButton}
                    >
                      <MaterialCommunityIcons name="minus" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setFormData(prev => ({ ...prev, costScore: Math.min(100, prev.costScore + 5) }))}
                      style={styles.sliderButton}
                    >
                      <MaterialCommunityIcons name="plus" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <TextInput
                  style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.costComments}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, costComments: text }))}
                  placeholder="Cost comments..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>

            {/* Overall Summary */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Overall Summary</Text>
              
              {/* Overall Score Display */}
              <View style={styles.overallScoreDisplay}>
                <Text style={[styles.overallScoreLabel, { color: theme.textSecondary }]}>Overall Score</Text>
                <View style={[
                  styles.overallScoreBadge,
                  { backgroundColor: getScoreColor(Math.round((formData.qualityScore + formData.deliveryScore + formData.serviceScore + formData.costScore) / 4)) }
                ]}>
                  <Text style={styles.overallScoreText}>
                    {Math.round((formData.qualityScore + formData.deliveryScore + formData.serviceScore + formData.costScore) / 4)}
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Overall Comments</Text>
                <TextInput
                  style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.overallComments}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, overallComments: text }))}
                  placeholder="Overall evaluation comments..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Action Items</Text>
                <TextInput
                  style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={formData.actionItems}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, actionItems: text }))}
                  placeholder="Recommended action items and improvements..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Trends Modal */}
      <Modal
        visible={showTrendsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTrendsModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {selectedSupplier?.name} - Performance Trends
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>12-Month Performance Trends</Text>
              
              {trends.map((trend, index) => (
                <View key={index} style={[styles.trendCard, { backgroundColor: theme.cardBackground }]}>
                  <Text style={[styles.trendPeriod, { color: theme.colors.text }]}>{trend.period}</Text>
                  <View style={styles.trendScores}>
                    <ScoreCard title="Quality" score={trend.qualityScore} color={getScoreColor(trend.qualityScore)} />
                    <ScoreCard title="Delivery" score={trend.deliveryScore} color={getScoreColor(trend.deliveryScore)} />
                    <ScoreCard title="Service" score={trend.serviceScore} color={getScoreColor(trend.serviceScore)} />
                    <ScoreCard title="Cost" score={trend.costScore} color={getScoreColor(trend.costScore)} />
                  </View>
                </View>
              ))}
              
              {trends.length === 0 && (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="chart-line" size={48} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No trend data available
                  </Text>
                </View>
              )}
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
  topPerformersSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  topPerformersList: {
    flexDirection: 'row',
  },
  topPerformerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 150,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  performerScore: {
    fontSize: 12,
    fontWeight: 'bold',
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
  scorecardCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scorecardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  evaluationPeriod: {
    fontSize: 14,
  },
  overallScoreContainer: {
    alignItems: 'center',
  },
  overallScoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  overallScoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overallScoreLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scoreItem: {
    width: '48%',
    marginBottom: 12,
  },
  scoreItemLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  scoreItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreItemValue: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 30,
  },
  progressBarContainer: {
    flex: 1,
    marginLeft: 8,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  scorecardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  evaluatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  evaluatorText: {
    marginLeft: 4,
    fontSize: 12,
  },
  trendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendsButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
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
    flex: 1,
    textAlign: 'center',
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
  supplierContainer: {
    flexDirection: 'row',
  },
  supplierOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  supplierText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  scoreInputContainer: {
    marginBottom: 20,
  },
  scoreInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sliderContainer: {
    marginBottom: 12,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  sliderFill: {
    height: 8,
    borderRadius: 4,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  overallScoreDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 16,
  },
  scoreCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: '48%',
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  scoreComments: {
    fontSize: 10,
  },
  trendCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  trendPeriod: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  trendScores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
}); 