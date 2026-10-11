import { createEvidenceRecord, EVIDENCE_KINDS, EVIDENCE_STATUS, validateEvidenceSet } from '../../market/evidence';
import { demoAdapter, normalizeSourcePayload } from '../../market/sources';
import { reconcileEvidenceSet } from '../../market/reconciliation';
import { detectContradictions } from '../../market/contradictions';
import { buildResearchDossier } from '../../market/dossier';
import { newsAdapter, enrichNewsEvidence, summarizeNewsIntelligence } from '../../market/news';

export const DEMO_DAYS = [
  ['2026-01-05', 23840, 23910, 23790, 23880, 1.12, 1.4],
  ['2026-01-06', 23880, 23940, 23810, 23835, 0.94, 1.1],
  ['2026-01-07', 23835, 24020, 23820, 23980, 1.35, 2.2],
  ['2026-01-08', 23980, 24010, 23870, 23920, 1.02, 1.8],
  ['2026-01-09', 23920, 24110, 23890, 24085, 1.58, 3.1],
  ['2026-01-12', 24085, 24160, 23980, 24040, 1.08, 2.5],
  ['2026-01-13', 24040, 24230, 24020, 24200, 1.72, 3.8],
  ['2026-01-14', 24200, 24260, 24080, 24120, 0.91, 2.0],
  ['2026-01-15', 24120, 24340, 24090, 24310, 1.86, 4.1],
  ['2026-01-16', 24310, 24380, 24200, 24255, 1.01, 2.6],
  ['2026-01-19', 24255, 24420, 24210, 24390, 1.49, 3.4],
  ['2026-01-20', 24390, 24410, 24280, 24320, 0.88, 2.1],
  ['2026-01-21', 24320, 24540, 24300, 24510, 1.92, 4.6],
  ['2026-01-22', 24510, 24580, 24390, 24420, 0.97, 1.7],
  ['2026-01-23', 24420, 24620, 24380, 24590, 1.63, 3.9],
  ['2026-01-26', 24590, 24610, 24450, 24480, 0.82, 1.4],
  ['2026-01-27', 24480, 24680, 24460, 24630, 1.77, 4.3],
  ['2026-01-28', 24630, 24720, 24530, 24570, 0.93, 2.0],
  ['2026-01-29', 24570, 24810, 24520, 24790, 1.96, 4.8],
  ['2026-01-30', 24790, 24840, 24620, 24680, 0.89, 1.9]
].map(([date, open, high, low, close, volume, oi]) => ({ date, open, high, low, close, volume, oi }));

export const formatNumber = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);

export const DEMO_SOURCE_EVIDENCE = normalizeSourcePayload(demoAdapter, DEMO_DAYS, { symbol: 'DEMO', exchange: 'DEMO', retrievedAt: '2026-01-31T00:00:00Z' });

export const DEMO_EVIDENCE = [
  createEvidenceRecord({
    entity: { symbol: 'DEMO', exchange: 'DEMO' },
    metric: { key: 'close', label: 'Close price' },
    value: 23880,
    unit: 'INR',
    period: { asOf: '2026-01-05' },
    source: { provider: 'OrbitBoard synthetic dataset', url: 'https://orbitboard.in/market-lab' },
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.UNVERIFIED,
    retrievedAt: '2026-01-05T00:00:00Z'
  }),
  createEvidenceRecord({
    entity: { symbol: 'DEMO', exchange: 'DEMO' },
    metric: { key: 'volume_index', label: 'Volume index' },
    value: 1.12,
    unit: 'x',
    period: { asOf: '2026-01-05' },
    source: { provider: 'OrbitBoard synthetic dataset', url: 'https://orbitboard.in/market-lab' },
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.UNVERIFIED,
    retrievedAt: '2026-01-05T00:00:00Z'
  }),
  createEvidenceRecord({
    entity: { symbol: 'DEMO', exchange: 'DEMO' },
    metric: { key: 'oi', label: 'Open interest index' },
    value: 1.4,
    unit: 'x',
    period: { asOf: '2026-01-05' },
    source: { provider: 'OrbitBoard synthetic dataset', url: 'https://orbitboard.in/market-lab' },
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.UNVERIFIED,
    retrievedAt: '2026-01-05T00:00:00Z'
  })
];

export const DEMO_EVIDENCE_VALIDATION = validateEvidenceSet(DEMO_EVIDENCE);
export const DEMO_SOURCE_VALIDATION = validateEvidenceSet(DEMO_SOURCE_EVIDENCE.records);

export const RECONCILIATION_DEMO = reconcileEvidenceSet([
  createEvidenceRecord({
    entity: { symbol: 'DEMO', exchange: 'DEMO' },
    metric: { key: 'revenue', label: 'Revenue' },
    value: 12.4,
    unit: 'INR Cr',
    period: { end: '2026-01-31' },
    source: { id: 'source-a', provider: 'Source A', url: 'https://orbitboard.in/market-lab' },
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.UNVERIFIED,
    retrievedAt: '2026-02-01T00:00:00Z'
  }),
  createEvidenceRecord({
    entity: { symbol: 'DEMO', exchange: 'DEMO' },
    metric: { key: 'revenue', label: 'Revenue' },
    value: 12.1,
    unit: 'INR Cr',
    period: { end: '2026-01-31' },
    source: { id: 'source-b', provider: 'Source B', url: 'https://orbitboard.in/market-lab' },
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.UNVERIFIED,
    retrievedAt: '2026-02-01T00:00:00Z'
  }),
  createEvidenceRecord({
    entity: { symbol: 'DEMO', exchange: 'DEMO' },
    metric: { key: 'revenue', label: 'Revenue' },
    value: 12.4,
    unit: 'INR Cr',
    period: { end: '2026-01-31' },
    source: { id: 'source-c', provider: 'Source C', url: 'https://orbitboard.in/market-lab' },
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.UNVERIFIED,
    retrievedAt: '2026-02-01T00:00:00Z'
  })
]);

export const DEMO_RECONCILIATION = RECONCILIATION_DEMO.results[0];

export const CONTRADICTION_DEMO_EVIDENCE = [
  createEvidenceRecord({
    entity: { symbol: 'DEMO', exchange: 'DEMO' },
    metric: { key: 'revenue_growth', label: 'Revenue growth' },
    value: 28,
    unit: '%',
    period: { end: '2026-01-31' },
    source: { provider: 'Demo financial source', url: 'https://orbitboard.in/market-lab' },
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.VERIFIED,
    retrievedAt: '2026-02-01T00:00:00Z'
  }),
  createEvidenceRecord({
    entity: { symbol: 'DEMO', exchange: 'DEMO' },
    metric: { key: 'profit_growth', label: 'Profit growth' },
    value: 35,
    unit: '%',
    period: { end: '2026-01-31' },
    source: { provider: 'Demo financial source', url: 'https://orbitboard.in/market-lab' },
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.VERIFIED,
    retrievedAt: '2026-02-01T00:00:00Z'
  }),
  createEvidenceRecord({
    entity: { symbol: 'DEMO', exchange: 'DEMO' },
    metric: { key: 'operating_cash_flow_growth', label: 'Operating cash flow growth' },
    value: -18,
    unit: '%',
    period: { end: '2026-01-31' },
    source: { provider: 'Demo financial source', url: 'https://orbitboard.in/market-lab' },
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.VERIFIED,
    retrievedAt: '2026-02-01T00:00:00Z'
  }),
  createEvidenceRecord({
    entity: { symbol: 'DEMO', exchange: 'DEMO' },
    metric: { key: 'debt_growth', label: 'Debt growth' },
    value: 62,
    unit: '%',
    period: { end: '2026-01-31' },
    source: { provider: 'Demo financial source', url: 'https://orbitboard.in/market-lab' },
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.VERIFIED,
    retrievedAt: '2026-02-01T00:00:00Z'
  })
];

export const DEMO_CONTRADICTIONS = detectContradictions(CONTRADICTION_DEMO_EVIDENCE);

export const DEMO_NEWS = normalizeSourcePayload(newsAdapter, [
  {
    symbol: 'DEMO',
    exchange: 'DEMO',
    headline: 'Demo company reports quarterly revenue growth',
    publishedAt: '2026-01-31T08:00:00Z',
    url: 'https://orbitboard.in/market-lab/demo-news-1',
    provider: 'Demo News Wire',
    direction: 'POSITIVE',
    materiality: 'HIGH'
  },
  {
    symbol: 'DEMO',
    exchange: 'DEMO',
    headline: 'Demo company reports quarterly revenue growth',
    publishedAt: '2026-01-31T08:05:00Z',
    url: 'https://orbitboard.in/market-lab/demo-news-1',
    provider: 'Demo News Wire',
    direction: 'POSITIVE',
    materiality: 'HIGH'
  },
  {
    symbol: 'DEMO',
    exchange: 'DEMO',
    headline: 'Demo company announces board meeting',
    publishedAt: '2026-01-20T08:00:00Z',
    url: 'https://orbitboard.in/market-lab/demo-news-2',
    provider: 'Demo News Wire',
    direction: 'NEUTRAL',
    materiality: 'MEDIUM'
  }
], { symbol: 'DEMO', exchange: 'DEMO', retrievedAt: '2026-02-01T10:00:00Z' });

export const DEMO_NEWS_INTELLIGENCE = enrichNewsEvidence(DEMO_NEWS.records, {
  now: '2026-02-01T10:00:00Z'
});
export const DEMO_NEWS_SUMMARY = summarizeNewsIntelligence(DEMO_NEWS_INTELLIGENCE);

export const DEMO_DOSSIER = buildResearchDossier({
  entity: { symbol: 'DEMO', exchange: 'DEMO' },
  asOf: '2026-02-01T00:00:00Z',
  evidence: [...DEMO_EVIDENCE, ...CONTRADICTION_DEMO_EVIDENCE, ...DEMO_SOURCE_EVIDENCE.records, ...DEMO_NEWS_INTELLIGENCE],
  reconciliations: RECONCILIATION_DEMO,
  signals: [],
  contradictions: DEMO_CONTRADICTIONS
});

export function runExperiment(data, volumeThreshold, oiThreshold, forwardDays) {
  const matches = [];
  for (let i = 2; i < data.length - forwardDays; i += 1) {
    const current = data[i];
    const baseline = (data[i - 1].volume + data[i - 2].volume) / 2;
    const oiChange = ((current.oi - data[i - 1].oi) / data[i - 1].oi) * 100;
    if (current.volume >= baseline * volumeThreshold && oiChange >= oiThreshold) {
      const exit = data[i + forwardDays];
      const returnPct = ((exit.close - current.close) / current.close) * 100;
      matches.push({ ...current, returnPct });
    }
  }
  const positive = matches.filter(item => item.returnPct > 0);
  const average = matches.length ? matches.reduce((sum, item) => sum + item.returnPct, 0) / matches.length : 0;
  return {
    matches,
    occurrences: matches.length,
    positiveRate: matches.length ? (positive.length / matches.length) * 100 : 0,
    averageReturn: average
  };
}
