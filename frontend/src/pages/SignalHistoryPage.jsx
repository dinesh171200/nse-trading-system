/**
 * Old/Running Trades Page
 * Shows all trading signals with automatic profit/loss tracking
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
  const [symbolFilter, setSymbolFilter] = useState('all'); // all, NIFTY50, BANKNIFTY, DOWJONES

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

  const clearAllHistory = async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete ALL signal history? This action cannot be undone!')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/signals/clear-all?confirm=true`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to clear signal history');
      }

      const data = await response.json();
      alert(`✅ Successfully deleted ${data.deleted.total} signals`);
      setHistory([]);
      setError(null);
    } catch (err) {
      console.error('Error clearing signal history:', err);
      alert(`❌ Error: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const formatPrice = (price, symbol) => {
    if (!price) return 'N/A';
    const currencySymbol = symbol === 'DOWJONES' ? '$' : '₹';
    return `${currencySymbol}${price.toFixed(2)}`;
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
    // Filter by action
    let matchesAction = true;
    if (filter === 'buy') matchesAction = item.signal?.action?.includes('BUY');
    if (filter === 'sell') matchesAction = item.signal?.action?.includes('SELL');

    // Filter by symbol
    let matchesSymbol = true;
    if (symbolFilter !== 'all') matchesSymbol = item.symbol === symbolFilter;

    return matchesAction && matchesSymbol;
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
        <h1 className="history-title">📊 Old/Running Trades</h1>
        <div className="header-actions">
          <button onClick={fetchHistory} className="refresh-btn" title="Refresh">
            🔄 Refresh
          </button>
          <button onClick={clearAllHistory} className="clear-all-btn" title="Clear All History">
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* Symbol Filters */}
      <div className="history-filters">
        <div className="filter-group">
          <label className="filter-label">Index:</label>
          <button
            className={`filter-btn ${symbolFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSymbolFilter('all')}
          >
            All ({history.length})
          </button>
          <button
            className={`filter-btn ${symbolFilter === 'NIFTY50' ? 'active' : ''}`}
            onClick={() => setSymbolFilter('NIFTY50')}
          >
            Nifty 50 ({history.filter(s => s.symbol === 'NIFTY50').length})
          </button>
          <button
            className={`filter-btn ${symbolFilter === 'BANKNIFTY' ? 'active' : ''}`}
            onClick={() => setSymbolFilter('BANKNIFTY')}
          >
            Bank Nifty ({history.filter(s => s.symbol === 'BANKNIFTY').length})
          </button>
          <button
            className={`filter-btn ${symbolFilter === 'DOWJONES' ? 'active' : ''}`}
            onClick={() => setSymbolFilter('DOWJONES')}
          >
            Dow Jones ({history.filter(s => s.symbol === 'DOWJONES').length})
          </button>
        </div>
      </div>

      {/* Action Filters */}
      <div className="history-filters">
        <div className="filter-group">
          <label className="filter-label">Action:</label>
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Signals
          </button>
          <button
            className={`filter-btn ${filter === 'buy' ? 'active' : ''}`}
            onClick={() => setFilter('buy')}
          >
            🟢 Buy Only
          </button>
          <button
            className={`filter-btn ${filter === 'sell' ? 'active' : ''}`}
            onClick={() => setFilter('sell')}
          >
            🔴 Sell Only
          </button>
        </div>
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
                    <span className="price-value">{formatPrice(item.price, item.symbol)}</span>
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

                {/* Profit/Loss Badge */}
                {item.performance && item.performance.outcome && item.performance.outcome !== 'PENDING' && (
                  <div className={`performance-badge ${item.performance.outcome === 'WIN' ? 'profit' : 'loss'}`}>
                    <span className="performance-icon">
                      {item.performance.outcome === 'WIN' ? '✅' : '❌'}
                    </span>
                    <div className="performance-details">
                      <div className="performance-pl">
                        {item.performance.profitLoss >= 0 ? '+' : ''}
                        {formatPrice(Math.abs(item.performance.profitLoss || 0), item.symbol)}
                        {item.performance.profitLossPercent && (
                          <span className="performance-percent">
                            ({item.performance.profitLossPercent >= 0 ? '+' : ''}
                            {item.performance.profitLossPercent.toFixed(2)}%)
                          </span>
                        )}
                      </div>
                      {item.performance.remarks && (
                        <div className="performance-remarks">
                          {item.performance.remarks}
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
