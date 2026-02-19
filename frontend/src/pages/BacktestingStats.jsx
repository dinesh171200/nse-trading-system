/**
 * Backtesting Statistics Page
 * Shows performance metrics and trading results
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './BacktestingStats.css';

const BacktestingStats = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [symbol, setSymbol] = useState('ALL');
  const [days, setDays] = useState(30);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/signals/statistics?symbol=${symbol}&days=${days}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch backtesting statistics');
      }

      const data = await response.json();
      setStats(data.stats);
      setError(null);
    } catch (err) {
      console.error('Error fetching backtesting stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbol, days]);

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const formatCurrency = (value) => {
    if (!value || value === 'N/A') return 'N/A';
    const num = parseFloat(value);
    return num >= 0 ? `+₹${num.toFixed(2)}` : `₹${num.toFixed(2)}`;
  };

  const formatPercent = (value) => {
    if (!value || value === 'N/A') return 'N/A';
    const num = parseFloat(value);
    return num >= 0 ? `+${num}%` : `${num}%`;
  };

  const getOutcomeColor = (outcome) => {
    if (outcome === 'WIN') return 'win';
    if (outcome === 'LOSS') return 'loss';
    return 'pending';
  };

  if (loading && !stats) {
    return (
      <div className="backtesting-page">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading backtesting statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="backtesting-page">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h2>Failed to Load Statistics</h2>
          <p>{error}</p>
          <button onClick={fetchStats} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="backtesting-page">
      {/* Header */}
      <div className="backtesting-header">
        <button onClick={() => navigate('/')} className="back-btn">
          ← Back
        </button>
        <h1 className="backtesting-title">📊 Backtesting Statistics</h1>
        <button onClick={fetchStats} className="refresh-btn" disabled={loading}>
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="backtesting-filters">
        <div className="filter-group">
          <label>Symbol:</label>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            <option value="ALL">All Indices</option>
            <option value="NIFTY50">Nifty 50</option>
            <option value="BANKNIFTY">Bank Nifty</option>
            <option value="DOWJONES">Dow Jones</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Period:</label>
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
        </div>
      </div>

      {stats && (
        <>
          {/* Overview Cards */}
          <div className="stats-overview">
            <div className="stat-card total">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalSignals}</div>
                <div className="stat-label">Total Signals</div>
              </div>
            </div>

            <div className="stat-card wins">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{stats.wins}</div>
                <div className="stat-label">Wins</div>
              </div>
            </div>

            <div className="stat-card losses">
              <div className="stat-icon">❌</div>
              <div className="stat-content">
                <div className="stat-value">{stats.losses}</div>
                <div className="stat-label">Losses</div>
              </div>
            </div>

            <div className="stat-card pending">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-value">{stats.pending}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="performance-section">
            <h2>📊 Performance Metrics</h2>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Win Rate</div>
                <div className={`metric-value ${parseFloat(stats.winRate) >= 50 ? 'positive' : 'negative'}`}>
                  {stats.winRate}%
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Loss Rate</div>
                <div className="metric-value negative">{stats.lossRate}%</div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Total P/L</div>
                <div className={`metric-value ${parseFloat(stats.totalPL) >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(stats.totalPL)}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Total P/L %</div>
                <div className={`metric-value ${parseFloat(stats.totalPLPercent) >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercent(stats.totalPLPercent)}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Average P/L</div>
                <div className={`metric-value ${parseFloat(stats.avgPL) >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(stats.avgPL)}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Average P/L %</div>
                <div className={`metric-value ${parseFloat(stats.avgPLPercent) >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercent(stats.avgPLPercent)}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Avg Win</div>
                <div className="metric-value positive">{formatPercent(stats.avgWin)}</div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Avg Loss</div>
                <div className="metric-value negative">{formatPercent(stats.avgLoss)}</div>
              </div>
            </div>
          </div>

          {/* Target Breakdown */}
          <div className="targets-section">
            <h2>🎯 Target Breakdown</h2>
            <div className="targets-grid">
              <div className="target-card">
                <div className="target-label">🟢 Target 1</div>
                <div className="target-value">{stats.targetBreakdown.target1}</div>
              </div>
              <div className="target-card">
                <div className="target-label">🟡 Target 2</div>
                <div className="target-value">{stats.targetBreakdown.target2}</div>
              </div>
              <div className="target-card">
                <div className="target-label">🔵 Target 3</div>
                <div className="target-value">{stats.targetBreakdown.target3}</div>
              </div>
              <div className="target-card loss">
                <div className="target-label">🔴 Stop Loss</div>
                <div className="target-value">{stats.targetBreakdown.stopLoss}</div>
              </div>
            </div>
          </div>

          {/* By Action & Symbol */}
          <div className="breakdown-section">
            <div className="breakdown-card">
              <h3>By Action</h3>
              <div className="breakdown-item">
                <span>🟢 Buy Signals</span>
                <span className="breakdown-value">{stats.byAction.buy}</span>
              </div>
              <div className="breakdown-item">
                <span>🔴 Sell Signals</span>
                <span className="breakdown-value">{stats.byAction.sell}</span>
              </div>
            </div>

            {stats.bySymbol && (
              <div className="breakdown-card">
                <h3>By Symbol</h3>
                <div className="breakdown-item">
                  <span>📊 Nifty 50</span>
                  <span className="breakdown-value">{stats.bySymbol.NIFTY50}</span>
                </div>
                <div className="breakdown-item">
                  <span>🏦 Bank Nifty</span>
                  <span className="breakdown-value">{stats.bySymbol.BANKNIFTY}</span>
                </div>
                <div className="breakdown-item">
                  <span>🇺🇸 Dow Jones</span>
                  <span className="breakdown-value">{stats.bySymbol.DOWJONES}</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Signals */}
          {stats.recentSignals && stats.recentSignals.length > 0 && (
            <div className="recent-signals-section">
              <h2>📜 Recent Signals</h2>
              <div className="signals-table-container">
                <table className="signals-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Symbol</th>
                      <th>Action</th>
                      <th>Confidence</th>
                      <th>Price</th>
                      <th>Outcome</th>
                      <th>P/L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentSignals.map((signal, index) => (
                      <tr key={index}>
                        <td>{new Date(signal.time).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</td>
                        <td><strong>{signal.symbol}</strong></td>
                        <td>
                          <span className={`action-badge ${signal.action.toLowerCase()}`}>
                            {signal.action}
                          </span>
                        </td>
                        <td>{signal.confidence.toFixed(1)}%</td>
                        <td>{signal.symbol === 'DOWJONES' ? '$' : '₹'}{signal.price.toFixed(2)}</td>
                        <td>
                          <span className={`outcome-badge ${getOutcomeColor(signal.outcome)}`}>
                            {signal.outcome}
                          </span>
                        </td>
                        <td className={parseFloat(signal.profitLossPercent) >= 0 ? 'positive' : 'negative'}>
                          {signal.profitLossPercent === 'N/A' ? 'N/A' : formatPercent(signal.profitLossPercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {stats.totalSignals === 0 && (
            <div className="empty-state">
              <span className="empty-icon">📊</span>
              <h3>No Signals Yet</h3>
              <p>Wait for the market to open and signals will appear here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BacktestingStats;
