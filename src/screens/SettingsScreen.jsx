import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Switch, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
      
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="account-circle" size={24} color="#007AFF" />
            <Text style={styles.cardTitle}>Profile Information</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, !editingProfile && styles.inputDisabled]}
              value={formProfile.username}
              editable={editingProfile}
              onChangeText={text => setFormProfile(prev => ({ ...prev, username: text }))}
              placeholder="Enter your full name"
            />
          </View>
          
          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput 
              style={[styles.input, styles.inputDisabled]}
              value={profile.email} 
              editable={false}
              placeholder="Enter your email"
            />
            <Text style={styles.fieldNote}>Email cannot be changed</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, !editingProfile && styles.inputDisabled]}
              value={formProfile.phone}
              editable={editingProfile}
              onChangeText={text => setFormProfile(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </View>
          
          {!editingProfile ? (
            <TouchableOpacity style={styles.primaryButton} onPress={handleEditProfile}>
              <LinearGradient
                colors={['#007AFF', '#5856D6']}
                style={styles.buttonGradient}
              >
                <MaterialCommunityIcons name="pencil" size={18} color="white" />
                <Text style={styles.primaryButtonText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.buttonRow}>  
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Security Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="shield-lock" size={24} color="#007AFF" />
            <Text style={styles.cardTitle}>Security</Text>
          </View>
          
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
          
          <TouchableOpacity style={styles.primaryButton} onPress={handleChangePassword}>
            <LinearGradient
              colors={['#007AFF', '#5856D6']}
              style={styles.buttonGradient}
            >
              <MaterialCommunityIcons name="key-change" size={18} color="white" />
              <Text style={styles.primaryButtonText}>Update Password</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Preferences Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="tune" size={24} color="#007AFF" />
            <Text style={styles.cardTitle}>Preferences</Text>
          </View>
          
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceContent}>
              <MaterialCommunityIcons name="bell-outline" size={20} color="#8E8E93" />
              <View style={styles.preferenceText}>
                <Text style={styles.preferenceTitle}>Push Notifications</Text>
                <Text style={styles.preferenceSubtitle}>Receive updates about your shipments</Text>
              </View>
            </View>
            <Switch
              value={settings?.enableNotifications ?? false}
              onValueChange={async (val) => {
                try {
                  await updateSettings({ ...settings, enableNotifications: val });
                } catch (e) {
                  console.error('Failed to update notifications preference', e);
                }
              }}
              trackColor={{ false: '#E1E5E9', true: '#007AFF' }}
              thumbColor={settings?.enableNotifications ? 'white' : '#F4F3F4'}
            />
          </View>
          
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceContent}>
              <MaterialCommunityIcons name="theme-light-dark" size={20} color="#8E8E93" />
              <View style={styles.preferenceText}>
                <Text style={styles.preferenceTitle}>Dark Mode</Text>
                <Text style={styles.preferenceSubtitle}>Coming soon in future updates</Text>
              </View>
            </View>
            <Switch 
              value={false} 
              disabled={true}
              trackColor={{ false: '#E1E5E9', true: '#007AFF' }}
              thumbColor={'#F4F3F4'}
            />
          </View>
        </View>

        {/* Account Actions Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="account-cog" size={24} color="#007AFF" />
            <Text style={styles.cardTitle}>Account Actions</Text>
          </View>
          
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <MaterialCommunityIcons name="logout" size={20} color="#FF9500" />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone Card */}
        <View style={styles.dangerCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="alert-circle" size={24} color="#FF3B30" />
            <Text style={[styles.cardTitle, { color: '#FF3B30' }]}>Danger Zone</Text>
          </View>
          
          <Text style={styles.dangerText}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </Text>
          
          <TouchableOpacity style={styles.dangerButton}>
            <MaterialCommunityIcons name="delete-forever" size={20} color="white" />
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  contentContainer: { 
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
  },
  
  // Card Styles
  card: { 
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  
  dangerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  cardTitle: { 
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  
  // Form Field Styles
  field: { 
    marginBottom: 16 
  },
  
  label: { 
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  
  input: { 
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1C1C1E',
  },
  
  inputDisabled: {
    backgroundColor: '#F2F2F7',
    color: '#8E8E93',
  },
  
  fieldNote: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    fontStyle: 'italic',
  },
  
  // Button Styles
  primaryButton: {
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  
  primaryButtonText: { 
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  
  buttonRow: { 
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  
  saveButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  
  cancelButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  
  cancelButtonText: {
    color: '#8E8E93',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Preference Styles
  preferenceRow: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  preferenceText: {
    marginLeft: 12,
    flex: 1,
  },
  
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  
  preferenceSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  
  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  
  logoutButtonText: {
    color: '#FF9500',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  
  // Danger Zone Styles
  dangerText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 16,
  },
  
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  
  dangerButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});