/**
 * AI-Powered Data Analyzer
 * Uses LLM (simulating ANN/Neural Network reasoning) to:
 * 1. Understand data schema & domain
 * 2. Select optimal chart types for each column combination
 * 3. Generate contextual insights, anomaly detection, forecasting
 * 4. Produce adaptive dashboard layout
 */
import { base44 } from '@/api/base44Client';

// ── Statistical utilities (local ML-style computations) ──────────

export function computeStats(values) {
  const nums = values.filter(v => v != null && !isNaN(Number(v))).map(Number);
  if (!nums.length) return {};
  const n = nums.length;
  const mean = nums.reduce((a, b) => a + b, 0) / n;
  const sorted = [...nums].sort((a, b) => a - b);
  const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  // Skewness (moment-based)
  const skewness = n > 2 ? (nums.reduce((a, b) => a + Math.pow((b - mean) / (std || 1), 3), 0) / n) : 0;
  return { mean, std, min: sorted[0], max: sorted[n - 1], median: sorted[Math.floor(n / 2)], q1, q3, iqr, skewness, n };
}

export function detectOutliers(values) {
  const stats = computeStats(values);
  if (!stats.n) return [];
  const { q1, q3, iqr } = stats;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return values
    .map((v, i) => ({ index: i, value: v }))
    .filter(({ value }) => value < lower || value > upper);
}

export function pearsonCorrelation(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const num = xs.slice(0, n).reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.slice(0, n).reduce((s, x) => s + Math.pow(x - mx, 2), 0) *
    ys.slice(0, n).reduce((s, y) => s + Math.pow(y - my, 2), 0)
  );
  return den === 0 ? 0 : parseFloat((num / den).toFixed(3));
}

// Simple linear regression (least squares)
export function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0, r2: 0 };
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

// Exponential smoothing forecast (Holt-Winters style)
export function expSmoothingForecast(values, periods = 6, alpha = 0.3, beta = 0.1) {
  if (values.length < 4) return [];
  let level = values[0];
  let trend = values[1] - values[0];
  const smoothed = [level];
  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    smoothed.push(level);
  }
  return Array.from({ length: periods }, (_, i) => Math.round(level + trend * (i + 1)));
}

// ── Chart type selector (AI logic) ────────────────────────────────

export function selectBestChartType(colX, colY, data) {
  if (!colY) {
    // Single column
    if (colX.type === 'numeric') return 'histogram';
    if (colX.type === 'category') return 'donut';
    if (colX.type === 'date') return 'timeline';
    return 'table';
  }
  if (colX.type === 'date' && colY.type === 'numeric') return 'area';
  if (colX.type === 'category' && colY.type === 'numeric') {
    return colX.uniqueCount <= 5 ? 'donut' : 'bar';
  }
  if (colX.type === 'numeric' && colY.type === 'numeric') return 'scatter';
  if (colX.type === 'category' && colY.type === 'category') return 'heatmap';
  return 'bar';
}

// ── Domain detector (Neural-network-style classification) ─────────

export function detectDomain(tableName, columns) {
  const name = (tableName || '').toLowerCase();
  const colNames = columns.map(c => c.name.toLowerCase()).join(' ');
  const text = `${name} ${colNames}`;
  
  if (/sales|revenue|product|customer|order|invoice|price|discount/.test(text)) return 'sales';
  if (/employee|salary|payroll|dept|department|hire|staff|workforce/.test(text)) return 'hr';
  if (/patient|hospital|medical|admission|diagnosis|bed|clinical/.test(text)) return 'healthcare';
  if (/stock|price|market|trade|portfolio|return|dividend/.test(text)) return 'finance';
  if (/user|session|click|page|visit|bounce|conversion|traffic/.test(text)) return 'web_analytics';
  if (/temp|humidity|weather|sensor|iot|device/.test(text)) return 'iot';
  if (/student|grade|course|school|university|enrollment/.test(text)) return 'education';
  if (/supply|inventory|logistics|warehouse|shipment/.test(text)) return 'supply_chain';
  return 'general';
}

// ── Full AI analysis pipeline ──────────────────────────────────────

export async function runAIAnalysis(table) {
  const { rows, columns, name: tableName } = table;
  const domain = detectDomain(tableName, columns);

  const dateCol = columns.find(c => c.type === 'date');
  const numericCols = columns.filter(c => c.type === 'numeric');
  const catCols = columns.filter(c => c.type === 'category');
  const idCols = columns.filter(c => c.type === 'id');

  // ── 1. Compute all column statistics locally ──
  const colStats = {};
  numericCols.forEach(col => {
    const vals = rows.map(r => Number(r[col.name])).filter(v => !isNaN(v));
    colStats[col.name] = computeStats(vals);
  });

  // ── 2. Build time-series aggregations ──
  const trendMap = {};
  if (dateCol) {
    numericCols.forEach(col => {
      const grouped = {};
      rows.forEach(row => {
        const key = String(row[dateCol.name]).slice(0, 7);
        if (!key || key === 'null') return;
        if (!grouped[key]) grouped[key] = [];
        const v = Number(row[col.name]);
        if (!isNaN(v)) grouped[key].push(v);
      });
      trendMap[col.name] = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({ date, value: Math.round(vals.reduce((a, b) => a + b, 0)) }));
    });
  }

  // ── 3. Breakdown by each categorical dimension ──
  const breakdownMap = {};
  catCols.forEach(catCol => {
    const breakdowns = {};
    numericCols.slice(0, 3).forEach(numCol => {
      const grouped = {};
      rows.forEach(row => {
        const key = String(row[catCol.name]);
        if (!grouped[key]) grouped[key] = 0;
        grouped[key] += Number(row[numCol.name]) || 0;
      });
      breakdowns[numCol.name] = Object.entries(grouped)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, value]) => ({ name, value: Math.round(value) }));
    });
    breakdownMap[catCol.name] = breakdowns;
  });

  // ── 4. Correlation matrix ──
  const correlations = [];
  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const xs = rows.map(r => Number(r[numericCols[i].name])).filter(v => !isNaN(v));
      const ys = rows.map(r => Number(r[numericCols[j].name])).filter(v => !isNaN(v));
      const r = pearsonCorrelation(xs, ys);
      if (Math.abs(r) > 0.3) {
        correlations.push({ colA: numericCols[i].name, colB: numericCols[j].name, r });
      }
    }
  }

  // ── 5. Anomaly detection (IQR + Z-score combined) ──
  const anomalies = [];
  const primaryTrend = dateCol && numericCols[0] ? trendMap[numericCols[0].name] : [];
  if (primaryTrend.length > 3) {
    const vals = primaryTrend.map(d => d.value);
    const stats = computeStats(vals);
    primaryTrend.forEach(d => {
      const z = Math.abs((d.value - stats.mean) / (stats.std || 1));
      if (z > 2) anomalies.push({
        date: d.date,
        value: d.value,
        expected: Math.round(stats.mean),
        severity: z > 3 ? 'high' : 'medium',
        zScore: parseFloat(z.toFixed(2)),
      });
    });
  }

  // ── 6. Forecasting (Exponential Smoothing + Linear Regression) ──
  let forecastData = [];
  if (primaryTrend.length >= 6) {
    const vals = primaryTrend.map(d => d.value);
    const xs = vals.map((_, i) => i);
    const lr = linearRegression(xs, vals);
    const expForecast = expSmoothingForecast(vals, 6);
    const lastDate = new Date(primaryTrend[primaryTrend.length - 1].date + '-01');
    forecastData = expForecast.map((v, i) => {
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + i + 1);
      // Blend exp smoothing with linear regression for accuracy
      const lrVal = Math.round(lr.slope * (vals.length + i) + lr.intercept);
      const blended = Math.round(v * 0.6 + lrVal * 0.4);
      return { date: d.toISOString().slice(0, 7), value: blended, isForecast: true };
    });
  }

  // ── 7. Primary / secondary metric selection (smart) ──
  // Pick the most "interesting" numeric col: highest variance relative to mean
  const rankedMetrics = numericCols.map(col => {
    const s = colStats[col.name];
    const cv = s && s.mean !== 0 ? (s.std / Math.abs(s.mean)) : 0; // coefficient of variation
    const isCurrency = /revenue|sales|profit|cost|salary|price|amount|value/.test(col.name.toLowerCase());
    return { col, score: cv + (isCurrency ? 2 : 0), stats: s };
  }).sort((a, b) => b.score - a.score);

  const primaryMetric = rankedMetrics[0]?.col;
  const secondMetric = rankedMetrics[1]?.col;

  const totalValue = primaryMetric
    ? rows.reduce((s, r) => s + (Number(r[primaryMetric.name]) || 0), 0)
    : 0;
  const secondValue = secondMetric
    ? rows.reduce((s, r) => s + (Number(r[secondMetric.name]) || 0), 0)
    : 0;

  const primaryTrendFinal = primaryMetric ? (trendMap[primaryMetric.name] || []) : [];
  const primaryBreakdown = primaryMetric && catCols[0]
    ? (breakdownMap[catCols[0].name]?.[primaryMetric.name] || [])
    : [];

  const growthRate = primaryTrendFinal.length >= 2
    ? parseFloat(((primaryTrendFinal[primaryTrendFinal.length - 1].value - primaryTrendFinal[0].value) / (primaryTrendFinal[0].value || 1) * 100).toFixed(1))
    : null;

  // ── 8. Build adaptive chart panels using AI (LLM) ──
  const schemaSnippet = columns.map(c => `${c.name}(${c.type})`).join(', ');
  const sampleRows = rows.slice(0, 3).map(r => JSON.stringify(r)).join('\n');
  const statsSnippet = numericCols.slice(0, 5).map(c => {
    const s = colStats[c.name];
    return s ? `${c.name}: min=${s.min}, max=${s.max}, mean=${Math.round(s.mean)}, std=${Math.round(s.std)}` : '';
  }).filter(Boolean).join('\n');

  // Exact column names list for LLM to reference
  const exactColNames = columns.map(c => c.name);
  const numericColNames = numericCols.map(c => c.name);
  const catColNames = catCols.map(c => c.name);
  const dateColNames = dateCol ? [dateCol.name] : [];

  let aiInsights = null;
  try {
    aiInsights = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a world-class data scientist. Analyze this dataset and return structured insights.

DATASET: "${tableName}"
DOMAIN: ${domain}

EXACT COLUMN NAMES (use these EXACTLY, character-for-character, in x_column and y_column fields):
- All columns: ${exactColNames.join(', ')}
- Numeric columns: ${numericColNames.join(', ')}
- Category columns: ${catColNames.join(', ')}
- Date columns: ${dateColNames.join(', ')}

ROWS: ${rows.length}
SAMPLE ROWS:
${sampleRows}
STATISTICS:
${statsSnippet}
CORRELATIONS: ${correlations.slice(0, 5).map(c => `${c.colA} vs ${c.colB}: r=${c.r}`).join(', ')}
ANOMALIES DETECTED: ${anomalies.length}

CRITICAL RULES:
1. x_column and y_column MUST be exact names from the column list above (copy-paste exactly)
2. For line_area/bar charts: x_column = date or category column, y_column = numeric column
3. For donut/horizontal_bar: x_column = category column, y_column = numeric column  
4. For scatter: x_column = numeric, y_column = numeric
5. For histogram/kpi_gauge/metric_card: x_column or y_column = numeric column
6. NEVER invent column names — only use names from the list above

Return ONLY valid JSON:
{
  "domain_label": "string (e.g. iPhone Sales Analytics)",
  "primary_metric_name": "string (EXACT name of best numeric KPI column from list above)",
  "secondary_metric_name": "string or null (EXACT column name)",
  "primary_dimension": "string or null (EXACT category column name)",
  "secondary_dimension": "string or null (EXACT column name)",
  "chart_panels": [
    {
      "id": "panel_1",
      "title": "string",
      "chart_type": "one of: kpi_gauge|line_area|bar|horizontal_bar|donut|scatter|heatmap|histogram|metric_card",
      "x_column": "EXACT column name from list above, or null",
      "y_column": "EXACT column name from list above, or null",
      "insight": "one sentence insight",
      "color_theme": "one of: cyan|purple|orange|green|pink|yellow|teal"
    }
  ],
  "executive_summary": "3-4 sentence professional summary",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "recommendations": [{"priority": "high|medium|low", "action": "string"}],
  "data_story": "string"
}

Generate 6-8 varied chart panels for THIS dataset using the exact column names provided.`,
      response_json_schema: {
        type: 'object',
        properties: {
          domain_label: { type: 'string' },
          primary_metric_name: { type: 'string' },
          secondary_metric_name: { type: ['string', 'null'] },
          primary_dimension: { type: ['string', 'null'] },
          secondary_dimension: { type: ['string', 'null'] },
          chart_panels: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                chart_type: { type: 'string' },
                x_column: { type: ['string', 'null'] },
                y_column: { type: ['string', 'null'] },
                insight: { type: 'string' },
                color_theme: { type: 'string' },
              },
            },
          },
          executive_summary: { type: 'string' },
          key_findings: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'object' } },
          data_story: { type: 'string' },
        },
      },
    });
  } catch (e) {
    console.warn('LLM analysis failed, using local fallback', e);
  }

  // ── 9. Resolve AI-recommended metrics against actual columns ──
  const resolveCol = (name) => columns.find(c => c.name === name) || columns.find(c => c.name.toLowerCase() === (name || '').toLowerCase());

  const aiPrimary = aiInsights?.primary_metric_name ? resolveCol(aiInsights.primary_metric_name) : null;
  const aiSecondary = aiInsights?.secondary_metric_name ? resolveCol(aiInsights.secondary_metric_name) : null;
  const aiPrimaryDim = aiInsights?.primary_dimension ? resolveCol(aiInsights.primary_dimension) : null;

  const finalPrimary = aiPrimary || primaryMetric;
  const finalSecondary = aiSecondary || secondMetric;
  const finalPrimaryDim = aiPrimaryDim || catCols[0];

  const finalTotalValue = finalPrimary
    ? rows.reduce((s, r) => s + (Number(r[finalPrimary.name]) || 0), 0)
    : totalValue;
  const finalBreakdown = finalPrimary && finalPrimaryDim
    ? (breakdownMap[finalPrimaryDim.name]?.[finalPrimary.name] || primaryBreakdown)
    : primaryBreakdown;
  const finalTrend = finalPrimary ? (trendMap[finalPrimary.name] || primaryTrendFinal) : primaryTrendFinal;
  const finalGrowthRate = finalTrend.length >= 2
    ? parseFloat(((finalTrend[finalTrend.length - 1].value - finalTrend[0].value) / (finalTrend[0].value || 1) * 100).toFixed(1))
    : growthRate;

  // ── 10. Return full enriched analysis ──
  return {
    // Core
    tableName,
    domain,
    domainLabel: aiInsights?.domain_label || tableName,
    primaryMetric: finalPrimary?.name,
    primaryLabel: finalPrimary?.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Primary KPI',
    secondMetric: finalSecondary?.name,
    secondLabel: finalSecondary?.name?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    primaryDimension: finalPrimaryDim?.name,
    secondDimension: aiInsights?.secondary_dimension || catCols[1]?.name,
    totalValue: Math.round(finalTotalValue),
    secondValue: finalSecondary ? Math.round(rows.reduce((s, r) => s + (Number(r[finalSecondary.name]) || 0), 0)) : 0,
    growthRate: finalGrowthRate,
    // Chart data
    trendData: finalTrend.slice(-24),
    forecastData,
    breakdownData: finalBreakdown,
    // All breakdowns by dimension for adaptive charts
    allBreakdowns: breakdownMap,
    allTrends: trendMap,
    correlations,
    colStats,
    // Anomalies
    anomalies,
    // AI insights
    chartPanels: aiInsights?.chart_panels || null,
    executiveSummary: aiInsights?.executive_summary || '',
    keyFindings: aiInsights?.key_findings || [],
    recommendations: aiInsights?.recommendations || [],
    dataStory: aiInsights?.data_story || '',
    canForecast: finalTrend.length >= 6,
    // Column metadata
    numericCols,
    catCols,
    dateCol,
  };
}