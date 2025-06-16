import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, SafeAreaView, KeyboardAvoidingView, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useCompanyBranding } from '../context/CompanyBrandingContext';

const API_URL = 'http://192.168.0.73:3000';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const { branding } = useCompanyBranding();

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return false;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return false;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          username: username.trim(), 
          password 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Sign up failed');
      }
      
      // On success, automatically log in
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      
      if (!loginRes.ok) {
        throw new Error('Account created but login failed. Please try signing in manually.');
      }
      
      const { token } = await loginRes.json();
      login(token);
    } catch (e) {
      console.error(e);
      Alert.alert('Sign Up Failed', e.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            
            <View style={styles.logoContainer}>
              {branding?.logoUrl ? (
                <Image source={{ uri: branding.logoUrl }} style={styles.logo} />
              ) : (
                <MaterialCommunityIcons name="account-plus" size={64} color="white" />
              )}
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join {branding?.companyName || 'Clean Logistics'} today
            </Text>
          </View>

          {/* Form Section with Keyboard Avoidance */}
          <KeyboardAvoidingView 
            style={styles.formSection}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#8E8E93"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="account" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#8E8E93"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password (min. 6 characters)"
                  placeholderTextColor="#8E8E93"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#8E8E93" 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.signUpButton, loading && styles.signUpButtonDisabled]}
                onPress={handleSignUp}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="account-plus" size={20} color="white" />
                    <Text style={styles.signUpButtonText}>Create Account</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>

          {/* Footer Section - Can be covered by keyboard */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },

  // Header Section
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
  },
  logoContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 0,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Form Section
  formSection: {
    flex: 1,
  },
  formContainer: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
    paddingTop: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1C1C1E',
  },
  eyeIcon: {
    padding: 8,
  },
  
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  signUpButtonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },

  termsContainer: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  termsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Footer Section
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 8,
  },
  signInLink: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});