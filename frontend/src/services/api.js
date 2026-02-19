import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Market Status
export const getMarketStatus = async () => {
  const response = await api.get('/api/test/market-status');
  return response.data;
};

// Latest Data
export const getLatestData = async () => {
  const response = await api.get('/api/test/latest-data');
  return response.data;
};

// Chart Data
export const getChartData = async (symbol, timeframe) => {
  const response = await api.get(`/api/charts/${symbol}/${timeframe}`);
  return response.data;
};

// Chart Statistics
export const getChartStats = async () => {
  const response = await api.get('/api/charts/stats');
  return response.data;
};

// Generate Charts
export const generateCharts = async (options = {}) => {
  const response = await api.post('/api/charts/generate', options);
  return response.data;
};

// Get Trading Signal (using LIVE endpoint with real-time price updates)
export const getTradingSignal = async (symbol, timeframe, minConfidence = 50) => {
  const response = await api.get('/api/signals/live', {
    params: { symbol, minConfidence }
  });

  // The live endpoint returns { success, signals: [...], count, source, timestamp }
  // Extract the first signal for the requested symbol
  if (response.data.success && response.data.signals && response.data.signals.length > 0) {
    return {
      success: true,
      data: response.data.signals[0]  // Return first matching signal
    };
  } else {
    return {
      success: false,
      message: 'No signal available for this index'
    };
  }
};

// Get Indicator Data
export const getIndicator = async (name, symbol, timeframe, period) => {
  const response = await api.get(`/api/test/indicator/${name}`, {
    params: { symbol, timeframe, period }
  });
  return response.data;
};

// Trigger Data Fetch
export const triggerDataFetch = async () => {
  const response = await api.get('/api/test/data-agent');
  return response.data;
};

export default api;
