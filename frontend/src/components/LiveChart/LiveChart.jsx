/**
 * Live Chart Component
 * Supports Line and Candlestick charts with multiple timeframes
 */

import React, { useEffect, useRef, useState } from 'react';
import './LiveChart.css';

const LiveChart = ({ data, symbol, timeframe = '5m', onTimeframeChange }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [chartType, setChartType] = useState('line'); // 'line' or 'candlestick'
  const [chartData, setChartData] = useState({
    line: [],
    candles: {
      '1m': [],
      '5m': [],
      '15m': []
    }
  });

  // Convert timeframe string to minutes
  const getTimeframeMinutes = (tf) => {
    return parseInt(tf.replace('m', ''));
  };

  // Update chart data when new data arrives
  useEffect(() => {
    if (!data) return;

    const currentMinutes = getTimeframeMinutes(timeframe);

    // Update line chart data
    setChartData(prev => {
      const newLineData = [...prev.line];

      if (data.timestamp && data.price) {
        const dataPoint = {
          x: new Date(data.timestamp),
          y: data.price
        };

        newLineData.push(dataPoint);

        // Keep last 100 points
        if (newLineData.length > 100) {
          newLineData.shift();
        }
      }

      // Update candle data for current timeframe
      const newCandles = { ...prev.candles };

      if (data.ohlc) {
        const candle = {
          x: new Date(data.timestamp),
          o: data.ohlc.open,
          h: data.ohlc.high,
          l: data.ohlc.low,
          c: data.ohlc.close
        };

        const tfKey = timeframe;
        if (!newCandles[tfKey]) {
          newCandles[tfKey] = [];
        }

        // Check if this is an update to the last candle or a new candle
        const lastCandle = newCandles[tfKey][newCandles[tfKey].length - 1];
        const candleTime = new Date(data.timestamp).getTime();
        const lastCandleTime = lastCandle ? new Date(lastCandle.x).getTime() : 0;

        // If within same timeframe period, update last candle
        const timeDiff = Math.abs(candleTime - lastCandleTime) / 60000; // minutes

        if (lastCandle && timeDiff < currentMinutes) {
          newCandles[tfKey][newCandles[tfKey].length - 1] = candle;
        } else {
          newCandles[tfKey].push(candle);

          // Keep last 60 candles
          if (newCandles[tfKey].length > 60) {
            newCandles[tfKey].shift();
          }
        }
      }

      return {
        line: newLineData,
        candles: newCandles
      };
    });
  }, [data, timeframe]);

  // Initialize or update chart
  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Get data for current chart type
    const displayData = chartType === 'line'
      ? chartData.line
      : chartData.candles[timeframe] || [];

    // Chart configuration
    const config = {
      type: chartType === 'line' ? 'line' : 'candlestick',
      data: {
        datasets: [{
          label: `${symbol} ${timeframe}`,
          data: displayData,
          borderColor: chartType === 'line' ? '#00ff88' : undefined,
          backgroundColor: chartType === 'line' ? 'rgba(0, 255, 136, 0.1)' : undefined,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1,
          fill: chartType === 'line',
          // Candlestick specific options
          ...(chartType === 'candlestick' && {
            color: {
              up: '#00ff88',
              down: '#ff4444',
              unchanged: '#999'
            },
            barPercentage: 0.15,
            categoryPercentage: 0.5
          })
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#333',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                if (chartType === 'candlestick') {
                  const data = context.raw;
                  return [
                    `O: ₹${data.o?.toFixed(2)}`,
                    `H: ₹${data.h?.toFixed(2)}`,
                    `L: ₹${data.l?.toFixed(2)}`,
                    `C: ₹${data.c?.toFixed(2)}`
                  ];
                } else {
                  return `Price: ₹${context.parsed.y?.toFixed(2)}`;
                }
              }
            }
          }
        },
        scales: {
          x: {
            type: 'timeseries',
            time: {
              unit: timeframe === '15m' ? 'hour' : 'minute',
              displayFormats: {
                minute: 'HH:mm',
                hour: 'HH:mm'
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#aaa',
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8
            }
          },
          y: {
            position: 'right',
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#aaa',
              callback: function(value) {
                return '₹' + value.toFixed(0);
              }
            }
          }
        },
        layout: {
          padding: {
            left: 15,
            right: 15,
            top: 20,
            bottom: 10
          }
        }
      }
    };

    // Create new chart
    chartRef.current = new window.Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [chartType, chartData, symbol, timeframe]);

  const handleChartTypeChange = (type) => {
    setChartType(type);
  };

  const handleTimeframeChange = (tf) => {
    if (onTimeframeChange) {
      onTimeframeChange(tf);
    }
  };

  return (
    <div className="live-chart">
      <div className="chart-header">
        <div className="chart-controls">
          <div className="chart-type-selector">
            <button
              className={`chart-btn ${chartType === 'line' ? 'active' : ''}`}
              onClick={() => handleChartTypeChange('line')}
            >
              📈 Line
            </button>
            <button
              className={`chart-btn ${chartType === 'candlestick' ? 'active' : ''}`}
              onClick={() => handleChartTypeChange('candlestick')}
            >
              📊 Candlestick
            </button>
          </div>

          <div className="timeframe-selector">
            <button
              className={`tf-btn ${timeframe === '1m' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('1m')}
            >
              1m
            </button>
            <button
              className={`tf-btn ${timeframe === '5m' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('5m')}
            >
              5m
            </button>
            <button
              className={`tf-btn ${timeframe === '15m' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('15m')}
            >
              15m
            </button>
          </div>
        </div>

        <div className="chart-info">
          <span className="chart-symbol">{symbol}</span>
          <span className="chart-timeframe">{timeframe}</span>
          <span className="chart-points">
            {chartType === 'line'
              ? `${chartData.line.length} points`
              : `${(chartData.candles[timeframe] || []).length} candles`}
          </span>
        </div>
      </div>

      <div className="chart-container">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
};

export default LiveChart;