import io from 'socket.io-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5001';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket && this.connected) {
      return;
    }

    this.socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    this.socket.on('connect', () => {
      console.log('✓ WebSocket connected');
      this.connected = true;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', () => {
      console.log('✗ WebSocket disconnected');
      this.connected = false;
      this.emit('connection_status', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.connected = false;
      this.emit('connection_status', { connected: false, error });
    });

    // Listen for data events
    this.socket.on('tick-update', (data) => {
      this.emit('tick-update', data);
    });

    this.socket.on('chart-update', (data) => {
      this.emit('chart-update', data);
    });

    this.socket.on('signal-generated', (data) => {
      this.emit('signal-generated', data);
    });

    this.socket.on('signal-updated', (data) => {
      this.emit('signal-updated', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  isConnected() {
    return this.connected;
  }
}

const websocketService = new WebSocketService();
export default websocketService;
