import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMarketSelection } from './marketSelection.js';
import { resolveResearchEntity } from './research/researchRunner.js';

test('India NSE stock selection is available', () => {
  assert.deepEqual(validateMarketSelection({ market: 'IN', assetType: 'STOCKS', exchange: 'NSE' }), {
    valid: true, market: 'IN', assetType: 'STOCKS', exchange: 'NSE'
  });
});

test('unsupported markets and exchanges are explicitly rejected', () => {
  assert.equal(validateMarketSelection({ market: 'US', assetType: 'STOCKS', exchange: 'NSE' }).code, 'MARKET_UNAVAILABLE');
  assert.equal(validateMarketSelection({ market: 'IN', assetType: 'STOCKS', exchange: 'BSE' }).code, 'EXCHANGE_UNAVAILABLE');
});

test('INFY resolves only to the selected NSE listing', () => {
  assert.equal(resolveResearchEntity('INFY', { market: 'IN', assetType: 'STOCKS', exchange: 'NSE' }).exchange, 'NSE');
  assert.equal(resolveResearchEntity('INFY', { market: 'IN', assetType: 'STOCKS', exchange: 'BSE' }), null);
  assert.equal(resolveResearchEntity('INFY', { market: 'US', assetType: 'STOCKS', exchange: 'NSE' }), null);
});

test('index research remains explicitly typed as indices', () => {
  const entity = resolveResearchEntity('NIFTY50', { market: 'IN', assetType: 'INDICES', exchange: 'NSE' });
  assert.equal(entity?.entityType, 'INDEX');
  assert.equal(resolveResearchEntity('NIFTY50', { market: 'IN', assetType: 'STOCKS', exchange: 'NSE' }), null);
});
