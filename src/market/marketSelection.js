export const MARKET_OPTIONS = Object.freeze([
  { value: 'IN', label: 'India', status: 'AVAILABLE' },
  { value: 'US', label: 'United States', status: 'COMING_SOON' },
  { value: 'UK', label: 'United Kingdom', status: 'COMING_SOON' },
  { value: 'GLOBAL', label: 'Global indices', status: 'COMING_SOON' }
]);

export const ASSET_OPTIONS = Object.freeze([
  { value: 'STOCKS', label: 'Stocks', status: 'AVAILABLE' },
  { value: 'INDICES', label: 'Indices', status: 'AVAILABLE' },
  { value: 'ETFS', label: 'ETFs', status: 'COMING_SOON' },
  { value: 'OTHER', label: 'Other assets', status: 'COMING_SOON' }
]);

export const EXCHANGE_OPTIONS = Object.freeze([
  { value: 'NSE', label: 'NSE', status: 'AVAILABLE' },
  { value: 'BSE', label: 'BSE', status: 'COMING_SOON' }
]);

export function validateMarketSelection({ market = 'IN', assetType = 'STOCKS', exchange = 'NSE' } = {}) {
  const marketOption = MARKET_OPTIONS.find(option => option.value === market);
  if (!marketOption || marketOption.status !== 'AVAILABLE') {
    return { valid: false, code: 'MARKET_UNAVAILABLE', message: 'This market is not available yet. India is the currently supported market.' };
  }

  const assetOption = ASSET_OPTIONS.find(option => option.value === assetType);
  if (!assetOption || assetOption.status !== 'AVAILABLE') {
    return { valid: false, code: 'ASSET_UNAVAILABLE', message: 'This asset type is not available yet.' };
  }

  const exchangeOption = EXCHANGE_OPTIONS.find(option => option.value === exchange);
  if (!exchangeOption || exchangeOption.status !== 'AVAILABLE') {
    return { valid: false, code: 'EXCHANGE_UNAVAILABLE', message: 'This exchange is not available yet. Choose NSE for the current research pilot.' };
  }

  return { valid: true, market, assetType, exchange };
}
