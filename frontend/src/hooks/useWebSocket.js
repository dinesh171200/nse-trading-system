import { useEffect, useState } from 'react';
import websocketService from '../services/websocket';

export const useWebSocket = () => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    websocketService.connect();

    const handleConnection = ({ connected, error }) => {
      setConnected(connected);
      if (error) {
        console.error('WebSocket error:', error);
      }
    };

    websocketService.on('connection_status', handleConnection);

    return () => {
      websocketService.off('connection_status', handleConnection);
    };
  }, []);

  return { connected };
};

export const useWebSocketEvent = (event, callback) => {
  useEffect(() => {
    websocketService.on(event, callback);

    return () => {
      websocketService.off(event, callback);
    };
  }, [event, callback]);
};
