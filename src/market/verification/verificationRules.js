export const VERIFICATION_STATUS = Object.freeze({
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  CONFLICTED: 'CONFLICTED',
  REJECTED: 'REJECTED'
});

export const VERIFICATION_DECISION = Object.freeze({
  ACCEPT: 'ACCEPT',
  HOLD: 'HOLD',
  REJECT: 'REJECT'
});

export const DEFAULT_VERIFICATION_RULES = Object.freeze({
  requirePrimaryForHighMateriality: true,
  allowSecondaryCorroboration: true,
  maxPublishedAgeDays: 3650
});

export function assessVerification({
  sourceTrust,
  materiality = 'LOW',
  corroboratingPrimary = 0,
  corroboratingSecondary = 0,
  sourceVerified = false,
  rules = DEFAULT_VERIFICATION_RULES
}) {
  if (sourceVerified) {
    return {
      status: VERIFICATION_STATUS.VERIFIED,
      decision: VERIFICATION_DECISION.ACCEPT,
      rationale: 'The source has been explicitly verified by the ingestion workflow.'
    };
  }

  if (sourceTrust === 'PRIMARY') {
    return {
      status: VERIFICATION_STATUS.VERIFIED,
      decision: VERIFICATION_DECISION.ACCEPT,
      rationale: 'Primary-source evidence is eligible for verification when its source identity is established.'
    };
  }

  if (
    materiality === 'HIGH'
    && rules.requirePrimaryForHighMateriality
    && corroboratingPrimary === 0
  ) {
    return {
      status: VERIFICATION_STATUS.UNVERIFIED,
      decision: VERIFICATION_DECISION.HOLD,
      rationale: 'High-materiality news requires primary-source corroboration before verification.'
    };
  }

  if (sourceTrust === 'SECONDARY' && rules.allowSecondaryCorroboration && corroboratingSecondary > 0) {
    return {
      status: VERIFICATION_STATUS.UNVERIFIED,
      decision: VERIFICATION_DECISION.HOLD,
      rationale: 'Secondary-source corroboration improves coverage but does not itself establish primary verification.'
    };
  }

  return {
    status: VERIFICATION_STATUS.UNVERIFIED,
    decision: VERIFICATION_DECISION.HOLD,
    rationale: 'Evidence has not met the verification requirements.'
  };
}
