/**
 * Signal History Page
 * Shows all trading signals in a grid/list view
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignalHistoryPage.css';

const SignalHistoryPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, buy, sell

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/signals/history?limit=100`
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
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'buy') return item.signal?.action?.includes('BUY');
    if (filter === 'sell') return item.signal?.action?.includes('SELL');
    return true;
  });

  if (loading) {
    return (
      <div className="history-page">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading signal history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-page">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h2>Failed to Load History</h2>
          <p>{error}</p>
          <button onClick={fetchHistory} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      {/* Header */}
      <div className="history-header">
        <button onClick={() => navigate('/')} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1 className="history-title">📜 Signal History</h1>
        <button onClick={fetchHistory} className="refresh-btn" title="Refresh">
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="history-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Signals ({history.length})
        </button>
        <button
          className={`filter-btn ${filter === 'buy' ? 'active' : ''}`}
          onClick={() => setFilter('buy')}
        >
          🟢 Buy Signals ({history.filter(s => s.signal?.action?.includes('BUY')).length})
        </button>
        <button
          className={`filter-btn ${filter === 'sell' ? 'active' : ''}`}
          onClick={() => setFilter('sell')}
        >
          🔴 Sell Signals ({history.filter(s => s.signal?.action?.includes('SELL')).length})
        </button>
      </div>

      {/* Signals Grid */}
      {filteredHistory.length === 0 ? (
        <div className="empty-history">
          <span className="empty-icon">📊</span>
          <h3>No Signals Found</h3>
          <p>No signals match your current filter.</p>
        </div>
      ) : (
        <div className="signals-grid">
          {filteredHistory.map((item, index) => {
            const actionColor = getActionColor(item.signal?.action);
            const confidenceColor = getConfidenceColor(item.signal?.confidence);

            return (
              <div
                key={item._id || index}
                className={`signal-card ${actionColor}`}
                onClick={() => navigate(`/signal/${item._id}`)}
              >
                <div className="card-header">
                  <span className={`action-badge ${actionColor}`}>
                    {item.signal?.action || 'HOLD'}
                  </span>
                  <span className={`confidence-badge ${confidenceColor}`}>
                    {item.signal?.confidence?.toFixed(0) || 0}%
                  </span>
                </div>

                <div className="card-body">
                  <div className="price-info">
                    <span className="price-label">Price</span>
                    <span className="price-value">{formatPrice(item.price)}</span>
                  </div>

                  <div className="meta-row">
                    <span className="meta-item">
                      📅 {formatDate(item.marketTime)}
                    </span>
                    <span className="meta-item">
                      ⏰ {formatTime(item.marketTime)}
                    </span>
                  </div>

                  <div className="meta-row">
                    <span className="meta-item">
                      📊 {item.symbol}
                    </span>
                    <span className="meta-item">
                      ⏱️ {item.timeframe}
                    </span>
                  </div>

                  {item.signal?.strength && (
                    <div className="strength-badge">
                      {item.signal.strength}
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <span className="view-details">
                    View Details →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SignalHistoryPage;
