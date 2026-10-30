import { describe, it, expect } from 'vitest';
import { isAdEligible } from './adsense';

const goodInfo = {
  intro: 'Work out your monthly EMI and see how much interest you will pay over the life of the loan.',
  how: ['Step one.', 'Step two.', 'Step three.'],
  faq: [['Q1', 'A1'], ['Q2', 'A2'], ['Q3', 'A3']],
};
const live = { slug: 'x', status: 'live' };

describe('isAdEligible', () => {
  it('allows a live tool with a guide and a working component', () => {
    expect(isAdEligible({ tool: live, info: goodInfo, hasTool: true })).toBe(true);
  });

  it('blocks coming-soon (planned) tools', () => {
    expect(isAdEligible({ tool: { ...live, status: 'planned' }, info: goodInfo, hasTool: false })).toBe(false);
  });

  it('blocks tools with no implementation even if marked live', () => {
    expect(isAdEligible({ tool: live, info: goodInfo, hasTool: false })).toBe(false);
  });

  it('blocks a missing tool (not found or redirect)', () => {
    expect(isAdEligible({ tool: undefined, info: goodInfo, hasTool: true })).toBe(false);
  });

  it('blocks thin guides: short intro, too few steps or FAQ items', () => {
    expect(isAdEligible({ tool: live, info: { ...goodInfo, intro: 'Short.' }, hasTool: true })).toBe(false);
    expect(isAdEligible({ tool: live, info: { ...goodInfo, how: ['one'] }, hasTool: true })).toBe(false);
    expect(isAdEligible({ tool: live, info: { ...goodInfo, faq: [['Q', 'A']] }, hasTool: true })).toBe(false);
  });

  it('blocks tools with no guide at all', () => {
    expect(isAdEligible({ tool: live, info: undefined, hasTool: true })).toBe(false);
  });
});
