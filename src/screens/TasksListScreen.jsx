import React, { useEffect, useState, useContext } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  RefreshControl, 
  Alert, 
  TextInput,
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { fetchTasks, createTask, updateTask, deleteTask } from '../api/crm/tasks';
import InternalHeader from '../components/InternalHeader';

const TASK_FILTERS = [
  { key: 'ALL', label: 'All', icon: 'format-list-bulleted' },
  { key: 'PENDING', label: 'Pending', icon: 'clock-outline' },
  { key: 'COMPLETED', label: 'Completed', icon: 'check-circle-outline' },
  { key: 'OVERDUE', label: 'Overdue', icon: 'alert-circle-outline' },
];

export default function TasksListScreen({ navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: ''
  });

  const loadTasks = async () => {
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks', err);
      Alert.alert('Error', 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleToggleComplete = async (task) => {
    try {
      await updateTask(task.id, { completed: !task.completed });
      loadTasks();
    } catch (err) {
      console.error('Failed to update task', err);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Validation', 'Task title is required');
      return;
    }

    try {
      const taskData = {
        title: newTask.title.trim(),
        description: newTask.description.trim() || null,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null
      };
      
      await createTask(taskData);
      setNewTask({ title: '', description: '', dueDate: '' });
      setShowAddForm(false);
      loadTasks();
    } catch (err) {
      console.error('Failed to create task', err);
      Alert.alert('Error', 'Failed to create task');
    }
  };

  const handleDeleteTask = (task) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(task.id);
              loadTasks();
            } catch (err) {
              console.error('Failed to delete task', err);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && !tasks.find(t => t.dueDate === dueDate)?.completed;
  };

  const getFilteredTasks = () => {
    let filtered = tasks;
    
    // Apply status filter
    switch (selectedFilter) {
      case 'PENDING':
        filtered = filtered.filter(task => !task.completed);
        break;
      case 'COMPLETED':
        filtered = filtered.filter(task => task.completed);
        break;
      case 'OVERDUE':
        filtered = filtered.filter(task => !task.completed && task.dueDate && new Date(task.dueDate) < new Date());
        break;
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Sort by due date, then by creation date
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1; // Completed tasks go to bottom
      }
      
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  };

  const renderFilterTabs = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      {TASK_FILTERS.map((filter) => {
        let count = tasks.length;
        switch (filter.key) {
          case 'PENDING':
            count = tasks.filter(t => !t.completed).length;
            break;
          case 'COMPLETED':
            count = tasks.filter(t => t.completed).length;
            break;
          case 'OVERDUE':
            count = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;
            break;
        }
        
        return (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              selectedFilter === filter.key && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <MaterialCommunityIcons 
              name={filter.icon} 
              size={16} 
              color={selectedFilter === filter.key ? 'white' : '#007AFF'} 
              style={styles.filterIcon}
            />
            <Text style={[
              styles.filterText,
              selectedFilter === filter.key && styles.filterTextActive
            ]}>
              {filter.label} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderTask = ({ item }) => {
    const overdue = !item.completed && item.dueDate && new Date(item.dueDate) < new Date();
    const dueToday = item.dueDate && 
      new Date(item.dueDate).toDateString() === new Date().toDateString();
    
    return (
      <View style={[
        styles.taskCard,
        item.completed && styles.taskCardCompleted,
        overdue && styles.taskCardOverdue
      ]}>
        <View style={styles.taskHeader}>
          <TouchableOpacity
            onPress={() => handleToggleComplete(item)}
            style={styles.checkboxContainer}
          >
            <MaterialCommunityIcons 
              name={item.completed ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
              size={24} 
              color={item.completed ? "#34C759" : overdue ? "#FF3B30" : "#007AFF"} 
            />
          </TouchableOpacity>
          
          <View style={styles.taskInfo}>
            <Text style={[
              styles.taskTitle,
              item.completed && styles.taskTitleCompleted
            ]}>
              {item.title}
            </Text>
            
            {item.description && (
              <Text style={[
                styles.taskDescription,
                item.completed && styles.taskDescriptionCompleted
              ]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            
            <View style={styles.taskMeta}>
              {item.dueDate && (
                <View style={[
                  styles.dueDateContainer,
                  overdue && styles.dueDateOverdue,
                  dueToday && !item.completed && styles.dueDateToday
                ]}>
                  <MaterialCommunityIcons 
                    name="calendar-clock" 
                    size={14} 
                    color={overdue ? "#FF3B30" : dueToday ? "#FF9500" : "#8E8E93"} 
                  />
                  <Text style={[
                    styles.dueDateText,
                    overdue && styles.dueDateTextOverdue,
                    dueToday && !item.completed && styles.dueDateTextToday
                  ]}>
                    {overdue ? 'Overdue' : dueToday ? 'Due today' : new Date(item.dueDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
              
              {item.assignee && (
                <View style={styles.assigneeContainer}>
                  <MaterialCommunityIcons name="account" size={14} color="#8E8E93" />
                  <Text style={styles.assigneeText}>
                    {item.assignee.firstName} {item.assignee.lastName}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.taskActions}>
            {(user.role === 'crm_admin' || user.role === 'dev') && (
              <TouchableOpacity
                onPress={() => handleDeleteTask(item)}
                style={styles.deleteButton}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
            <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
          </View>
        </View>
      </View>
    );
  };

  const renderAddForm = () => (
    <View style={styles.addForm}>
      <Text style={styles.addFormTitle}>Add New Task</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Task Title"
        value={newTask.title}
        onChangeText={(text) => setNewTask({...newTask, title: text})}
        autoCapitalize="sentences"
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description (optional)"
        value={newTask.description}
        onChangeText={(text) => setNewTask({...newTask, description: text})}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        autoCapitalize="sentences"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Due Date (YYYY-MM-DD) (optional)"
        value={newTask.dueDate}
        onChangeText={(text) => setNewTask({...newTask, dueDate: text})}
        autoCapitalize="none"
      />
      
      <View style={styles.formButtons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => {
            setShowAddForm(false);
            setNewTask({ title: '', description: '', dueDate: '' });
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.addButton]}
          onPress={handleAddTask}
        >
          <Text style={styles.addButtonText}>Add Task</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Tasks" />
        <ActivityIndicator style={styles.center} size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  const filteredTasks = getFilteredTasks();
  const pendingCount = tasks.filter(t => !t.completed).length;
  const overdueCount = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader 
        navigation={navigation} 
        title="Tasks"
        rightIcon={(user.role === 'crm_admin' || user.role === 'sales_rep' || user.role === 'account_manager' || user.role === 'dev') ? "plus" : null}
        onRightPress={() => setShowAddForm(!showAddForm)}
      />

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Add Form */}
        {showAddForm && renderAddForm()}

        {/* Quick Stats */}
        {pendingCount > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            {overdueCount > 0 && (
              <View style={[styles.statItem, styles.statItemOverdue]}>
                <Text style={[styles.statNumber, styles.statNumberOverdue]}>{overdueCount}</Text>
                <Text style={[styles.statLabel, styles.statLabelOverdue]}>Overdue</Text>
              </View>
            )}
          </View>
        )}

        {/* Filter Tabs */}
        {renderFilterTabs()}

        {/* Tasks List */}
        <FlatList
          data={filteredTasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name={selectedFilter === 'COMPLETED' ? "check-all" : "format-list-bulleted-square"} 
                size={64} 
                color="#C7C7CC" 
              />
              <Text style={styles.emptyTitle}>
                {selectedFilter === 'COMPLETED' ? 'No Completed Tasks' : 'No Tasks Found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedFilter !== 'ALL' 
                  ? 'Try adjusting your filters' 
                  : 'Get started by adding your first task'
                }
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  addForm: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addFormTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1C1C1E',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    marginRight: 32,
  },
  statItemOverdue: {
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 0,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  statNumberOverdue: {
    color: '#FF3B30',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  statLabelOverdue: {
    color: '#FF3B30',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: 'white',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterIcon: {
    marginRight: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  filterTextActive: {
    color: 'white',
  },
  listContainer: {
    paddingBottom: 20,
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskCardCompleted: {
    opacity: 0.7,
  },
  taskCardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  taskDescription: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 8,
    lineHeight: 20,
  },
  taskDescriptionCompleted: {
    color: '#C7C7CC',
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  dueDateOverdue: {
    backgroundColor: '#FFEBEE',
  },
  dueDateToday: {
    backgroundColor: '#FFF8E1',
  },
  dueDateText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
    fontWeight: '500',
  },
  dueDateTextOverdue: {
    color: '#FF3B30',
  },
  dueDateTextToday: {
    color: '#FF9500',
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  assigneeText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
}); 