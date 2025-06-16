import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function InternalHeader({ navigation, title, rightIcon, onRightPress, rightIcons }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        
        {/* Support for multiple right icons */}
        {rightIcons ? (
          <View style={styles.rightIconsContainer}>
            {rightIcons.map((iconConfig, index) => (
              <TouchableOpacity 
                key={index}
                onPress={iconConfig.onPress}
                style={[styles.rightIconButton, index > 0 && styles.rightIconSpacing]}
              >
                <MaterialCommunityIcons 
                  name={iconConfig.icon} 
                  size={24} 
                  color={iconConfig.color || "#007AFF"} 
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : rightIcon ? (
          <TouchableOpacity onPress={onRightPress}>
            <MaterialCommunityIcons name={rightIcon} size={24} color="#000" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  rightIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightIconButton: {
    padding: 4,
  },
  rightIconSpacing: {
    marginLeft: 8,
  },
}); 