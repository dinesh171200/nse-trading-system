# Technical Indicators Library (50+ Indicators)

This system analyzes **50+ technical indicators** across 6 categories to generate comprehensive trading signals.

## 📊 Momentum Indicators (16)
1. **RSI 14** - Relative Strength Index (14-period)
2. **RSI 21** - Relative Strength Index (21-period)
3. **Stochastic Oscillator** - %K and %D lines
4. **CCI** - Commodity Channel Index
5. **Williams %R** - Williams Percent Range
6. **ROC** - Rate of Change
7. **Ultimate Oscillator** - Triple timeframe momentum
8. **TRIX** - Triple Exponential Average
9. **Momentum** - Price momentum
10. **CMO** - Chande Momentum Oscillator
11. **TSI** - True Strength Index
12. **Awesome Oscillator** - Bill Williams indicator
13. **Balance of Power** - Buyer/Seller strength

## 📈 Trend Indicators (15)
1. **EMA 9** - Exponential Moving Average (9-period)
2. **EMA 20** - Exponential Moving Average (20-period)
3. **EMA 50** - Exponential Moving Average (50-period)
4. **SMA 20** - Simple Moving Average (20-period)
5. **SMA 50** - Simple Moving Average (50-period)
6. **EMA Crossover (12/26)** - Golden/Death Cross detection
7. **MACD** - Moving Average Convergence Divergence
8. **ADX** - Average Directional Index
9. **Supertrend** - Trend-following indicator
10. **Parabolic SAR** - Stop and Reverse
11. **Aroon** - Aroon Up/Down oscillator
12. **DMI** - Directional Movement Index
13. **Vortex Indicator** - VI+ and VI-
14. **Mass Index** - Trend reversal detection
15. **Ichimoku Cloud** - Comprehensive trend system
16. **Choppiness Index** - Market consolidation detector

## 💹 Volatility Indicators (8)
1. **Bollinger Bands** - Upper/Middle/Lower bands
2. **ATR** - Average True Range
3. **Keltner Channel** - Volatility envelope
4. **Donchian Channel** - Price channel
5. **Standard Deviation** - Price volatility
6. **Historical Volatility** - Annualized volatility

## 📊 Volume Indicators (12)
1. **OBV** - On-Balance Volume
2. **MFI** - Money Flow Index
3. **VWAP** - Volume Weighted Average Price
4. **Accumulation/Distribution Line** - Money flow accumulation
5. **Chaikin Money Flow** - Volume-weighted A/D
6. **Force Index** - Price and volume force
7. **Volume Oscillator** - Volume momentum
8. **Ease of Movement** - Price movement ease
9. **Chaikin Oscillator** - A/D momentum

## 🎯 Support/Resistance Indicators (6)
1. **Pivot Points** - Standard pivots
2. **Fibonacci Retracement** - Fib levels (23.6%, 38.2%, 50%, 61.8%, 78.6%)
3. **Support/Resistance Levels** - Dynamic S/R zones
4. **Previous Day High/Low** - Yesterday's extremes

## 🎨 Pattern Recognition
- Candlestick pattern detection
- Chart pattern identification
- Price action analysis

## ⚙️ Weighting System

Each category has a specific weight in final signal calculation:

- **Trend**: 30%
- **Momentum**: 25%
- **Volume**: 15%
- **Volatility**: 10%
- **Patterns**: 10%
- **Support/Resistance**: 10%

## 🔄 Signal Generation Process

1. **Calculate All Indicators** - Each indicator generates a score (-100 to +100)
2. **Category Scoring** - Average scores within each category
3. **Weighted Combination** - Apply category weights
4. **Agreement Bonus** - Boost confidence when indicators align
5. **Confidence Calculation** - Normalize to 0-100% confidence
6. **Action Determination** - BUY/SELL/HOLD based on total score
7. **Strength Classification** - STRONG/MODERATE/WEAK signal strength

## 📈 Signal Output

Each generated signal includes:
- **Action**: BUY, SELL, or HOLD
- **Confidence**: 0-100%
- **Strength**: STRONG (>75%), MODERATE (50-75%), WEAK (<50%)
- **Entry Price**: Recommended entry level
- **Stop Loss**: Risk management level
- **Targets**: 3 profit targets
- **Risk/Reward Ratio**: Expected R:R
- **Category Scores**: Individual category analysis
- **Reasoning**: Detailed explanation
- **Support/Resistance Levels**: Key price zones

## 🎯 Minimum Confidence Threshold

- Signals with confidence < 50% are not saved to database
- Only actionable signals (BUY/SELL with high confidence) are displayed
- HOLD signals indicate market indecision

## 📊 Indicators by Data Requirement

**Minimal Data (2-10 candles):**
- OBV, VWAP, Accumulation/Distribution, Pivot Points

**Short Period (11-20 candles):**
- RSI, Stochastic, Bollinger Bands, ATR, EMA 9-20

**Medium Period (21-35 candles):**
- MACD, ADX, Aroon, SMA 20-50

**Long Period (36+ candles):**
- EMA 50, Ichimoku, Mass Index

## 🚀 Real-Time Analysis

All indicators are calculated in real-time:
- Data fetched every 1 minute during market hours
- Charts generated for multiple timeframes (1m, 5m, 15m, 30m, 1h)
- Signals updated every minute
- Best signal across all timeframes is selected

## 📝 Notes

- Options indicators (PCR, OI Analysis) require separate options chain data
- Pattern recognition is automated based on price action
- Indicators adapt to available data (graceful degradation)
- System handles missing/insufficient data automatically
