import React, { useEffect, useState, useContext } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { fetchSKUAttributes, updateSKUAttribute, deleteSKUAttribute } from '../api/skuAttributes';
import InternalHeader from '../components/InternalHeader';

// Custom styled button components
const CustomButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);
const DeleteButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.deleteButton} onPress={onPress}>
    <Text style={styles.deleteButtonText}>{title}</Text>
  </TouchableOpacity>
);

function EditSKUAttributeScreen({ route, navigation }) {
  const { id } = route.params;
  const { userToken } = useContext(AuthContext);
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('STRING');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDef = async () => {
      try {
        const data = await fetchSKUAttributes(userToken);
        const def = data.find((a) => a.id === id);
        if (!def) throw new Error('Not found');
        setKey(def.key);
        setLabel(def.label);
        setType(def.type);
      } catch (err) {
        console.error('Error loading definition:', err);
        Alert.alert('Error', 'Failed to load definition');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    loadDef();
  }, [id]);

  const onSave = async () => {
    if (!key || !label || !type) {
      Alert.alert('Validation error', 'Key, label, and type are required.');
      return;
    }
    setLoading(true);
    try {
      await updateSKUAttribute(userToken, id, { key, label, type });
      Alert.alert('Success', 'Attribute updated');
      navigation.goBack();
    } catch (err) {
      console.error('Error updating definition:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this attribute? This will remove all values.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteDef }
      ]
    );
  };

  const deleteDef = async () => {
    setLoading(true);
    try {
      await deleteSKUAttribute(userToken, id);
      Alert.alert('Deleted', 'Attribute has been deleted');
      navigation.goBack();
    } catch (err) {
      console.error('Error deleting definition:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Edit SKU Attribute" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Key</Text>
          <TextInput style={styles.input} value={key} onChangeText={setKey} />

          <Text style={styles.fieldLabel}>Label</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} />

          <Text style={styles.fieldLabel}>Type</Text>
          <TextInput style={styles.input} value={type} onChangeText={setType} />

          <CustomButton title="Save Changes" onPress={onSave} />
          <DeleteButton title="Delete Attribute" onPress={onDelete} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  content: { padding: 16 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
  },
  fieldLabel: { marginTop: 12, fontSize: 14, color: '#444', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 12, marginTop: 8, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 6, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteButton: { backgroundColor: '#FF3B30', paddingVertical: 14, borderRadius: 6, marginTop: 12, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { marginTop: 16 }
});

export default EditSKUAttributeScreen; 