import { io } from 'socket.io-client';
import { supabase } from './supabase';

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

let socket = null;

// Initialize socket connection
export const initializeSocket = async () => {
  if (socket?.connected) {
    return socket;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('No authenticated user found');
    return null;
  }

  try {
    const token = session.access_token;

    socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    return null;
  }
};

// Get existing socket instance
export const getSocket = () => {
  return socket;
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Join a delivery room
export const joinDeliveryRoom = (deliveryId) => {
  if (socket && deliveryId) {
    socket.emit('join-delivery', { deliveryId });
  }
};

// Leave a delivery room
export const leaveDeliveryRoom = (deliveryId) => {
  if (socket && deliveryId) {
    socket.emit('leave-delivery', { deliveryId });
  }
};

// Send location update
export const sendLocationUpdate = (location) => {
  if (socket) {
    socket.emit('location-update', location);
  }
};

// Send chat message
export const sendChatMessage = (deliveryId, message) => {
  if (socket) {
    socket.emit('send-message', { deliveryId, message });
  }
};

// Emit typing indicator
export const emitTyping = (deliveryId, isTyping) => {
  if (socket) {
    socket.emit('typing', { deliveryId, isTyping });
  }
};

// Listen to events
export const onDeliveryCreated = (callback) => {
  if (socket) {
    socket.on('delivery-created', callback);
  }
};

export const onDeliveryAccepted = (callback) => {
  if (socket) {
    socket.on('delivery-accepted', callback);
  }
};

export const onDeliveryCancelled = (callback) => {
  if (socket) {
    socket.on('delivery-cancelled', callback);
  }
};

export const onLocationUpdated = (callback) => {
  if (socket) {
    socket.on('location-updated', callback);
  }
};

export const onMessageReceived = (callback) => {
  if (socket) {
    socket.on('message-received', callback);
  }
};

export const onNotification = (callback) => {
  if (socket) {
    socket.on('notification', callback);
  }
};

export const onStatusChanged = (callback) => {
  if (socket) {
    socket.on('status-changed', callback);
  }
};

// Remove event listeners
export const removeEventListener = (event) => {
  if (socket) {
    socket.off(event);
  }
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  joinDeliveryRoom,
  leaveDeliveryRoom,
  sendLocationUpdate,
  sendChatMessage,
  emitTyping,
  onDeliveryCreated,
  onDeliveryAccepted,
  onDeliveryCancelled,
  onLocationUpdated,
  onMessageReceived,
  onNotification,
  onStatusChanged,
  removeEventListener,
};

