import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Switch, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getCurrentUser, changePassword, updateProfile } from '../api/users';
import InternalHeader from '../components/InternalHeader';

export default function SettingsScreen({ navigation }) {
  const { logout, userToken } = useContext(AuthContext);
  const { settings, updateSettings } = useSettings();
  const [profile, setProfile] = React.useState({ username: '', email: '', phone: '' });
  const [formProfile, setFormProfile] = React.useState(profile);
  const [editingProfile, setEditingProfile] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  React.useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await getCurrentUser(userToken);
        setProfile({ username: data.username, email: data.email, phone: data.phone || '' });
        setFormProfile({ username: data.username, email: data.email, phone: data.phone || '' });
      } catch (e) {
        console.error('Failed to load profile', e);
      }
    }
    fetchProfile();
  }, [userToken]);

  const handleEditProfile = () => {
    setEditingProfile(true);
  };
  const handleCancelEdit = () => {
    setFormProfile(profile);
    setEditingProfile(false);
  };
  const handleSaveProfile = async () => {
    try {
      const updated = await updateProfile(userToken, { username: formProfile.username, phone: formProfile.phone });
      setProfile(updated);
      setFormProfile(updated);
      setEditingProfile(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please enter current and new passwords');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirmation do not match');
      return;
    }
    if (newPassword === currentPassword) {
      Alert.alert('Error', 'New password must differ from current password');
      return;
    }
    try {
      await changePassword(userToken, currentPassword, newPassword);
      Alert.alert('Success', 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update password');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Account Settings" />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Profile Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile Info</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={formProfile.username}
              editable={editingProfile}
              onChangeText={text => setFormProfile(prev => ({ ...prev, username: text }))}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput 
              style={styles.input} 
              value={profile.email} editable={editingProfile}
              onChangeText={text => setFormProfile(prev => ({ ...prev, email: text }))}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={formProfile.phone}
                editable={editingProfile}
                onChangeText={text => setFormProfile(prev => ({ ...prev, phone: text }))}
              />
            </View>
            <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={handleEditProfile} disabled={editingProfile}>
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          {editingProfile && (
            <View style={styles.row}>  
              <TouchableOpacity style={styles.button} onPress={handleSaveProfile}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: 'gray', marginLeft: 8 }]} onPress={handleCancelEdit}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Security */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Security</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Enter current password"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Enter new password"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Confirm new password"
            />
          </View>
          <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
            <Text style={styles.buttonText}>Update Password</Text>
          </TouchableOpacity>
        </View>
        {/* Preferences */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferences</Text>
          <View style={styles.rowField}>
            <Text style={styles.label}>Enable Notifications</Text>
            <Switch
              value={settings?.enableNotifications ?? false}
              onValueChange={async (val) => {
                try {
                  await updateSettings({ ...settings, enableNotifications: val });
                } catch (e) {
                  console.error('Failed to update notifications preference', e);
                }
              }}
            />
          </View>
          <View style={styles.rowField}>
            <Text style={styles.label}>Dark Mode</Text>
            <Switch value={false} />
          </View>
        </View>
        {/* Logout */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.button} onPress={logout}>
            <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
        {/* Danger Zone */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Danger Zone</Text>
          <TouchableOpacity style={styles.dangerButton}>
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  contentContainer: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, color: '#555', marginBottom: 4 },
  input: { backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  button: { backgroundColor: '#0074D9', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  rowField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  dangerButton: { marginTop: 8, backgroundColor: '#e74c3c', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  dangerButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});