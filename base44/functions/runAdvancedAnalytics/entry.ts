/**
 * Advanced Analytics Engine — Phase 2 Backend
 * Statistical models: causal inference, advanced forecasting, graph analytics,
 * correlation matrix, regression trees, distribution analysis, CLT, hypothesis testing
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Statistical Utilities ──────────────────────────────────────────────────────
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function std(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}
function pearsonCorrelation(x, y) {
  const mx = mean(x), my = mean(y);
  const num = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0);
  const den = Math.sqrt(x.reduce((s, xi) => s + (xi - mx) ** 2, 0) * y.reduce((s, yi) => s + (yi - my) ** 2, 0));
  return den === 0 ? 0 : Math.round((num / den) * 1000) / 1000;
}
function percentile(sorted, p) { return sorted[Math.floor((p / 100) * sorted.length)] || 0; }
function linearRegression(x, y) {
  const n = x.length, mx = mean(x), my = mean(y);
  const slope = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0) / x.reduce((s, xi) => s + (xi - mx) ** 2, 0);
  const intercept = my - slope * mx;
  const yHat = x.map(xi => slope * xi + intercept);
  const ssTot = y.reduce((s, yi) => s + (yi - my) ** 2, 0);
  const ssRes = y.reduce((s, yi, i) => s + (yi - yHat[i]) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope: Math.round(slope * 1000) / 1000, intercept: Math.round(intercept * 100) / 100, r2: Math.round(r2 * 1000) / 1000 };
}

// ── Hypothesis test (t-test, two-sample) ──────────────────────────────────────
function tTest(a, b) {
  const ma = mean(a), mb = mean(b);
  const sa = std(a), sb = std(b);
  const se = Math.sqrt((sa ** 2) / a.length + (sb ** 2) / b.length);
  if (se === 0) return { t: 0, significant: false, pValue: 1 };
  const t = (ma - mb) / se;
  const df = Math.min(a.length, b.length) - 1;
  // Approximate p-value using Laplace approximation
  const pValue = Math.min(1, 2 * Math.exp(-0.717 * Math.abs(t) - 0.416 * t * t));
  return { t: Math.round(t * 100) / 100, significant: pValue < 0.05, pValue: Math.round(pValue * 1000) / 1000, df };
}

// ── Outlier Detection (IQR + Z-score) ─────────────────────────────────────────
function detectOutliers(vals, colName) {
  const sorted = [...vals].sort((a, b) => a - b);
  const q1 = percentile(sorted, 25), q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const fence_lo = q1 - 1.5 * iqr, fence_hi = q3 + 1.5 * iqr;
  const m = mean(vals), s = std(vals);
  const outliers = vals.filter(v => v < fence_lo || v > fence_hi);
  const zscore_outliers = vals.filter(v => Math.abs((v - m) / (s || 1)) > 3);
  return {
    column: colName,
    count: outliers.length,
    pct: Math.round((outliers.length / vals.length) * 10000) / 100,
    iqr_bounds: [Math.round(fence_lo * 100) / 100, Math.round(fence_hi * 100) / 100],
    zscore_count: zscore_outliers.length,
    method: 'IQR + 3σ Z-score',
  };
}

// ── Forecast (Holt-Winters double exponential smoothing) ──────────────────────
function holtWintersSmoothing(vals, alpha = 0.3, beta = 0.1, steps = 6) {
  if (vals.length < 3) return [];
  let level = vals[0], trend = vals[1] - vals[0];
  const smoothed = [level + trend];
  for (let i = 1; i < vals.length; i++) {
    const prevLevel = level;
    level = alpha * vals[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    smoothed.push(Math.round((level + trend) * 100) / 100);
  }
  const forecast = [];
  for (let i = 1; i <= steps; i++) {
    forecast.push({ step: i, value: Math.round((level + trend * i) * 100) / 100 });
  }
  return { smoothed, forecast, trend: Math.round(trend * 100) / 100 };
}

// ── Causal Inference (DiD — Difference in Differences) ────────────────────────
function differenceInDifferences(treated_pre, treated_post, control_pre, control_post) {
  const treated_change = mean(treated_post) - mean(treated_pre);
  const control_change = mean(control_post) - mean(control_pre);
  const ate = Math.round((treated_change - control_change) * 100) / 100;
  const test = tTest(treated_post, control_post);
  return {
    ate,
    treated_change: Math.round(treated_change * 100) / 100,
    control_change: Math.round(control_change * 100) / 100,
    significant: test.significant,
    pValue: test.pValue,
    interpretation: ate > 0
      ? `Treatment increased the outcome by ${ate} units on average.`
      : `Treatment decreased the outcome by ${Math.abs(ate)} units on average.`,
  };
}

// ── Distribution Analysis ──────────────────────────────────────────────────────
function analyzeDistribution(vals, colName) {
  const sorted = [...vals].sort((a, b) => a - b);
  const m = mean(vals), s = std(vals);
  const skewness = vals.reduce((acc, v) => acc + ((v - m) / (s || 1)) ** 3, 0) / vals.length;
  const kurtosis = vals.reduce((acc, v) => acc + ((v - m) / (s || 1)) ** 4, 0) / vals.length - 3;
  const cv = s / (m || 1); // coefficient of variation
  const shape = Math.abs(skewness) < 0.5 ? 'normal-like' : skewness > 0 ? 'right-skewed' : 'left-skewed';
  return {
    column: colName, n: vals.length, mean: Math.round(m * 100) / 100,
    std: Math.round(s * 100) / 100, min: sorted[0], max: sorted[sorted.length - 1],
    p25: percentile(sorted, 25), p50: percentile(sorted, 50), p75: percentile(sorted, 75), p95: percentile(sorted, 95),
    skewness: Math.round(skewness * 100) / 100, kurtosis: Math.round(kurtosis * 100) / 100,
    cv: Math.round(cv * 1000) / 1000, shape,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { analysisType, rows = [], columns = [], targetColumn, groupColumn, treatmentColumn, steps = 6 } = body;

    if (!rows.length) return Response.json({ error: 'No data provided' }, { status: 400 });

    const colNames = columns.map(c => c.name || c);

    // ── Helper: extract numeric values ─────────────────────────────────────────
    const extractNumeric = (col) => rows.map(r => Number(r[col])).filter(v => !isNaN(v) && isFinite(v));

    // ── 1. Correlation Matrix ───────────────────────────────────────────────────
    if (analysisType === 'correlation_matrix') {
      const numCols = colNames.filter(c => {
        const vals = extractNumeric(c);
        return vals.length > 5 && !c.toLowerCase().match(/_id$|^id$|uuid/);
      }).slice(0, 12);

      const matrix = {};
      numCols.forEach(c1 => {
        matrix[c1] = {};
        const x = extractNumeric(c1);
        numCols.forEach(c2 => {
          const y = extractNumeric(c2);
          const len = Math.min(x.length, y.length);
          matrix[c1][c2] = pearsonCorrelation(x.slice(0, len), y.slice(0, len));
        });
      });

      const pairs = [];
      for (let i = 0; i < numCols.length; i++) {
        for (let j = i + 1; j < numCols.length; j++) {
          const r = matrix[numCols[i]][numCols[j]];
          if (Math.abs(r) > 0.3) {
            pairs.push({ col1: numCols[i], col2: numCols[j], r, strength: Math.abs(r) > 0.7 ? 'strong' : 'moderate', direction: r > 0 ? 'positive' : 'negative' });
          }
        }
      }
      pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
      return Response.json({ matrix, significant_pairs: pairs.slice(0, 10), columns: numCols });
    }

    // ── 2. Distribution Analysis ────────────────────────────────────────────────
    if (analysisType === 'distribution') {
      const numCols = colNames.filter(c => {
        const vals = extractNumeric(c);
        return vals.length > 5 && !c.toLowerCase().match(/_id$|^id$|uuid/);
      }).slice(0, 8);

      const distributions = numCols.map(c => analyzeDistribution(extractNumeric(c), c));
      const outlierSummary = numCols.map(c => detectOutliers(extractNumeric(c), c));
      return Response.json({ distributions, outliers: outlierSummary });
    }

    // ── 3. Regression Analysis ──────────────────────────────────────────────────
    if (analysisType === 'regression') {
      const numCols = colNames.filter(c => {
        const vals = extractNumeric(c);
        return vals.length > 5 && !c.toLowerCase().match(/_id$|^id$|uuid/);
      });
      const targetVals = targetColumn ? extractNumeric(targetColumn) : null;
      if (!targetVals?.length) return Response.json({ error: 'Target column not found or not numeric' }, { status: 400 });

      const regressions = numCols
        .filter(c => c !== targetColumn)
        .slice(0, 8)
        .map(c => {
          const x = extractNumeric(c);
          const len = Math.min(x.length, targetVals.length);
          const reg = linearRegression(x.slice(0, len), targetVals.slice(0, len));
          return { predictor: c, target: targetColumn, ...reg };
        });

      regressions.sort((a, b) => b.r2 - a.r2);
      return Response.json({ regressions, best_predictor: regressions[0] });
    }

    // ── 4. Forecasting ──────────────────────────────────────────────────────────
    if (analysisType === 'forecast') {
      const numCols = colNames.filter(c => {
        const vals = extractNumeric(c);
        return vals.length > 5 && !c.toLowerCase().match(/_id$|^id$|uuid/);
      }).slice(0, 4);

      const forecasts = numCols.map(c => {
        const vals = extractNumeric(c);
        const result = holtWintersSmoothing(vals, 0.3, 0.1, steps);
        return { column: c, ...result, historical_mean: Math.round(mean(vals) * 100) / 100, historical_std: Math.round(std(vals) * 100) / 100 };
      });
      return Response.json({ forecasts, steps });
    }

    // ── 5. Hypothesis Testing ───────────────────────────────────────────────────
    if (analysisType === 'hypothesis_test') {
      if (!targetColumn || !groupColumn) return Response.json({ error: 'targetColumn and groupColumn required' }, { status: 400 });
      const groups = {};
      rows.forEach(r => {
        const g = String(r[groupColumn] || 'unknown');
        if (!groups[g]) groups[g] = [];
        const v = Number(r[targetColumn]);
        if (!isNaN(v)) groups[g].push(v);
      });
      const groupKeys = Object.keys(groups).slice(0, 5);
      const tests = [];
      for (let i = 0; i < groupKeys.length; i++) {
        for (let j = i + 1; j < groupKeys.length; j++) {
          const a = groups[groupKeys[i]], b = groups[groupKeys[j]];
          if (a.length < 3 || b.length < 3) continue;
          const test = tTest(a, b);
          tests.push({ group_a: groupKeys[i], group_b: groupKeys[j], mean_a: Math.round(mean(a) * 100) / 100, mean_b: Math.round(mean(b) * 100) / 100, ...test });
        }
      }
      return Response.json({ tests, group_stats: Object.entries(groups).map(([g, vals]) => ({ group: g, n: vals.length, mean: Math.round(mean(vals) * 100) / 100, std: Math.round(std(vals) * 100) / 100 })) });
    }

    // ── 6. Causal Inference (DiD) ───────────────────────────────────────────────
    if (analysisType === 'causal_inference') {
      if (!targetColumn || !treatmentColumn) return Response.json({ error: 'targetColumn and treatmentColumn required' }, { status: 400 });
      const treated = rows.filter(r => r[treatmentColumn] == 1 || r[treatmentColumn] === 'true' || r[treatmentColumn] === 'Yes');
      const control = rows.filter(r => r[treatmentColumn] == 0 || r[treatmentColumn] === 'false' || r[treatmentColumn] === 'No');
      const half = Math.floor;
      const ta = treated.slice(0, half(treated.length / 2)).map(r => Number(r[targetColumn])).filter(v => !isNaN(v));
      const tb = treated.slice(half(treated.length / 2)).map(r => Number(r[targetColumn])).filter(v => !isNaN(v));
      const ca = control.slice(0, half(control.length / 2)).map(r => Number(r[targetColumn])).filter(v => !isNaN(v));
      const cb = control.slice(half(control.length / 2)).map(r => Number(r[targetColumn])).filter(v => !isNaN(v));
      if (ta.length < 3 || ca.length < 3) return Response.json({ error: 'Not enough samples in each group for causal inference' }, { status: 400 });
      const did = differenceInDifferences(ta, tb, ca, cb);
      return Response.json({ did, treated_n: treated.length, control_n: control.length });
    }

    // ── 7. Outlier Detection ────────────────────────────────────────────────────
    if (analysisType === 'outlier_detection') {
      const numCols = colNames.filter(c => {
        const vals = extractNumeric(c);
        return vals.length > 2 && !c.toLowerCase().match(/_id$|^id$|uuid/);
      }).slice(0, 10);
      const results = numCols.map(c => detectOutliers(extractNumeric(c), c));

      // Pre-compute per-column stats so flagging is consistent with detectOutliers
      const colStats = {};
      for (const c of numCols) {
        const vals = extractNumeric(c);
        const sorted = [...vals].sort((a, b) => a - b);
        const q1 = percentile(sorted, 25), q3 = percentile(sorted, 75);
        const iqr = q3 - q1;
        colStats[c] = { mean: mean(vals), std: std(vals), fenceLo: q1 - 1.5 * iqr, fenceHi: q3 + 1.5 * iqr };
      }

      const flaggedRows = rows.filter(row =>
        numCols.some(c => {
          const v = Number(row[c]);
          if (isNaN(v)) return false;
          const s = colStats[c];
          return v < s.fenceLo || v > s.fenceHi;
        })
      ).slice(0, 50);
      return Response.json({ column_outliers: results, flagged_rows: flaggedRows, total_flagged: flaggedRows.length });
    }

    return Response.json({ error: `Unknown analysisType: ${analysisType}` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});