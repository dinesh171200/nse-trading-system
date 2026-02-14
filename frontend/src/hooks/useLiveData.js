import { useState, useEffect, useCallback } from 'react';
import { getLatestData, getMarketStatus } from '../services/api';
import { useWebSocketEvent } from './useWebSocket';

export const useLiveData = (symbol) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getLatestData();
      if (response.success) {
        const symbolData = symbol === 'NIFTY50'
          ? response.data.nifty50
          : response.data.bankNifty;
        setData(symbolData);
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  // Initial fetch
  useEffect(() => {
    fetchData();
    // Poll every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Listen for WebSocket updates
  useWebSocketEvent('tick-update', (update) => {
    if (update.symbol === symbol) {
      setData(update);
    }
  });

  return { data, loading, error, refetch: fetchData };
};

export const useMarketStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await getMarketStatus();
        if (response.success) {
          setStatus(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch market status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return { status, loading };
};
