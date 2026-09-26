import { EVIDENCE_STATUS } from '../evidence';
import { CONTRADICTION_SEVERITY, CONTRADICTION_TYPES, DEFAULT_CONTRADICTION_RULES } from './rules';

const RULE_DEFINITIONS = [
  {
    type: CONTRADICTION_TYPES.GROWTH_VS_CASHFLOW,
    left: ['revenue_growth', 'profit_growth'],
    right: ['operating_cash_flow_growth', 'operating_cash_flow'],
    severity: CONTRADICTION_SEVERITY.HIGH,
    rationale: 'Reported growth is positive while operating cash-flow evidence is negative or deteriorating.'
  },
  {
    type: CONTRADICTION_TYPES.PROFIT_VS_CASHFLOW,
    left: ['profit', 'net_profit', 'profit_growth'],
    right: ['operating_cash_flow', 'operating_cash_flow_growth'],
    severity: CONTRADICTION_SEVERITY.HIGH,
    rationale: 'Profit evidence is positive while operating cash-flow evidence is negative or deteriorating.'
  },
  {
    type: CONTRADICTION_TYPES.GROWTH_VS_DEBT,
    left: ['revenue_growth', 'profit_growth'],
    right: ['debt_growth', 'net_debt_growth', 'debt'],
    severity: CONTRADICTION_SEVERITY.MEDIUM,
    rationale: 'Growth evidence is positive while debt evidence is increasing.'
  },
  {
    type: CONTRADICTION_TYPES.PROFIT_VS_DEBT,
    left: ['profit_growth', 'profit'],
    right: ['debt_growth', 'net_debt_growth'],
    severity: CONTRADICTION_SEVERITY.MEDIUM,
    rationale: 'Profit evidence is positive while debt is also increasing.'
  },
  {
    type: CONTRADICTION_TYPES.POSITIVE_NEWS_VS_FINANCIAL_RISK,
    left: ['news_event'],
    right: ['debt_growth', 'cash_flow_risk', 'margin_decline'],
    severity: CONTRADICTION_SEVERITY.HIGH,
    rationale: 'Positive or high-materiality news coexists with financial-risk evidence.'
  },
  {
    type: CONTRADICTION_TYPES.PRICE_VS_FUNDAMENTALS,
    left: ['price_change', 'price_trend'],
    right: ['profit_growth', 'revenue_growth', 'margin_change'],
    severity: CONTRADICTION_SEVERITY.MEDIUM,
    rationale: 'Price direction and fundamental direction point in opposite directions.'
  }
];

function directionOf(record) {
  const value = record.value;
  if (typeof value === 'number') return value > 0 ? 'POSITIVE' : value < 0 ? 'NEGATIVE' : 'NEUTRAL';
  return value?.direction ?? 'NEUTRAL';
}

function usable(record, rules) {
  if (record.value === null || record.value === undefined) return false;
  if (rules.requireVerifiedEvidence && record.status !== EVIDENCE_STATUS.VERIFIED) return false;
  return true;
}

function findMatches(records, keys, rules) {
  return records.filter(record =>
    keys.includes(record.metric?.key)
    && usable(record, rules)
  );
}

function contradictionFor(rule, left, right) {
  const leftDirections = left.map(directionOf);
  const rightDirections = right.map(directionOf);

  const leftPositive = leftDirections.includes('POSITIVE');
  const leftNegative = leftDirections.includes('NEGATIVE');
  const rightPositive = rightDirections.includes('POSITIVE');
  const rightNegative = rightDirections.includes('NEGATIVE');

  const opposing =
    (leftPositive && rightNegative) ||
    (leftNegative && rightPositive) ||
    (rule.type === CONTRADICTION_TYPES.GROWTH_VS_DEBT && leftPositive && rightPositive) ||
    (rule.type === CONTRADICTION_TYPES.PROFIT_VS_DEBT && leftPositive && rightPositive);

  if (!opposing) return null;

  return {
    type: rule.type,
    severity: rule.severity,
    entity: left[0]?.entity ?? right[0]?.entity ?? null,
    period: left[0]?.period ?? right[0]?.period ?? null,
    left: left.map(record => ({ metric: record.metric?.key, value: record.value, evidenceId: record.id })),
    right: right.map(record => ({ metric: record.metric?.key, value: record.value, evidenceId: record.id })),
    evidenceIds: [...left, ...right].map(record => record.id),
    rationale: rule.rationale
  };
}

export function detectContradictions(records, options = {}) {
  if (!Array.isArray(records)) throw new TypeError('Contradiction detection requires evidence records.');

  const rules = { ...DEFAULT_CONTRADICTION_RULES, ...options.rules };
  const contradictions = [];

  for (const rule of RULE_DEFINITIONS) {
    const entities = new Map();

    for (const record of records) {
      const entityKey = [record.entity?.exchange ?? '', record.entity?.symbol ?? ''].join('|');
      if (!entities.has(entityKey)) entities.set(entityKey, []);
      entities.get(entityKey).push(record);
    }

    for (const entityRecords of entities.values()) {
      const periods = [...new Set(entityRecords.map(record => record.period?.end ?? record.period?.asOf).filter(Boolean))];

      for (const period of periods) {
        const scoped = entityRecords.filter(record => (record.period?.end ?? record.period?.asOf) === period);
        const left = findMatches(scoped, rule.left, rules);
        const right = findMatches(scoped, rule.right, rules);

        if (left.length >= rules.minimumEvidencePerSide && right.length >= rules.minimumEvidencePerSide) {
          const contradiction = contradictionFor(rule, left, right);
          if (contradiction) contradictions.push(contradiction);
        }
      }
    }
  }

  return {
    contradictions,
    summary: {
      total: contradictions.length,
      highOrCritical: contradictions.filter(item => ['HIGH', 'CRITICAL'].includes(item.severity)).length,
      byType: Object.fromEntries(
        RULE_DEFINITIONS.map(rule => [
          rule.type,
          contradictions.filter(item => item.type === rule.type).length
        ])
      )
    }
  };
}
