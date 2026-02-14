/**
 * Signal Detail Page
 * Shows full details of a single trading signal
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './SignalDetail.css';

const SignalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSignalDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/signals/detail/${id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch signal details');
      }

      const data = await response.json();
      setSignal(data.signal);
      setError(null);
    } catch (err) {
      console.error('Error fetching signal detail:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSignalDetail();
  }, [fetchSignalDetail]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

  if (loading) {
    return (
      <div className="signal-detail-page">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading signal details...</p>
        </div>
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="signal-detail-page">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h2>Signal Not Found</h2>
          <p>{error || 'The requested signal could not be found.'}</p>
          <button onClick={() => navigate('/')} className="back-btn">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const actionColor = getActionColor(signal.signal?.action);
  const confidenceColor = getConfidenceColor(signal.signal?.confidence);

  return (
    <div className="signal-detail-page">
      {/* Header */}
      <div className="detail-header">
        <button onClick={() => navigate('/')} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1 className="detail-title">Signal Details</h1>
      </div>

      {/* Main Signal Card */}
      <div className="detail-card main-signal">
        <div className="signal-header">
          <div className="signal-info">
            <span className={`signal-action-badge ${actionColor}`}>
              {signal.signal?.action || 'HOLD'}
            </span>
            <span className={`confidence-badge ${confidenceColor}`}>
              {signal.signal?.confidence?.toFixed(1) || 0}% Confidence
            </span>
          </div>
          <div className="signal-strength">
            <span className="strength-label">Strength:</span>
            <span className="strength-value">{signal.signal?.strength || 'N/A'}</span>
          </div>
        </div>

        <div className="signal-meta">
          <div className="meta-item">
            <span className="meta-icon">📅</span>
            <div className="meta-content">
              <span className="meta-label">Date</span>
              <span className="meta-value">{formatDate(signal.marketTime)}</span>
            </div>
          </div>
          <div className="meta-item">
            <span className="meta-icon">⏰</span>
            <div className="meta-content">
              <span className="meta-label">Time</span>
              <span className="meta-value">{formatTime(signal.marketTime)}</span>
            </div>
          </div>
          <div className="meta-item">
            <span className="meta-icon">💰</span>
            <div className="meta-content">
              <span className="meta-label">Price</span>
              <span className="meta-value">{formatPrice(signal.price)}</span>
            </div>
          </div>
          <div className="meta-item">
            <span className="meta-icon">📊</span>
            <div className="meta-content">
              <span className="meta-label">Symbol</span>
              <span className="meta-value">{signal.symbol}</span>
            </div>
          </div>
          <div className="meta-item">
            <span className="meta-icon">⏱️</span>
            <div className="meta-content">
              <span className="meta-label">Timeframe</span>
              <span className="meta-value">{signal.timeframe}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Price Levels */}
      {signal.levels && signal.levels.target1 > 0 && (
        <div className="detail-card levels-card">
          <h2 className="card-title">💰 Price Levels</h2>
          <div className="levels-grid">
            <div className="level-box entry">
              <span className="level-icon">📍</span>
              <span className="level-label">Entry Price</span>
              <span className="level-value">{formatPrice(signal.levels.entry)}</span>
            </div>
            <div className="level-box stop-loss">
              <span className="level-icon">🛑</span>
              <span className="level-label">Stop Loss</span>
              <span className="level-value">{formatPrice(signal.levels.stopLoss)}</span>
            </div>
            <div className="level-box target">
              <span className="level-icon">🎯</span>
              <span className="level-label">Target 1</span>
              <span className="level-value">{formatPrice(signal.levels.target1)}</span>
            </div>
            <div className="level-box target">
              <span className="level-icon">🎯</span>
              <span className="level-label">Target 2</span>
              <span className="level-value">{formatPrice(signal.levels.target2)}</span>
            </div>
            <div className="level-box target">
              <span className="level-icon">🎯</span>
              <span className="level-label">Target 3</span>
              <span className="level-value">{formatPrice(signal.levels.target3)}</span>
            </div>
            <div className="level-box ratio">
              <span className="level-icon">📊</span>
              <span className="level-label">Risk:Reward</span>
              <span className="level-value">1:{signal.levels.riskRewardRatio?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Indicator Scores */}
      {signal.scoring && (
        <div className="detail-card scores-card">
          <h2 className="card-title">📈 Indicator Scores</h2>
          <div className="scores-grid">
            <div className="score-box">
              <div className="score-header">
                <span className="score-name">Trend Analysis</span>
                <span className="score-value">{signal.scoring.trendScore?.toFixed(1) || 0}</span>
              </div>
              <div className="score-bar-container">
                <div
                  className="score-bar trend"
                  style={{ width: `${Math.abs(signal.scoring.trendScore || 0)}%` }}
                />
              </div>
            </div>
            <div className="score-box">
              <div className="score-header">
                <span className="score-name">Momentum</span>
                <span className="score-value">{signal.scoring.momentumScore?.toFixed(1) || 0}</span>
              </div>
              <div className="score-bar-container">
                <div
                  className="score-bar momentum"
                  style={{ width: `${Math.abs(signal.scoring.momentumScore || 0)}%` }}
                />
              </div>
            </div>
            <div className="score-box">
              <div className="score-header">
                <span className="score-name">Volume Analysis</span>
                <span className="score-value">{signal.scoring.volumeScore?.toFixed(1) || 0}</span>
              </div>
              <div className="score-bar-container">
                <div
                  className="score-bar volume"
                  style={{ width: `${Math.abs(signal.scoring.volumeScore || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis & Reasoning */}
      {signal.reasoning && signal.reasoning.length > 0 && (
        <div className="detail-card reasoning-card">
          <h2 className="card-title">💡 Technical Analysis</h2>
          <ul className="reasoning-list">
            {signal.reasoning.map((reason, idx) => (
              <li key={idx} className="reasoning-item">
                <span className="reasoning-bullet">▸</span>
                <span className="reasoning-text">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata */}
      {signal.metadata && (
        <div className="detail-card metadata-card">
          <h2 className="card-title">ℹ️ Additional Information</h2>
          <div className="metadata-grid">
            {signal.metadata.candlesAnalyzed && (
              <div className="metadata-item">
                <span className="metadata-label">Candles Analyzed:</span>
                <span className="metadata-value">{signal.metadata.candlesAnalyzed}</span>
              </div>
            )}
            {signal.metadata.indicatorsUsed && (
              <div className="metadata-item">
                <span className="metadata-label">Indicators Used:</span>
                <span className="metadata-value">{signal.metadata.indicatorsUsed}</span>
              </div>
            )}
            {signal.metadata.processingTime && (
              <div className="metadata-item">
                <span className="metadata-label">Processing Time:</span>
                <span className="metadata-value">{signal.metadata.processingTime}ms</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignalDetail;
