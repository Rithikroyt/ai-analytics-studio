// OmniData v2.0 — Core Analytics Engine
// All algorithms run client-side on parsed dataset arrays

// ─── Column Profiler ──────────────────────────────────────────────────────────
export function profileColumn(rows, columnName) {
  const values = rows.map(r => r[columnName]);
  const nonNull = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  const missingCount = values.length - nonNull.length;
  const uniqueValues = [...new Set(nonNull.map(v => String(v).trim()))];

  const numericValues = nonNull
    .map(v => Number(String(v).replace(/[$,%\s]/g, '')))
    .filter(v => !Number.isNaN(v) && isFinite(v));

  const missingRate = values.length === 0 ? 0 : missingCount / values.length;
  const uniqueRate = values.length === 0 ? 0 : uniqueValues.length / values.length;

  let detectedType = 'string';
  if (numericValues.length / Math.max(nonNull.length, 1) > 0.8) detectedType = 'number';
  if (nonNull.filter(v => !Number.isNaN(Date.parse(String(v)))).length / Math.max(nonNull.length, 1) > 0.8) detectedType = 'date';
  if (uniqueValues.length <= 20 && detectedType === 'string') detectedType = 'category';
  if (nonNull.some(v => String(v).startsWith('$'))) detectedType = 'currency';
  if (nonNull.some(v => String(v).endsWith('%'))) detectedType = 'percentage';

  const colLower = columnName.toLowerCase();
  let semanticRole = 'unknown';
  if (['id','_id','key','code'].some(s => colLower.includes(s))) semanticRole = 'id';
  else if (['date','time','year','month','week','day','period','quarter'].some(s => colLower.includes(s))) semanticRole = 'date';
  else if (['lat','lon','latitude','longitude','city','state','country','region','zip','postal'].some(s => colLower.includes(s))) semanticRole = 'geo';
  else if (detectedType === 'number' || detectedType === 'currency') semanticRole = 'metric';
  else if (detectedType === 'category') semanticRole = 'dimension';
  else if (detectedType === 'date') semanticRole = 'date';

  let mean = null, median = null, stdDev = null, min = null, max = null;
  if (numericValues.length > 0) {
    mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    const sorted = [...numericValues].sort((a, b) => a - b);
    median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    stdDev = Math.sqrt(numericValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / numericValues.length);
    min = String(sorted[0]);
    max = String(sorted[sorted.length - 1]);
  } else if (uniqueValues.length > 0) {
    min = uniqueValues.reduce((a, b) => a < b ? a : b);
    max = uniqueValues.reduce((a, b) => a > b ? a : b);
  }

  // Outlier detection (IQR)
  let outlierCount = 0;
  if (numericValues.length > 4) {
    const sorted = [...numericValues].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    outlierCount = numericValues.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr).length;
  }

  const mode = uniqueValues.length > 0
    ? nonNull.map(v => String(v).trim()).reduce((a, b, i, arr) =>
        arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b)
    : null;

  const warnings = [];
  const recommendedFixes = [];
  if (missingRate > 0.1) { warnings.push(`${(missingRate * 100).toFixed(1)}% missing values`); recommendedFixes.push('Fill or drop missing values'); }
  if (outlierCount > 0 && detectedType === 'number') { warnings.push(`${outlierCount} outliers detected`); recommendedFixes.push('Cap or remove outliers'); }
  if (detectedType === 'currency') recommendedFixes.push('Convert currency string to numeric');
  if (detectedType === 'percentage') recommendedFixes.push('Convert percentage string to decimal');

  return {
    columnName, detectedType, semanticRole,
    missingCount, missingRate, uniqueCount: uniqueValues.length, uniqueRate,
    mean: mean !== null ? Math.round(mean * 100) / 100 : null,
    median: median !== null ? Math.round(median * 100) / 100 : null,
    stdDev: stdDev !== null ? Math.round(stdDev * 100) / 100 : null,
    min, max, mode, outlierCount,
    isKpiCandidate: semanticRole === 'metric',
    isDateCandidate: semanticRole === 'date',
    isGeoCandidate: semanticRole === 'geo',
    warnings, recommendedFixes,
    sampleValues: uniqueValues.slice(0, 5)
  };
}

export function profileDataset(rows, columns) {
  return columns.map(col => profileColumn(rows, col));
}

// ─── Quality Score Calculator ─────────────────────────────────────────────────
export function calculateQualityScore(rows, columnProfiles) {
  const totalCells = rows.length * columnProfiles.length;
  const missingCells = columnProfiles.reduce((acc, cp) => acc + cp.missingCount, 0);
  const completeness = totalCells === 0 ? 1 : 1 - (missingCells / totalCells);

  // Validity: flag negatives in revenue/cost, bad dates, etc.
  let invalidCount = 0;
  columnProfiles.forEach(cp => {
    if (cp.semanticRole === 'metric') {
      const colLower = cp.columnName.toLowerCase();
      const isPositiveOnly = ['revenue','price','cost','sales','profit','spend','amount'].some(k => colLower.includes(k));
      if (isPositiveOnly && cp.min && Number(cp.min) < 0) invalidCount += 5;
    }
    if (cp.detectedType === 'date' && cp.missingRate > 0) invalidCount += Math.round(cp.missingCount * 0.5);
  });
  const validity = Math.max(0, 1 - invalidCount / Math.max(totalCells, 1));

  // Uniqueness: check for duplicate rows
  const rowStrings = rows.map(r => JSON.stringify(r));
  const uniqueRows = new Set(rowStrings).size;
  const uniqueness = rows.length === 0 ? 1 : uniqueRows / rows.length;

  // Consistency: column name consistency, category count
  const lowCardinalDimensions = columnProfiles.filter(cp => cp.detectedType === 'category' && cp.uniqueCount > 20);
  const consistency = Math.max(0, 1 - (lowCardinalDimensions.length * 0.05));

  // Timeliness: check if date fields have recent data
  const dateCols = columnProfiles.filter(cp => cp.isDateCandidate);
  let timeliness = 0.7; // default
  if (dateCols.length > 0 && dateCols[0].max) {
    const maxDate = new Date(dateCols[0].max);
    const now = new Date();
    const monthsDiff = (now - maxDate) / (1000 * 60 * 60 * 24 * 30);
    timeliness = monthsDiff < 3 ? 1.0 : monthsDiff < 12 ? 0.8 : monthsDiff < 24 ? 0.6 : 0.4;
  }

  // Business Rule: basic checks
  const hasMetric = columnProfiles.some(cp => cp.isKpiCandidate);
  const hasDimension = columnProfiles.some(cp => cp.semanticRole === 'dimension');
  const hasDate = columnProfiles.some(cp => cp.isDateCandidate);
  const businessRuleScore = (hasMetric ? 0.4 : 0) + (hasDimension ? 0.3 : 0) + (hasDate ? 0.3 : 0);

  const finalScore = Math.round((
    completeness * 0.25 +
    validity * 0.20 +
    uniqueness * 0.20 +
    consistency * 0.15 +
    timeliness * 0.10 +
    businessRuleScore * 0.10
  ) * 100);

  let label = 'Not Ready';
  if (finalScore >= 90) label = 'Excellent';
  else if (finalScore >= 80) label = 'Good';
  else if (finalScore >= 70) label = 'Usable with Caution';
  else if (finalScore >= 60) label = 'Needs Cleaning';

  return {
    score: Math.min(100, finalScore),
    label,
    completeness: Math.round(completeness * 100),
    validity: Math.round(validity * 100),
    uniqueness: Math.round(uniqueness * 100),
    consistency: Math.round(consistency * 100),
    timeliness: Math.round(timeliness * 100),
    businessRuleScore: Math.round(businessRuleScore * 100),
    duplicateRows: rows.length - uniqueRows,
    missingCells,
    totalCells
  };
}

// ─── Readiness Score ──────────────────────────────────────────────────────────
export function calculateReadinessScore(columnProfiles, qualityScore) {
  const hasMetric = columnProfiles.some(cp => cp.isKpiCandidate);
  const hasDimension = columnProfiles.some(cp => cp.semanticRole === 'dimension');
  const hasDate = columnProfiles.some(cp => cp.isDateCandidate);
  const hasId = columnProfiles.some(cp => cp.semanticRole === 'id');
  const hasGeo = columnProfiles.some(cp => cp.isGeoCandidate);

  const kpiReadiness = (hasMetric ? 40 : 0) + (hasDimension ? 30 : 0) + (hasDate ? 20 : 0) + (hasId ? 10 : 0);
  const timeSeriesReadiness = hasDate ? (hasMetric ? 90 : 50) : 20;
  const vizReadiness = (hasMetric ? 40 : 0) + (hasDimension ? 30 : 0) + (hasGeo ? 20 : 0) + 10;
  const agentReadiness = qualityScore.score > 60 ? 80 : 40;
  const governanceReadiness = 60; // base

  const score = Math.round(
    qualityScore.score * 0.30 +
    kpiReadiness * 0.20 +
    timeSeriesReadiness * 0.15 +
    Math.min(vizReadiness, 100) * 0.15 +
    agentReadiness * 0.10 +
    governanceReadiness * 0.10
  );

  return {
    score: Math.min(100, score),
    kpiReadiness,
    timeSeriesReadiness,
    vizReadiness: Math.min(100, vizReadiness),
    agentReadiness,
    governanceReadiness,
    hasMetric, hasDimension, hasDate, hasId, hasGeo
  };
}

// ─── Chart Recommendation ─────────────────────────────────────────────────────
export function recommendChart(columnProfiles) {
  const hasDate = columnProfiles.some(f => f.semanticRole === 'date' || f.isDateCandidate);
  const metrics = columnProfiles.filter(f => f.semanticRole === 'metric' || f.isKpiCandidate);
  const dimensions = columnProfiles.filter(f => f.semanticRole === 'dimension');
  const geo = columnProfiles.filter(f => f.semanticRole === 'geo' || f.isGeoCandidate);

  if (geo.length > 0 && metrics.length > 0) return { type: 'geo_map', reason: 'Geographic + metric fields detected' };
  if (hasDate && metrics.length > 0) return { type: 'line', reason: 'Time series data detected' };
  if (dimensions.length === 1 && metrics.length === 1) return { type: 'bar', reason: 'One dimension, one metric — ideal for bar chart' };
  if (dimensions.length === 1 && metrics.length > 1) return { type: 'grouped_bar', reason: 'Multiple metrics per dimension' };
  if (metrics.length === 2) return { type: 'scatter', reason: 'Two numeric metrics — ideal for correlation analysis' };
  if (dimensions.length === 2 && metrics.length === 1) return { type: 'heatmap', reason: 'Two dimensions, one metric' };
  if (dimensions.some(d => ['stage','step','funnel','phase'].some(k => d.columnName.toLowerCase().includes(k)))) return { type: 'funnel', reason: 'Stage/funnel field detected' };
  return { type: 'table', reason: 'Complex data — table recommended' };
}

// ─── Geo Strategy ─────────────────────────────────────────────────────────────
export function getGeoStrategy(columns) {
  const names = columns.map(c => c.toLowerCase());
  if (names.includes('latitude') && names.includes('longitude')) return 'point_map';
  if (['city','state','country'].some(k => names.includes(k))) return 'location_name_map';
  if (names.includes('region')) return 'regional_symbolic_map';
  return 'geo_readiness_assistant';
}

// ─── Data Cleaner ─────────────────────────────────────────────────────────────
export function applyCleaningStep(rows, step) {
  let result = [...rows];
  let affected = 0;

  switch (step.action) {
    case 'remove_duplicates': {
      const seen = new Set();
      const before = result.length;
      result = result.filter(row => {
        const key = JSON.stringify(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      affected = before - result.length;
      break;
    }
    case 'remove_blank_rows': {
      const before = result.length;
      result = result.filter(row => Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== ''));
      affected = before - result.length;
      break;
    }
    case 'trim_whitespace': {
      result = result.map(row => {
        const newRow = {};
        Object.keys(row).forEach(k => { newRow[k] = typeof row[k] === 'string' ? row[k].trim() : row[k]; });
        return newRow;
      });
      affected = result.length;
      break;
    }
    case 'fill_missing_mean': {
      const col = step.column;
      const nums = result.map(r => Number(r[col])).filter(v => !isNaN(v));
      const mean = nums.reduce((a, b) => a + b, 0) / Math.max(nums.length, 1);
      result = result.map(row => {
        if (!row[col] || String(row[col]).trim() === '') { affected++; return { ...row, [col]: Math.round(mean * 100) / 100 }; }
        return row;
      });
      break;
    }
    case 'fill_missing_zero': {
      const col = step.column;
      result = result.map(row => {
        if (!row[col] || String(row[col]).trim() === '') { affected++; return { ...row, [col]: 0 }; }
        return row;
      });
      break;
    }
    case 'fill_missing_unknown': {
      const col = step.column;
      result = result.map(row => {
        if (!row[col] || String(row[col]).trim() === '') { affected++; return { ...row, [col]: 'Unknown' }; }
        return row;
      });
      break;
    }
    case 'convert_currency_to_numeric': {
      const col = step.column;
      result = result.map(row => {
        const val = String(row[col] || '').replace(/[$,\s]/g, '');
        const num = Number(val);
        if (!isNaN(num)) { affected++; return { ...row, [col]: num }; }
        return row;
      });
      break;
    }
    case 'convert_percentage_to_decimal': {
      const col = step.column;
      result = result.map(row => {
        const val = String(row[col] || '').replace(/%/g, '');
        const num = Number(val) / 100;
        if (!isNaN(num)) { affected++; return { ...row, [col]: Math.round(num * 10000) / 10000 }; }
        return row;
      });
      break;
    }
    case 'standardize_column_names': {
      result = result.map(row => {
        const newRow = {};
        Object.keys(row).forEach(k => {
          const newKey = k.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          newRow[newKey] = row[k];
        });
        return newRow;
      });
      affected = result.length;
      break;
    }
    case 'uppercase_to_lowercase': {
      const col = step.column;
      result = result.map(row => ({ ...row, [col]: typeof row[col] === 'string' ? row[col].toLowerCase() : row[col] }));
      affected = result.length;
      break;
    }
    case 'add_calculated_column': {
      result = result.map(row => {
        try {
          const cols = Object.keys(row);
          const func = new Function(...cols, `return ${step.formula}`);
          const val = func(...cols.map(c => Number(row[c]) || 0));
          return { ...row, [step.newColumn]: Math.round(val * 100) / 100 };
        } catch { return row; }
      });
      affected = result.length;
      break;
    }
    default:
      break;
  }
  return { rows: result, affected };
}

// ─── KPI Calculator ───────────────────────────────────────────────────────────
export function calculateKPIs(rows, columnProfiles) {
  const metrics = columnProfiles.filter(cp => cp.isKpiCandidate);
  const kpis = {};

  metrics.forEach(cp => {
    const col = cp.columnName;
    const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v) && isFinite(v));
    if (vals.length === 0) return;
    kpis[col] = {
      sum: Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100,
      avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
      min: Math.min(...vals),
      max: Math.max(...vals),
      count: vals.length
    };
  });

  return kpis;
}

// ─── Simple Forecasting ───────────────────────────────────────────────────────
export function simpleLinearForecast(values, periodsAhead = 3) {
  const n = values.length;
  if (n < 2) return [];

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let num = 0, den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  const forecast = [];
  for (let i = 0; i < periodsAhead; i++) {
    const x = n + i;
    forecast.push(Math.round((slope * x + intercept) * 100) / 100);
  }
  return forecast;
}

// ─── A/B Test Calculator ──────────────────────────────────────────────────────
export function calculateABTest(controlConversions, controlVisitors, variantConversions, variantVisitors) {
  const p1 = controlConversions / Math.max(controlVisitors, 1);
  const p2 = variantConversions / Math.max(variantVisitors, 1);
  const se1 = Math.sqrt(p1 * (1 - p1) / Math.max(controlVisitors, 1));
  const se2 = Math.sqrt(p2 * (1 - p2) / Math.max(variantVisitors, 1));
  const z = (p2 - p1) / Math.sqrt(se1 ** 2 + se2 ** 2);
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  const significant = pValue < 0.05;
  const lift = p1 === 0 ? 0 : ((p2 - p1) / p1) * 100;

  return {
    controlRate: Math.round(p1 * 10000) / 100,
    variantRate: Math.round(p2 * 10000) / 100,
    zScore: Math.round(z * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    significant,
    lift: Math.round(lift * 100) / 100,
    winner: significant ? (p2 > p1 ? 'Variant' : 'Control') : 'No significant winner'
  };
}

function normalCDF(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return z > 0 ? 1 - p : p;
}

// ─── Supply Chain KPIs ────────────────────────────────────────────────────────
export function calculateSupplyChainKPIs(rows) {
  const total = rows.length;
  const onTime = rows.filter(r => String(r.on_time || r.onTime || r.delivery_status || '').toLowerCase().includes('on') || r.on_time_delivery === 1).length;
  const revenue = rows.reduce((acc, r) => acc + (Number(r.revenue) || Number(r.sales) || 0), 0);
  const cost = rows.reduce((acc, r) => acc + (Number(r.cost) || Number(r.transportation_cost) || 0), 0);
  const profit = revenue - cost;

  return {
    totalOrders: total,
    onTimeDeliveryRate: total > 0 ? Math.round((onTime / total) * 10000) / 100 : 0,
    totalRevenue: Math.round(revenue * 100) / 100,
    totalCost: Math.round(cost * 100) / 100,
    grossProfit: Math.round(profit * 100) / 100,
    grossMarginPct: revenue > 0 ? Math.round((profit / revenue) * 10000) / 100 : 0,
    avgOrderValue: total > 0 ? Math.round((revenue / total) * 100) / 100 : 0
  };
}

// ─── Marketing KPIs ───────────────────────────────────────────────────────────
export function calculateMarketingKPIs(rows) {
  const impressions = rows.reduce((a, r) => a + (Number(r.impressions) || 0), 0);
  const clicks = rows.reduce((a, r) => a + (Number(r.clicks) || 0), 0);
  const conversions = rows.reduce((a, r) => a + (Number(r.conversions) || Number(r.leads) || 0), 0);
  const spend = rows.reduce((a, r) => a + (Number(r.spend) || Number(r.cost) || Number(r.budget) || 0), 0);
  const revenue = rows.reduce((a, r) => a + (Number(r.revenue) || 0), 0);
  const customers = rows.reduce((a, r) => a + (Number(r.new_customers) || 0), 0);

  return {
    impressions,
    clicks,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    conversions,
    conversionRate: clicks > 0 ? Math.round((conversions / clicks) * 10000) / 100 : 0,
    totalSpend: Math.round(spend * 100) / 100,
    totalRevenue: Math.round(revenue * 100) / 100,
    roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
    cac: customers > 0 ? Math.round((spend / customers) * 100) / 100 : 0,
    cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0
  };
}

// ─── Decision Matrix ─────────────────────────────────────────────────────────
export function scoreDecisionOption(option) {
  return Math.round((
    (option.impact || 0) * 0.30 +
    (option.feasibility || 0) * 0.25 +
    (option.costEfficiency || 0) * 0.20 +
    (option.speed || 0) * 0.15 +
    (option.riskReduction || 0) * 0.10
  ) * 100) / 100;
}