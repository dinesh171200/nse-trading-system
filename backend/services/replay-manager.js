/**
 * Replay Manager - Simulates Live Market Using Historical Data
 * Plays through Feb 13, 2024 data minute-by-minute
 */

const TickData = require('../models/TickData');
const ChartData = require('../models/ChartData');
const SignalHistory = require('../models/SignalHistory');
const signalCombiner = require('./signal-combiner');

class ReplayManager {
  constructor() {
    this.isPlaying = false;
    this.currentIndex = 0;
    this.allTicks = [];
    this.symbol = 'NIFTY50';
    this.playbackSpeed = 1000; // 1 second = 1 minute
    this.intervalId = null;
    this.listeners = [];
    this.sessionId = Date.now().toString(); // Unique session ID
  }

  /**
   * Load Feb 13 data for replay
   */
  async loadReplayData(symbol = 'NIFTY50') {
    try {
      this.symbol = symbol;

      // Load all Feb 13 ticks
      const startDate = new Date('2024-02-13T03:45:00.000Z');
      const endDate = new Date('2024-02-13T10:00:00.000Z');

      this.allTicks = await TickData.find({
        symbol,
        timestamp: { $gte: startDate, $lt: endDate }
      }).sort({ timestamp: 1 });

      console.log(`\n📊 Replay Manager: Loaded ${this.allTicks.length} ticks for ${symbol}`);
      return {
        success: true,
        ticksLoaded: this.allTicks.length,
        startTime: this.allTicks[0]?.timestamp,
        endTime: this.allTicks[this.allTicks.length - 1]?.timestamp
      };
    } catch (error) {
      throw new Error(`Failed to load replay data: ${error.message}`);
    }
  }

  /**
   * Start replay
   */
  async start(options = {}) {
    if (this.isPlaying) {
      return { success: false, message: 'Replay already running' };
    }

    let { speed = 1, startFrom = 0 } = options;
    this.playbackSpeed = 1000 / speed; // speed multiplier

    if (this.allTicks.length === 0) {
      await this.loadReplayData(this.symbol);
    }

    // If starting from beginning and user hasn't specified, start from 50 min
    // This ensures we have enough data for signals (10 complete 5m candles)
    if (startFrom === 0 && this.currentIndex === 0) {
      startFrom = 50; // Start from 50 minutes in
      console.log(`\n⏩ Fast-forwarding to 10:05 AM (50 minutes in) for immediate signals...`);
    }

    this.currentIndex = startFrom;
    this.isPlaying = true;
    console.log(`\n▶️  Replay started at index ${this.currentIndex} (speed: ${speed}x)`);

    // Start playback interval
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.playbackSpeed);

    return {
      success: true,
      message: 'Replay started',
      currentIndex: this.currentIndex,
      totalTicks: this.allTicks.length
    };
  }

  /**
   * Process one tick
   */
  async tick() {
    if (this.currentIndex >= this.allTicks.length) {
      console.log('\n🏁 Replay finished - restarting from beginning');
      this.currentIndex = 0; // Loop back to start
    }

    const currentTick = this.allTicks[this.currentIndex];

    // Get all ticks up to current point
    const ticksUpToNow = this.allTicks.slice(0, this.currentIndex + 1);

    // Generate charts for current timepoint
    const charts = await this.generateChartsUpToNow(ticksUpToNow);

    // Generate signal for 5m timeframe
    const signal = await this.generateSignalUpToNow(charts['5m']);

    // Save signal to history (only if it's a real signal, not warming up)
    if (signal && signal.signal.confidence > 0) {
      await this.saveSignalToHistory(currentTick, signal);
    }

    // Notify all listeners
    const replayData = {
      currentIndex: this.currentIndex,
      totalTicks: this.allTicks.length,
      progress: ((this.currentIndex / this.allTicks.length) * 100).toFixed(1),
      currentTick: {
        timestamp: currentTick.timestamp,
        price: currentTick.price,
        volume: currentTick.volume,
        open: currentTick.metadata?.open || currentTick.price,
        high: currentTick.metadata?.high || currentTick.price,
        low: currentTick.metadata?.low || currentTick.price,
        change: currentTick.metadata?.change || 0,
        changePercent: currentTick.metadata?.changePercent || 0
      },
      charts,
      signal,
      marketTime: currentTick.timestamp.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    // Call all listeners
    this.listeners.forEach(callback => {
      try {
        callback(replayData);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });

    this.currentIndex++;
  }

  /**
   * Generate charts from ticks up to current point
   */
  async generateChartsUpToNow(ticks) {
    const { generateOHLC, getGroupingFunction } = require('../utils/ohlc-generator');
    const charts = {};
    const timeframes = ['5m']; // Focus on 5m for signals

    for (const timeframe of timeframes) {
      try {
        // Group ticks by timeframe
        const groupingFunc = getGroupingFunction(timeframe);
        const groupedTicks = groupingFunc(ticks);

        // Generate OHLC candles
        const candles = [];
        for (const [timestamp, tickGroup] of Object.entries(groupedTicks)) {
          const ohlc = generateOHLC(tickGroup);

          if (ohlc) {
            candles.push({
              symbol: this.symbol,
              timeframe,
              timestamp: new Date(timestamp),
              ohlc: {
                open: ohlc.open,
                high: ohlc.high,
                low: ohlc.low,
                close: ohlc.close
              },
              volume: ohlc.volume,
              metadata: {
                tickCount: ohlc.tickCount
              }
            });
          }
        }

        // Keep only the last 100 candles
        charts[timeframe] = candles.slice(-100);
      } catch (error) {
        console.error(`Chart generation error for ${timeframe}:`, error.message);
        charts[timeframe] = [];
      }
    }

    return charts;
  }

  /**
   * Generate signal from charts up to current point
   */
  async generateSignalUpToNow(candles) {
    const minCandles = 10; // Need at least 10 candles for reliable signals

    if (!candles || candles.length < minCandles) {
      const minutesNeeded = (minCandles - (candles?.length || 0)) * 5;
      return {
        signal: {
          action: 'HOLD',
          confidence: 0,
          strength: 'VERY_WEAK'
        },
        levels: { entry: 0, stopLoss: 0, target1: 0, target2: 0, target3: 0, riskRewardRatio: 0 },
        reasoning: [
          `Warming up indicators... ${candles?.length || 0}/${minCandles} candles available`,
          `Signals will appear in ~${minutesNeeded} minutes`
        ],
        metadata: {
          candlesNeeded: minCandles - (candles?.length || 0)
        }
      };
    }

    try {
      const signal = await signalCombiner.generateSignal(candles, {
        symbol: this.symbol,
        timeframe: '5m',
        minConfidence: 0
      });
      return signal;
    } catch (error) {
      console.error('Signal generation error:', error.message);
      return {
        signal: {
          action: 'HOLD',
          confidence: 0,
          strength: 'VERY_WEAK'
        },
        levels: { entry: 0, stopLoss: 0, target1: 0, target2: 0, target3: 0, riskRewardRatio: 0 },
        reasoning: ['Signal calculation in progress...', error.message]
      };
    }
  }

  /**
   * Pause replay
   */
  pause() {
    if (!this.isPlaying) {
      return { success: false, message: 'Replay not running' };
    }

    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log(`\n⏸️  Replay paused at index ${this.currentIndex}`);
    return {
      success: true,
      message: 'Replay paused',
      currentIndex: this.currentIndex
    };
  }

  /**
   * Resume replay
   */
  resume() {
    if (this.isPlaying) {
      return { success: false, message: 'Replay already running' };
    }

    return this.start({ startFrom: this.currentIndex });
  }

  /**
   * Stop replay
   */
  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentIndex = 0;

    console.log('\n⏹️  Replay stopped');
    return {
      success: true,
      message: 'Replay stopped'
    };
  }

  /**
   * Seek to specific index
   */
  seek(index) {
    if (index < 0 || index >= this.allTicks.length) {
      return { success: false, message: 'Invalid index' };
    }

    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.pause();
    }

    this.currentIndex = index;

    if (wasPlaying) {
      this.resume();
    }

    return {
      success: true,
      currentIndex: this.currentIndex,
      timestamp: this.allTicks[index].timestamp
    };
  }

  /**
   * Add listener for replay updates
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      currentIndex: this.currentIndex,
      totalTicks: this.allTicks.length,
      progress: this.allTicks.length > 0
        ? ((this.currentIndex / this.allTicks.length) * 100).toFixed(1)
        : 0,
      symbol: this.symbol,
      currentTick: this.allTicks[this.currentIndex] || null,
      playbackSpeed: this.playbackSpeed
    };
  }

  /**
   * Change symbol
   */
  async changeSymbol(symbol) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.stop();
    }

    await this.loadReplayData(symbol);

    if (wasPlaying) {
      this.start();
    }

    return {
      success: true,
      symbol: this.symbol,
      ticksLoaded: this.allTicks.length
    };
  }

  /**
   * Save signal to history
   */
  async saveSignalToHistory(tick, signal) {
    try {
      // Only save meaningful signals (not HOLD with 0 confidence)
      if (signal.signal.action === 'HOLD' && signal.signal.confidence < 50) {
        return;
      }

      const historyEntry = {
        symbol: this.symbol,
        timeframe: '5m',
        marketTime: tick.timestamp,
        signal: signal.signal,
        price: tick.price,
        levels: signal.levels,
        scoring: signal.scoring,
        reasoning: signal.reasoning,
        metadata: {
          replaySession: this.sessionId,
          candlesAnalyzed: signal.metadata?.candlesAnalyzed || 0,
          indicatorsUsed: signal.metadata?.indicatorsUsed || 0,
          processingTime: signal.metadata?.processingTime || 0
        }
      };

      await SignalHistory.create(historyEntry);
    } catch (error) {
      console.error('Failed to save signal history:', error.message);
    }
  }

  /**
   * Get signal history for current session
   */
  async getSignalHistory(limit = 50) {
    try {
      const history = await SignalHistory.find({
        symbol: this.symbol,
        'metadata.replaySession': this.sessionId
      })
      .sort({ marketTime: -1 })
      .limit(limit);

      return history;
    } catch (error) {
      console.error('Failed to get signal history:', error.message);
      return [];
    }
  }

  /**
   * Clear signal history for current session
   */
  async clearSignalHistory() {
    try {
      await SignalHistory.deleteMany({
        'metadata.replaySession': this.sessionId
      });
      console.log('✓ Signal history cleared');
    } catch (error) {
      console.error('Failed to clear signal history:', error.message);
    }
  }
}

// Singleton instance
const replayManager = new ReplayManager();

module.exports = replayManager;
