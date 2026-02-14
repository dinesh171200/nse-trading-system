# Testing Guide

## Overview

This document explains how to test individual components of the NSE Trading System.

## Testing Scripts

### Test Data Agent
```bash
node scripts/test-data-agent.js
```
Tests NSE data fetching independently.

### Test Chart Agent
```bash
node scripts/test-chart-agent.js
node scripts/test-chart-agent.js --symbol=NIFTY50 --timeframe=5m
```
Tests chart generation from tick data.

### Test Signal Agent
```bash
node scripts/test-signal-agent.js
node scripts/test-signal-agent.js --symbol=BANKNIFTY
```
Tests signal generation.

### Test Individual Indicator
```bash
node scripts/test-indicator.js --indicator=rsi
node scripts/test-indicator.js --indicator=macd
node scripts/test-indicator.js --indicator=bollinger
```

## Unit Tests

Run all tests:
```bash
npm test
```

Run specific test suite:
```bash
npm test -- indicators
npm test -- agents
npm test -- services
```

Watch mode:
```bash
npm test:watch
```

Coverage report:
```bash
npm test:coverage
```

## Writing Tests

Example test structure:
```javascript
const { calculateRSI } = require('../indicators/momentum/rsi');

describe('RSI Indicator', () => {
  test('should calculate RSI correctly', () => {
    const data = [/* mock data */];
    const result = calculateRSI(data);
    expect(result).toBeDefined();
    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.value).toBeLessThanOrEqual(100);
  });
});
```

## Integration Tests

Test the complete flow:
1. Data fetching → Storage
2. Chart generation → Storage
3. Signal generation → Storage → WebSocket broadcast

## Performance Tests

Monitor:
- Indicator calculation time
- Database query performance
- WebSocket latency
- Memory usage
