import React from 'react';
import './SignalCard.css';

const SignalCard = ({ signal }) => {
  if (!signal) {
    return (
      <div className="signal-card loading">
        <div className="skeleton skeleton-header"></div>
        <div className="skeleton skeleton-body"></div>
      </div>
    );
  }

  const getActionColor = (action) => {
    switch (action) {
      case 'STRONG_BUY':
      case 'BUY':
        return 'bullish';
      case 'STRONG_SELL':
      case 'SELL':
        return 'bearish';
      default:
        return 'neutral';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'STRONG_BUY': return '🚀';
      case 'BUY': return '✅';
      case 'STRONG_SELL': return '🛑';
      case 'SELL': return '⛔';
      default: return '⏸️';
    }
  };

  const actionColor = getActionColor(signal.signal.action);
  const actionIcon = getActionIcon(signal.signal.action);

  return (
    <div className={`signal-card ${actionColor}`}>
      <div className="signal-header">
        <div className="signal-action">
          <span className="action-icon">{actionIcon}</span>
          <span className="action-text">{signal.signal.action.replace('_', ' ')}</span>
        </div>
        <div className="signal-meta">
          <span className="confidence-badge">{signal.signal.confidence.toFixed(0)}%</span>
        </div>
      </div>

      <div className="confidence-bar-container">
        <div
          className="confidence-bar-fill"
          style={{ width: `${signal.signal.confidence}%` }}
        />
      </div>

      <div className="signal-details">
        <div className="detail-row">
          <span className="detail-label">Current Price:</span>
          <span className="detail-value">₹{signal.currentPrice.toFixed(2)}</span>
        </div>

        {signal.signal.action !== 'HOLD' && (
          <>
            <div className="detail-row">
              <span className="detail-label">Entry:</span>
              <span className="detail-value entry">₹{signal.levels.entry.toFixed(2)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Stop Loss:</span>
              <span className="detail-value stop-loss">₹{signal.levels.stopLoss.toFixed(2)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Target 1:</span>
              <span className="detail-value target">₹{signal.levels.target1.toFixed(2)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">R/R Ratio:</span>
              <span className="detail-value">1:{signal.levels.riskRewardRatio.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {/* Performance Display - Show if target/SL was hit */}
      {signal.performance && signal.performance.targetHit && signal.performance.targetHit !== 'NONE' && (
        <div className={`signal-performance ${signal.performance.outcome === 'WIN' ? 'win' : 'loss'}`}>
          <div className="performance-header">
            <span className="performance-icon">
              {signal.performance.outcome === 'WIN' ? '✅' : '❌'}
            </span>
            <span className="performance-status">
              {signal.performance.outcome === 'WIN' ? 'Target Hit!' : 'Stop Loss Hit'}
            </span>
          </div>
          <div className="performance-details">
            <div className="performance-item">
              <span className="performance-label">Hit Level:</span>
              <span className="performance-value">{signal.performance.targetHit.replace(/(\d)/, ' $1')}</span>
            </div>
            <div className="performance-item">
              <span className="performance-label">Exit Price:</span>
              <span className="performance-value">₹{signal.performance.exitPrice?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="performance-item">
              <span className="performance-label">P/L:</span>
              <span className={`performance-value ${signal.performance.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                {signal.performance.profitLoss >= 0 ? '+' : ''}₹{signal.performance.profitLoss?.toFixed(2) || 'N/A'}
                {signal.performance.profitLossPercent && (
                  <> ({signal.performance.profitLossPercent >= 0 ? '+' : ''}{signal.performance.profitLossPercent.toFixed(2)}%)</>
                )}
              </span>
            </div>
            {signal.performance.exitTime && (
              <div className="performance-item">
                <span className="performance-label">Exit Time:</span>
                <span className="performance-value">
                  {new Date(signal.performance.exitTime).toLocaleString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="signal-scores">
        <div className="score-item">
          <span className="score-label">Trend</span>
          <span className="score-value">{signal.scoring.trendScore.toFixed(0)}</span>
        </div>
        <div className="score-item">
          <span className="score-label">Momentum</span>
          <span className="score-value">{signal.scoring.momentumScore.toFixed(0)}</span>
        </div>
        <div className="score-item">
          <span className="score-label">Total</span>
          <span className="score-value">{signal.scoring.totalScore.toFixed(0)}</span>
        </div>
      </div>

      {signal.reasoning && signal.reasoning.length > 0 && (
        <div className="signal-reasoning">
          <h4 className="reasoning-title">Analysis:</h4>
          <ul className="reasoning-list">
            {signal.reasoning.slice(0, 3).map((reason, index) => (
              <li key={index} className="reasoning-item">{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {signal.alerts && signal.alerts.length > 0 && (
        <div className="signal-alerts">
          {signal.alerts.map((alert, index) => (
            <div key={index} className="alert-item">
              ⚠️ {alert}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SignalCard;
