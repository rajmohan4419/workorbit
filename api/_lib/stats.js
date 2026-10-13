/**
 * Deterministic Financial Statistics Module
 * Calculates returns, 52-week position, annualized volatility, and maximum drawdown.
 * Handles edge cases, missing data, zero denominators, and non-finite numbers safely.
 */

function isFiniteNumber(val) {
  return typeof val === 'number' && Number.isFinite(val);
}

/**
 * Calculates percentage return between start and end prices.
 * @param {number} startPrice
 * @param {number} endPrice
 * @returns {number|null} percentage return rounded to 2 decimal places, or null if invalid
 */
export function calculateReturn(startPrice, endPrice) {
  if (!isFiniteNumber(startPrice) || !isFiniteNumber(endPrice) || startPrice <= 0) {
    return null;
  }
  const ret = ((endPrice - startPrice) / startPrice) * 100;
  return isFiniteNumber(ret) ? Math.round(ret * 100) / 100 : null;
}

/**
 * Calculates position in 52-week range as a percentage between 0 and 100.
 * Formula: ((price - low) / (high - low)) * 100
 * @param {number} currentPrice
 * @param {number} low
 * @param {number} high
 * @returns {number|null} range position percentage (0-100) rounded to 2 decimal places, or null
 */
export function calculate52WeekPosition(currentPrice, low, high) {
  if (
    !isFiniteNumber(currentPrice) ||
    !isFiniteNumber(low) ||
    !isFiniteNumber(high) ||
    high <= low ||
    currentPrice < low ||
    currentPrice > high
  ) {
    return null;
  }
  const position = ((currentPrice - low) / (high - low)) * 100;
  return isFiniteNumber(position) ? Math.round(position * 100) / 100 : null;
}

/**
 * Calculates annualized volatility from a daily close price series.
 * Uses daily log/percentage returns and annualization factor sqrt(252).
 * @param {Array<{close?: number}>} history
 * @returns {number|null} annualized volatility as percentage rounded to 2 decimal places, or null
 */
export function calculateAnnualizedVolatility(history) {
  if (!Array.isArray(history) || history.length < 2) {
    return null;
  }

  const validCloses = history
    .map((h) => (h && isFiniteNumber(h.close) ? h.close : null))
    .filter((c) => c !== null && c > 0);

  if (validCloses.length < 2) {
    return null;
  }

  const dailyReturns = [];
  for (let i = 1; i < validCloses.length; i++) {
    const prev = validCloses[i - 1];
    const curr = validCloses[i];
    const r = (curr - prev) / prev;
    if (isFiniteNumber(r)) {
      dailyReturns.push(r);
    }
  }

  if (dailyReturns.length < 1) {
    return null;
  }

  const mean = dailyReturns.reduce((acc, val) => acc + val, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((acc, val) => acc + (val - mean) ** 2, 0) /
    (dailyReturns.length > 1 ? dailyReturns.length - 1 : 1);

  const dailyStdDev = Math.sqrt(variance);
  const annualizedVol = dailyStdDev * Math.sqrt(252) * 100;

  return isFiniteNumber(annualizedVol) ? Math.round(annualizedVol * 100) / 100 : null;
}

/**
 * Calculates maximum drawdown percentage from a close price series.
 * Formula: max((peak - price) / peak) * 100
 * @param {Array<{close?: number}>} history
 * @returns {number|null} max drawdown as percentage (positive number e.g. 15.5 for 15.5% drop) or null
 */
export function calculateMaxDrawdown(history) {
  if (!Array.isArray(history) || history.length < 2) {
    return null;
  }

  const validCloses = history
    .map((h) => (h && isFiniteNumber(h.close) ? h.close : null))
    .filter((c) => c !== null && c > 0);

  if (validCloses.length < 2) {
    return null;
  }

  let peak = validCloses[0];
  let maxDrawdown = 0.0;

  for (const price of validCloses) {
    if (price > peak) {
      peak = price;
    }
    const drawdown = (peak - price) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  const maxDrawdownPct = maxDrawdown * 100;
  return isFiniteNumber(maxDrawdownPct) ? Math.round(maxDrawdownPct * 100) / 100 : null;
}

/**
 * Computes all standard statistics for a given stock and history array.
 * @param {object} quote - Live or current quote object
 * @param {Array} history - Daily history array sorted chronologically (oldest to newest)
 * @returns {object} Calculated statistics
 */
export function computeStatistics(quote, history = []) {
  const validHistory = Array.isArray(history)
    ? history.filter((h) => h && isFiniteNumber(h.close) && h.close > 0)
    : [];

  const currentPrice = isFiniteNumber(quote?.price) ? quote.price : (validHistory.length > 0 ? validHistory[validHistory.length - 1].close : null);
  const low52 = isFiniteNumber(quote?.fifty_two_week_range?.low) ? quote.fifty_two_week_range.low : null;
  const high52 = isFiniteNumber(quote?.fifty_two_week_range?.high) ? quote.fifty_two_week_range.high : null;

  // Find price N days/months ago
  const getReturnForPeriodDays = (days) => {
    if (validHistory.length < 2) return null;
    const latestClose = validHistory[validHistory.length - 1].close;
    const startIndex = Math.max(0, validHistory.length - 1 - days);
    const startClose = validHistory[startIndex].close;
    return calculateReturn(startClose, latestClose);
  };

  return {
    return_1m: getReturnForPeriodDays(21), // ~21 trading days in a month
    return_6m: getReturnForPeriodDays(126), // ~126 trading days in 6 months
    return_1y: getReturnForPeriodDays(252), // ~252 trading days in 1 year
    range_52w_position: calculate52WeekPosition(currentPrice, low52, high52),
    annualized_volatility: calculateAnnualizedVolatility(validHistory),
    max_drawdown: calculateMaxDrawdown(validHistory),
  };
}
