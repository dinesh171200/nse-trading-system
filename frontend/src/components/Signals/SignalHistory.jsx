/**
 * Signal History Component
 * Displays past trading signals with expand/collapse
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignalHistory.css';

const SignalHistory = ({ symbol, limit = 20 }) => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/signals/history?symbol=${symbol}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch signal history');
      }

      const data = await response.json();
      setHistory(data.signals || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching signal history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbol, limit]);

  // Fetch signal history
  useEffect(() => {
    fetchHistory();

    // Refresh every 2 minutes
    const interval = setInterval(fetchHistory, 120000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  const handleSignalClick = (id) => {
    navigate(`/signal/${id}`);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatPrice = (price) => {
    return price ? `₹${price.toFixed(2)}` : 'N/A';
  };

  const getActionColor = (action) => {
    if (!action) return '';
    if (action.includes('BUY')) return 'buy';
    if (action.includes('SELL')) return 'sell';
    return 'hold';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  };

  if (loading && history.length === 0) {
    return (
      <div className="signal-history loading">
        <div className="spinner"></div>
        <p>Loading signal history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="signal-history error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button onClick={fetchHistory} className="retry-btn">Retry</button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="signal-history empty">
        <span className="empty-icon">📊</span>
        <p>No signal history yet</p>
        <small>Signals will appear as they are generated</small>
      </div>
    );
  }

  return (
    <div className="signal-history">
      <div className="history-header">
        <h3>📜 Signal History</h3>
        <span className="history-count">{history.length} signals</span>
        <button onClick={fetchHistory} className="refresh-btn" title="Refresh">
          🔄
        </button>
      </div>

      <div className="history-list">
        {history.map((item, index) => {
          const actionColor = getActionColor(item.signal?.action);
          const confidenceColor = getConfidenceColor(item.signal?.confidence);

          return (
            <div
              key={item._id || index}
              className="history-item"
              onClick={() => handleSignalClick(item._id)}
            >
              <div className="history-item-summary">
                <div className="summary-left">
                  <span className={`signal-badge ${actionColor}`}>
                    {item.signal?.action || 'HOLD'}
                  </span>
                  <span className="signal-time">
                    {formatTime(item.marketTime)}
                    <small>{formatDate(item.marketTime)}</small>
                  </span>
                </div>

                <div className="summary-right">
                  <span className={`confidence-badge ${confidenceColor}`}>
                    {item.signal?.confidence?.toFixed(0) || 0}%
                  </span>
                  <span className="signal-price">
                    {formatPrice(item.price)}
                  </span>
                  <span className="view-icon">
                    👁️
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SignalHistory;