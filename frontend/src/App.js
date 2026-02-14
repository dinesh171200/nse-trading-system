import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import Header from './components/Common/Header';
import IndexSelector from './components/Common/IndexSelector';
import PriceDisplay from './components/LiveChart/PriceDisplay';
import SignalCard from './components/Signals/SignalCard';
import LiveChart from './components/LiveChart/LiveChart';
import SignalDetail from './pages/SignalDetail';
import SignalHistoryPage from './pages/SignalHistoryPage';
import { useWebSocket } from './hooks/useWebSocket';
import { useLiveData, useMarketStatus } from './hooks/useLiveData';
import { useSignals } from './hooks/useSignals';

function Dashboard() {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState('NIFTY50');
  const [selectedTimeframe, setSelectedTimeframe] = useState('5m');

  // Hooks
  const { connected: wsConnected } = useWebSocket();
  const { status: marketStatus } = useMarketStatus();
  const { data: liveData } = useLiveData(selectedIndex);
  const { signal, loading: signalLoading, refetch: refetchSignal } = useSignals(
    selectedIndex,
    selectedTimeframe
  );

  return (
    <div className="App">
      <Header marketStatus={marketStatus} wsConnected={wsConnected} />

      <main className="main-content">
        {/* Top Bar: Index Selection & Price */}
        <div className="top-bar">
          <IndexSelector
            selected={selectedIndex}
            onChange={setSelectedIndex}
          />
          <PriceDisplay data={liveData} symbol={selectedIndex} />
        </div>

        {/* Main Layout: Signal Panel (Left) + Chart (Right) */}
        <div className="main-layout">
          {/* Left Panel: Signals */}
          <div className="left-panel">
            {/* Current Signal */}
            <div className="current-signal-section">
              <h2 className="section-title">
                🎯 Live Trading Signal
                <span className="timeframe-badge">{selectedTimeframe}</span>
              </h2>

              {signalLoading && !signal ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading signal...</p>
                </div>
              ) : signal ? (
                <SignalCard signal={signal} />
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
            <LiveChart
              data={liveData}
              symbol={selectedIndex}
              timeframe={selectedTimeframe}
              onTimeframeChange={setSelectedTimeframe}
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
            Built with React.js, Node.js, MongoDB • Powered by 16+ Technical Indicators
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
        <Route path="/history" element={<SignalHistoryPage />} />
        <Route path="/signal/:id" element={<SignalDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
