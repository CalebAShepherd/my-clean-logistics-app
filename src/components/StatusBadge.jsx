import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const StatusBadge = ({ status, size = 'medium' }) => {
  const theme = useTheme();

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return '#F59E0B';
      case 'APPROVED':
        return '#10B981';
      case 'REJECTED':
        return '#EF4444';
      case 'DRAFT':
        return '#6B7280';
      case 'PENDING_APPROVAL':
        return '#F59E0B';
      case 'SENT':
        return '#3B82F6';
      case 'ACKNOWLEDGED':
        return '#8B5CF6';
      case 'PARTIALLY_RECEIVED':
        return '#F59E0B';
      case 'FULLY_RECEIVED':
        return '#10B981';
      case 'CANCELLED':
        return '#EF4444';
      case 'ACTIVE':
        return '#10B981';
      case 'INACTIVE':
        return '#6B7280';
      case 'COMPLETED':
        return '#10B981';
      case 'IN_PROGRESS':
        return '#3B82F6';
      case 'OVERDUE':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING_APPROVAL':
        return 'Pending Approval';
      case 'PARTIALLY_RECEIVED':
        return 'Partially Received';
      case 'FULLY_RECEIVED':
        return 'Fully Received';
      case 'IN_PROGRESS':
        return 'In Progress';
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase() || 'Unknown';
    }
  };

  const color = getStatusColor(status);
  const text = getStatusText(status);

  const sizeStyles = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 10,
    },
    medium: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 12,
    },
    large: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 14,
    },
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color + '20',
          borderColor: color,
          paddingHorizontal: sizeStyles[size].paddingHorizontal,
          paddingVertical: sizeStyles[size].paddingVertical,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: color,
            fontSize: sizeStyles[size].fontSize,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default StatusBadge;
