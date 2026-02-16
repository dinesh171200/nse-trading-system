import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import Header from './components/Common/Header';
import SignalCard from './components/Signals/SignalCard';
import MoneyControlChart from './components/LiveChart/MoneyControlChart';
import SignalDetail from './pages/SignalDetail';
import SignalHistoryPage from './pages/SignalHistoryPage';
import DetailedChart from './pages/DetailedChart';
import { useWebSocket } from './hooks/useWebSocket';
import { useMarketStatus } from './hooks/useLiveData';
import { useSignals } from './hooks/useSignals';

function Dashboard() {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState('NIFTY50');
  const [selectedTimeframe, setSelectedTimeframe] = useState('5m');
  const [selectedChart, setSelectedChart] = useState('NIFTY50'); // Track chart selection

  // Map chart symbols to signal API symbols
  const chartToSignalMap = {
    'NIFTY50': 'NIFTY50',
    'BANKNIFTY': 'BANKNIFTY',
    'GIFTNIFTY': 'NIFTY50', // Use NIFTY50 signals for Gift Nifty (similar correlation)
    'DOWJONES': 'NIFTY50'   // Use NIFTY50 signals for Dow Jones (no US signals available)
  };

  // Chart display names
  const chartNames = {
    'NIFTY50': 'Nifty 50',
    'BANKNIFTY': 'Bank Nifty',
    'GIFTNIFTY': 'Gift Nifty',
    'DOWJONES': 'Dow Jones'
  };

  // Hooks
  const { connected: wsConnected } = useWebSocket();
  const { status: marketStatus } = useMarketStatus();
  const { signal, loading: signalLoading, refetch: refetchSignal } = useSignals(
    chartToSignalMap[selectedChart] || selectedIndex,
    selectedTimeframe
  );

  return (
    <div className="App">
      <Header marketStatus={marketStatus} wsConnected={wsConnected} />

      <main className="main-content">
        {/* Main Layout: Signal Panel (Left) + Chart (Right) */}
        <div className="main-layout">
          {/* Left Panel: Signals */}
          <div className="left-panel">
            {/* Current Signal */}
            <div className="current-signal-section">
              <h2 className="section-title">
                🎯 {chartNames[selectedChart] || 'Nifty 50'}
                <span className="timeframe-badge">{selectedTimeframe}</span>
              </h2>

              {signalLoading && !signal ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading signal...</p>
                </div>
              ) : signal ? (
                <>
                  <SignalCard signal={signal} />
                  {(selectedChart === 'GIFTNIFTY' || selectedChart === 'DOWJONES') && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      background: 'rgba(255, 193, 7, 0.1)',
                      border: '1px solid rgba(255, 193, 7, 0.3)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'rgba(255, 193, 7, 0.9)'
                    }}>
                      ℹ️ Showing Nifty 50 signals (correlated with {chartNames[selectedChart]})
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">📊</span>
                  <h3>No Signal</h3>
                  <p>Waiting for market data...</p>
                  <button className="retry-btn" onClick={refetchSignal}>
                    Retry
                  </button>
                </div>
              )}

              {/* View History Button */}
              <button
                className="view-history-btn"
                onClick={() => navigate('/history')}
              >
                📜 View Signal History
              </button>
            </div>
          </div>

          {/* Right Panel: Chart */}
          <div className="right-panel">
            <MoneyControlChart
              initialSymbol={selectedIndex}
              onSymbolChange={setSelectedChart}
            />
          </div>
        </div>

        {/* Indicators Info (Full Width Below) */}
        {signal && (
          <div className="indicators-section">
            <div className="indicators-info">
              <h3 className="indicators-title">
                📊 Indicators Analyzed: {signal.metadata?.indicatorsUsed || 0}
              </h3>
              <div className="indicator-list">
                {Object.keys(signal.indicators || {}).map((key) => (
                  <span key={key} className="indicator-tag">
                    {signal.indicators[key].name || key}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="footer-note">
          <p>
            <strong>⚠️ Disclaimer:</strong> Signals are generated using technical analysis only.
            This is for educational purposes. Always do your own research before trading.
          </p>
          <p className="build-info">
            Built with React.js, Node.js, MongoDB • Powered by 72+ Technical Indicators with AI Market Regime Detection
          </p>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/detailed" element={<DetailedChart />} />
        <Route path="/history" element={<SignalHistoryPage />} />
        <Route path="/signal/:id" element={<SignalDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
