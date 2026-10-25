/**
 * Weighted decision matrix.
 * criteria: [{ name, weight }]  (weights can be any positive numbers; they are normalised)
 * options:  ['Vendor A', 'Vendor B', ...]
 * scores:   scores[criterionIndex][optionIndex] on a 0-10 scale
 * Returns each option's weighted score on a 0-10 scale and its rank.
 */
export function computeDecisionMatrix({ criteria, options, scores }) {
  const warnings = [];
  const usable = criteria.map((c, i) => ({ ...c, weight: Math.max(0, Number(c.weight) || 0), index: i }));
  const totalWeight = usable.reduce((s, c) => s + c.weight, 0);

  if (options.length === 0) warnings.push('Add at least one option to compare.');
  if (totalWeight === 0) warnings.push('Give at least one criterion a weight above zero.');

  const results = options.map((name, o) => {
    let weighted = 0;
    let missing = 0;
    for (const c of usable) {
      const raw = scores?.[c.index]?.[o];
      const s = raw === undefined || raw === null || raw === '' ? null : Number(raw);
      if (s === null || !Number.isFinite(s)) { missing++; continue; }
      weighted += c.weight * Math.min(10, Math.max(0, s));
    }
    if (missing > 0) warnings.push(`${name}: ${missing} score(s) missing and counted as zero.`);
    return { name, score: totalWeight > 0 ? weighted / totalWeight : 0 };
  });

  const ranked = [...results].sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return { ranked, totalWeight, warnings };
}
