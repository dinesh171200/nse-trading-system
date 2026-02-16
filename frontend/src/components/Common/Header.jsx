import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ marketStatus, wsConnected }) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatusColor = () => {
    if (!marketStatus) return 'gray';
    return marketStatus.isMarketOpen ? 'green' : 'red';
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">
          <span className="icon">🤖</span>
          AI Trading Signals
          <span className="made-by">Made by Dinesh</span>
        </h1>
        <p className="header-subtitle">Powered by 72+ Technical Indicators • Nifty 50 & Bank Nifty</p>
      </div>

      <div className="header-nav">
        <button className="nav-btn" onClick={() => navigate('/')} title="Home">
          🏠 Home
        </button>
        <button className="nav-btn" onClick={() => navigate('/detailed')} title="Detailed Chart">
          📊 Detailed
        </button>
        <button className="nav-btn" onClick={() => navigate('/history')} title="Signal History">
          📜 History
        </button>
      </div>

      <div className="header-right">
        <div className="status-item">
          <span
            className={`status-dot ${getStatusColor()}`}
            title={marketStatus?.isMarketOpen ? 'Market Open' : 'Market Closed'}
          />
          <span className="status-text">
            {marketStatus ? marketStatus.status : 'Loading...'}
          </span>
        </div>

        <div className="status-item">
          <span
            className={`status-dot ${wsConnected ? 'green' : 'gray'}`}
            title={wsConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
          />
          <span className="status-text">
            {wsConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        <div className="market-time">
          <div className="time-display">
            <span className="time-date">{formatDate(currentTime)}</span>
            <span className="time-value">{formatTime(currentTime)}</span>
            <span className="time-zone">IST</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
