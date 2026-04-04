/**
 * statsEngine.js — Client-side Statistical & ML Engine
 * Implements Python/scipy/sklearn-equivalent methods in JS:
 *   - Descriptive statistics (mean, median, std, skewness, kurtosis, IQR)
 *   - Pearson / Spearman correlation
 *   - Linear & polynomial regression (OLS)
 *   - K-Means clustering (Lloyd's algorithm)
 *   - Time-series decomposition (additive: trend + seasonal + residual)
 *   - One-sample & two-sample t-test
 *   - Chi-squared goodness-of-fit test
 *   - Z-score anomaly detection
 *   - Exponential smoothing forecast (Holt-Winters double)
 *   - Moving average & rolling std
 */

// ─── Basic descriptive ─────────────────────────────────────────────
export function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function variance(arr, sample = true) {
  const m = mean(arr);
  const n = sample ? arr.length - 1 : arr.length;
  return arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / n;
}

export function std(arr, sample = true) {
  return Math.sqrt(variance(arr, sample));
}

export function skewness(arr) {
  const m = mean(arr);
  const s = std(arr);
  const n = arr.length;
  return (n / ((n - 1) * (n - 2))) * arr.reduce((sum, v) => sum + Math.pow((v - m) / s, 3), 0);
}

export function kurtosis(arr) {
  const m = mean(arr);
  const s = std(arr);
  const n = arr.length;
  const kurt = arr.reduce((sum, v) => sum + Math.pow((v - m) / s, 4), 0) / n;
  return kurt - 3; // excess kurtosis
}

export function quantile(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  const idx = p * (s.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

export function iqr(arr) {
  return quantile(arr, 0.75) - quantile(arr, 0.25);
}

export function describe(arr) {
  const nums = arr.filter(v => v != null && !isNaN(Number(v))).map(Number);
  if (!nums.length) return null;
  const q1 = quantile(nums, 0.25);
  const q3 = quantile(nums, 0.75);
  return {
    count: nums.length,
    mean: mean(nums),
    std: std(nums),
    min: Math.min(...nums),
    q1,
    median: median(nums),
    q3,
    max: Math.max(...nums),
    iqr: q3 - q1,
    skewness: skewness(nums),
    kurtosis: kurtosis(nums),
    cv: std(nums) / Math.abs(mean(nums)), // coefficient of variation
  };
}

// ─── Correlation ───────────────────────────────────────────────────
export function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return { r: 0, pValue: 1, significant: false };
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  const num = xs.slice(0, n).reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.slice(0, n).reduce((s, x) => s + (x - mx) ** 2, 0) *
    ys.slice(0, n).reduce((s, y) => s + (y - my) ** 2, 0)
  );
  const r = den === 0 ? 0 : num / den;
  // Approximate p-value via t-distribution (2-tailed)
  const t = r * Math.sqrt((n - 2) / (1 - r * r + 1e-10));
  const pValue = 2 * (1 - tCDF(Math.abs(t), n - 2));
  return { r: parseFloat(r.toFixed(4)), pValue: parseFloat(pValue.toFixed(4)), significant: pValue < 0.05 };
}

// Spearman rank correlation
export function spearman(xs, ys) {
  const rank = arr => {
    const sorted = [...arr].sort((a, b) => a - b);
    return arr.map(v => sorted.indexOf(v) + 1);
  };
  return pearson(rank(xs), rank(ys));
}

// ─── Regression ────────────────────────────────────────────────────
export function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0, r2: 0, predict: x => ys[0] || 0 };
  const mx = mean(xs), my = mean(ys);
  const ssxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const ssxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = ssxx === 0 ? 0 : ssxy / ssxx;
  const intercept = my - slope * mx;
  const predicted = xs.map(x => slope * x + intercept);
  const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  const ssRes = ys.reduce((s, y, i) => s + (y - predicted[i]) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const residuals = ys.map((y, i) => y - predicted[i]);
  const se = Math.sqrt(ssRes / (n - 2));
  const predict = x => slope * x + intercept;
  return { slope, intercept, r2: parseFloat(r2.toFixed(4)), se, residuals, predict };
}

// Polynomial regression (degree 2 - quadratic) via normal equations
export function polynomialRegression(xs, ys, degree = 2) {
  // Build Vandermonde matrix
  const X = xs.map(x => Array.from({ length: degree + 1 }, (_, k) => Math.pow(x, k)));
  // OLS: beta = (X'X)^-1 X'y  — simplified for degree 2
  if (degree === 2) {
    const n = xs.length;
    const s0 = n, s1 = xs.reduce((a, b) => a + b, 0);
    const s2 = xs.reduce((a, b) => a + b ** 2, 0);
    const s3 = xs.reduce((a, b) => a + b ** 3, 0);
    const s4 = xs.reduce((a, b) => a + b ** 4, 0);
    const t0 = ys.reduce((a, b) => a + b, 0);
    const t1 = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const t2 = xs.reduce((a, x, i) => a + x ** 2 * ys[i], 0);
    // Solve 3x3 system
    const A = [[s0, s1, s2], [s1, s2, s3], [s2, s3, s4]];
    const b = [t0, t1, t2];
    const coeffs = solve3x3(A, b);
    const predicted = xs.map(x => coeffs[0] + coeffs[1] * x + coeffs[2] * x ** 2);
    const my = mean(ys);
    const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0);
    const ssRes = ys.reduce((s, y, i) => s + (y - predicted[i]) ** 2, 0);
    const r2 = 1 - ssRes / ssTot;
    return { coeffs, r2: parseFloat(r2.toFixed(4)), predicted };
  }
  return linearRegression(xs, ys);
}

function solve3x3(A, b) {
  // Gaussian elimination
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < 3; i++) {
    let max = i;
    for (let j = i + 1; j < 3; j++) if (Math.abs(M[j][i]) > Math.abs(M[max][i])) max = j;
    [M[i], M[max]] = [M[max], M[i]];
    for (let j = i + 1; j < 3; j++) {
      const f = M[j][i] / M[i][i];
      for (let k = i; k <= 3; k++) M[j][k] -= f * M[i][k];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    x[i] = M[i][3];
    for (let j = i + 1; j < 3; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}

// ─── K-Means clustering ────────────────────────────────────────────
export function kMeans(points, k = 3, maxIter = 100) {
  if (points.length < k) return { labels: points.map((_, i) => i % k), centroids: [] };
  // Init: random centroids from data
  let centroids = points.slice(0, k).map(p => [...p]);
  let labels = new Array(points.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign
    const newLabels = points.map(p => {
      let minDist = Infinity, label = 0;
      centroids.forEach((c, i) => {
        const d = p.reduce((s, v, j) => s + (v - c[j]) ** 2, 0);
        if (d < minDist) { minDist = d; label = i; }
      });
      return label;
    });
    // Check convergence
    if (newLabels.every((l, i) => l === labels[i])) break;
    labels = newLabels;
    // Update centroids
    centroids = Array.from({ length: k }, (_, ci) => {
      const group = points.filter((_, i) => labels[i] === ci);
      if (!group.length) return centroids[ci];
      return group[0].map((_, j) => mean(group.map(p => p[j])));
    });
  }

  // Compute within-cluster variance (inertia)
  const inertia = points.reduce((s, p, i) => {
    const c = centroids[labels[i]];
    return s + p.reduce((ss, v, j) => ss + (v - c[j]) ** 2, 0);
  }, 0);

  return { labels, centroids, inertia };
}

// ─── Time-series decomposition (additive STL-like) ────────────────
export function decomposeTimeSeries(values, period = 12) {
  const n = values.length;
  if (n < period * 2) return null;

  // 1. Trend via centered moving average
  const halfW = Math.floor(period / 2);
  const trend = values.map((_, i) => {
    const start = Math.max(0, i - halfW);
    const end = Math.min(n, i + halfW + 1);
    return mean(values.slice(start, end));
  });

  // 2. Detrended = observed - trend
  const detrended = values.map((v, i) => v - trend[i]);

  // 3. Seasonal: average detrended for each period position
  const seasonal = new Array(n).fill(0);
  for (let p = 0; p < period; p++) {
    const positions = [];
    for (let i = p; i < n; i += period) positions.push(detrended[i]);
    const avgSeasonal = mean(positions);
    for (let i = p; i < n; i += period) seasonal[i] = avgSeasonal;
  }

  // 4. Residual
  const residual = values.map((v, i) => v - trend[i] - seasonal[i]);

  return { trend, seasonal, residual };
}

// ─── t-test ────────────────────────────────────────────────────────
export function tTest(sample1, sample2 = null) {
  if (!sample2) {
    // One-sample vs mean = 0
    const n = sample1.length;
    const m = mean(sample1);
    const s = std(sample1);
    const t = m / (s / Math.sqrt(n));
    const pValue = 2 * (1 - tCDF(Math.abs(t), n - 1));
    return { t, pValue, significant: pValue < 0.05, type: 'one-sample' };
  }
  // Two-sample Welch's t-test
  const n1 = sample1.length, n2 = sample2.length;
  const m1 = mean(sample1), m2 = mean(sample2);
  const v1 = variance(sample1), v2 = variance(sample2);
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = (m1 - m2) / se;
  const df = Math.pow(v1 / n1 + v2 / n2, 2) /
    (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));
  const pValue = 2 * (1 - tCDF(Math.abs(t), df));
  return {
    t: parseFloat(t.toFixed(4)),
    df: Math.round(df),
    pValue: parseFloat(pValue.toFixed(4)),
    significant: pValue < 0.05,
    meanDiff: m1 - m2,
    type: 'two-sample-welch',
  };
}

// ─── Chi-squared test ──────────────────────────────────────────────
export function chiSquaredGoodnessOfFit(observed) {
  const total = observed.reduce((a, b) => a + b, 0);
  const expected = total / observed.length;
  const chi2 = observed.reduce((s, o) => s + (o - expected) ** 2 / expected, 0);
  const df = observed.length - 1;
  const pValue = 1 - chi2CDF(chi2, df);
  return { chi2: parseFloat(chi2.toFixed(4)), df, pValue: parseFloat(pValue.toFixed(4)), significant: pValue < 0.05 };
}

// ─── Anomaly detection ─────────────────────────────────────────────
export function detectAnomalies(values, threshold = 2.5) {
  const m = mean(values);
  const s = std(values);
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqrVal = q3 - q1;
  return values.map((v, i) => {
    const zScore = Math.abs((v - m) / (s || 1));
    const iqrOutlier = v < q1 - 1.5 * iqrVal || v > q3 + 1.5 * iqrVal;
    const isAnomaly = zScore > threshold || iqrOutlier;
    return { index: i, value: v, zScore: parseFloat(zScore.toFixed(3)), isAnomaly, method: zScore > threshold ? 'z-score' : 'iqr' };
  }).filter(d => d.isAnomaly);
}

// ─── Holt-Winters double exponential smoothing ────────────────────
export function holtwinters(values, h = 6, alpha = 0.3, beta = 0.1) {
  if (values.length < 4) return [];
  let l = values[0];
  let b = values[1] - values[0];
  const forecasts = [];
  const fitted = [];
  for (let i = 0; i < values.length; i++) {
    if (i === 0) { fitted.push(l + b); continue; }
    const prevL = l, prevB = b;
    l = alpha * values[i] + (1 - alpha) * (prevL + prevB);
    b = beta * (l - prevL) + (1 - beta) * prevB;
    fitted.push(l + b);
  }
  for (let i = 1; i <= h; i++) forecasts.push(l + b * i);
  return { forecasts, fitted };
}

// ─── Moving average ────────────────────────────────────────────────
export function movingAverage(values, window = 3) {
  return values.map((_, i) => {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(values.length, i + Math.ceil(window / 2));
    return mean(values.slice(start, end));
  });
}

// ─── Probability distributions ────────────────────────────────────
// Approximate t-distribution CDF (Abramowitz & Stegun)
function tCDF(t, df) {
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(x, df / 2, 0.5);
}

// Approximate chi-squared CDF
function chi2CDF(x, k) {
  return regularizedGammaP(k / 2, x / 2);
}

function incompleteBeta(x, a, b) {
  // Approximation
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const lx = a * Math.log(x) + b * Math.log(1 - x) - lbeta;
  return Math.exp(lx) * betaCF(x, a, b) / a;
}

function betaCF(x, a, b) {
  const maxIter = 100, eps = 3e-7;
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    let aa = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < eps) break;
  }
  return h;
}

function regularizedGammaP(a, x) {
  if (x < 0) return 0;
  if (x === 0) return 0;
  if (a <= 0) return 1;
  let sum = 1 / a, term = 1 / a;
  for (let n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-10 * Math.abs(sum)) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

function logGamma(z) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = z, x = z, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y += 1; ser += c[j] / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

// ─── Normalization ────────────────────────────────────────────────
export function zScoreNormalize(arr) {
  const m = mean(arr), s = std(arr);
  return arr.map(v => (v - m) / (s || 1));
}

export function minMaxNormalize(arr) {
  const min = Math.min(...arr), max = Math.max(...arr);
  return arr.map(v => (v - min) / (max - min || 1));
}

// ─── Frequency / histogram ────────────────────────────────────────
export function histogram(values, bins = 10) {
  const min = Math.min(...values), max = Math.max(...values);
  const width = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  values.forEach(v => {
    const idx = Math.min(Math.floor((v - min) / width), bins - 1);
    counts[idx]++;
  });
  return counts.map((count, i) => ({
    bin: `${(min + i * width).toFixed(1)}–${(min + (i + 1) * width).toFixed(1)}`,
    count,
    frequency: count / values.length,
  }));
}

// ─── Value formatting helper ──────────────────────────────────────
export function fmtNum(v, decimals = 2) {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(decimals);
}