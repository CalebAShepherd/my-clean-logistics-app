import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getCurrentUser } from '../api/users';
import { fetchDamageReports } from '../api/damageReports';
import InternalHeader from '../components/InternalHeader';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

// Custom styled button
const CustomButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

function DamageReportsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [warehouseId, setWarehouseId] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser(userToken);
        if (user.warehouseId) {
          setWarehouseId(user.warehouseId);
          const data = await fetchDamageReports(userToken, { warehouseId: user.warehouseId });
          setReports(data);
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Export CSV using FileSystem and Sharing to include auth header
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (warehouseId) params.append('warehouseId', warehouseId);
      const now = Date.now();
      const fileUri = FileSystem.documentDirectory + `incidents-${now}.csv`;
      const downloadRes = await FileSystem.downloadAsync(
        `${API_URL}/damage-reports/export?${params.toString()}`,
        fileUri,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      await Sharing.shareAsync(downloadRes.uri);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      Alert.alert('Error', 'Failed to export CSV');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.InventoryItem.name} ({item.InventoryItem.sku})</Text>
      <Text style={styles.cardMeta}>{new Date(item.reportedAt).toLocaleDateString()} - {item.type}</Text>
      <Text>Qty: {item.quantity}</Text>
      {item.reasonCode ? <Text>Reason: {item.reasonCode}</Text> : null}
      {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
    </View>
  );

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Incident Reports" />
      <View style={styles.actions}>
        <CustomButton title="Log Incident" onPress={() => navigation.navigate('Log Incident')} />
        <CustomButton title="Export CSV" onPress={handleExport} />
      </View>
      {reports.length === 0 ? (
        <View style={styles.empty}><Text>No incidents logged.</Text></View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
  button: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  cardMeta: { fontSize: 12, color: '#666', marginVertical: 4 },
  desc: { marginTop: 4, fontStyle: 'italic', color: '#555' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default DamageReportsScreen; 