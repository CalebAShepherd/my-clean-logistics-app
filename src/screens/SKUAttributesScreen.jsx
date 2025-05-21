import React, { useEffect, useState, useContext } from 'react';
import { SafeAreaView, View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { fetchSKUAttributes } from '../api/skuAttributes';
import InternalHeader from '../components/InternalHeader';

// Custom styled button component
const CustomButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

function SKUAttributesScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAttributes = async () => {
    setLoading(true);
    try {
      const data = await fetchSKUAttributes(userToken);
      setAttributes(data);
    } catch (err) {
      console.error('Error loading attributes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAttributes(); }, []);

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="SKU Attributes" />
      <View style={styles.actions}>
        <CustomButton title="Add Attribute" onPress={() => navigation.navigate('Create SKU Attribute')} />
        <CustomButton title="Refresh" onPress={loadAttributes} />
      </View>
      <FlatList
        data={attributes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Edit SKU Attribute', { id: item.id })}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>{item.label}</Text>
            <Text style={styles.cardSubtitle}>{item.key}</Text>
            <Text style={styles.cardType}>Type: {item.type}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  cardSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  cardType: { fontSize: 12, color: '#888', marginTop: 4 },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default SKUAttributesScreen; 