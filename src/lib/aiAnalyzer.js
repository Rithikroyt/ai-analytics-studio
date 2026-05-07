/**
 * AI-Powered Data Analyzer — V3 Senior Platform
 * Z-score + IQR anomaly, exponential smoothing + linear regression forecast,
 * full correlation matrix, LLM-driven chart panels & executive insights
 */
import { base44 } from '@/api/base44Client';

// ── Statistical helpers ───────────────────────────────────────────

export function computeStats(values) {
  const nums = values.filter(v => v != null && !isNaN(Number(v))).map(Number);
  if (!nums.length) return { mean: 0, std: 0, min: 0, max: 0, median: 0, q1: 0, q3: 0, iqr: 0, n: 0, skew: 0 };
  const n = nums.length;
  const sorted = [...nums].sort((a, b) => a - b);
  const mean = nums.reduce((a, b) => a + b, 0) / n;
  const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const median = sorted[Math.floor(n / 2)];
  // Pearson skewness approximation
  const skew = std > 0 ? (3 * (mean - median)) / std : 0;
  return { mean, std, min: sorted[0], max: sorted[n - 1], median, q1, q3, iqr: q3 - q1, n, skew: parseFloat(skew.toFixed(3)) };
}

export function pearsonCorrelation(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 4) return 0;
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const num = xs.slice(0, n).reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.slice(0, n).reduce((s, x) => s + Math.pow(x - mx, 2), 0) *
    ys.slice(0, n).reduce((s, y) => s + Math.pow(y - my, 2), 0)
  );
  return den === 0 ? 0 : parseFloat((num / den).toFixed(3));
}

export function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 3) return { slope: 0, intercept: ys[0] || 0, r2: 0 };
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const ssxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const ssxx = xs.reduce((s, x) => s + Math.pow(x - mx, 2), 0);
  const slope = ssxx === 0 ? 0 : ssxy / ssxx;
  const intercept = my - slope * mx;
  const predicted = xs.map(x => slope * x + intercept);
  const ssTot = ys.reduce((s, y) => s + Math.pow(y - my, 2), 0);
  const ssRes = ys.reduce((s, y, i) => s + Math.pow(y - predicted[i], 2), 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2: parseFloat(r2.toFixed(3)) };
}

export function expSmoothingForecast(values, periods = 6, alpha = 0.35, beta = 0.15) {
  if (values.length < 4) return [];
  let level = values[0];
  let trend = (values[Math.min(3, values.length - 1)] - values[0]) / Math.min(3, values.length - 1);
  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  return Array.from({ length: periods }, (_, i) => Math.max(0, Math.round(level + trend * (i + 1))));
}

// ── Anomaly detection: Z-score + IQR ─────────────────────────────
export function detectAnomaliesZScore(trendData, zThreshold = 1.85) {
  if (trendData.length < 4) return [];
  const vals = trendData.map(d => d.value);
  const s = computeStats(vals);
  return trendData
    .map(d => {
      const z = Math.abs((d.value - s.mean) / (s.std || 1));
      return z > zThreshold
        ? { date: d.date, value: d.value, expected: Math.round(s.mean), severity: z > 2.8 ? 'high' : 'medium', zScore: parseFloat(z.toFixed(2)), method: 'z-score' }
        : null;
    })
    .filter(Boolean);
}

export function detectAnomaliesIQR(trendData) {
  if (trendData.length < 4) return [];
  const vals = trendData.map(d => d.value);
  const s = computeStats(vals);
  const lower = s.q1 - 1.5 * s.iqr;
  const upper = s.q3 + 1.5 * s.iqr;
  return trendData
    .filter(d => d.value < lower || d.value > upper)
    .map(d => ({
      date: d.date, value: d.value, expected: Math.round(s.mean),
      severity: Math.abs(d.value - s.mean) > 3 * s.std ? 'high' : 'medium',
      zScore: parseFloat(Math.abs((d.value - s.mean) / (s.std || 1)).toFixed(2)),
      method: 'iqr'
    }));
}

export function detectDomain(tableName, columns) {
  const text = `${(tableName || '').toLowerCase()} ${columns.map(c => c.name.toLowerCase()).join(' ')}`;
  if (/sales|revenue|product|customer|order|invoice|price|discount/.test(text)) return 'sales';
  if (/employee|salary|payroll|dept|department|hire|staff|workforce|attrition/.test(text)) return 'hr';
  if (/patient|hospital|medical|admission|diagnosis|bed|clinical|readmission/.test(text)) return 'healthcare';
  if (/stock|market|trade|portfolio|return|dividend|financial/.test(text)) return 'finance';
  if (/user|session|click|page|visit|bounce|conversion|traffic/.test(text)) return 'web_analytics';
  if (/student|grade|course|school|university|enrollment|completion/.test(text)) return 'education';
  if (/supply|inventory|logistics|warehouse|shipment/.test(text)) return 'supply_chain';
  if (/survey|feedback|nps|satisfaction|sentiment/.test(text)) return 'feedback';
  if (/flight|delay|airline|airport|departure|arrival/.test(text)) return 'aviation';
  return 'general';
}

// ── Chart type recommender ────────────────────────────────────────
export function recommendChartType(colTypes, userIntent = '') {
  const intent = userIntent.toLowerCase();
  const hasDate = colTypes.some(t => t === 'date');
  const numCount = colTypes.filter(t => t === 'numeric').length;
  const catCount = colTypes.filter(t => t === 'category').length;

  if (/funnel|conversion|drop/i.test(intent)) return 'funnel';
  if (/distribution|histogram|spread/i.test(intent)) return 'histogram';
  if (/scatter|correlat|relation/i.test(intent)) return 'scatter';
  if (/map|geo|location|city|state|country/i.test(intent)) return 'map';
  if (/waterfall|variance|bridge/i.test(intent)) return 'waterfall';
  if (/treemap|hierarchy|hierarchical/i.test(intent)) return 'treemap';
  if (hasDate && numCount >= 1) return 'line_area';
  if (catCount >= 1 && numCount >= 1) return 'bar';
  if (numCount === 1) return 'histogram';
  if (numCount >= 2) return 'scatter';
  return 'table';
}

// ── Main analysis pipeline V3 ─────────────────────────────────────

export async function runAIAnalysis(table, overrides = {}) {
  const { rows, columns, name: tableName } = table;
  if (!rows?.length || !columns?.length) throw new Error('Empty table');

  const domain = detectDomain(tableName, columns);
  const dateCol = overrides.dateCol === 'none' ? null
    : overrides.dateCol ? (columns.find(c => c.name === overrides.dateCol) || columns.find(c => c.type === 'date'))
    : columns.find(c => c.type === 'date');
  const numericCols = columns.filter(c => c.type === 'numeric');
  const catCols = columns.filter(c => c.type === 'category');
  const formatLabel = s => s?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';

  if (!numericCols.length) {
    throw new Error('No numeric columns found — please select a dataset with measurable KPIs.');
  }

  // 1. Column statistics (V3: includes skewness, imputation strategy hint)
  const colStats = {};
  numericCols.forEach(col => {
    const vals = rows.map(r => Number(r[col.name])).filter(v => !isNaN(v));
    const stats = computeStats(vals);
    colStats[col.name] = {
      ...stats,
      imputationStrategy: Math.abs(stats.skew) > 1 ? 'median' : 'mean',
      outlierCount: vals.filter(v => Math.abs(v - stats.mean) > 2 * stats.std).length,
    };
  });

  // 2. Smart primary metric selection
  const rankMetric = col => {
    const n = col.name.toLowerCase();
    if (/revenue|sales|profit|income/.test(n)) return 10;
    if (/score|rate|margin/.test(n)) return 7;
    if (/cost|expense|spend/.test(n)) return 5;
    if (/count|quantity|units/.test(n)) return 4;
    const cv = colStats[col.name]?.std / Math.abs(colStats[col.name]?.mean || 1);
    return 3 + cv;
  };
  const rankedCols = [...numericCols].sort((a, b) => rankMetric(b) - rankMetric(a));
  let primaryMetric = rankedCols[0];
  if (overrides.primaryMetric) {
    const om = columns.find(c => c.name === overrides.primaryMetric && c.type === 'numeric');
    if (om) primaryMetric = om;
  }
  const secondMetric = rankedCols.find(c => c !== primaryMetric) || rankedCols[1];

  // 3. Time-series aggregation
  const trendMap = {};
  if (dateCol) {
    numericCols.forEach(col => {
      const grouped = {};
      rows.forEach(row => {
        const key = String(row[dateCol.name]).slice(0, 7);
        if (!key || key.length < 4 || key === 'null') return;
        if (!grouped[key]) grouped[key] = [];
        const v = Number(row[col.name]);
        if (!isNaN(v)) grouped[key].push(v);
      });
      trendMap[col.name] = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({ date, value: Math.round(vals.reduce((a, b) => a + b, 0)) }));
    });
  }

  // 4. Categorical breakdowns
  const breakdownMap = {};
  catCols.forEach(catCol => {
    const breakdowns = {};
    numericCols.slice(0, 4).forEach(numCol => {
      const grouped = {};
      rows.forEach(row => {
        const key = String(row[catCol.name] ?? 'Unknown');
        grouped[key] = (grouped[key] || 0) + (Number(row[numCol.name]) || 0);
      });
      breakdowns[numCol.name] = Object.entries(grouped)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, value]) => ({ name, value: Math.round(value) }));
    });
    breakdownMap[catCol.name] = breakdowns;
  });

  // 5. Full correlation matrix
  const correlations = [];
  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const xs = rows.map(r => Number(r[numericCols[i].name])).filter(v => !isNaN(v));
      const ys = rows.map(r => Number(r[numericCols[j].name])).filter(v => !isNaN(v));
      const r = pearsonCorrelation(xs, ys);
      if (Math.abs(r) > 0.25) {
        correlations.push({
          colA: numericCols[i].name, colB: numericCols[j].name, r,
          strength: Math.abs(r) > 0.7 ? 'strong' : Math.abs(r) > 0.4 ? 'moderate' : 'weak',
          significant: Math.abs(r) > 0.5,
          direction: r > 0 ? 'positive' : 'negative',
        });
      }
    }
  }
  correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  // 6. Anomaly detection (Z-score + IQR combined, deduplicated)
  const primaryTrend = primaryMetric ? (trendMap[primaryMetric.name] || []) : [];
  const zAnomalies = detectAnomaliesZScore(primaryTrend);
  const iqrAnomalies = detectAnomaliesIQR(primaryTrend);
  // Merge: prefer z-score results, add IQR-only catches
  const anomalyDates = new Set(zAnomalies.map(a => a.date));
  const anomalies = [
    ...zAnomalies,
    ...iqrAnomalies.filter(a => !anomalyDates.has(a.date)),
  ].sort((a, b) => b.zScore - a.zScore);

  // 7. Forecasting (Exp smoothing + LR blended)
  let forecastData = [];
  let forecastAccuracy = null;
  if (primaryTrend.length >= 6) {
    const vals = primaryTrend.map(d => d.value);
    const xs = vals.map((_, i) => i);
    const lr = linearRegression(xs, vals);
    const expFc = expSmoothingForecast(vals, 6);
    const lastDate = new Date(primaryTrend[primaryTrend.length - 1].date + '-01');
    forecastData = expFc.map((v, i) => {
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + i + 1);
      const lrVal = Math.round(lr.slope * (vals.length + i) + lr.intercept);
      const blended = Math.round(v * 0.6 + lrVal * 0.4);
      return { date: d.toISOString().slice(0, 7), value: blended, isForecast: true };
    });
    // Pseudo-accuracy via R² of linear trend component
    forecastAccuracy = Math.round(lr.r2 * 100);
  }

  // 8. Final metric values
  const totalValue = primaryMetric ? rows.reduce((s, r) => s + (Number(r[primaryMetric.name]) || 0), 0) : 0;
  const secondValue = secondMetric ? rows.reduce((s, r) => s + (Number(r[secondMetric.name]) || 0), 0) : 0;
  const primaryDim = catCols[0];
  const primaryBreakdown = primaryMetric && primaryDim ? (breakdownMap[primaryDim.name]?.[primaryMetric.name] || []) : [];
  const growthRate = primaryTrend.length >= 2
    ? parseFloat(((primaryTrend[primaryTrend.length - 1].value - primaryTrend[0].value) / (primaryTrend[0].value || 1) * 100).toFixed(1))
    : null;

  // 9. Data quality detailed stats (V3: per-column nulls)
  const nullSummary = {};
  columns.forEach(col => {
    const nulls = rows.filter(r => r[col.name] == null || r[col.name] === '' || r[col.name] === 'null').length;
    nullSummary[col.name] = { count: nulls, pct: Math.round((nulls / rows.length) * 100) };
  });
  const rowHashes = rows.slice(0, 1000).map(r => JSON.stringify(r));
  const duplicateRows = rowHashes.length - new Set(rowHashes).size;

  // 10. LLM call for AI insights
  const statsSnippet = numericCols.slice(0, 8).map(c => {
    const s = colStats[c.name];
    return s ? `${c.name}: mean=${Math.round(s.mean)}, std=${Math.round(s.std)}, min=${s.min}, max=${s.max}, skew=${s.skew}, outliers=${s.outlierCount}` : '';
  }).filter(Boolean).join('\n');

  const sampleRows = rows.slice(0, 5).map(r => JSON.stringify(r)).join('\n');
  let aiInsights = null;

  try {
    aiInsights = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a world-class senior data scientist & business analyst producing an enterprise analytics briefing.

DATASET: "${tableName}"
DOMAIN: ${domain}
ROWS: ${rows.length.toLocaleString()} | COLS: ${columns.length}
QUALITY: Completeness ${Math.round((1 - Object.values(nullSummary).reduce((s, v) => s + v.pct, 0) / (100 * columns.length)) * 100)}% | Duplicates: ${duplicateRows}

EXACT COLUMN NAMES (use ONLY these):
- Numeric: ${numericCols.map(c => c.name).join(', ')}
- Category: ${catCols.map(c => c.name).join(', ')}
- Date: ${dateCol ? dateCol.name : 'none'}

SAMPLE ROWS:
${sampleRows}

COLUMN STATISTICS:
${statsSnippet}

CORRELATIONS: ${correlations.slice(0, 5).map(c => `${c.colA} ↔ ${c.colB}: r=${c.r} (${c.strength})`).join(', ') || 'none'}
ANOMALIES: ${anomalies.length} (${anomalies.filter(a => a.severity === 'high').length} high-severity)
GROWTH RATE: ${growthRate != null ? growthRate + '%' : 'N/A'}
FORECAST: ${primaryTrend.length >= 6 ? 'Available' : 'Not available'}

CHART RULES:
- x_column and y_column MUST be EXACT column names from above
- date→numeric = line_area | category→numeric = bar or donut | numeric→numeric = scatter
- Generate 6–8 varied chart panels across different dimensions

Return ONLY valid JSON:
{
  "domain_label": "string",
  "primary_metric_name": "EXACT numeric column name",
  "secondary_metric_name": "EXACT numeric column name or null",
  "primary_dimension": "EXACT category column name or null",
  "chart_panels": [{
    "id": "string",
    "title": "string (max 6 words)",
    "chart_type": "line_area|bar|horizontal_bar|donut|scatter|histogram|metric_card",
    "x_column": "EXACT column name or null",
    "y_column": "EXACT column name or null",
    "insight": "one sentence with a specific number",
    "color_theme": "cyan|purple|orange|green|pink|yellow|teal",
    "x_axis_label": "string",
    "y_axis_label": "string"
  }],
  "executive_summary": "4-5 sentence professional summary with specific numbers",
  "key_findings": ["finding with data point", "finding", "finding", "finding"],
  "recommendations": [
    {"priority": "high|medium|low|critical", "action": "specific actionable recommendation", "impact": "expected business impact"},
    {"priority": "high|medium|low", "action": "specific actionable recommendation", "impact": "expected business impact"},
    {"priority": "medium|low", "action": "specific actionable recommendation", "impact": "expected business impact"}
  ],
  "data_story": "one sentence narrative arc",
  "risk_signals": ["risk with context", "risk"],
  "root_causes": ["potential root cause for primary trend"],
  "confidence": 85
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          domain_label: { type: 'string' },
          primary_metric_name: { type: 'string' },
          secondary_metric_name: { type: ['string', 'null'] },
          primary_dimension: { type: ['string', 'null'] },
          chart_panels: { type: 'array', items: { type: 'object' } },
          executive_summary: { type: 'string' },
          key_findings: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'object' } },
          data_story: { type: 'string' },
          risk_signals: { type: 'array', items: { type: 'string' } },
          root_causes: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number' },
        },
      },
    });
  } catch (e) {
    console.warn('[AIAnalyzer V3] LLM call failed, using local fallback:', e?.message);
  }

  // 11. Resolve AI metric names
  const resolveCol = (name) => {
    if (!name) return null;
    return columns.find(c => c.name === name) || columns.find(c => c.name.toLowerCase() === name.toLowerCase());
  };

  const aiPrimary = resolveCol(aiInsights?.primary_metric_name);
  const aiSecondary = resolveCol(aiInsights?.secondary_metric_name);
  const aiPrimaryDim = resolveCol(aiInsights?.primary_dimension);

  const finalPrimary = (aiPrimary?.type === 'numeric' ? aiPrimary : null) || primaryMetric;
  const finalSecondary = (aiSecondary?.type === 'numeric' ? aiSecondary : null) || secondMetric;
  const finalPrimaryDim = (aiPrimaryDim?.type === 'category' ? aiPrimaryDim : null) || primaryDim;

  const finalTotalValue = finalPrimary ? rows.reduce((s, r) => s + (Number(r[finalPrimary.name]) || 0), 0) : totalValue;
  const finalBreakdown = finalPrimary && finalPrimaryDim ? (breakdownMap[finalPrimaryDim.name]?.[finalPrimary.name] || primaryBreakdown) : primaryBreakdown;
  const finalTrend = finalPrimary ? (trendMap[finalPrimary.name] || primaryTrend) : primaryTrend;
  const finalGrowthRate = finalTrend.length >= 2
    ? parseFloat(((finalTrend[finalTrend.length - 1].value - finalTrend[0].value) / (finalTrend[0].value || 1) * 100).toFixed(1))
    : growthRate;

  const localFindings = [
    `Total ${formatLabel(finalPrimary?.name)} is ${Math.round(finalTotalValue).toLocaleString()}.`,
    finalGrowthRate != null ? `Overall trend: ${finalGrowthRate > 0 ? '+' : ''}${finalGrowthRate}% over the period.` : 'No date column — time-series analysis unavailable.',
    finalBreakdown[0] ? `Top segment: "${finalBreakdown[0].name}" (${Math.round(finalBreakdown[0].value / (Math.round(finalTotalValue) || 1) * 100)}% of total).` : null,
    anomalies.length > 0 ? `${anomalies.length} statistical anomalies detected (${anomalies.filter(a => a.severity === 'high').length} high-severity).` : 'No anomalies — data within normal bounds.',
    correlations[0] ? `Strongest correlation: ${formatLabel(correlations[0].colA)} ↔ ${formatLabel(correlations[0].colB)} (r=${correlations[0].r}, ${correlations[0].strength}).` : null,
    duplicateRows > 0 ? `${duplicateRows} duplicate rows detected — consider deduplication.` : null,
  ].filter(Boolean);

  const localRecommendations = [
    Number(finalGrowthRate) > 10 && { priority: 'high', action: `Accelerate investment to sustain ${finalGrowthRate}% growth.`, impact: 'Revenue uplift' },
    Number(finalGrowthRate) < -5 && { priority: 'critical', action: `Investigate declining trend (${finalGrowthRate}%) — convene task force immediately.`, impact: 'Risk mitigation' },
    anomalies.length > 0 && { priority: 'medium', action: `Review ${anomalies.length} anomalies for data quality or external causes.`, impact: 'Data integrity' },
    finalBreakdown[0] && { priority: 'medium', action: `Prioritize "${finalBreakdown[0].name}" — top-performing segment. Replicate its drivers.`, impact: 'Performance optimization' },
    { priority: 'low', action: 'Schedule quarterly data review to maintain analytical reliability.', impact: 'Governance' },
  ].filter(Boolean).slice(0, 4);

  return {
    tableName,
    domain,
    domainLabel: aiInsights?.domain_label || tableName,
    primaryMetric: finalPrimary?.name,
    primaryLabel: formatLabel(finalPrimary?.name) || 'Primary KPI',
    secondMetric: finalSecondary?.name,
    secondLabel: formatLabel(finalSecondary?.name),
    primaryDimension: finalPrimaryDim?.name,
    secondDimension: catCols[1]?.name,
    totalValue: Math.round(finalTotalValue),
    secondValue: finalSecondary ? Math.round(rows.reduce((s, r) => s + (Number(r[finalSecondary.name]) || 0), 0)) : Math.round(secondValue),
    growthRate: finalGrowthRate,
    trendData: finalTrend.slice(-36),
    forecastData,
    forecastAccuracy,
    breakdownData: finalBreakdown,
    allBreakdowns: breakdownMap,
    allTrends: trendMap,
    correlations,
    colStats,
    anomalies,
    nullSummary,
    duplicateRows,
    chartPanels: aiInsights?.chart_panels || null,
    executiveSummary: aiInsights?.executive_summary || `Analysis of ${tableName}: total ${formatLabel(finalPrimary?.name)} is ${Math.round(finalTotalValue).toLocaleString()}.`,
    keyFindings: (aiInsights?.key_findings?.length ? aiInsights.key_findings : localFindings),
    recommendations: (aiInsights?.recommendations?.length ? aiInsights.recommendations : localRecommendations),
    dataStory: aiInsights?.data_story || `${tableName} data shows ${Number(finalGrowthRate) > 0 ? 'growth' : Number(finalGrowthRate) < 0 ? 'decline' : 'stability'}.`,
    riskSignals: aiInsights?.risk_signals || [],
    rootCauses: aiInsights?.root_causes || [],
    aiConfidence: aiInsights?.confidence || 75,
    canForecast: finalTrend.length >= 6,
    numericCols,
    catCols,
    dateCol,
  };
}