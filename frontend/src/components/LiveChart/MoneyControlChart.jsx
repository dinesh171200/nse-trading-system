import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import './MoneyControlChart.css';
import {
  calculateSupportResistance,
  calculateDemandSupplyZones,
  calculateFairValueGaps,
  calculatePivotPoints
} from '../../utils/smcCalculations';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// MoneyControl API symbols
const SYMBOLS = {
  NIFTY50: { symbol: 'in;NSX', type: 'candlestick', api: 'indian', name: 'Nifty 50', backendSymbol: 'NIFTY50' },
  BANKNIFTY: { symbol: 'in;nbx', type: 'candlestick', api: 'indian', name: 'Bank Nifty', backendSymbol: 'BANKNIFTY' },
  GIFTNIFTY: { symbol: 'in;gsx', type: 'candlestick', api: 'gift', name: 'Gift Nifty', backendSymbol: 'GIFTNIFTY' },
  DOWJONES: { symbol: 'INDU', type: 'candlestick', api: 'us', name: 'Dow Jones', backendSymbol: 'DOWJONES' }
};

function MoneyControlChart({ initialSymbol = 'NIFTY50', onSymbolChange }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const lineSeriesRef = useRef(null);
  const ema9SeriesRef = useRef(null);
  const ema21SeriesRef = useRef(null);
  const ema50SeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const priceLinesRef = useRef([]); // Store price line references
  const isInitialLoadRef = useRef(true); // Track if this is the first data load

  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [priceInfo, setPriceInfo] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Notify parent component when symbol changes
  const handleSymbolChange = (symbol) => {
    setSelectedSymbol(symbol);
    if (onSymbolChange) {
      onSymbolChange(symbol);
    }
  };

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    const chartContainer = chartContainerRef.current?.parentElement;

    if (!chartContainer) return;

    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        if (chartContainer.requestFullscreen) {
          await chartContainer.requestFullscreen();
        } else if (chartContainer.webkitRequestFullscreen) {
          await chartContainer.webkitRequestFullscreen(); // Safari
        } else if (chartContainer.msRequestFullscreen) {
          await chartContainer.msRequestFullscreen(); // IE/Edge
        }
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen(); // Safari
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen(); // IE/Edge
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);

      // Resize chart when entering/exiting fullscreen
      if (chartRef.current && chartContainerRef.current) {
        setTimeout(() => {
          try {
            chartRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
              height: isFullscreen ? window.innerHeight - 100 : 600,
            });
          } catch (e) {
            // Ignore
          }
        }, 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // Calculate EMA (Exponential Moving Average)
  const calculateEMA = (data, period) => {
    if (!data || data.length < period) return [];

    const k = 2 / (period + 1);
    const emaData = [];
    let ema = 0;

    // Calculate initial SMA
    for (let i = 0; i < period; i++) {
      ema += data[i].close || data[i].value || 0;
    }
    ema = ema / period;
    emaData.push({ time: data[period - 1].time, value: ema });

    // Calculate EMA for remaining data
    for (let i = period; i < data.length; i++) {
      const price = data[i].close || data[i].value || 0;
      ema = price * k + ema * (1 - k);
      emaData.push({ time: data[i].time, value: ema });
    }

    return emaData;
  };

  // Fetch data from MoneyControl API
  const fetchMoneyControlData = async () => {
    try {
      setLoading(true);
      setError(null);

      const symbolConfig = SYMBOLS[selectedSymbol];
      let url, data, chartData;

      if (symbolConfig.api === 'indian') {
        // Indian Market API - Fetch more historical data (30 days)
        const now = Math.floor(Date.now() / 1000);
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60); // Increased from 5 to 30 days
        const resolution = 5;
        const countback = 8640; // Increased from 1440 to 8640 (30 days of 5-min candles)

        url = `https://priceapi.moneycontrol.com/techCharts/indianMarket/index/history?symbol=${encodeURIComponent(symbolConfig.symbol)}&resolution=${resolution}&from=${thirtyDaysAgo}&to=${now}&countback=${countback}&currencyCode=INR`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        data = await response.json();
        if (data.s !== 'ok') throw new Error('No data available');

        chartData = data.t.map((timestamp, index) => {
          // MoneyControl API returns timestamps in IST
          // No need to convert, just use as is
          return {
            time: timestamp,
            open: data.o[index],
            high: data.h[index],
            low: data.l[index],
            close: data.c[index],
            volume: data.v ? data.v[index] : 0,
          };
        });

        // Sort by time in ascending order (required by lightweight-charts)
        chartData.sort((a, b) => a.time - b.time);

        // Remove duplicate timestamps (keep last occurrence)
        const uniqueData = [];
        const seenTimes = new Set();
        for (let i = chartData.length - 1; i >= 0; i--) {
          if (!seenTimes.has(chartData[i].time)) {
            seenTimes.add(chartData[i].time);
            uniqueData.unshift(chartData[i]);
          }
        }
        chartData = uniqueData;

        // Calculate price info for TODAY only
        if (chartData.length > 0) {
          const latest = chartData[chartData.length - 1];
          const latestTime = latest.time;

          // Get today's date (start of day in IST)
          const todayStart = new Date(latestTime * 1000);
          todayStart.setHours(0, 0, 0, 0);
          const todayStartTimestamp = Math.floor(todayStart.getTime() / 1000);

          // Filter candles for today only
          const todayCandles = chartData.filter(candle => candle.time >= todayStartTimestamp);

          if (todayCandles.length > 0) {
            const todayFirst = todayCandles[0];
            const todayHigh = Math.max(...todayCandles.map(c => c.high));
            const todayLow = Math.min(...todayCandles.map(c => c.low));

            const change = latest.close - todayFirst.open;
            const changePercent = ((change / todayFirst.open) * 100);

            setPriceInfo({
              price: latest.close,
              change: change,
              changePercent: changePercent,
              high: todayHigh,
              low: todayLow,
              open: todayFirst.open,
            });
          } else {
            // Fallback if no today data (use latest available)
            const first = chartData[Math.max(0, chartData.length - 80)]; // Last ~6.5 hours
            const change = latest.close - first.open;
            const changePercent = ((change / first.open) * 100);
            const recentHigh = Math.max(...chartData.slice(-80).map(c => c.high));
            const recentLow = Math.min(...chartData.slice(-80).map(c => c.low));

            setPriceInfo({
              price: latest.close,
              change: change,
              changePercent: changePercent,
              high: recentHigh,
              low: recentLow,
              open: first.open,
            });
          }
        }

      } else if (symbolConfig.api === 'gift') {
        // Gift Nifty from MoneyControl via backend proxy
        url = `${API_URL}/api/investing/gift-nifty`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const result = await response.json();

        if (!result.success || !result.data) {
          throw new Error('No data available for Gift Nifty');
        }

        data = result.data;

        // Backend returns array of [timestamp, open, high, low, close, volume]
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('No data available for Gift Nifty');
        }

        // Transform to candlestick format
        chartData = data.map(item => ({
          time: Math.floor(item[0] / 1000), // Convert ms to seconds
          open: item[1],
          high: item[2],
          low: item[3],
          close: item[4],
          volume: item[5] || 0,
        }));

        // Sort by time in ascending order (required by lightweight-charts)
        chartData.sort((a, b) => a.time - b.time);

        // Remove duplicate timestamps (keep last occurrence)
        const uniqueGiftData = [];
        const seenGiftTimes = new Set();
        for (let i = chartData.length - 1; i >= 0; i--) {
          if (!seenGiftTimes.has(chartData[i].time)) {
            seenGiftTimes.add(chartData[i].time);
            uniqueGiftData.unshift(chartData[i]);
          }
        }
        chartData = uniqueGiftData;

        // Calculate price info for TODAY only
        if (chartData.length > 0) {
          const latest = chartData[chartData.length - 1];
          const latestTime = latest.time;

          // Get today's date (start of day)
          const todayStart = new Date(latestTime * 1000);
          todayStart.setHours(0, 0, 0, 0);
          const todayStartTimestamp = Math.floor(todayStart.getTime() / 1000);

          // Filter candles for today only
          const todayCandles = chartData.filter(candle => candle.time >= todayStartTimestamp);

          if (todayCandles.length > 0) {
            const todayFirst = todayCandles[0];
            const todayHigh = Math.max(...todayCandles.map(c => c.high));
            const todayLow = Math.min(...todayCandles.map(c => c.low));

            const change = latest.close - todayFirst.open;
            const changePercent = ((change / todayFirst.open) * 100);

            setPriceInfo({
              price: latest.close,
              change: change,
              changePercent: changePercent,
              high: todayHigh,
              low: todayLow,
              open: todayFirst.open,
            });
          } else {
            // Fallback if no today data (use recent data)
            const first = chartData[Math.max(0, chartData.length - 80)];
            const change = latest.close - first.open;
            const changePercent = ((change / first.open) * 100);
            const recentHigh = Math.max(...chartData.slice(-80).map(c => c.high));
            const recentLow = Math.min(...chartData.slice(-80).map(c => c.low));

            setPriceInfo({
              price: latest.close,
              change: change,
              changePercent: changePercent,
              high: recentHigh,
              low: recentLow,
              open: first.open,
            });
          }
        }

      } else if (symbolConfig.api === 'us') {
        // Dow Jones from MoneyControl via backend proxy
        url = `${API_URL}/api/investing/dow-jones`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const result = await response.json();

        if (!result.success || !result.data) {
          throw new Error('No data available for Dow Jones');
        }

        data = result.data;

        // Backend returns array of [timestamp, open, high, low, close, volume]
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('No data available for Dow Jones');
        }

        // Transform to candlestick format
        chartData = data.map(item => ({
          time: Math.floor(item[0] / 1000), // Convert ms to seconds
          open: item[1],
          high: item[2],
          low: item[3],
          close: item[4],
          volume: item[5] || 0,
        }));

        // Sort by time in ascending order (required by lightweight-charts)
        chartData.sort((a, b) => a.time - b.time);

        // Remove duplicate timestamps (keep last occurrence)
        const uniqueDowData = [];
        const seenDowTimes = new Set();
        for (let i = chartData.length - 1; i >= 0; i--) {
          if (!seenDowTimes.has(chartData[i].time)) {
            seenDowTimes.add(chartData[i].time);
            uniqueDowData.unshift(chartData[i]);
          }
        }
        chartData = uniqueDowData;

        // Calculate price info for TODAY only
        if (chartData.length > 0) {
          const latest = chartData[chartData.length - 1];
          const latestTime = latest.time;

          // Get today's date (start of day)
          const todayStart = new Date(latestTime * 1000);
          todayStart.setHours(0, 0, 0, 0);
          const todayStartTimestamp = Math.floor(todayStart.getTime() / 1000);

          // Filter candles for today only
          const todayCandles = chartData.filter(candle => candle.time >= todayStartTimestamp);

          if (todayCandles.length > 0) {
            const todayFirst = todayCandles[0];
            const todayHigh = Math.max(...todayCandles.map(c => c.high));
            const todayLow = Math.min(...todayCandles.map(c => c.low));

            const change = latest.close - todayFirst.open;
            const changePercent = ((change / todayFirst.open) * 100);

            setPriceInfo({
              price: latest.close,
              change: change,
              changePercent: changePercent,
              high: todayHigh,
              low: todayLow,
              open: todayFirst.open,
            });
          } else {
            // Fallback if no today data (use recent data)
            const first = chartData[Math.max(0, chartData.length - 80)];
            const change = latest.close - first.open;
            const changePercent = ((change / first.open) * 100);
            const recentHigh = Math.max(...chartData.slice(-80).map(c => c.high));
            const recentLow = Math.min(...chartData.slice(-80).map(c => c.low));

            setPriceInfo({
              price: latest.close,
              change: change,
              changePercent: changePercent,
              high: recentHigh,
              low: recentLow,
              open: first.open,
            });
          }
        }
      }

      updateChart(chartData, symbolConfig.type);
      setLastUpdate(new Date());
      setLoading(false);

    } catch (err) {
      console.error('Error fetching MoneyControl data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Remove existing chart if any
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        // Ignore
      }
      chartRef.current = null;
    }

    // Reset initial load flag when symbol changes
    isInitialLoadRef.current = true;

    // Create new chart with better visibility
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600, // Increased from 400 to 600
      layout: {
        background: { color: '#1e222d' }, // Dark background
        textColor: '#d1d4dc',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.6)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.6)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#758696',
          width: 1,
          style: 1,
          labelBackgroundColor: '#4682B4',
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: 1,
          labelBackgroundColor: '#4682B4',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.4)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.4)',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 3,
        minBarSpacing: 0.5,
      },
      localization: {
        locale: 'en-IN',
        dateFormat: 'dd MMM',
        timeFormatter: (timestamp) => {
          // Display time in IST format
          const date = new Date(timestamp * 1000);

          // Get hours and minutes
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');

          // Format: HH:MM (24-hour format)
          // Market hours: 09:15 - 15:30
          return `${hours}:${minutes}`;
        },
      },
    });

    const symbolConfig = SYMBOLS[selectedSymbol];

    // Create appropriate series with vibrant colors
    if (symbolConfig.type === 'candlestick') {
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a', // Teal green (more professional)
        downColor: '#ef5350', // Red
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
      });
      candlestickSeriesRef.current = candlestickSeries;
      lineSeriesRef.current = null;

      // Add EMA indicators with brighter, more visible colors
      const ema9Series = chart.addLineSeries({
        color: '#2196F3', // Bright blue
        lineWidth: 2,
        title: 'EMA 9',
        lastValueVisible: true,
        priceLineVisible: true,
      });
      ema9SeriesRef.current = ema9Series;

      const ema21Series = chart.addLineSeries({
        color: '#FF9800', // Bright orange
        lineWidth: 2,
        title: 'EMA 21',
        lastValueVisible: true,
        priceLineVisible: true,
      });
      ema21SeriesRef.current = ema21Series;

      const ema50Series = chart.addLineSeries({
        color: '#E91E63', // Pink
        lineWidth: 2,
        title: 'EMA 50',
        lastValueVisible: true,
        priceLineVisible: true,
      });
      ema50SeriesRef.current = ema50Series;

      // Add volume histogram
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });
      volumeSeriesRef.current = volumeSeries;

      // Configure volume price scale
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

    } else {
      const lineSeries = chart.addLineSeries({
        color: '#00ccff',
        lineWidth: 2,
      });
      lineSeriesRef.current = lineSeries;
      candlestickSeriesRef.current = null;
      ema9SeriesRef.current = null;
      ema21SeriesRef.current = null;
      ema50SeriesRef.current = null;
      volumeSeriesRef.current = null;
    }

    chartRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        try {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        } catch (e) {
          // Ignore
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
          // Ignore
        }
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      lineSeriesRef.current = null;
      ema9SeriesRef.current = null;
      ema21SeriesRef.current = null;
      ema50SeriesRef.current = null;
      volumeSeriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, [selectedSymbol]);

  // Calculate and apply SMC overlays directly from chart data
  const applySMCOverlays = (chartData) => {
    try {
      if (!candlestickSeriesRef.current || !chartData || chartData.length < 20) return;

      console.log('Applying SMC overlays with', chartData.length, 'candles');

      const series = candlestickSeriesRef.current;

      // Remove all existing price lines to prevent duplicates
      if (priceLinesRef.current.length > 0) {
        console.log('Removing', priceLinesRef.current.length, 'old price lines');
        priceLinesRef.current.forEach(line => {
          try {
            series.removePriceLine(line);
          } catch (e) {
            // Ignore errors when removing lines
          }
        });
        priceLinesRef.current = [];
      }

      // Calculate zones from chart data
      const { supportLevels, resistanceLevels } = calculateSupportResistance(chartData, 50);
      const { demandZones, supplyZones } = calculateDemandSupplyZones(chartData, 50);
      const { bullishFVGs, bearishFVGs } = calculateFairValueGaps(chartData);
      const pivots = calculatePivotPoints(chartData);

      console.log('SMC Zones found:', {
        support: supportLevels.length,
        resistance: resistanceLevels.length,
        demand: demandZones.length,
        supply: supplyZones.length,
        bullishFVGs: bullishFVGs.length,
        bearishFVGs: bearishFVGs.length
      });

      // Draw Support Levels (bright green dashed lines)
      supportLevels.forEach((level, idx) => {
        try {
          const priceLine = series.createPriceLine({
            price: level.level,
            color: '#4CAF50', // Brighter green
            lineWidth: 2,
            lineStyle: 1, // dashed
            axisLabelVisible: true,
            title: `S${idx + 1} (${level.touches})`,
          });
          priceLinesRef.current.push(priceLine);
          console.log(`Drew support S${idx + 1} at ${level.level.toFixed(2)}`);
        } catch (e) {
          console.log('Error drawing support line:', e.message);
        }
      });

      // Draw Resistance Levels (bright red dashed lines)
      resistanceLevels.forEach((level, idx) => {
        try {
          const priceLine = series.createPriceLine({
            price: level.level,
            color: '#F44336', // Brighter red
            lineWidth: 2,
            lineStyle: 1, // dashed
            axisLabelVisible: true,
            title: `R${idx + 1} (${level.touches})`,
          });
          priceLinesRef.current.push(priceLine);
          console.log(`Drew resistance R${idx + 1} at ${level.level.toFixed(2)}`);
        } catch (e) {
          console.log('Error drawing resistance line:', e.message);
        }
      });

      // Draw Pivot Points (yellow)
      if (pivots) {
        try {
          const priceLine = series.createPriceLine({
            price: pivots.pivot,
            color: '#FFC107',
            lineWidth: 2,
            lineStyle: 2, // dotted
            axisLabelVisible: true,
            title: 'Pivot',
          });
          priceLinesRef.current.push(priceLine);
          console.log(`Drew pivot at ${pivots.pivot.toFixed(2)}`);
        } catch (e) {}

        // Draw pivot support levels
        Object.entries(pivots.support).forEach(([key, price]) => {
          try {
            const priceLine = series.createPriceLine({
              price,
              color: '#4CAF50',
              lineWidth: 1,
              lineStyle: 2,
              axisLabelVisible: true,
              title: key.toUpperCase(),
            });
            priceLinesRef.current.push(priceLine);
          } catch (e) {}
        });

        // Draw pivot resistance levels
        Object.entries(pivots.resistance).forEach(([key, price]) => {
          try {
            const priceLine = series.createPriceLine({
              price,
              color: '#F44336',
              lineWidth: 1,
              lineStyle: 2,
              axisLabelVisible: true,
              title: key.toUpperCase(),
            });
            priceLinesRef.current.push(priceLine);
          } catch (e) {}
        });
      }

      // Draw Demand Zones (green transparent zones)
      demandZones.forEach((zone, idx) => {
        try {
          // Draw bottom boundary of demand zone
          const bottomLine = series.createPriceLine({
            price: zone.zone[0],
            color: '#4CAF50',
            lineWidth: 2,
            lineStyle: 0, // solid
            axisLabelVisible: true,
            title: `Demand ${idx + 1} Bottom`,
          });
          priceLinesRef.current.push(bottomLine);

          // Draw top boundary of demand zone
          const topLine = series.createPriceLine({
            price: zone.zone[1],
            color: '#4CAF50',
            lineWidth: 2,
            lineStyle: 0, // solid
            axisLabelVisible: true,
            title: `Demand ${idx + 1} Top`,
          });
          priceLinesRef.current.push(topLine);

          console.log(`Drew demand zone ${idx + 1}: ${zone.zone[0].toFixed(2)}-${zone.zone[1].toFixed(2)}`);
        } catch (e) {
          console.log('Error drawing demand zone:', e.message);
        }
      });

      // Draw Supply Zones (red transparent zones)
      supplyZones.forEach((zone, idx) => {
        try {
          // Draw bottom boundary of supply zone
          const bottomLine = series.createPriceLine({
            price: zone.zone[0],
            color: '#F44336',
            lineWidth: 2,
            lineStyle: 0, // solid
            axisLabelVisible: true,
            title: `Supply ${idx + 1} Bottom`,
          });
          priceLinesRef.current.push(bottomLine);

          // Draw top boundary of supply zone
          const topLine = series.createPriceLine({
            price: zone.zone[1],
            color: '#F44336',
            lineWidth: 2,
            lineStyle: 0, // solid
            axisLabelVisible: true,
            title: `Supply ${idx + 1} Top`,
          });
          priceLinesRef.current.push(topLine);

          console.log(`Drew supply zone ${idx + 1}: ${zone.zone[0].toFixed(2)}-${zone.zone[1].toFixed(2)}`);
        } catch (e) {
          console.log('Error drawing supply zone:', e.message);
        }
      });

      // Draw Bullish Fair Value Gaps (purple zones)
      bullishFVGs.forEach((gap, idx) => {
        if (!gap.filled) { // Only show unfilled gaps
          try {
            // Draw bottom boundary of FVG
            const bottomLine = series.createPriceLine({
              price: gap.gap[0],
              color: '#9C27B0',
              lineWidth: 2,
              lineStyle: 3, // dashed-dotted
              axisLabelVisible: true,
              title: `Bull FVG ${idx + 1} Low`,
            });
            priceLinesRef.current.push(bottomLine);

            // Draw top boundary of FVG
            const topLine = series.createPriceLine({
              price: gap.gap[1],
              color: '#9C27B0',
              lineWidth: 2,
              lineStyle: 3, // dashed-dotted
              axisLabelVisible: true,
              title: `Bull FVG ${idx + 1} High`,
            });
            priceLinesRef.current.push(topLine);

            console.log(`Drew bullish FVG ${idx + 1}: ${gap.gap[0].toFixed(2)}-${gap.gap[1].toFixed(2)}`);
          } catch (e) {
            console.log('Error drawing bullish FVG:', e.message);
          }
        }
      });

      // Draw Bearish Fair Value Gaps (orange zones)
      bearishFVGs.forEach((gap, idx) => {
        if (!gap.filled) { // Only show unfilled gaps
          try {
            // Draw bottom boundary of FVG
            const bottomLine = series.createPriceLine({
              price: gap.gap[0],
              color: '#FF9800',
              lineWidth: 2,
              lineStyle: 3, // dashed-dotted
              axisLabelVisible: true,
              title: `Bear FVG ${idx + 1} Low`,
            });
            priceLinesRef.current.push(bottomLine);

            // Draw top boundary of FVG
            const topLine = series.createPriceLine({
              price: gap.gap[1],
              color: '#FF9800',
              lineWidth: 2,
              lineStyle: 3, // dashed-dotted
              axisLabelVisible: true,
              title: `Bear FVG ${idx + 1} High`,
            });
            priceLinesRef.current.push(topLine);

            console.log(`Drew bearish FVG ${idx + 1}: ${gap.gap[0].toFixed(2)}-${gap.gap[1].toFixed(2)}`);
          } catch (e) {
            console.log('Error drawing bearish FVG:', e.message);
          }
        }
      });

    } catch (error) {
      console.log('Failed to apply SMC overlays:', error);
    }
  };

  // Update chart with data
  const updateChart = (chartData, chartType) => {
    if (!chartData || chartData.length === 0) {
      setError('No data available (market may be closed)');
      return;
    }

    if (chartType === 'candlestick' && candlestickSeriesRef.current) {
      // Set candlestick data
      candlestickSeriesRef.current.setData(chartData);

      // Calculate and set EMA indicators
      if (ema9SeriesRef.current) {
        const ema9Data = calculateEMA(chartData, 9);
        ema9SeriesRef.current.setData(ema9Data);
      }

      if (ema21SeriesRef.current) {
        const ema21Data = calculateEMA(chartData, 21);
        ema21SeriesRef.current.setData(ema21Data);
      }

      if (ema50SeriesRef.current) {
        const ema50Data = calculateEMA(chartData, 50);
        ema50SeriesRef.current.setData(ema50Data);
      }

      // Set volume data (if available)
      if (volumeSeriesRef.current && chartData[0].volume !== undefined) {
        const volumeData = chartData.map(candle => ({
          time: candle.time,
          value: candle.volume || 0,
          color: candle.close >= candle.open ? '#26a69a80' : '#ef535080'
        }));
        volumeSeriesRef.current.setData(volumeData);
      }

      // Apply SMC overlays using the chart data
      console.log('Calling applySMCOverlays with chart data');
      applySMCOverlays(chartData);

    } else if (chartType === 'line' && lineSeriesRef.current) {
      lineSeriesRef.current.setData(chartData);
    }

    // Only reset zoom/pan on initial load, not on subsequent refreshes
    // This allows users to zoom in/out without being interrupted
    if (chartRef.current && isInitialLoadRef.current) {
      // Show last 200 candles initially (about 16 hours of 5-min data)
      // User can scroll left to see more history
      const timeScale = chartRef.current.timeScale();
      if (chartData && chartData.length > 200) {
        const lastIndex = chartData.length - 1;
        const firstVisibleIndex = Math.max(0, lastIndex - 200);
        timeScale.setVisibleLogicalRange({
          from: firstVisibleIndex,
          to: lastIndex
        });
      } else {
        timeScale.fitContent();
      }

      // Mark initial load as complete
      isInitialLoadRef.current = false;
    }
  };

  // Fetch on mount and symbol change
  useEffect(() => {
    fetchMoneyControlData();

    // Auto-refresh every 10 seconds for more responsive price updates
    const interval = setInterval(() => {
      fetchMoneyControlData();
    }, 10 * 1000); // 10 seconds

    return () => clearInterval(interval);
  }, [selectedSymbol]); // Only depend on selectedSymbol to avoid infinite re-renders

  const symbolConfig = SYMBOLS[selectedSymbol];

  return (
    <div className="moneycontrol-chart">
      {/* Symbol Selector - MOVED TO TOP for better mobile UX */}
      <div className="mc-chart-header">
        <div className="mc-symbol-tabs">
          {Object.keys(SYMBOLS).map((key) => (
            <button
              key={key}
              className={`mc-tab ${selectedSymbol === key ? 'active' : ''}`}
              onClick={() => handleSymbolChange(key)}
            >
              {SYMBOLS[key].name}
            </button>
          ))}
        </div>

        {lastUpdate && (
          <div className="mc-update-time">
            Updated: {lastUpdate.toLocaleTimeString('en-IN')}
          </div>
        )}
      </div>

      {/* Price Display */}
      {priceInfo && (
        <div className="mc-price-display">
          <div className="mc-price-main">
            <h2 className="mc-symbol-name">{symbolConfig.name}</h2>
            <div className="mc-price-row">
              <span className="mc-current-price">
                {symbolConfig.api === 'indian' ? '₹' : symbolConfig.api === 'gift' ? '$' : '$'}
                {priceInfo.price.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
              <span className={`mc-price-change ${priceInfo.change >= 0 ? 'positive' : 'negative'}`}>
                {priceInfo.change >= 0 ? '+' : ''}
                {priceInfo.change.toFixed(2)} ({priceInfo.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="mc-price-details">
            <div className="mc-detail-item">
              <span className="mc-detail-label">Open</span>
              <span className="mc-detail-value">
                {symbolConfig.api === 'indian' ? '₹' : '$'}
                {priceInfo.open.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mc-detail-item">
              <span className="mc-detail-label">High</span>
              <span className="mc-detail-value mc-high">
                {symbolConfig.api === 'indian' ? '₹' : '$'}
                {priceInfo.high.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mc-detail-item">
              <span className="mc-detail-label">Low</span>
              <span className="mc-detail-value mc-low">
                {symbolConfig.api === 'indian' ? '₹' : '$'}
                {priceInfo.low.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="mc-chart-wrapper">
        {/* Fullscreen Button */}
        <button
          className="mc-fullscreen-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>

        {loading && (
          <div className="mc-loading">
            <div className="spinner"></div>
            <p>Loading chart...</p>
          </div>
        )}

        {error && (
          <div className="mc-error">
            <p>{error}</p>
            <button onClick={fetchMoneyControlData}>Retry</button>
          </div>
        )}

        <div ref={chartContainerRef} className="mc-chart-container" />
      </div>
    </div>
  );
}

export default MoneyControlChart;
