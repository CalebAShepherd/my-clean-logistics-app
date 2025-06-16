import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import InternalHeader from '../components/InternalHeader';
import { useSettings } from '../context/SettingsContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const PRESET_COLORS = [
  { name: 'Ocean Blue', primary: '#007AFF', secondary: '#FFFFFF', accent: '#34C759' },
  { name: 'Sunset Orange', primary: '#FF9500', secondary: '#FFFFFF', accent: '#007AFF' },
  { name: 'Forest Green', primary: '#34C759', secondary: '#FFFFFF', accent: '#FF9500' },
  { name: 'Royal Purple', primary: '#AF52DE', secondary: '#FFFFFF', accent: '#FFD60A' },
  { name: 'Cherry Red', primary: '#FF3B30', secondary: '#FFFFFF', accent: '#34C759' },
  { name: 'Midnight', primary: '#1C1C1E', secondary: '#FFFFFF', accent: '#007AFF' },
];

export default function WhiteLabelThemeScreen({ navigation }) {
  const { settings, updateSettings } = useSettings();
  const [themeSettings, setThemeSettings] = useState({
    primaryColor: '#007AFF',
    secondaryColor: '#FFFFFF',
    accentColor: '#FFAA00',
    customDomain: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (settings) {
      setThemeSettings({
        primaryColor: settings.primaryColor || '#007AFF',
        secondaryColor: settings.secondaryColor || '#FFFFFF',
        accentColor: settings.accentColor || '#FFAA00',
        customDomain: settings.customDomain || '',
      });
    }
  }, [settings]);

  const validateHexColor = (color) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  };

  const validateDomain = (domain) => {
    if (!domain) return true; // Optional field
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return domainRegex.test(domain);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!validateHexColor(themeSettings.primaryColor)) {
      newErrors.primaryColor = 'Please enter a valid hex color (e.g., #007AFF)';
    }
    
    if (!validateHexColor(themeSettings.secondaryColor)) {
      newErrors.secondaryColor = 'Please enter a valid hex color (e.g., #FFFFFF)';
    }
    
    if (!validateHexColor(themeSettings.accentColor)) {
      newErrors.accentColor = 'Please enter a valid hex color (e.g., #FFAA00)';
    }
    
    if (!validateDomain(themeSettings.customDomain)) {
      newErrors.customDomain = 'Please enter a valid domain (e.g., mycompany.com)';
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

  const updateThemeSetting = (key, value) => {
    setThemeSettings(prev => ({ ...prev, [key]: value }));
    clearError(key);
  };

  const applyPreset = (preset) => {
    setThemeSettings(prev => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    }));
    // Clear color-related errors
    ['primaryColor', 'secondaryColor', 'accentColor'].forEach(clearError);
  };

  const saveTheme = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors below before saving.');
      return;
    }

    setSaving(true);
    try {
      const newSettings = { ...settings, ...themeSettings };
      await updateSettings(newSettings);
      Alert.alert('Success', 'Theme settings saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving theme:', error);
      Alert.alert('Error', 'Failed to save theme settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderColorCard = (title, key, description, icon) => (
    <View style={styles.colorCard}>
      <View style={styles.colorCardHeader}>
        <View style={styles.colorCardInfo}>
          <MaterialCommunityIcons name={icon} size={20} color="#007AFF" />
          <Text style={styles.colorCardTitle}>{title}</Text>
        </View>
        <View style={[styles.colorPreview, { backgroundColor: themeSettings[key] }]} />
      </View>
      <Text style={styles.colorCardDescription}>{description}</Text>
      <TextInput
        style={[
          styles.colorInput,
          errors[key] && styles.inputError
        ]}
        value={themeSettings[key]}
        onChangeText={(text) => updateThemeSetting(key, text)}
        placeholder="#007AFF"
        placeholderTextColor="#8E8E93"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {errors[key] && (
        <Text style={styles.errorText}>{errors[key]}</Text>
      )}
    </View>
  );

  const renderPresetCard = (preset, index) => (
    <TouchableOpacity
      key={index}
      style={styles.presetCard}
      onPress={() => applyPreset(preset)}
      activeOpacity={0.7}
    >
      <View style={styles.presetColors}>
        <View style={[styles.presetColorCircle, { backgroundColor: preset.primary }]} />
        <View style={[styles.presetColorCircle, { backgroundColor: preset.secondary, borderWidth: 1, borderColor: '#E5E5EA' }]} />
        <View style={[styles.presetColorCircle, { backgroundColor: preset.accent }]} />
      </View>
      <Text style={styles.presetName}>{preset.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="White Label Theme" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Visual Header */}
          <View style={styles.visualHeader}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="palette" size={48} color="#007AFF" />
            </View>
            <Text style={styles.headerTitle}>Brand Customization</Text>
            <Text style={styles.headerSubtitle}>
              Customize colors and branding to match your company
            </Text>
          </View>

          {/* Live Preview Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Live Preview</Text>
            <Text style={styles.cardSubtitle}>
              See how your theme will look in the app
            </Text>
            
            <View style={styles.previewContainer}>
              <View style={[styles.previewHeader, { backgroundColor: themeSettings.primaryColor }]}>
                <MaterialCommunityIcons name="menu" size={20} color={themeSettings.secondaryColor} />
                <Text style={[styles.previewHeaderTitle, { color: themeSettings.secondaryColor }]}>
                  Your App
                </Text>
                <MaterialCommunityIcons name="bell" size={20} color={themeSettings.secondaryColor} />
              </View>
              
              <View style={styles.previewContent}>
                <View style={[styles.previewButton, { backgroundColor: themeSettings.primaryColor }]}>
                  <Text style={[styles.previewButtonText, { color: themeSettings.secondaryColor }]}>
                    Primary Button
                  </Text>
                </View>
                
                <View style={styles.previewCard}>
                  <View style={styles.previewCardHeader}>
                    <Text style={styles.previewCardTitle}>Sample Card</Text>
                    <View style={[styles.previewAccent, { backgroundColor: themeSettings.accentColor }]} />
                  </View>
                  <Text style={styles.previewCardText}>
                    This is how cards will appear with your theme
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Color Presets */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Presets</Text>
            <Text style={styles.cardSubtitle}>
              Choose from pre-designed color combinations
            </Text>
            
            <View style={styles.presetsGrid}>
              {PRESET_COLORS.map(renderPresetCard)}
            </View>
          </View>

          {/* Color Customization */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Custom Colors</Text>
            <Text style={styles.cardSubtitle}>
              Fine-tune your brand colors with hex codes
            </Text>
            
            {renderColorCard(
              'Primary Color',
              'primaryColor',
              'Main brand color for headers, buttons, and key elements',
              'format-color-fill'
            )}
            
            {renderColorCard(
              'Secondary Color',
              'secondaryColor',
              'Background and text color for contrast',
              'format-color-text'
            )}
            
            {renderColorCard(
              'Accent Color',
              'accentColor',
              'Highlights, badges, and call-to-action elements',
              'star'
            )}
          </View>

          {/* Domain Settings */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Domain Settings</Text>
            <Text style={styles.cardSubtitle}>
              Configure your custom domain (optional)
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Custom Domain</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.customDomain && styles.inputError
                ]}
                value={themeSettings.customDomain}
                onChangeText={(text) => updateThemeSetting('customDomain', text)}
                placeholder="mycompany.com"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
                keyboardType="url"
                autoCorrect={false}
              />
              {errors.customDomain && (
                <Text style={styles.errorText}>{errors.customDomain}</Text>
              )}
              <Text style={styles.fieldHint}>
                Enter your domain without https:// or www.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity 
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={saveTheme}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={saving ? ['#C7C7CC', '#C7C7CC'] : [themeSettings.primaryColor, themeSettings.primaryColor + '99']}
              style={styles.submitGradient}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save" size={20} color="#FFFFFF" />
                  <Text style={styles.submitText}>Save Theme</Text>
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
    paddingBottom: 120,
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

  // Live Preview
  previewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  previewHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewContent: {
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  previewButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  previewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  previewAccent: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  previewCardText: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },

  // Presets
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  presetCard: {
    width: '48%',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  presetColors: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: -8,
  },
  presetColorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    textAlign: 'center',
  },

  // Color Cards
  colorCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  colorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  colorCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  colorCardDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 12,
    lineHeight: 18,
  },
  colorInput: {
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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

  // Submit Button
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
}); 