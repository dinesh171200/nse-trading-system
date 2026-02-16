import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import './DetailedChart.css';

// MoneyControl API symbols
const SYMBOLS = {
  NIFTY50: { symbol: 'in;NSX', type: 'candlestick', api: 'indian' },
  BANKNIFTY: { symbol: 'in;nbx', type: 'candlestick', api: 'indian' },
  DOWJONES: { symbol: 'INDU:FUT', type: 'line', api: 'us' }
};

function DetailedChart() {
  const navigate = useNavigate();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const lineSeriesRef = useRef(null);

  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY50');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [candleCount, setCandleCount] = useState(0);
  const [timeRange, setTimeRange] = useState({ from: null, to: null });

  // Fetch data from MoneyControl API
  const fetchMoneyControlData = async () => {
    try {
      setLoading(true);
      setError(null);

      const symbolConfig = SYMBOLS[selectedSymbol];
      let url, data, chartData;

      if (symbolConfig.api === 'indian') {
        // Indian Market API (Nifty, Bank Nifty)
        const now = Math.floor(Date.now() / 1000);
        const fiveDaysAgo = now - (5 * 24 * 60 * 60);
        const resolution = 5;
        const countback = 1440;

        url = `https://priceapi.moneycontrol.com/techCharts/indianMarket/index/history?symbol=${encodeURIComponent(symbolConfig.symbol)}&resolution=${resolution}&from=${fiveDaysAgo}&to=${now}&countback=${countback}&currencyCode=INR`;

        console.log('Fetching Indian Market:', url);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        data = await response.json();
        if (data.s !== 'ok') throw new Error('No data available');

        // Transform to candlestick format
        chartData = data.t.map((timestamp, index) => ({
          time: timestamp,
          open: data.o[index],
          high: data.h[index],
          low: data.l[index],
          close: data.c[index],
        }));

      } else if (symbolConfig.api === 'us') {
        // US Market API (Dow Jones Future)
        url = `https://priceapi.moneycontrol.com/globaltechCharts/usMarket/index/intra?symbol=${symbolConfig.symbol}&duration=1D&firstCall=false`;

        console.log('Fetching US Market:', url);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        data = await response.json();
        if (data.s !== 'ok') throw new Error('No data available');

        // Transform to line chart format
        chartData = data.data.map(item => ({
          time: item.time,
          value: item.value,
        }));
      }

      updateChart(chartData, symbolConfig.type);
      setCandleCount(chartData.length);
      setLastUpdate(new Date());

      // Set time range
      if (chartData.length > 0) {
        setTimeRange({
          from: new Date(chartData[0].time * 1000),
          to: new Date(chartData[chartData.length - 1].time * 1000)
        });
      }

      setLoading(false);

    } catch (err) {
      console.error('Error fetching MoneyControl data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Initialize chart (recreate when symbol changes for independent charts)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Remove existing chart if any
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        // Ignore errors if chart already disposed
      }
      chartRef.current = null;
    }

    // Create new chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { color: '#1a1d29' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2a2e39' },
        horzLines: { color: '#2a2e39' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const symbolConfig = SYMBOLS[selectedSymbol];

    // Create appropriate series based on symbol type
    if (symbolConfig.type === 'candlestick') {
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#00ff88',
        downColor: '#ff4466',
        borderVisible: false,
        wickUpColor: '#00ff88',
        wickDownColor: '#ff4466',
      });
      candlestickSeriesRef.current = candlestickSeries;
      lineSeriesRef.current = null;
    } else {
      const lineSeries = chart.addLineSeries({
        color: '#00ccff',
        lineWidth: 2,
      });
      lineSeriesRef.current = lineSeries;
      candlestickSeriesRef.current = null;
    }

    chartRef.current = chart;

    // Handle window resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        try {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        } catch (e) {
          // Ignore if chart disposed
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart) {
        try {
          chart.remove();
        } catch (e) {
          // Ignore errors if chart already disposed
        }
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      lineSeriesRef.current = null;
    };
  }, [selectedSymbol]); // Recreate chart when symbol changes

  // Update chart with data
  const updateChart = (chartData, chartType) => {
    if (!chartData || chartData.length === 0) return;

    // Update the appropriate series
    if (chartType === 'candlestick' && candlestickSeriesRef.current) {
      candlestickSeriesRef.current.setData(chartData);
    } else if (chartType === 'line' && lineSeriesRef.current) {
      lineSeriesRef.current.setData(chartData);
    }

    // Fit content to chart
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  // Fetch data on mount and when symbol changes
  useEffect(() => {
    fetchMoneyControlData();

    // Auto-refresh every 1 minute (60,000 ms)
    const interval = setInterval(() => {
      fetchMoneyControlData();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedSymbol]);

  return (
    <div className="detailed-chart-page">
      {/* Header */}
      <div className="detailed-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>

        <h1 className="detailed-title">📊 Detailed Chart View</h1>

        <div className="symbol-selector">
          <button
            className={`symbol-btn ${selectedSymbol === 'NIFTY50' ? 'active' : ''}`}
            onClick={() => setSelectedSymbol('NIFTY50')}
          >
            📈 Nifty 50
          </button>
          <button
            className={`symbol-btn ${selectedSymbol === 'BANKNIFTY' ? 'active' : ''}`}
            onClick={() => setSelectedSymbol('BANKNIFTY')}
          >
            🏦 Bank Nifty
          </button>
          <button
            className={`symbol-btn ${selectedSymbol === 'DOWJONES' ? 'active' : ''}`}
            onClick={() => setSelectedSymbol('DOWJONES')}
          >
            🇺🇸 Dow Jones
          </button>
        </div>
      </div>

      {/* Chart Info */}
      <div className="chart-info">
        <div className="info-item">
          <span className="info-label">Symbol:</span>
          <span className="info-value">{selectedSymbol}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Timeframe:</span>
          <span className="info-value">
            {SYMBOLS[selectedSymbol].type === 'candlestick' ? '5 Minutes' : '1 Minute'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Period:</span>
          <span className="info-value">
            {SYMBOLS[selectedSymbol].api === 'indian' ? 'Last 5 Days' : 'Last 1 Day'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Candles:</span>
          <span className="info-value">{candleCount}</span>
        </div>
        {lastUpdate && (
          <div className="info-item">
            <span className="info-label">Last Updated:</span>
            <span className="info-value">
              {lastUpdate.toLocaleTimeString('en-IN')}
            </span>
          </div>
        )}
        <div className="info-item">
          <span className="info-label">Auto-Refresh:</span>
          <span className="info-value refresh-badge">Every 1 min</span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="chart-wrapper">
        {loading && !candleCount && (
          <div className="chart-loading">
            <div className="spinner"></div>
            <p>Loading chart data from MoneyControl...</p>
          </div>
        )}

        {error && (
          <div className="chart-error">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
            <button className="retry-btn" onClick={fetchMoneyControlData}>
              Retry
            </button>
          </div>
        )}

        <div ref={chartContainerRef} className="chart-container" />
      </div>

      {/* Footer Info */}
      <div className="chart-footer">
        <p className="footer-note">
          <strong>📌 Note:</strong>{' '}
          {SYMBOLS[selectedSymbol].api === 'indian' ? (
            <>
              This chart shows real-time 5-minute candles from MoneyControl for the last 5 days.
              Auto-refreshes every minute. Green candles = Price up, Red candles = Price down.
            </>
          ) : (
            <>
              This chart shows real-time intraday data from MoneyControl for the last 1 day.
              Auto-refreshes every minute. Blue line tracks price movements.
            </>
          )}
        </p>
        <p className="footer-note">
          <strong>🔗 Data Source:</strong> MoneyControl{' '}
          {SYMBOLS[selectedSymbol].api === 'indian' ? 'Indian Market' : 'US Market'} API •{' '}
          <strong>Symbol:</strong> {SYMBOLS[selectedSymbol].symbol}
        </p>
        {timeRange.from && timeRange.to && (
          <div className="time-range-display">
            <div className="time-range-item">
              <span className="time-label">📅 From:</span>
              <span className="time-value">
                {timeRange.from.toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </span>
            </div>
            <div className="time-range-separator">→</div>
            <div className="time-range-item">
              <span className="time-label">📅 To:</span>
              <span className="time-value">
                {timeRange.to.toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DetailedChart;
