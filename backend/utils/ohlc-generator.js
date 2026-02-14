/**
 * OHLC Generator Utility
 * Converts tick data into OHLC candles
 */

/**
 * Generate OHLC candle from tick data
 * @param {Array} ticks - Array of tick documents
 * @returns {Object} OHLC data
 */
function generateOHLC(ticks) {
  if (!ticks || ticks.length === 0) {
    return null;
  }

  // Sort by timestamp ascending
  const sortedTicks = ticks.sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  const open = sortedTicks[0].price;
  const close = sortedTicks[sortedTicks.length - 1].price;

  const high = Math.max(...sortedTicks.map(t => t.price));
  const low = Math.min(...sortedTicks.map(t => t.price));

  const volume = sortedTicks.reduce((sum, t) => sum + (t.volume || 0), 0);

  return {
    open,
    high,
    low,
    close,
    volume,
    tickCount: ticks.length,
    firstTick: sortedTicks[0].timestamp,
    lastTick: sortedTicks[sortedTicks.length - 1].timestamp
  };
}

/**
 * Group ticks by time intervals
 * @param {Array} ticks - Array of tick documents
 * @param {Number} intervalMinutes - Interval in minutes
 * @returns {Object} Grouped ticks by interval
 */
function groupTicksByInterval(ticks, intervalMinutes) {
  const groups = {};

  ticks.forEach(tick => {
    const timestamp = new Date(tick.timestamp);

    // Round down to nearest interval
    const roundedMinutes = Math.floor(timestamp.getMinutes() / intervalMinutes) * intervalMinutes;
    timestamp.setMinutes(roundedMinutes);
    timestamp.setSeconds(0);
    timestamp.setMilliseconds(0);

    const key = timestamp.toISOString();

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(tick);
  });

  return groups;
}

/**
 * Group ticks by hour
 */
function groupTicksByHour(ticks) {
  const groups = {};

  ticks.forEach(tick => {
    const timestamp = new Date(tick.timestamp);
    timestamp.setMinutes(0);
    timestamp.setSeconds(0);
    timestamp.setMilliseconds(0);

    const key = timestamp.toISOString();

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(tick);
  });

  return groups;
}

/**
 * Group ticks by day
 */
function groupTicksByDay(ticks) {
  const groups = {};

  ticks.forEach(tick => {
    const timestamp = new Date(tick.timestamp);
    timestamp.setHours(0, 0, 0, 0);

    const key = timestamp.toISOString();

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(tick);
  });

  return groups;
}

/**
 * Convert timeframe string to minutes
 */
function timeframeToMinutes(timeframe) {
  const map = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '1d': 1440
  };
  return map[timeframe] || 1;
}

/**
 * Get appropriate grouping function for timeframe
 */
function getGroupingFunction(timeframe) {
  switch (timeframe) {
    case '1h':
      return groupTicksByHour;
    case '1d':
      return groupTicksByDay;
    default:
      // For minute-based timeframes
      const minutes = timeframeToMinutes(timeframe);
      return (ticks) => groupTicksByInterval(ticks, minutes);
  }
}

module.exports = {
  generateOHLC,
  groupTicksByInterval,
  groupTicksByHour,
  groupTicksByDay,
  timeframeToMinutes,
  getGroupingFunction
};
