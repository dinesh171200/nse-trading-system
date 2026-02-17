import { useState, useEffect, useCallback } from 'react';
import { getTradingSignal } from '../services/api';
import { useWebSocketEvent } from './useWebSocket';

export const useSignals = (symbol, timeframe) => {
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSignal = useCallback(async () => {
    if (!symbol || !timeframe) return;

    try {
      setLoading(true);
      const response = await getTradingSignal(symbol, timeframe, 50);
      if (response.success) {
        setSignal(response.data);
        setError(null);
      } else {
        // No signal found - clear old signal instead of keeping it
        setSignal(null);
        setError('No signal available for this index');
      }
    } catch (err) {
      // Error fetching - also clear old signal
      setSignal(null);
      setError(err.message);
      console.error('Failed to fetch signal:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  // Clear signal immediately when symbol/timeframe changes
  useEffect(() => {
    setSignal(null);
    setError(null);
    setLoading(true);
  }, [symbol, timeframe]);

  // Initial fetch
  useEffect(() => {
    fetchSignal();
    // Refresh every 10 seconds for more responsive updates
    const interval = setInterval(fetchSignal, 10000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]); // Only depend on symbol and timeframe to avoid infinite re-renders

  // Listen for WebSocket updates
  useWebSocketEvent('signal-generated', (newSignal) => {
    if (newSignal.symbol === symbol && newSignal.timeframe === timeframe) {
      setSignal(newSignal);
    }
  });

  return { signal, loading, error, refetch: fetchSignal };
};
