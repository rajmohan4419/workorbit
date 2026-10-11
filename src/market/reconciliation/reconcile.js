import { evidenceKey, EVIDENCE_STATUS } from '../evidence/evidenceModel.js';
import { validateEvidenceRecord } from '../evidence/validator.js';
import { RECONCILIATION_STATUS, DEFAULT_RECONCILIATION_RULES, valuesAgree } from './rules.js';

function sourceIdentity(record) {
  return [
    record.source?.id ?? record.source?.provider ?? 'unknown',
    record.source?.provider ?? 'unknown'
  ].join('|');
}

function observationValue(record) {
  return record.value;
}

function isUsable(record) {
  return validateEvidenceRecord(record).valid && record.value !== null && record.value !== undefined;
}

function buildObservations(records) {
  return records.map(record => ({
    evidenceId: record.id,
    value: observationValue(record),
    unit: record.unit ?? null,
    source: record.source ?? null,
    status: record.status,
    kind: record.kind,
    publishedAt: record.publishedAt ?? null,
    retrievedAt: record.retrievedAt ?? null
  }));
}

function buildValueGroups(usableRecords) {
  const groupsMap = new Map();
  for (const record of usableRecords) {
    if (!groupsMap.has(record.value)) {
      groupsMap.set(record.value, []);
    }
    groupsMap.get(record.value).push(record);
  }

  return [...groupsMap.entries()]
    .map(([value, group]) => ({
      value,
      count: group.length,
      sources: [...new Set(group.map(sourceIdentity))]
    }))
    .sort((a, b) => b.count - a.count);
}

function handleUnusableGroup(key, representative, observations, invalid, sources) {
  const hasInvalid = invalid.length > 0;
  return {
    key,
    entity: representative?.entity ?? null,
    metric: representative?.metric ?? null,
    status: hasInvalid ? RECONCILIATION_STATUS.INVALID : RECONCILIATION_STATUS.INSUFFICIENT_DATA,
    selectedValue: null,
    observations,
    agreementCount: 0,
    conflictCount: 0,
    sourceCount: sources.length,
    sources,
    invalidCount: invalid.length,
    rationale: hasInvalid
      ? 'No usable observations remain after evidence validation.'
      : 'No usable observations are available for this evidence key.'
  };
}

function handleSingleSourceGroup(key, usable, rules, observations, sources, invalidCount) {
  const only = usable[0];
  const canSelect = rules.allowSelectedValueOnSingleSource
    && (!rules.singleSourceRequiresVerifiedEvidence || only.status === EVIDENCE_STATUS.VERIFIED);

  return {
    key,
    status: RECONCILIATION_STATUS.SINGLE_SOURCE,
    selectedValue: canSelect ? only.value : null,
    observations,
    agreementCount: 1,
    conflictCount: 0,
    sourceCount: sources.length,
    sources,
    invalidCount,
    rationale: canSelect
      ? 'Only one usable source observation is available; value is retained with single-source provenance.'
      : 'Only one usable source observation is available, but policy does not permit selecting it as reconciled.'
  };
}

function handleAgreedGroup(key, representative, values, rules, usableLength, observations, sources, invalidCount) {
  const isAgreed = valuesAgree(values, rules);
  return {
    key,
    entity: representative?.entity ?? null,
    metric: representative?.metric ?? null,
    status: isAgreed ? RECONCILIATION_STATUS.AGREED : RECONCILIATION_STATUS.CONFLICTED,
    selectedValue: rules.allowSelectedValueOnAgreement ? values[0] : null,
    observations,
    agreementCount: usableLength,
    conflictCount: 0,
    sourceCount: sources.length,
    sources,
    invalidCount,
    rationale: 'All usable observations report the same value for the same evidence key.'
  };
}

function handleConflictedGroup(key, representative, agreementCount, conflictCount, valueGroups, observations, sources, invalidCount) {
  return {
    key,
    entity: representative?.entity ?? null,
    metric: representative?.metric ?? null,
    status: RECONCILIATION_STATUS.CONFLICTED,
    selectedValue: null,
    observations,
    agreementCount,
    conflictCount,
    sourceCount: sources.length,
    sources,
    valueGroups: valueGroups.map(group => ({
      value: group.value,
      observationCount: group.count,
      sourceCount: group.sources.length,
      sources: group.sources
    })),
    invalidCount,
    rationale: `${agreementCount} observation${agreementCount === 1 ? '' : 's'} agree and ${conflictCount} conflict. No source is silently preferred.`
  };
}

function reconcileGroup(key, records, rules) {
  const representative = records[0] ?? null;
  const observations = buildObservations(records);

  const invalid = records.filter(record => !validateEvidenceRecord(record).valid);
  const usable = records.filter(isUsable);
  const sources = [...new Set(usable.map(sourceIdentity))];

  if (!usable.length) {
    return handleUnusableGroup(key, representative, observations, invalid, sources);
  }

  const valueGroups = buildValueGroups(usable);
  const distinctValues = valueGroups.map(group => group.value);
  const agreementCount = valueGroups[0]?.count ?? 0;
  const conflictCount = Math.max(0, usable.length - agreementCount);

  if (distinctValues.length === 1) {
    if (usable.length === 1) {
      return handleSingleSourceGroup(key, usable, rules, observations, sources, invalid.length);
    }

    const values = usable.map(record => record.value);
    return handleAgreedGroup(key, representative, values, rules, usable.length, observations, sources, invalid.length);
  }

  return handleConflictedGroup(key, representative, agreementCount, conflictCount, valueGroups, observations, sources, invalid.length);
}

export { reconcileGroup };

export function reconcileEvidenceSet(records, options = {}) {
  if (!Array.isArray(records)) {
    throw new TypeError('Reconciliation requires an evidence records array.');
  }

  const rules = { ...DEFAULT_RECONCILIATION_RULES, ...options.rules };
  const groups = new Map();

  for (const record of records) {
    const key = evidenceKey(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  const results = [...groups.entries()].map(([key, group]) => reconcileGroup(key, group, rules));

  return {
    results,
    summary: {
      totalKeys: results.length,
      agreed: results.filter(item => item.status === RECONCILIATION_STATUS.AGREED).length,
      conflicted: results.filter(item => item.status === RECONCILIATION_STATUS.CONFLICTED).length,
      singleSource: results.filter(item => item.status === RECONCILIATION_STATUS.SINGLE_SOURCE).length,
      insufficientData: results.filter(item => item.status === RECONCILIATION_STATUS.INSUFFICIENT_DATA).length,
      invalid: results.filter(item => item.status === RECONCILIATION_STATUS.INVALID).length
    }
  };
}
