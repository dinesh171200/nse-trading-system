import React from 'react';
import './IndexSelector.css';

const IndexSelector = ({ selected, onChange }) => {
  const indices = [
    { value: 'NIFTY50', label: 'Nifty 50', icon: '📈' },
    { value: 'BANKNIFTY', label: 'Bank Nifty', icon: '🏦' }
  ];

  return (
    <div className="index-selector">
      {indices.map(index => (
        <button
          key={index.value}
          className={`index-btn ${selected === index.value ? 'active' : ''}`}
          onClick={() => onChange(index.value)}
        >
          <span className="index-icon">{index.icon}</span>
          <span className="index-label">{index.label}</span>
        </button>
      ))}
    </div>
  );
};

export default IndexSelector;
