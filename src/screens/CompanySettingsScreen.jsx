import React, { useEffect, useState, useContext } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { View, Text, Switch, TextInput, Button, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import InternalHeader from '../components/InternalHeader';

const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.0.73:3000';

export default function CompanySettingsScreen({ navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const { settings: contextSettings, updateSettings } = useSettings();
  const [settings, setSettings] = useState(contextSettings);

  // sync local state when contextSettings load
  useEffect(() => {
    if (contextSettings) setSettings(contextSettings);
  }, [contextSettings]);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setSettings({ ...settings, logoUrl: result.assets[0].uri });
    }
  };
  const saveSettings = async () => {
    try {
      await updateSettings(settings);
      Alert.alert('Success', 'Settings saved');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };
  if (!settings) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Loading settings...</Text>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Company Settings" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.label}>Company Name</Text>
        <TextInput
          style={styles.input}
          value={settings.companyName || ''}
          onChangeText={text => setSettings({ ...settings, companyName: text })}
        />

        <Text style={styles.label}>Logo</Text>
        {settings.logoUrl ? (
          <Image source={{ uri: settings.logoUrl }} style={styles.logo} />
        ) : null}
        <Button title="Change Logo" onPress={pickLogo} />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Warehouses</Text>
          <Switch
            value={settings.hasWarehouses}
            onValueChange={val => setSettings({ ...settings, hasWarehouses: val })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Own Transporters</Text>
          <Switch
            value={settings.ownTransporters}
            onValueChange={val => setSettings({ ...settings, ownTransporters: val })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Third-Party Carriers</Text>
          <Switch
            value={settings.useThirdPartyCarriers}
            onValueChange={val => setSettings({ ...settings, useThirdPartyCarriers: val })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Manual Tracking Entry</Text>
          <Switch
            value={settings.enableTrackingInput}
            onValueChange={val => setSettings({ ...settings, enableTrackingInput: val })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Address Validation</Text>
          <Switch
            value={settings.enableAddressValidation}
            onValueChange={val => setSettings({ ...settings, enableAddressValidation: val })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Rate Quotes</Text>
          <Switch
            value={settings.enableRateQuotes}
            onValueChange={val => setSettings({ ...settings, enableRateQuotes: val })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Pickup Scheduling</Text>
          <Switch
            value={settings.enablePickups}
            onValueChange={val => setSettings({ ...settings, enablePickups: val })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Notifications</Text>
          <Switch
            value={settings.enableNotifications}
            onValueChange={val => setSettings({ ...settings, enableNotifications: val })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Warehouse Heatmap</Text>
          <Switch
            value={settings.enableWarehouseHeatmap}
            onValueChange={val => setSettings({ ...settings, enableWarehouseHeatmap: val })}
          />
        </View>

        {/* Google API Key */}
        <Text style={styles.label}>Google API Key</Text>
        <TextInput
          style={styles.input}
          value={settings.googleApiKey || ''}
          onChangeText={text => setSettings({ ...settings, googleApiKey: text })}
          placeholder="Enter Google API Key"
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Use Google Route Optimization</Text>
          <Switch
            value={settings.useGoogleRouteOptimization}
            onValueChange={val => setSettings({ ...settings, useGoogleRouteOptimization: val })}
          />
        </View>

        <Button title="Save Settings" onPress={saveSettings} />
        <View style={{ marginVertical: 8 }}>
          <Button title="Customize Theme" onPress={() => navigation.navigate('White Label Theme')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 16, marginTop: 12, marginHorizontal: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginTop: 4, borderRadius: 4, marginHorizontal: 16 },
  logo: { width: 100, height: 100, marginVertical: 8 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 16
  },
  switchLabel: { fontSize: 16 },
});