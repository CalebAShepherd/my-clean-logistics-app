import io from 'socket.io-client';
import Constants from 'expo-constants';

const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.token = null;
    this.listeners = new Map();
  }

  connect(userToken) {
    if (this.socket?.connected) {
      this.disconnect();
    }

    console.log('Connecting to WebSocket with token:', userToken ? 'present' : 'missing');
    this.token = userToken;
    this.socket = io(API_URL, {
      auth: {
        token: userToken
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      console.error('Full error details:', error);
      
      // If it's an authentication error, try to reconnect with a fresh token
      if (error.message.includes('Authentication error')) {
        console.log('Authentication failed, check your JWT token');
      }
    });

    // Re-register all listeners
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Register event listeners
  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove event listeners
  off(event) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  // Emit events
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  // Typing indicators
  startTyping(conversationId) {
    this.emit('typing_start', { conversationId });
  }

  stopTyping(conversationId) {
    this.emit('typing_stop', { conversationId });
  }

  // Mark message as read
  markMessageAsRead(conversationId, messageId) {
    this.emit('mark_read', { conversationId, messageId });
  }

  // Check connection status
  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService(); 