import React, { useEffect, useContext, useState, useRef, useCallback } from 'react';
import { SafeAreaView, View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import Constants from 'expo-constants';
import { fetchNotifications } from '../api/notifications';
import InternalHeader from '../components/InternalHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

export default function ConversationListScreen({ navigation }) {
  const { userToken, user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [unreadConvIds, setUnreadConvIds] = useState([]);
  const [swipedItemId, setSwipedItemId] = useState(null);
  const swipeableRefs = useRef(new Map());

  const loadConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/conversations`, { headers: { Authorization: `Bearer ${userToken}` } });
      const data = await res.json();
      
      // Only update state if the data has actually changed to prevent unnecessary re-renders
      setConversations(prevConversations => {
        const dataString = JSON.stringify(data);
        const prevString = JSON.stringify(prevConversations);
        
        if (dataString !== prevString) {
          // console.log('Conversations data changed, updating state');
          return data;
        } else {
          // console.log('Conversations data unchanged, preserving state');
          return prevConversations;
        }
      });
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadUnreadConversations = async () => {
    try {
      const data = await fetchNotifications(userToken);
      const msgNotes = data.filter(n => n.type === 'message' && !n.isRead);
      const convIds = msgNotes.map(n => n.metadata?.conversationId).filter(Boolean);
      setUnreadConvIds(convIds);
    } catch (err) {
      console.error('Error loading message notifications:', err);
    }
  };

  const markConversationAsRead = async (conversationId) => {
    try {
      // Mark conversation notifications as read
      const data = await fetchNotifications(userToken);
      const msgNotes = data.filter(n => n.type === 'message' && !n.isRead && n.metadata?.conversationId === conversationId);
      
      for (const notification of msgNotes) {
        await fetch(`${API_URL}/api/notifications/${notification.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${userToken}` }
        });
      }
      
      // Update local state immediately
      setUnreadConvIds(prev => prev.filter(id => id !== conversationId));
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  const refreshData = async () => {
    if (!userToken) return;
    await Promise.all([loadConversations(), loadUnreadConversations()]);
  };

  const closeAllSwipes = () => {
    if (swipedItemId) {
      const swipeRef = swipeableRefs.current.get(swipedItemId);
      if (swipeRef && swipeRef.closeSwipe) {
        swipeRef.closeSwipe(); // This will handle setting swipedItemId to null after animation
      } else {
        // Fallback if ref doesn't exist
        setSwipedItemId(null);
      }
    }
  };

  const deleteConversation = async (conversationId) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${userToken}` }
              });

              if (response.ok) {
                // Remove conversation from local state
                setConversations(prev => prev.filter(conv => conv.id !== conversationId));
                setUnreadConvIds(prev => prev.filter(id => id !== conversationId));
                setSwipedItemId(null);
              } else {
                throw new Error('Failed to delete conversation');
              }
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Initial load
  useEffect(() => {
    refreshData();
  }, [userToken]);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshData();
    }, [userToken])
  );

  // Poll for updates every 5 seconds when screen is focused
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 5000);

    return () => clearInterval(interval);
  }, [userToken]);

  // SwipeableConversationItem component
  const SwipeableConversationItem = React.memo(({ item, onPress, onDelete }) => {
    // Initialize translateX with a stable initial value to avoid useInsertionEffect warning
    const translateX = useRef(new Animated.Value(0)).current;
    const { width: screenWidth } = Dimensions.get('window');
    const deleteButtonWidth = 80;
    const isUnread = unreadConvIds.includes(item.id);
    const isSwipedOpen = swipedItemId === item.id;
    const gestureRef = useRef(null);
    
    // Track component state
    const isLocallyOpen = useRef(false);
    const lastSwipedState = useRef(false);
    const isAnimating = useRef(false);
    const isMounted = useRef(false);

    // Initialize position based on current state - run immediately to avoid flicker
    const initializePosition = () => {
      const shouldBeOpen = swipedItemId === item.id;
      const targetPosition = shouldBeOpen ? -deleteButtonWidth : 0;
      
      // Only set if position is different to avoid unnecessary updates
      if (Math.abs(translateX._value - targetPosition) > 1) {
        translateX.setValue(targetPosition);
        console.log('Positioned item', item.id, 'to:', targetPosition);
      }
      
      isLocallyOpen.current = shouldBeOpen;
      lastSwipedState.current = shouldBeOpen;
      isMounted.current = true;
    };

    // Initialize immediately (synchronously) to prevent any flicker
    if (!isMounted.current) {
      initializePosition();
    }

    const animateToPosition = (toValue, callback) => {
      console.log('Animating to:', toValue);
      Animated.spring(translateX, {
        toValue,
        useNativeDriver: false,
        tension: 200,
        friction: 25,
        velocity: 0,
      }).start((finished) => {
        console.log('Animation finished:', finished, 'at value:', toValue);
        if (finished) {
          // Update our local state immediately
          isLocallyOpen.current = (toValue === -deleteButtonWidth);
          console.log('Local state updated, isLocallyOpen:', isLocallyOpen.current);
          if (callback) {
            callback();
          }
        }
      });
    };

    // Handle state changes with proper animation
    useEffect(() => {
      if (!isMounted.current) return; // Don't run on initial mount
      
      const wasOpen = lastSwipedState.current;
      const shouldBeOpen = isSwipedOpen;
      
      // Only animate if the state actually changed and we're not already animating
      if (wasOpen !== shouldBeOpen && !isAnimating.current) {
        console.log('State change detected for item', item.id, 'from', wasOpen, 'to', shouldBeOpen);
        
        isAnimating.current = true;
        animateToPosition(shouldBeOpen ? -deleteButtonWidth : 0, () => {
          isLocallyOpen.current = shouldBeOpen;
          lastSwipedState.current = shouldBeOpen;
          isAnimating.current = false;
          console.log('State change animation complete for item', item.id);
        });
      }
    }, [isSwipedOpen]);

    const isGestureActive = useRef(false);

    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { 
        useNativeDriver: false,
        listener: (event) => {
          if (!isGestureActive.current) return;
          
          // Add rubber band effect for over-swiping
          const { translationX } = event.nativeEvent;
          if (translationX > 0) {
            // Resistance when swiping right (wrong direction)
            const resistance = Math.min(translationX * 0.3, 30);
            translateX.setValue(resistance);
          } else if (translationX < -deleteButtonWidth - 10) {
            // Resistance when over-swiping left
            const overshoot = Math.abs(translationX + deleteButtonWidth);
            const resistance = Math.min(overshoot * 0.2, 20);
            translateX.setValue(-deleteButtonWidth - resistance);
          }
        }
      }
    );

    const onHandlerStateChange = (event) => {
      const { state, translationX, velocityX } = event.nativeEvent;

      if (state === State.BEGAN) {
        isGestureActive.current = true;
        // Stop any ongoing animations when gesture begins
        translateX.stopAnimation();
      } else if (state === State.END || state === State.CANCELLED) {
        isGestureActive.current = false;
        
        const halfwayThreshold = deleteButtonWidth / 2;
        const velocityThreshold = 600;
        
        // Determine if we should open or close based on position and velocity
        let shouldOpen = false;
        
        if (Math.abs(velocityX) > velocityThreshold) {
          // Fast swipe - use velocity direction (only left opens)
          shouldOpen = velocityX < -velocityThreshold;
        } else {
          // Slow swipe - use position threshold (only consider leftward swipes)
          shouldOpen = translationX < 0 && Math.abs(translationX) > halfwayThreshold;
        }
        
        const toValue = shouldOpen ? -deleteButtonWidth : 0;
        
        console.log('Gesture end:', { translationX, velocityX, shouldOpen, toValue });
        
        isAnimating.current = true;
        animateToPosition(toValue, () => {
          isLocallyOpen.current = shouldOpen;
          lastSwipedState.current = shouldOpen;
          isAnimating.current = false;
          
          // Update global state after animation is complete
          if (shouldOpen) {
            setSwipedItemId(item.id);
          } else if (swipedItemId === item.id) {
            setSwipedItemId(null);
          }
        });
      }
    };

    // This effect is no longer needed since we handle state changes in the effect above
    // The position updates happen immediately in the useEffect that watches isSwipedOpen

    // Expose close function via ref
    useEffect(() => {
      swipeableRefs.current.set(item.id, {
        closeSwipe: () => {
          console.log('Closing swipe for item:', item.id);
          if (!isAnimating.current) {
            isAnimating.current = true;
            animateToPosition(0, () => {
              isLocallyOpen.current = false;
              lastSwipedState.current = false;
              isAnimating.current = false;
              console.log('Close animation complete');
              setSwipedItemId(null);
            });
          }
        }
      });
      
      return () => {
        swipeableRefs.current.delete(item.id);
      };
    }, []);

    const otherParticipants = item.participants.filter(p => p.user.id !== user.id);
    const isGroup = otherParticipants.length > 1;
    
    // Create display name
    let displayName;
    if (isGroup) {
      // Use custom name if available, otherwise fall back to generic name
      displayName = item.name || `Group (${otherParticipants.length + 1})`;
    } else {
      displayName = otherParticipants.map(p => p.user.username).join(', ');
    }
    
    const lastMessage = item.messages[0];
    let preview = 'No messages yet';
    let timestamp = '';
    if (lastMessage) {
      const senderName = lastMessage.senderId === user.id ? 'You' : lastMessage.sender?.username || 'Someone';
      const content = lastMessage.contentType === 'text' ? lastMessage.content : '📎 Attachment';
      preview = isGroup ? `${senderName}: ${content}` : content;
      
      // Format timestamp
      const messageDate = new Date(lastMessage.createdAt);
      const now = new Date();
      const diffMs = now - messageDate;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      if (diffHours < 1) {
        timestamp = 'now';
      } else if (diffHours < 24) {
        timestamp = `${Math.floor(diffHours)}h`;
      } else if (diffDays < 7) {
        timestamp = `${Math.floor(diffDays)}d`;
      } else {
        timestamp = messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    
    // Generate avatar background color based on display name
    const getAvatarColor = (name) => {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    return (
      <View style={styles.swipeableContainer}>
        {/* Delete button (appears behind the item) */}
        <View style={styles.deleteButton}>
          <TouchableOpacity
            style={styles.deleteButtonInner}
            onPress={() => onDelete(item.id)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="white" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Swipeable conversation item */}
        <PanGestureHandler
          ref={gestureRef}
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          activeOffsetX={[-10, 10]}
          failOffsetY={[-15, 15]}
          minPointers={1}
          maxPointers={1}
          shouldCancelWhenOutside={false}
        >
          <Animated.View
            style={[
              styles.swipeableItem,
              { transform: [{ translateX }] }
            ]}
          >
            <TouchableOpacity
              style={[styles.conversationCard, isUnread && styles.unreadCard]}
              onPress={onPress}
              activeOpacity={0.7}
            >
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(displayName) }]}>
                {isGroup ? (
                  <MaterialCommunityIcons name="account-group" size={20} color="white" />
                ) : (
                  <Text style={styles.avatarText}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              
              {/* Conversation Content */}
              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={[styles.conversationTitle, isUnread && styles.unreadTitle]}>
                    {displayName}
                  </Text>
                  <View style={styles.metaContainer}>
                    {timestamp && (
                      <Text style={[styles.timestamp, isUnread && styles.unreadTimestamp]}>
                        {timestamp}
                      </Text>
                    )}
                    {isUnread && <View style={styles.unreadBadge} />}
                  </View>
                </View>
                
                <Text style={[styles.messagePreview, isUnread && styles.unreadPreview]} numberOfLines={1}>
                  {preview}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.participants.length === nextProps.item.participants.length &&
      JSON.stringify(prevProps.item.messages[0]) === JSON.stringify(nextProps.item.messages[0])
    );
  });

  const renderItem = useCallback(({ item }) => {
    const isUnread = unreadConvIds.includes(item.id);
    const otherParticipants = item.participants.filter(p => p.user.id !== user.id);
    const isGroup = otherParticipants.length > 1;
    
    // Create display name
    let displayName;
    if (isGroup) {
      // Use custom name if available, otherwise fall back to generic name
      displayName = item.name || `Group (${otherParticipants.length + 1})`;
    } else {
      displayName = otherParticipants.map(p => p.user.username).join(', ');
    }

    const handlePress = () => {
      if (isUnread) {
        markConversationAsRead(item.id);
      }
      closeAllSwipes(); // Close any open swipe before navigating
      navigation.navigate('Chat', { 
        conversationId: item.id, 
        name: displayName,
        isGroup 
      });
    };

    return (
      <SwipeableConversationItem
        item={item}
        onPress={handlePress}
        onDelete={deleteConversation}
      />
    );
  }, [unreadConvIds, swipedItemId]);

  return (
    <TouchableWithoutFeedback onPress={closeAllSwipes}>
      <SafeAreaView style={styles.container}>
        <InternalHeader navigation={navigation} title="Messages" />
        
        {/* New Conversation Button */}
        <View style={styles.newConvContainer}>
          <TouchableOpacity 
            style={styles.newConvButton} 
            onPress={() => navigation.navigate('NewConversation')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#007AFF', '#0056CC']}
              style={styles.newConvGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="plus" size={20} color="white" />
              <Text style={styles.newConvText}>New Conversation</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Conversations List */}
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="message-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>Start a new conversation to get chatting!</Text>
            </View>
          }
          onScrollBeginDrag={closeAllSwipes} // Close swipe on scroll
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA',
  },
  
  // New Conversation Button Styles
  newConvContainer: { 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
  },
  newConvButton: { 
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newConvGradient: {
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  newConvText: { 
    fontSize: 16, 
    color: 'white', 
    marginLeft: 8,
    fontWeight: '600',
  },
  
  // List Styles
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  // Swipeable Container Styles
  swipeableContainer: {
    position: 'relative',
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  swipeableItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    zIndex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  
  // Delete Button Styles
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  deleteButtonInner: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  
  // Conversation Card Styles
  conversationCard: { 
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 0,
  },
  unreadCard: { 
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  
  // Avatar Styles
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  
  // Conversation Content Styles
  conversationContent: {
    flex: 1,
  },
  conversationHeader: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationTitle: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  unreadTitle: { 
    fontWeight: '700',
    color: '#000',
  },
  
  // Meta Container (timestamp + badge)
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  unreadTimestamp: {
    color: '#007AFF',
    fontWeight: '600',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  
  // Message Preview Styles
  messagePreview: { 
    fontSize: 14, 
    color: '#8E8E93',
    lineHeight: 20,
  },
  unreadPreview: { 
    color: '#007AFF',
    fontWeight: '500',
  },
  
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 40,
    lineHeight: 22,
  },
}); 