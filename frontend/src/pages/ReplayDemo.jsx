/**
 * Replay Demo Page
 * Live simulation using Feb 13, 2024 historical data
 */

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './ReplayDemo.css';

const SOCKET_URL = 'http://localhost:3001';

function ReplayDemo() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [replayStatus, setReplayStatus] = useState(null);
  const [currentData, setCurrentData] = useState(null);
  const [speed, setSpeed] = useState(1);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('replay-status', (status) => {
      console.log('Replay status:', status);
      setReplayStatus(status);
    });

    newSocket.on('replay-update', (data) => {
      console.log('Replay update:', data);
      setCurrentData(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Load replay data on mount
  useEffect(() => {
    if (isConnected) {
      loadReplayData();
    }
  }, [isConnected]);

  const loadReplayData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/replay/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'NIFTY50' })
      });
      const result = await response.json();
      console.log('Data loaded:', result);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleStart = () => {
    if (socket) {
      socket.emit('replay-start', { speed });
    }
  };

  const handlePause = () => {
    if (socket) {
      socket.emit('replay-pause');
    }
  };

  const handleResume = () => {
    if (socket) {
      socket.emit('replay-resume');
    }
  };

  const handleStop = () => {
    if (socket) {
      socket.emit('replay-stop');
    }
  };

  const formatPrice = (price) => {
    return price ? `₹${price.toFixed(2)}` : 'N/A';
  };

  const formatPercent = (value) => {
    if (!value) return '0.00%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getActionColor = (action) => {
    if (!action) return '';
    if (action.includes('BUY')) return 'buy';
    if (action.includes('SELL')) return 'sell';
    return 'hold';
  };

  return (
    <div className="replay-demo">
      {/* Header */}
      <header className="replay-header">
        <div className="header-left">
          <h1>📊 Live Replay Demo</h1>
          <span className="demo-badge">Feb 13, 2024 Data</span>
        </div>
        <div className="header-right">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="replay-controls">
        <div className="control-buttons">
          <button
            onClick={handleStart}
            disabled={replayStatus?.isPlaying}
            className="btn btn-start"
          >
            ▶️ Start
          </button>
          <button
            onClick={handlePause}
            disabled={!replayStatus?.isPlaying}
            className="btn btn-pause"
          >
            ⏸️ Pause
          </button>
          <button
            onClick={handleResume}
            disabled={replayStatus?.isPlaying}
            className="btn btn-resume"
          >
            ▶️ Resume
          </button>
          <button
            onClick={handleStop}
            className="btn btn-stop"
          >
            ⏹️ Stop
          </button>
        </div>

        <div className="speed-control">
          <label>Speed: {speed}x</label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            disabled={replayStatus?.isPlaying}
          />
        </div>

        {replayStatus && (
          <div className="progress-info">
            <div className="progress-text">
              {currentData?.marketTime || 'Not started'} |{' '}
              Tick {replayStatus.currentIndex} / {replayStatus.totalTicks} |{' '}
              {currentData?.progress || 0}%
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${currentData?.progress || 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Live Data Display */}
      {currentData && (
        <div className="live-data">
          {/* Price Card */}
          <div className="data-card price-card">
            <h2>💰 Current Price</h2>
            <div className="price-display">
              <div className="main-price">{formatPrice(currentData.currentTick.price)}</div>
              <div className={`price-change ${currentData.currentTick.changePercent >= 0 ? 'positive' : 'negative'}`}>
                {formatPercent(currentData.currentTick.changePercent)}
              </div>
            </div>
            <div className="ohlc-data">
              <div className="ohlc-item">
                <span className="label">Open:</span>
                <span className="value">{formatPrice(currentData.currentTick.open)}</span>
              </div>
              <div className="ohlc-item">
                <span className="label">High:</span>
                <span className="value green">{formatPrice(currentData.currentTick.high)}</span>
              </div>
              <div className="ohlc-item">
                <span className="label">Low:</span>
                <span className="value red">{formatPrice(currentData.currentTick.low)}</span>
              </div>
              <div className="ohlc-item">
                <span className="label">Volume:</span>
                <span className="value">{currentData.currentTick.volume?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Signal Card */}
          {currentData.signal && (
            <div className="data-card signal-card">
              <h2>📊 Trading Signal</h2>
              <div className={`signal-action ${getActionColor(currentData.signal.signal.action)}`}>
                <div className="action-label">{currentData.signal.signal.action}</div>
                <div className="confidence-display">
                  <div className="confidence-text">
                    {currentData.signal.signal.confidence.toFixed(1)}% Confidence
                  </div>
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{ width: `${currentData.signal.signal.confidence}%` }}
                    />
                  </div>
                </div>
              </div>

              {currentData.signal.levels && currentData.signal.levels.target1 > 0 && (
                <div className="levels-display">
                  <div className="level-row">
                    <span className="level-label">📍 Entry:</span>
                    <span className="level-value">{formatPrice(currentData.signal.levels.entry)}</span>
                  </div>
                  <div className="level-row">
                    <span className="level-label">🛑 Stop Loss:</span>
                    <span className="level-value red">{formatPrice(currentData.signal.levels.stopLoss)}</span>
                  </div>
                  <div className="level-row">
                    <span className="level-label">🎯 Target 1:</span>
                    <span className="level-value green">{formatPrice(currentData.signal.levels.target1)}</span>
                  </div>
                  <div className="level-row">
                    <span className="level-label">🎯 Target 2:</span>
                    <span className="level-value green">{formatPrice(currentData.signal.levels.target2)}</span>
                  </div>
                  <div className="level-row">
                    <span className="level-label">🎯 Target 3:</span>
                    <span className="level-value green">{formatPrice(currentData.signal.levels.target3)}</span>
                  </div>
                  <div className="level-row">
                    <span className="level-label">📊 R:R Ratio:</span>
                    <span className="level-value">1:{currentData.signal.levels.riskRewardRatio.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {currentData.signal.reasoning && (
                <div className="reasoning">
                  <h3>💡 Analysis</h3>
                  <ul>
                    {currentData.signal.reasoning.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Indicators Summary */}
          {currentData.signal && currentData.signal.scoring && (
            <div className="data-card indicators-card">
              <h2>📈 Indicator Scores</h2>
              <div className="indicator-scores">
                <div className="score-item">
                  <span className="score-label">Trend</span>
                  <div className="score-bar">
                    <div
                      className="score-fill trend"
                      style={{ width: `${Math.abs(currentData.signal.scoring.trendScore)}%` }}
                    />
                  </div>
                  <span className="score-value">{currentData.signal.scoring.trendScore.toFixed(0)}</span>
                </div>
                <div className="score-item">
                  <span className="score-label">Momentum</span>
                  <div className="score-bar">
                    <div
                      className="score-fill momentum"
                      style={{ width: `${Math.abs(currentData.signal.scoring.momentumScore)}%` }}
                    />
                  </div>
                  <span className="score-value">{currentData.signal.scoring.momentumScore.toFixed(0)}</span>
                </div>
                <div className="score-item">
                  <span className="score-label">Volume</span>
                  <div className="score-bar">
                    <div
                      className="score-fill volume"
                      style={{ width: `${Math.abs(currentData.signal.scoring.volumeScore)}%` }}
                    />
                  </div>
                  <span className="score-value">{currentData.signal.scoring.volumeScore.toFixed(0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Waiting State */}
      {!currentData && (
        <div className="waiting-state">
          <div className="waiting-message">
            <h2>🎬 Ready to Start Replay</h2>
            <p>Click "Start" to begin playing through Feb 13, 2024 market data minute-by-minute</p>
            <p className="info-text">
              {replayStatus?.totalTicks} minutes of historical data loaded
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReplayDemo;
