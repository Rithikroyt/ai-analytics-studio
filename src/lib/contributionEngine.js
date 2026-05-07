/**
 * Contribution Analysis Engine
 * Identifies which segments/dimensions contributed most to a change, anomaly, or total
 * Uses: Contribution %, deviation from expected, simple Cramer's V proxy
 */

// ── Contribution % ───────────────────────────────────────────────
export function computeContributions(rows, categoryCol, numericCol) {
  if (!rows?.length || !categoryCol || !numericCol) return [];
  const grouped = {};
  rows.forEach(row => {
    const key = String(row[categoryCol] ?? 'Unknown');
    grouped[key] = (grouped[key] || 0) + (Number(row[numericCol]) || 0);
  });
  const total = Object.values(grouped).reduce((a, b) => a + b, 0);
  return Object.entries(grouped)
    .map(([name, value]) => ({
      name,
      value: Math.round(value),
      contribution: total > 0 ? parseFloat((value / total * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
}

// ── Anomaly contribution: which segment drove the anomaly? ────────
export function computeAnomalyContribution(rows, categoryCol, numericCol, anomalyDate, dateCol) {
  if (!rows?.length || !anomalyDate || !dateCol) return [];

  const anomalyRows = rows.filter(r => String(r[dateCol]).slice(0, 7) === anomalyDate.slice(0, 7));
  const baselineRows = rows.filter(r => String(r[dateCol]).slice(0, 7) !== anomalyDate.slice(0, 7));

  if (!anomalyRows.length || !baselineRows.length) return [];

  // Build segment means for baseline
  const baselineBySegment = {};
  const anomalyBySegment = {};

  baselineRows.forEach(r => {
    const key = String(r[categoryCol] ?? 'Unknown');
    if (!baselineBySegment[key]) baselineBySegment[key] = [];
    baselineBySegment[key].push(Number(r[numericCol]) || 0);
  });
  anomalyRows.forEach(r => {
    const key = String(r[categoryCol] ?? 'Unknown');
    if (!anomalyBySegment[key]) anomalyBySegment[key] = [];
    anomalyBySegment[key].push(Number(r[numericCol]) || 0);
  });

  const results = Object.keys({ ...baselineBySegment, ...anomalyBySegment }).map(seg => {
    const baseVals = baselineBySegment[seg] || [];
    const anomVals = anomalyBySegment[seg] || [];
    const baseMean = baseVals.length ? baseVals.reduce((a, b) => a + b, 0) / baseVals.length : 0;
    const anomMean = anomVals.length ? anomVals.reduce((a, b) => a + b, 0) / anomVals.length : 0;
    const deviation = baseMean > 0 ? ((anomMean - baseMean) / baseMean * 100) : 0;
    return {
      segment: seg,
      baseline: Math.round(baseMean),
      anomaly: Math.round(anomMean),
      deviation: parseFloat(deviation.toFixed(1)),
      impact: Math.abs(deviation) > 20 ? 'high' : Math.abs(deviation) > 10 ? 'medium' : 'low',
    };
  });

  return results.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation)).slice(0, 10);
}

// ── Cramer's V proxy (association between categorical and target) ─
export function cramersVProxy(rows, categoryCol, numericCol) {
  if (!rows?.length) return [];
  const contribs = computeContributions(rows, categoryCol, numericCol);
  if (!contribs.length) return [];

  // Simple association score: normalized entropy of contributions
  const total = contribs.reduce((s, c) => s + c.value, 0);
  const n = contribs.length;
  const scores = contribs.map(c => {
    const p = c.value / (total || 1);
    const entropy = p > 0 ? -p * Math.log2(p) : 0;
    return {
      ...c,
      associationScore: parseFloat((1 - entropy / Math.log2(Math.max(n, 2))).toFixed(3)),
    };
  });
  return scores;
}

// ── KPI Variance ─────────────────────────────────────────────────
export function computeKPIVariance(actual, target) {
  if (target == null || target === 0) return null;
  const variance = actual - target;
  const variancePct = parseFloat(((actual - target) / Math.abs(target) * 100).toFixed(1));
  return { actual, target, variance: Math.round(variance), variancePct };
}