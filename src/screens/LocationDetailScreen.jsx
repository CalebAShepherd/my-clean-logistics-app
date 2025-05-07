// import withScreenLayout from '../components/withScreenLayout';
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { fetchLocation, updateLocation, deleteLocation } from '../api/locations';

function LocationDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { userToken } = useContext(AuthContext);
  const [location, setLocation] = useState(null);
  const [zone, setZone] = useState('');
  const [shelf, setShelf] = useState('');
  const [bin, setBin] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchLocation(userToken, id);
        setLocation(data);
        setZone(data.zone);
        setShelf(data.shelf);
        setBin(data.bin);
      } catch (err) {
        console.error('Error loading location:', err);
        Alert.alert('Error', 'Failed to load location');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const onSave = async () => {
    if (!zone.trim() || !shelf.trim() || !bin.trim()) {
      Alert.alert('Validation', 'Zone, shelf, and bin are required');
      return;
    }
    setLoading(true);
    try {
      const updated = await updateLocation(userToken, id, { zone, shelf, bin });
      setLocation(updated);
      Alert.alert('Success', 'Location updated');
    } catch (err) {
      console.error('Error updating location:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this location?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteItem }
      ]
    );
  };

  const deleteItem = async () => {
    setLoading(true);
    try {
      await deleteLocation(userToken, id);
      Alert.alert('Deleted', 'Location removed');
      navigation.goBack();
    } catch (err) {
      console.error('Error deleting location:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Zone</Text>
      <TextInput style={styles.input} value={zone} onChangeText={setZone} />
      <Text style={styles.label}>Shelf</Text>
      <TextInput style={styles.input} value={shelf} onChangeText={setShelf} />
      <Text style={styles.label}>Bin</Text>
      <TextInput style={styles.input} value={bin} onChangeText={setBin} />
      <Button title="Save" onPress={onSave} />
      <View style={styles.deleteBtn}>
        <Button title="Delete" color="red" onPress={onDelete} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: 'bold', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginTop: 4, borderRadius: 4 },
  deleteBtn: { marginTop: 16 }
}); 
// export default withScreenLayout(LocationDetailScreen, { title: 'LocationDetail' });
