import React from 'react';
import './PriceDisplay.css';

const PriceDisplay = ({ data, symbol }) => {
  if (!data) {
    return (
      <div className="price-display loading">
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-price"></div>
      </div>
    );
  }

  const isPositive = data.metadata?.changePercent >= 0;
  const changeSymbol = isPositive ? '+' : '';

  return (
    <div className="price-display">
      <div className="price-header">
        <h2 className="symbol-name">
          {symbol === 'NIFTY50' ? 'Nifty 50' : 'Bank Nifty'}
        </h2>
        <span className="data-source">{data.source || 'NSE'}</span>
      </div>

      <div className="price-main">
        <div className="current-price">₹{data.price?.toFixed(2)}</div>
        <div className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
          <span className="change-value">
            {changeSymbol}{data.metadata?.change?.toFixed(2)}
          </span>
          <span className="change-percent">
            ({changeSymbol}{data.metadata?.changePercent?.toFixed(2)}%)
          </span>
        </div>
      </div>

      <div className="price-details">
        <div className="detail-item">
          <span className="detail-label">Open:</span>
          <span className="detail-value">₹{data.metadata?.open?.toFixed(2)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">High:</span>
          <span className="detail-value">₹{data.metadata?.high?.toFixed(2)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Low:</span>
          <span className="detail-value">₹{data.metadata?.low?.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default PriceDisplay;
