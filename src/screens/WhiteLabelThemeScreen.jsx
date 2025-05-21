import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import InternalHeader from '../components/InternalHeader';
import { useSettings } from '../context/SettingsContext';

export default function WhiteLabelThemeScreen({ navigation }) {
  const { settings, updateSettings } = useSettings();
  const [themeSettings, setThemeSettings] = useState({
    primaryColor: '#007AFF',
    secondaryColor: '#FFFFFF',
    accentColor: '#FFAA00',
    customDomain: '',
  });

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

  const saveTheme = async () => {
    try {
      const newSettings = { ...settings, ...themeSettings };
      await updateSettings(newSettings);
      Alert.alert('Success', 'Theme settings saved');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="White Label Theme" />
      <Text style={styles.label}>Primary Color (HEX)</Text>
      <TextInput
        style={styles.input}
        value={themeSettings.primaryColor}
        onChangeText={(text) => setThemeSettings({ ...themeSettings, primaryColor: text })}
      />
      <Text style={styles.label}>Secondary Color (HEX)</Text>
      <TextInput
        style={styles.input}
        value={themeSettings.secondaryColor}
        onChangeText={(text) => setThemeSettings({ ...themeSettings, secondaryColor: text })}
      />
      <Text style={styles.label}>Accent Color (HEX)</Text>
      <TextInput
        style={styles.input}
        value={themeSettings.accentColor}
        onChangeText={(text) => setThemeSettings({ ...themeSettings, accentColor: text })}
      />
      <Text style={styles.label}>Custom Domain</Text>
      <TextInput
        style={styles.input}
        value={themeSettings.customDomain}
        onChangeText={(text) => setThemeSettings({ ...themeSettings, customDomain: text })}
      />
      <View style={styles.buttonContainer}>
        <Button title="Save Theme" onPress={saveTheme} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontSize: 16, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 24,
  },
}); 