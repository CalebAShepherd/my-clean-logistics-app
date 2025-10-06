import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { workerSyncApi } from '../api/workerTasks';
import { optimizerApi } from '../api/optimizer';

export default function WarehouseManagerDashboardScreen() {
  const nav = useNavigation();
  const [health, setHealth] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, t] = await Promise.all([
        workerSyncApi.health().catch(() => ({ ok: false })),
        workerSyncApi.fetchTasks().catch(() => ([])),
      ]);
      setHealth(h);
      setTasks(Array.isArray(t) ? t : t?.tasks || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSyncWorkers = async () => {
    setSyncing(true);
    try {
      await workerSyncApi.syncWorkers();
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const onPlanDockYard = async () => {
    // Navigate to DockManagement which can call optimizerApi.planDockYard within that screen
    nav.navigate('DockManagement');
  };

  const onOpenSlotting = () => nav.navigate('SlottingOptimizationScreen');
  const onOpenForecast = () => nav.navigate('BudgetingForecastingScreen');

  const renderTask = ({ item }) => (
    <View style={styles.taskCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.taskTitle}>{item.title || `${item.type || 'TASK'} ${item.task_id || ''}`}</Text>
        <Text style={styles.meta}>Type: {item.type || item.category || 'N/A'}</Text>
        {item.location ? <Text style={styles.meta}>Location: {item.location}</Text> : null}
        {item.priority ? <Text style={styles.meta}>Priority: {item.priority}</Text> : null}
        {item.eta_minutes ? <Text style={styles.meta}>ETA: {item.eta_minutes} min</Text> : null}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={async () => {
          await workerSyncApi.acceptTask(item.id || item.task_id, item.assigneeId || item.worker_id || 'manager');
          await load();
        }}>
          <Text style={styles.btnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={async () => {
          await workerSyncApi.completeTask(item.id || item.task_id, item.assigneeId || item.worker_id || 'manager');
          await load();
        }}>
          <Text style={[styles.btnText, styles.secondaryText]}>Complete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Warehouse Manager</Text>
        <Text style={styles.subtitle}>Optimizer-driven operations</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Optimizer</Text>
          <Text style={styles.meta}>Status: {health?.ok ? 'Online' : 'Unknown'}</Text>
          <TouchableOpacity style={styles.btn} onPress={load}>
            <Text style={styles.btnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sync</Text>
          <Text style={styles.meta}>Push worker profiles</Text>
          <TouchableOpacity style={[styles.btn, syncing && { opacity: 0.6 }]} disabled={syncing} onPress={onSyncWorkers}>
            <Text style={styles.btnText}>{syncing ? 'Syncing…' : 'Sync Workers'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.cardWide}>
          <Text style={styles.cardTitle}>Dock/Yard</Text>
          <Text style={styles.meta}>Plan doors, schedule dynamically</Text>
          <TouchableOpacity style={styles.btn} onPress={onPlanDockYard}>
            <Text style={styles.btnText}>Open Dock Management</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.cardHalf}>
          <Text style={styles.cardTitle}>Slotting</Text>
          <Text style={styles.meta}>Optimize placements</Text>
          <TouchableOpacity style={styles.btn} onPress={onOpenSlotting}>
            <Text style={styles.btnText}>Open Slotting</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardHalf}>
          <Text style={styles.cardTitle}>Forecast</Text>
          <Text style={styles.meta}>Demand projections</Text>
          <TouchableOpacity style={styles.btn} onPress={onOpenForecast}>
            <Text style={styles.btnText}>Open Forecasting</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Optimizer Tasks</Text>
      <FlatList
        data={tasks}
        keyExtractor={(item, idx) => String(item.id || item.task_id || idx)}
        renderItem={renderTask}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!loading ? (
          <Text style={styles.empty}>No tasks available.</Text>
        ) : null}
        contentContainerStyle={{ paddingBottom: 60 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#6B7280', marginTop: 2 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 2 },
  cardWide: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 2 },
  cardHalf: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  meta: { color: '#6B7280', marginTop: 2 },
  btn: { marginTop: 10, backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  btnText: { color: 'white', fontWeight: '600' },
  secondary: { backgroundColor: '#F3F4F6' },
  secondaryText: { color: '#111827' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginVertical: 8 },
  taskCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  taskTitle: { fontSize: 16, fontWeight: '600' },
  actions: { gap: 8 },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 20 },
});
