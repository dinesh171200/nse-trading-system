# Technical Indicators Reference

This document lists all 115+ technical indicators used in the NSE Real-time Trading System.

## Indicator Categories

### 1. Trend Indicators (30% weight)
- EMA (9, 12, 20, 26, 50, 100, 200)
- SMA (20, 50, 200)
- WMA (Weighted Moving Average)
- DEMA (Double EMA)
- TEMA (Triple EMA)
- HMA (Hull Moving Average)
- KAMA (Kaufman Adaptive MA)
- MACD (Moving Average Convergence Divergence)
- ADX (Average Directional Index)
- DMI (Directional Movement Index)
- Aroon Indicator
- Parabolic SAR
- Supertrend
- Ichimoku Cloud
- Linear Regression
- Zig Zag
- Trend Intensity Index

### 2. Momentum Indicators (25% weight)
- RSI (14, 21 period)
- Stochastic (Fast, Slow, Full)
- CCI (Commodity Channel Index)
- Williams %R
- ROC (Rate of Change)
- Momentum Indicator
- TSI (True Strength Index)
- Ultimate Oscillator
- Awesome Oscillator
- Detrended Price Oscillator
- Elder Ray Index
- Know Sure Thing (KST)
- Price Momentum Oscillator
- Chande Momentum Oscillator

### 3. Volatility Indicators (10% weight)
- Bollinger Bands (20,2) (20,3)
- Keltner Channel
- Donchian Channel
- ATR (Average True Range)
- Standard Deviation
- Historical Volatility
- Chandelier Exit

### 4. Volume Indicators (15% weight)
- OBV (On Balance Volume)
- MFI (Money Flow Index)
- VWAP (Volume Weighted Average Price)
- Accumulation/Distribution
- Chaikin Money Flow
- Volume Price Trend
- Ease of Movement
- Klinger Oscillator

### 5. Support/Resistance (10% weight)
- Pivot Points (Standard, Fibonacci, Woodie, Camarilla, DeMark)
- Fibonacci Retracement
- Fibonacci Extension
- S/R Detection Algorithm

### 6. Patterns (10% weight)
- 20+ Candlestick Patterns
- 10+ Chart Patterns
- 5+ Harmonic Patterns

### 7. Options (5% weight)
- Put-Call Ratio (PCR)
- Max Pain Level
- Implied Volatility

## Implementation Status

Each indicator should:
1. Be in its own file under the appropriate category folder
2. Export a function that takes chart data and returns a score (-100 to 100)
3. Include metadata (name, category, weight, description)
4. Handle edge cases (insufficient data, invalid values)
5. Include unit tests

## Adding New Indicators

1. Create indicator file in appropriate category folder
2. Implement calculation function
3. Export with standard interface
4. Add to `indicators/index.js`
5. Write unit tests
6. Update this documentation
