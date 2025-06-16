import React, { useEffect, useState, useContext } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { fetchSKUAttributes, updateSKUAttribute, deleteSKUAttribute } from '../api/skuAttributes';
import InternalHeader from '../components/InternalHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ATTRIBUTE_TYPES = [
  {
    id: 'STRING',
    label: 'Text',
    icon: 'format-text',
    description: 'Letters, numbers, and symbols',
    color: '#007AFF',
    lightColor: '#EAF4FF'
  },
  {
    id: 'NUMBER',
    label: 'Number',
    icon: 'numeric',
    description: 'Whole numbers and decimals',
    color: '#34C759',
    lightColor: '#E8F8EA'
  },
  {
    id: 'BOOLEAN',
    label: 'Yes/No',
    icon: 'toggle-switch',
    description: 'True or false values',
    color: '#FF9500',
    lightColor: '#FFF3E8'
  },
  {
    id: 'DATE',
    label: 'Date',
    icon: 'calendar',
    description: 'Date and time values',
    color: '#AF52DE',
    lightColor: '#F3EAFF'
  }
];

function EditSKUAttributeScreen({ route, navigation }) {
  const { id } = route.params;
  const { userToken } = useContext(AuthContext);
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('STRING');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadAttributeData();
  }, [id]);

  const loadAttributeData = async () => {
    setLoading(true);
    try {
      const data = await fetchSKUAttributes(userToken);
      const attribute = data.find((a) => a.id === id);
      if (!attribute) {
        throw new Error('Attribute not found');
      }
      setKey(attribute.key || '');
      setLabel(attribute.label || '');
      setType(attribute.type || 'STRING');
    } catch (error) {
      console.error('Error loading attribute:', error);
      Alert.alert('Error', 'Failed to load attribute information', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!key.trim()) {
      newErrors.key = 'Key is required';
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key.trim())) {
      newErrors.key = 'Key must start with a letter and contain only letters, numbers, and underscores';
    }
    
    if (!label.trim()) {
      newErrors.label = 'Label is required';
    }
    
    if (!type) {
      newErrors.type = 'Type is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const onSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors below before saving.');
      return;
    }

    setSaving(true);
    try {
      await updateSKUAttribute(userToken, id, { 
        key: key.trim(), 
        label: label.trim(), 
        type 
      });
      Alert.alert('Success', 'Attribute updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error updating attribute:', error);
      Alert.alert('Error', error.message || 'Failed to update attribute');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert(
      'Delete Attribute',
      'Are you sure you want to delete this attribute? This action cannot be undone and will remove all associated values.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]
    );
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteSKUAttribute(userToken, id);
      Alert.alert('Success', 'Attribute deleted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error deleting attribute:', error);
      Alert.alert('Error', error.message || 'Failed to delete attribute');
    } finally {
      setDeleting(false);
    }
  };

  const renderTypeCard = (typeOption) => {
    const isSelected = type === typeOption.id;
    
    return (
      <TouchableOpacity
        key={typeOption.id}
        style={[
          styles.typeCard,
          isSelected && styles.typeCardSelected,
          { borderColor: isSelected ? typeOption.color : '#E5E5EA' }
        ]}
        onPress={() => {
          setType(typeOption.id);
          clearError('type');
        }}
        activeOpacity={0.7}
      >
        <View style={[
          styles.typeIconContainer,
          { backgroundColor: isSelected ? typeOption.color : typeOption.lightColor }
        ]}>
          <MaterialCommunityIcons 
            name={typeOption.icon} 
            size={24} 
            color={isSelected ? '#FFFFFF' : typeOption.color} 
          />
        </View>
        <Text style={[
          styles.typeLabel,
          isSelected && { color: typeOption.color }
        ]}>
          {typeOption.label}
        </Text>
        <Text style={[
          styles.typeDescription,
          isSelected && { color: typeOption.color, opacity: 0.8 }
        ]}>
          {typeOption.description}
        </Text>
        {isSelected && (
          <View style={[styles.typeSelectedIndicator, { backgroundColor: typeOption.color }]}>
            <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Loading..." />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading attribute information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Edit SKU Attribute" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Visual Header Section */}
          <View style={styles.visualHeader}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="tag-edit" size={48} color="#007AFF" />
            </View>
            <Text style={styles.headerTitle}>Edit SKU Attribute</Text>
            <Text style={styles.headerSubtitle}>
              Modify attribute settings for your product catalog
            </Text>
          </View>

          {/* Basic Information Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic Information</Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                Attribute Key <Text style={styles.required}>*</Text>
              </Text>
              <TextInput 
                style={[
                  styles.input,
                  errors.key && styles.inputError
                ]} 
                value={key} 
                onChangeText={(text) => {
                  setKey(text);
                  clearError('key');
                }}
                placeholder="e.g., product_weight, item_color"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect={false}
              />
              {errors.key && (
                <Text style={styles.errorText}>{errors.key}</Text>
              )}
              <Text style={styles.fieldHint}>
                Used internally for system identification
              </Text>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                Display Label <Text style={styles.required}>*</Text>
              </Text>
              <TextInput 
                style={[
                  styles.input,
                  errors.label && styles.inputError
                ]} 
                value={label} 
                onChangeText={(text) => {
                  setLabel(text);
                  clearError('label');
                }}
                placeholder="e.g., Product Weight, Item Color"
                placeholderTextColor="#8E8E93"
                autoCapitalize="words"
              />
              {errors.label && (
                <Text style={styles.errorText}>{errors.label}</Text>
              )}
              <Text style={styles.fieldHint}>
                Shown to users in forms and displays
              </Text>
            </View>
          </View>

          {/* Attribute Type Selection Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Attribute Type <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.cardSubtitle}>
              Choose the data type for this attribute
            </Text>
            
            <View style={styles.typesGrid}>
              {ATTRIBUTE_TYPES.map(renderTypeCard)}
            </View>
            
            {errors.type && (
              <Text style={styles.errorText}>{errors.type}</Text>
            )}
          </View>

          {/* Warning Card */}
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons name="alert" size={20} color="#FF9500" />
              <Text style={styles.warningTitle}>Important</Text>
            </View>
            <Text style={styles.warningText}>
              Changing the attribute type may affect existing data. Ensure compatibility before saving changes.
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={onSave}
            disabled={saving || deleting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={saving ? ['#C7C7CC', '#C7C7CC'] : ['#007AFF', '#0056CC']}
              style={styles.saveGradient}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save" size={20} color="#FFFFFF" />
                  <Text style={styles.saveText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
            onPress={onDelete}
            disabled={saving || deleting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={deleting ? ['#C7C7CC', '#C7C7CC'] : ['#FF3B30', '#D70015']}
              style={styles.deleteGradient}
            >
              {deleting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="delete" size={20} color="#FFFFFF" />
                  <Text style={styles.deleteText}>Delete Attribute</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F2F2F7' 
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: { 
    padding: 16,
    paddingBottom: 160,
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

  // Visual Header
  visualHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
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

  // Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    lineHeight: 20,
  },

  // Form Fields
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: { 
    fontSize: 16,
    color: '#1C1C1E', 
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: { 
    borderWidth: 1.5, 
    borderColor: '#E5E5EA', 
    borderRadius: 12, 
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#1C1C1E',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  fieldHint: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 6,
    lineHeight: 18,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 6,
    lineHeight: 18,
  },

  // Type Selection
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  typeCard: {
    width: '48%',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    position: 'relative',
  },
  typeCardSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  typeSelectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Warning Card
  warningCard: {
    backgroundColor: '#FFF8E8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },

  // Action Buttons
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  deleteButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  deleteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default EditSKUAttributeScreen; 