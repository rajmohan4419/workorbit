import { assessVerification, VERIFICATION_STATUS } from './verificationRules';

function sourceTrustOf(record) {
  return record.source?.trust ?? 'DISCOVERY';
}

function eventIdentity(record) {
  return [
    record.entity?.exchange ?? '',
    record.entity?.symbol ?? '',
    record.metric?.key ?? '',
    record.value?.headline ?? '',
    record.publishedAt ?? record.value?.publishedAt ?? ''
  ].join('|').toLowerCase();
}

function isSameEvent(left, right) {
  if (left.entity?.symbol !== right.entity?.symbol) return false;
  if (left.entity?.exchange !== right.entity?.exchange) return false;
  if (left.metric?.key !== right.metric?.key) return false;
  return Math.abs(
    new Date(left.publishedAt ?? left.value?.publishedAt).getTime()
    - new Date(right.publishedAt ?? right.value?.publishedAt).getTime()
  ) <= 72 * 60 * 60 * 1000;
}

export function verifyNewsEvidence(records = [], options = {}) {
  const primary = records.filter(record => sourceTrustOf(record) === 'PRIMARY');
  const secondary = records.filter(record => sourceTrustOf(record) === 'SECONDARY');

  return records.map(record => {
    const materiality = record.value?.materiality ?? 'LOW';
    const primaryMatches = primary.filter(candidate => candidate !== record && isSameEvent(record, candidate));
    const secondaryMatches = secondary.filter(candidate => candidate !== record && isSameEvent(record, candidate));

    const assessment = assessVerification({
      sourceTrust: sourceTrustOf(record),
      materiality,
      corroboratingPrimary: primaryMatches.length,
      corroboratingSecondary: secondaryMatches.length,
      sourceVerified: record.provenance?.verification?.sourceVerified === true,
      rules: options.rules
    });

    const status = assessment.status === VERIFICATION_STATUS.VERIFIED
      ? VERIFICATION_STATUS.VERIFIED
      : assessment.status;

    return {
      ...record,
      status,
      provenance: {
        ...(record.provenance ?? {}),
        verification: {
          decision: assessment.decision,
          rationale: assessment.rationale,
          sourceTrust: sourceTrustOf(record),
          primaryCorroborationCount: primaryMatches.length,
          secondaryCorroborationCount: secondaryMatches.length,
          verifiedAt: status === VERIFICATION_STATUS.VERIFIED
            ? (options.verifiedAt ?? new Date().toISOString())
            : null
        }
      }
    };
  });
}

export function verificationSummary(records = []) {
  return records.reduce((summary, record) => {
    summary.total += 1;
    if (record.status === VERIFICATION_STATUS.VERIFIED) summary.verified += 1;
    if (record.status === VERIFICATION_STATUS.UNVERIFIED) summary.unverified += 1;
    if (record.status === VERIFICATION_STATUS.CONFLICTED) summary.conflicted += 1;
    if (record.status === VERIFICATION_STATUS.REJECTED) summary.rejected += 1;
    return summary;
  }, { total: 0, verified: 0, unverified: 0, conflicted: 0, rejected: 0 });
}
