import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

export default function FilterPagination({ 
  filters, 
  pagination, 
  onFilterChange, 
  onPageChange,
  loading = false,
  filterOptions = []
}) {
  const [showFilters, setShowFilters] = useState(false);

  // Normalize filters into an array for rendering
  const filterArray = Array.isArray(filters)
    ? filters
    : filterOptions.map((opt) => ({
        ...opt,
        type: opt.type || 'select',
        value: filters && Object.prototype.hasOwnProperty.call(filters, opt.key)
          ? filters[opt.key]
          : '',
      }));

  const handleValueChange = (filter, value) => {
    if (Array.isArray(filters)) {
      // Pass key/value signature
      onFilterChange && onFilterChange(filter.key, value);
    } else {
      // Pass object merge signature
      onFilterChange && onFilterChange({ [filter.key]: value });
    }
  };

  const renderFilterItem = (filter) => {
    switch (filter.type) {
      case 'select':
        return (
          <View key={filter.key} style={styles.filterItem}>
            <Text style={styles.filterLabel}>{filter.label}</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filter.value}
                style={styles.picker}
                onValueChange={(value) => handleValueChange(filter, value)}
              >
                <Picker.Item label="All" value="" />
                {filter.options.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  const hasActiveFilters = filterArray.some(
    (filter) =>
      filter.value !== undefined &&
      filter.value !== null &&
      filter.value !== '' &&
      filter.value !== 'all'
  );

  return (
    <View style={styles.container}>
      {/* Filter Header */}
      <View style={styles.filterHeader}>
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={16} color={hasActiveFilters ? '#fff' : '#007AFF'} />
          <Text
            style={[
              styles.filterButtonText,
              hasActiveFilters && styles.filterButtonTextActive,
            ]}
          >
            Filter {hasActiveFilters && '(Active)'}
          </Text>
        </TouchableOpacity>

        {pagination && (
          <View style={styles.paginationInfo}>
            <Text style={styles.paginationText}>
              {pagination.totalCount > 0
                ? `${(pagination.currentPage - 1) * 20 + 1}-${Math.min(
                    pagination.currentPage * 20,
                    pagination.totalCount
                  )} of ${pagination.totalCount}`
                : 'No results'}
            </Text>
          </View>
        )}
      </View>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[styles.pageButton, !pagination.hasPrev && styles.pageButtonDisabled]}
            onPress={() => pagination.hasPrev && onPageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrev || loading}
          >
            <Ionicons
              name="chevron-back"
              size={16}
              color={!pagination.hasPrev ? '#ccc' : '#007AFF'}
            />
          </TouchableOpacity>

          <View style={styles.pageInfo}>
            <Text style={styles.pageText}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.pageButton, !pagination.hasNext && styles.pageButtonDisabled]}
            onPress={() => pagination.hasNext && onPageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNext || loading}
          >
            <Ionicons
              name="chevron-forward"
              size={16}
              color={!pagination.hasNext ? '#ccc' : '#007AFF'}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity
              onPress={() => {
                // Clear filters
                filterArray.forEach((filter) => handleValueChange(filter, ''));
                setShowFilters(false);
              }}
            >
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>{filterArray.map(renderFilterItem)}</ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 6,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  paginationInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pageButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  pageButtonDisabled: {
    borderColor: '#ccc',
  },
  pageInfo: {
    marginHorizontal: 20,
  },
  pageText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  clearText: {
    fontSize: 16,
    color: '#ff3b30',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterItem: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 