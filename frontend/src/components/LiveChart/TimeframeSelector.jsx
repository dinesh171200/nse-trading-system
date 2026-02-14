import React from 'react';
import './TimeframeSelector.css';

const TimeframeSelector = ({ selected, onChange }) => {
  const timeframes = [
    { value: '1m', label: '1M' },
    { value: '5m', label: '5M' },
    { value: '15m', label: '15M' },
    { value: '30m', label: '30M' },
    { value: '1h', label: '1H' },
    { value: '1d', label: '1D' }
  ];

  return (
    <div className="timeframe-selector">
      {timeframes.map(tf => (
        <button
          key={tf.value}
          className={`tf-btn ${selected === tf.value ? 'active' : ''}`}
          onClick={() => onChange(tf.value)}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
};

export default TimeframeSelector;
