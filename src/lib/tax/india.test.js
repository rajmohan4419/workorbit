import {describe,it,expect} from 'vitest';
import {indiaTax,INDIA_TAX_PERIODS} from './india.js';
describe('period-specific ordinary-income tax',()=>{
  it('keeps assessment years and current tax year distinct',()=>{
    expect(INDIA_TAX_PERIODS['ay2026-27'].act).toBe(1961);
    expect(INDIA_TAX_PERIODS['ty2026-27'].act).toBe(2025);
    expect(indiaTax(1200000,{period:'ay2025-26'}).total).toBe(83200);
    expect(indiaTax(1200000,{period:'ay2026-27'}).total).toBe(0);
    expect(indiaTax(1200000,{period:'ty2026-27'}).total).toBe(0);
  });
  it('applies rebate marginal relief just above 12 lakh and denies nonresident rebate',()=>{
    expect(indiaTax(1200100).total).toBe(104);
    expect(indiaTax(1200000,{resident:false}).total).toBe(62400);
  });
  it('does not give nonresidents senior citizen thresholds or old-regime rebate',()=>{
    expect(indiaTax(500000,{regime:'old',resident:false,ageBand:'super'}).total).toBe(13000);
    expect(indiaTax(500000,{regime:'old',resident:true,ageBand:'below60'}).total).toBe(0);
  });
  it('applies surcharge marginal relief without a cliff',()=>{
    const at=indiaTax(5000000).total, above=indiaTax(5000100).total;
    expect(above-at).toBeCloseTo(104,5);
    expect(()=>indiaTax(100,{period:'unknown'})).toThrow(/Unsupported/);
  });
});
