import React, { useEffect, useContext, useState, useRef } from 'react';
import { SafeAreaView, View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Image, Linking, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Modal, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import InternalHeader from '../components/InternalHeader';
import { ScrollView } from 'react-native-gesture-handler';
import socketService from '../services/socketService';

const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

export default function ChatScreen({ route, navigation }) {
  const { conversationId, name, isGroup } = route.params;
  const { userToken, user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [typingUsernames, setTypingUsernames] = useState(new Map()); // Map userId to username
  const [participants, setParticipants] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [editNameModalVisible, setEditNameModalVisible] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [currentGroupName, setCurrentGroupName] = useState(name);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pendingMessagesRef = useRef(new Map()); // Track temp messages

  // Animation refs for typing dots
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadMessages();
    loadParticipants();
    setupWebSocket();
    
    return () => {
      cleanupWebSocket();
    };
  }, [conversationId]);

  const loadParticipants = async () => {
    if (!isGroup) return;
    
    try {
      const res = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      setParticipants(data.participants || []);
      
      // Create username mapping for typing indicators
      const usernameMap = new Map();
      data.participants?.forEach(p => {
        usernameMap.set(p.user.id, p.user.username);
      });
      setTypingUsernames(usernameMap);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const setupWebSocket = () => {
    if (!socketService.isConnected()) {
      socketService.connect(userToken);
    }

    socketService.on('new_message', (message) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some(existingMsg => existingMsg.id === message.id);
          if (exists) {
            return prev;
          }
          
          // If this is our own message, check if it matches a pending message
          if (message.senderId === user.id) {
            for (const [tempId, messageData] of pendingMessagesRef.current) {
              if (messageData.content === message.content && messageData.contentType === message.contentType) {
                // Replace temp message with real message
                pendingMessagesRef.current.delete(tempId);
                return prev.map(msg => msg.id === tempId ? { ...message, status: 'SENT' } : msg);
              }
            }
          }
          
          return [...prev, message];
        });
        if (message.senderId !== user.id) {
          socketService.markMessageAsRead(conversationId, message.id);
        }
      }
    });

    socketService.on('user_typing', ({ conversationId: typingConvId, userId, isTyping: userIsTyping }) => {
      if (typingConvId === conversationId && userId !== user.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (userIsTyping) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      }
    });

    socketService.on('message_read', ({ conversationId: readConvId, messageId, readBy, readAt }) => {
      if (readConvId === conversationId) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'READ', readAt }
            : msg
        ));
      }
    });
  };

  const cleanupWebSocket = () => {
    socketService.off('new_message');
    socketService.off('user_typing');
    socketService.off('message_read');
  };

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Permission to access media library is required!');
        }
      }
    })();
  }, []);

  useEffect(() => {
    console.log('pendingAttachment state changed:', pendingAttachment);
  }, [pendingAttachment]);

  const handleTextChange = (newText) => {
    setText(newText);
    
    if (newText.trim() && !isTyping) {
      setIsTyping(true);
      socketService.startTyping(conversationId);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socketService.stopTyping(conversationId);
      }
    }, 1000);
  };

  const loadMessages = () => {
    setLoading(true);
    fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
      .then(res => res.json())
      .then(data => {
        setMessages(data);
        data.forEach(message => {
          if (message.senderId !== user.id && message.status !== 'READ') {
            socketService.markMessageAsRead(conversationId, message.id);
          }
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const sendText = () => {
    if (!text.trim()) return;
    
    if (isTyping) {
      setIsTyping(false);
      socketService.stopTyping(conversationId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
    
    // Create temporary message for optimistic update
    const tempId = `temp_${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: text,
      contentType: 'text',
      senderId: user.id,
      conversationId: conversationId,
      createdAt: new Date().toISOString(),
      status: 'SENDING'
    };
    
    const messageText = text;
    setText('');
    
    // Track this pending message
    pendingMessagesRef.current.set(tempId, { content: messageText, contentType: 'text' });
    setMessages(prev => [...prev, tempMessage]);
    
    fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ content: messageText }),
    })
      .then(res => res.json())
      .then(msg => {
        // Replace temporary message with real message if it still exists
        setMessages(prev => {
          const tempExists = prev.some(m => m.id === tempId);
          if (tempExists) {
            pendingMessagesRef.current.delete(tempId);
            return prev.map(m => m.id === tempId ? { ...msg, status: 'SENT' } : m);
          }
          // If temp message doesn't exist, it was already replaced by WebSocket
          return prev;
        });
      })
      .catch(err => {
        console.error(err);
        // Remove failed message and restore text
        pendingMessagesRef.current.delete(tempId);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setText(messageText);
        alert('Failed to send message');
      });
  };

  const sendAttachment = async () => {
    if (!pendingAttachment) return;
    try {
      const formData = new FormData();
      formData.append('file', { uri: pendingAttachment.uri, name: pendingAttachment.name, type: pendingAttachment.type });
      console.log('Uploading attachment:', pendingAttachment);
      const res = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${userToken}` }, body: formData });
      console.log('sendAttachment response status:', res.status);
      const msg = await res.json();
      console.log('sendAttachment message:', msg);
      if (!res.ok) throw new Error('Upload failed');
      
      // Check if message already exists before adding (in case WebSocket already added it)
      setMessages(prev => {
        const exists = prev.some(existingMsg => existingMsg.id === msg.id);
        if (exists) {
          return prev;
        }
        return [...prev, msg];
      });
      setPendingAttachment(null);
    } catch (err) {
      console.error('Error uploading attachment:', err);
      alert(`Upload failed: ${err.message}`);
    }
  };

  const pickFile = async () => {
    try {
      console.log('pickFile triggered');
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      console.log('DocumentPicker result:', result);
      let asset = null;
      if (result.type === 'success') {
        asset = result;
      } else if (result.assets?.length > 0 && result.canceled === false) {
        asset = result.assets[0];
      }
      if (!asset) {
        console.log('DocumentPicker canceled or no assets:', result);
        return;
      }
      console.log('DocumentPicker asset:', asset);
      const uri = asset.uri;
      const name = asset.name || uri.split('/').pop();
      const ext = name.split('.').pop().toLowerCase();
      let mimeType = asset.mimeType;
      if (!mimeType) {
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'csv') mimeType = 'text/csv';
        else mimeType = 'application/octet-stream';
      }
      setPendingAttachment({ uri, name, type: mimeType, contentType: 'file' });
    } catch (e) {
      console.log('pickFile error:', e);
      alert('Error picking document: ' + e.message);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType, quality: 0.7 });
    console.log('ImagePicker result:', result);
    if (result.canceled) return;
    const asset = result.assets && result.assets[0];
    if (!asset || !asset.uri) return;
    const uri = asset.uri;
    const fileName = asset.fileName || uri.split('/').pop();
    const match = /\.(\w+)$/.exec(fileName);
    const ext = match ? match[1] : 'jpg';
    const type = `image/${ext}`;
    setPendingAttachment({ uri, name: fileName, type, contentType: 'image' });
  };

  const openImageModal = (imageUri) => {
    setSelectedImage(imageUri);
    setModalVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeImageModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setSelectedImage(null);
    });
  };

  const downloadImage = async () => {
    if (!selectedImage) return;
    
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access media library is required to download images.');
        return;
      }

      const filename = `image_${Date.now()}.jpg`;
      const fileUri = FileSystem.documentDirectory + filename;

      const downloadResumable = FileSystem.createDownloadResumable(
        selectedImage,
        fileUri
      );
      
      const { uri } = await downloadResumable.downloadAsync();
      
      await MediaLibrary.saveToLibraryAsync(uri);
      
      alert('Image saved to gallery!');
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  const downloadDocument = async (fileUrl, filename) => {
    try {
      const finalFilename = filename || fileUrl.split('/').pop() || `document_${Date.now()}`;
      const fileUri = FileSystem.documentDirectory + finalFilename;

      console.log('Downloading document from:', fileUrl);
      console.log('Saving to:', fileUri);

      const downloadResumable = FileSystem.createDownloadResumable(
        fileUrl,
        fileUri
      );
      
      const { uri } = await downloadResumable.downloadAsync();
      console.log('Downloaded to:', uri);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: finalFilename.endsWith('.pdf') ? 'application/pdf' : 'text/csv',
          dialogTitle: 'Save document',
          UTI: finalFilename.endsWith('.pdf') ? 'com.adobe.pdf' : 'public.comma-separated-values-text'
        });
      } else {
        alert(`Document downloaded to: ${finalFilename}`);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const openEditNameModal = () => {
    setEditingGroupName(currentGroupName);
    setEditNameModalVisible(true);
  };

  const closeEditNameModal = () => {
    setEditNameModalVisible(false);
    setEditingGroupName('');
  };

  const updateGroupName = async () => {
    if (!editingGroupName.trim()) {
      Alert.alert('Error', 'Group name cannot be empty');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/conversations/${conversationId}/name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ name: editingGroupName.trim() })
      });

      if (response.ok) {
        const updatedConversation = await response.json();
        setCurrentGroupName(updatedConversation.name || editingGroupName.trim());
        closeEditNameModal();
        Alert.alert('Success', 'Group name updated successfully');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to update group name');
      }
    } catch (error) {
      console.error('Error updating group name:', error);
      Alert.alert('Error', 'Failed to update group name. Please try again.');
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === user.id;
    const senderName = item.sender?.username || 'Unknown';
    
    // Enhanced file rendering
    if (item.contentType === 'pdf' || item.contentType === 'csv') {
      const filename = item.fileUrl.split('/').pop();
      const getFileIcon = (type) => {
        switch (type) {
          case 'pdf': return { name: 'file-pdf-box', color: '#E74C3C' };
          case 'csv': return { name: 'file-delimited-outline', color: '#1D6F42' };
          default: return { name: 'file-outline', color: '#666' };
        }
      };
      const iconConfig = getFileIcon(item.contentType);
      
      return (
        <View style={[styles.messageRow, isMe && styles.myMessageRow]}>
          <View style={[styles.messageBubble, isMe ? styles.myMessageBubble : styles.otherMessageBubble]}>
            {isGroup && !isMe && (
              <Text style={styles.senderName}>{senderName}</Text>
            )}
            <TouchableOpacity 
              onPress={() => downloadDocument(`${API_URL}${item.fileUrl}`, filename)} 
              style={styles.fileAttachment}
              activeOpacity={0.7}
            >
              <View style={[styles.fileIcon, { backgroundColor: iconConfig.color + '20' }]}>
                <MaterialCommunityIcons name={iconConfig.name} size={20} color={iconConfig.color} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{filename}</Text>
                <Text style={styles.fileType}>{item.contentType.toUpperCase()}</Text>
              </View>
              <MaterialCommunityIcons name="download" size={16} color="#8E8E93" />
            </TouchableOpacity>
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {renderMessageStatus(item)}
            </View>
          </View>
        </View>
      );
    }
    
    // Enhanced regular message rendering
    return (
      <View style={[styles.messageRow, isMe && styles.myMessageRow]}>
        <View style={[styles.messageBubble, isMe ? styles.myMessageBubble : styles.otherMessageBubble]}>
          {isGroup && !isMe && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}
          
          {item.contentType === 'text' && (
            <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
              {item.content}
            </Text>
          )}
          
          {item.contentType === 'image' && (
            <TouchableOpacity 
              onPress={() => openImageModal(`${API_URL}${item.fileUrl}`)}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri: `${API_URL}${item.fileUrl}` }} 
                style={styles.messageImage} 
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {renderMessageStatus(item)}
          </View>
        </View>
      </View>
    );
  };

  // Animation effect for typing dots
  useEffect(() => {
    if (typingUsers.size === 0) {
      // Stop animations when no one is typing
      dot1Anim.stopAnimation();
      dot2Anim.stopAnimation();
      dot3Anim.stopAnimation();
      dot1Anim.setValue(0);
      dot2Anim.setValue(0);
      dot3Anim.setValue(0);
      return;
    }

    const createBouncingAnimation = (animValue, delay = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: -5,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        { iterations: -1 }
      );
    };

    // Start animations with staggered delays
    const animation1 = createBouncingAnimation(dot1Anim, 0);
    const animation2 = createBouncingAnimation(dot2Anim, 133);
    const animation3 = createBouncingAnimation(dot3Anim, 266);
    
    animation1.start();
    animation2.start();
    animation3.start();
    
    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [typingUsers.size > 0]);

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (typingUsers.size === 0) return null;
    
    // Create typing text based on who's typing
    let typingText = 'typing';
    if (isGroup && typingUsernames.size > 0) {
      const typingNames = Array.from(typingUsers)
        .map(userId => typingUsernames.get(userId))
        .filter(Boolean);
      
      if (typingNames.length === 1) {
        typingText = `${typingNames[0]} is typing`;
      } else if (typingNames.length > 1) {
        typingText = `${typingNames.join(', ')} are typing`;
      }
    }
    
    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <View style={styles.typingContent}>
            <Text style={styles.typingText}>{typingText}</Text>
            <View style={styles.typingDots}>
              <Animated.View 
                style={[
                  styles.typingDot, 
                  { transform: [{ translateY: dot1Anim }] }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.typingDot, 
                  { transform: [{ translateY: dot2Anim }] }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.typingDot, 
                  { transform: [{ translateY: dot3Anim }] }
                ]} 
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderMessageStatus = (message) => {
    if (message.senderId !== user.id) return null;
    
    let icon = 'check';
    let color = '#999';
    
    if (message.status === 'SENDING') {
      icon = 'clock-outline';
      color = '#999';
    } else if (message.status === 'DELIVERED') {
      icon = 'check-all';
      color = '#999';
    } else if (message.status === 'READ') {
      icon = 'check-all';
      color = '#007AFF';
    }
    
    return (
      <MaterialCommunityIcons 
        name={icon} 
        size={12} 
        color={color} 
        style={styles.messageStatus} 
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <InternalHeader 
        navigation={navigation} 
        title={currentGroupName} 
        rightIcons={isGroup ? [
          {
            icon: 'pencil',
            color: '#007AFF',
            onPress: openEditNameModal
          },
          {
            icon: 'information-outline',
            color: '#007AFF',
            onPress: () => navigation.navigate('GroupInfo', { conversationId, participants })
          }
        ] : undefined}
      />
          <ScrollView
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
            style={styles.chatContent}
          >
            {loading ? (
              <ActivityIndicator style={styles.center} size="large" />
            ) : (
              <FlatList
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                style={{ flex: 1 }}
                contentContainerStyle={[styles.list, { flexGrow: 1 }]}
              />
            )}
            {renderTypingIndicator()}
          </ScrollView>

          {/* Enhanced Pending Attachment Preview */}
          {pendingAttachment && (
            <View style={styles.attachmentPreview}>
              <View style={styles.attachmentContent}>
                {(() => {
                  const ext = pendingAttachment.name.split('.').pop().toLowerCase();
                  const getFileIcon = (extension) => {
                    switch (extension) {
                      case 'pdf': return { name: 'file-pdf-box', color: '#E74C3C' };
                      case 'doc':
                      case 'docx': return { name: 'file-word-box', color: '#2B579A' };
                      case 'xls':
                      case 'xlsx': return { name: 'file-excel-box', color: '#1D6F42' };
                      case 'ppt':
                      case 'pptx': return { name: 'file-powerpoint-box', color: '#D04423' };
                      case 'txt': return { name: 'file-document-outline', color: '#666' };
                      case 'csv': return { name: 'file-delimited-outline', color: '#1D6F42' };
                      case 'zip':
                      case 'rar':
                      case '7z': return { name: 'folder-zip-outline', color: '#8B4513' };
                      default: return { name: 'file-outline', color: '#666' };
                    }
                  };
                  
                  if (['png','jpg','jpeg','gif'].includes(ext)) {
                    return (
                      <Image 
                        source={{ uri: pendingAttachment.uri }} 
                        style={styles.attachmentImagePreview} 
                        resizeMode="cover"
                      />
                    );
                  } else {
                    const icon = getFileIcon(ext);
                    return (
                      <View style={[styles.attachmentFileIcon, { backgroundColor: icon.color + '20' }]}>
                        <MaterialCommunityIcons name={icon.name} size={24} color={icon.color} />
                      </View>
                    );
                  }
                })()}
                <View style={styles.attachmentInfo}>
                  <Text style={styles.attachmentName} numberOfLines={1}>{pendingAttachment.name}</Text>
                  <Text style={styles.attachmentType}>Ready to send</Text>
                </View>
              </View>
              
              <View style={styles.attachmentActions}>
                <TouchableOpacity onPress={sendAttachment} style={styles.attachmentSendButton}>
                  <MaterialCommunityIcons name="send" size={20} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPendingAttachment(null)} style={styles.attachmentCancelButton}>
                  <MaterialCommunityIcons name="close" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Enhanced Input Container */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TouchableOpacity onPress={pickImage} style={styles.attachButton} activeOpacity={0.7}>
                <MaterialCommunityIcons name="image-outline" size={24} color="#8E8E93" />
              </TouchableOpacity>
              <TouchableOpacity onPress={pickFile} style={styles.attachButton} activeOpacity={0.7}>
                <MaterialCommunityIcons name="paperclip" size={24} color="#8E8E93" />
              </TouchableOpacity>
              <TextInput
                style={styles.messageInput}
                value={text}
                onChangeText={handleTextChange}
                placeholder="Type a message..."
                placeholderTextColor="#8E8E93"
                multiline={true}
                textAlignVertical="center"
                blurOnSubmit={false}
              />
              <TouchableOpacity 
                onPress={pendingAttachment ? sendAttachment : sendText} 
                style={[styles.sendButton, (text.trim() || pendingAttachment) && styles.sendButtonActive]}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons 
                  name="send" 
                  size={20} 
                  color={(text.trim() || pendingAttachment) ? 'white' : '#8E8E93'} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <Modal
            visible={modalVisible}
            transparent={true}
            animationType="none"
            onRequestClose={closeImageModal}
          >
            <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
              <TouchableWithoutFeedback onPress={closeImageModal}>
                <View style={styles.modalBackground} />
              </TouchableWithoutFeedback>
              <Animated.View style={[styles.modalContent, { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
                {selectedImage && (
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                )}
                <TouchableOpacity style={styles.closeButton} onPress={closeImageModal}>
                  <MaterialCommunityIcons name="close" size={30} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.downloadButton} onPress={downloadImage}>
                  <MaterialCommunityIcons name="download" size={30} color="white" />
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </Modal>

          {/* Edit Group Name Modal */}
          <Modal
            visible={editNameModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={closeEditNameModal}
          >
            <View style={styles.editNameModalOverlay}>
              <TouchableWithoutFeedback onPress={closeEditNameModal}>
                <View style={styles.editNameModalBackground} />
              </TouchableWithoutFeedback>
              <View style={styles.editNameModalContent}>
                <Text style={styles.editNameModalTitle}>Edit Group Name</Text>
                <TextInput
                  style={styles.editNameInput}
                  value={editingGroupName}
                  onChangeText={setEditingGroupName}
                  placeholder="Enter group name"
                  autoFocus={true}
                />
                <View style={styles.editNameModalButtons}>
                  <TouchableOpacity 
                    style={[styles.editNameModalButton, styles.cancelButton]} 
                    onPress={closeEditNameModal}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editNameModalButton, styles.saveButton]} 
                    onPress={updateGroupName}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Main Container
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA',
  },
  
  // Chat Content Area
  chatContent: { 
    flex: 1, 
    paddingBottom: 8,
  },
  list: { 
    paddingHorizontal: 16, 
    paddingTop: 16,
    paddingBottom: 8,
  },
  
  // Message Bubbles
  messageRow: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 4,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  myMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  
  // Message Text
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#1C1C1E',
  },
  
  // Sender Name (for groups)
  senderName: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#007AFF', 
    marginBottom: 4,
    opacity: 0.8,
  },
  
  // Message Images
  messageImage: { 
    width: 200, 
    height: 200, 
    borderRadius: 12,
    marginVertical: 2,
  },
  
  // File Attachments in Messages
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '100%',
    flexWrap: 'nowrap',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginVertical: 2,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  fileType: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  // Message Footer (time + status)
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#8E8E93',
    opacity: 0.7,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageStatus: {
    marginLeft: 6,
  },
  
  // Input Container
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F2F2F7',
    borderRadius: 24,
    padding: 4,
    minHeight: 44,
  },
  messageInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    lineHeight: 20,
    color: '#1C1C1E',
  },
  attachButton: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    backgroundColor: '#E5E5EA',
    paddingLeft: 3,
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
    paddingLeft: 3,
  },
  
  // Attachment Preview
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  attachmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  attachmentImagePreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  attachmentFileIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  attachmentType: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  attachmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentSendButton: {
    padding: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
  },
  attachmentCancelButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#FFF0F0',
  },
  
  // Typing Indicator
  typingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    backgroundColor: 'white',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  typingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 8,
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8E8E93',
    marginHorizontal: 1,
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 22,
    padding: 12,
  },
  downloadButton: {
    position: 'absolute',
    top: 20,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 22,
    padding: 12,
  },
  
  // Edit Name Modal
  editNameModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  editNameModalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  editNameModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    minWidth: 300,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  editNameModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1C1C1E',
  },
  editNameInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#F8F9FA',
  },
  editNameModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editNameModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  saveButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  
  // Utility
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
}); 