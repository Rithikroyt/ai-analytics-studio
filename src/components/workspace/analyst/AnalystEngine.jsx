/**
 * AnalystEngine v2 — LLM-powered deep analysis with mode-aware reasoning
 * Supports: Exploratory, Predictive, Diagnostic, Prescriptive
 * Techniques: ML models, Deviation Analysis, Distribution Analysis, Storytelling
 */
import { base44 } from '@/api/base44Client';
import { assessConfidence } from '@/lib/analystTools';
import * as localTools from '@/lib/analystToolsLocal.js';

// ── Build rich data context for LLM ─────────────────────────────
function buildDataContext(store, activeTable, analysisResults) {
  const r = analysisResults;
  const table = activeTable;
  if (!table) return 'No dataset loaded.';

  const numCols = table.columns?.filter(c => c.type === 'numeric') || [];
  const catCols = table.columns?.filter(c => c.type === 'category') || [];
  const dateCols = table.columns?.filter(c => c.type === 'date') || [];

  const fmt = v => v == null ? 'N/A' : Number(v) >= 1e6 ? `${(Number(v)/1e6).toFixed(2)}M` : Number(v) >= 1e3 ? `${(Number(v)/1e3).toFixed(1)}K` : String(v);

  // Column statistics
  const colStats = numCols.slice(0, 8).map(col => {
    const vals = (table.rows || []).map(r => Number(r[col.name])).filter(v => !isNaN(v));
    if (!vals.length) return null;
    const mean = vals.reduce((a,b) => a+b, 0) / vals.length;
    const sorted = [...vals].sort((a,b) => a-b);
    const std = Math.sqrt(vals.reduce((a,b) => a + (b-mean)**2, 0) / vals.length);
    const q1 = sorted[Math.floor(vals.length * 0.25)];
    const q3 = sorted[Math.floor(vals.length * 0.75)];
    const outlierCount = vals.filter(v => Math.abs(v - mean) > 2 * std).length;
    return `  ${col.name}: mean=${fmt(mean)}, std=${fmt(std)}, min=${fmt(sorted[0])}, max=${fmt(sorted[sorted.length-1])}, Q1=${fmt(q1)}, Q3=${fmt(q3)}, outliers=${outlierCount}`;
  }).filter(Boolean).join('\n');

  // Category distributions
  const catDist = catCols.slice(0, 4).map(col => {
    const freq = {};
    (table.rows || []).forEach(row => { const v = String(row[col.name] || ''); freq[v] = (freq[v] || 0) + 1; });
    const top = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, 5);
    return `  ${col.name}: ${top.map(([k,v]) => `${k}(${v})`).join(', ')}`;
  }).join('\n');

  // Anomaly details
  const anomalyDetail = r?.anomalies?.slice(0, 5).map(a =>
    `  ${a.date || 'row'}: actual=${fmt(a.value)}, expected=${fmt(a.expected)}, z=${a.zScore}σ, severity=${a.severity}`
  ).join('\n') || '  None detected';

  // Correlations
  const corrDetail = r?.correlations?.slice(0, 5).map(c =>
    `  ${c.colA} ↔ ${c.colB}: r=${c.r} (${Math.abs(c.r) > 0.7 ? 'strong' : Math.abs(c.r) > 0.4 ? 'moderate' : 'weak'})`
  ).join('\n') || '  None computed';

  // Trend summary
  const trendSummary = r?.trendData?.length
    ? `Growth rate: ${r.growthRate}% | Periods: ${r.trendData.length} | Latest: ${fmt(r.trendData[r.trendData.length-1]?.value)} | Earliest: ${fmt(r.trendData[0]?.value)}`
    : 'No time-series data';

  return `
DATASET: ${table.name}
Rows: ${table.rowCount?.toLocaleString()} | Columns: ${table.columns?.length} | Quality Score: ${table.qualityScore}%
Numeric columns: ${numCols.map(c => c.name).join(', ') || 'None'}
Category columns: ${catCols.map(c => c.name).join(', ') || 'None'}
Date columns: ${dateCols.map(c => c.name).join(', ') || 'None'}

PRIMARY KPI: ${r?.primaryLabel || 'Unknown'} = ${fmt(r?.totalValue)}
SECONDARY KPI: ${r?.secondLabel || 'N/A'} = ${fmt(r?.secondValue)}
TREND: ${trendSummary}
TOP SEGMENTS (${r?.breakdownData?.slice(0,5).map(b => `${b.name}: ${fmt(b.value)}`).join(', ') || 'N/A'})

NUMERIC COLUMN STATISTICS:
${colStats || '  No numeric data'}

CATEGORY DISTRIBUTIONS:
${catDist || '  No category data'}

ANOMALIES (${r?.anomalies?.length || 0} total):
${anomalyDetail}

CORRELATIONS:
${corrDetail}

EXISTING RECOMMENDATIONS:
${r?.recommendations?.map(rec => `  [${rec.priority?.toUpperCase()}] ${rec.action}`).join('\n') || '  None'}

KEY FINDINGS:
${r?.keyFindings?.map(f => `  • ${f}`).join('\n') || '  None'}

ISSUES: ${table.issues?.map(i => i.message).join('; ') || 'None'}
`.trim();
}

// ── Mode-specific deep prompts ───────────────────────────────────
function buildPrompt(question, mode, dataContext) {
  const modeInstructions = {
    exploratory: `You are a senior data scientist performing EXPLORATORY ANALYSIS. Apply:
- Distribution Analysis: describe the shape, skewness, kurtosis of key variables
- Outlier Detection: flag statistical outliers using IQR and Z-score methods  
- Correlation Mapping: identify key variable relationships with Pearson/Spearman analysis
- Segmentation: break down performance across all meaningful dimensions
- Data Quality storytelling: narrate what the data reveals about itself`,

    predictive: `You are an ML engineer performing PREDICTIVE ANALYSIS. Apply:
- Trend Extrapolation: use linear regression and exponential smoothing signals
- Forecast Narrative: project likely future states with bull/base/bear scenarios
- Feature Importance: identify which variables most predict the primary KPI (based on correlations)
- Anomaly Forecasting: flag periods at risk based on deviation patterns
- Confidence Intervals: state prediction uncertainty ranges`,

    diagnostic: `You are a data detective performing ROOT CAUSE DIAGNOSIS. Apply:
- Deviation Analysis: quantify exactly how much each metric deviates from baseline/expected
- Drill-down Decomposition: break the problem into contributing factors by segment, time, column
- Causal Chain Mapping: trace the sequence of events/metrics leading to the observed outcome
- Statistical Significance Testing: distinguish signal from noise
- Network Effect Analysis: how do correlated variables amplify the issue?`,

    prescriptive: `You are a strategic advisor performing PRESCRIPTIVE ANALYSIS. Apply:
- Priority Matrix: rank actions by impact × feasibility × urgency
- Resource Optimization: recommend where to focus effort for maximum ROI
- Risk-adjusted Recommendations: weigh upside vs downside of each action
- Implementation Roadmap: sequence actions in 30/60/90 day horizons
- Decision Rules: create IF-THEN decision logic based on data thresholds`,
  };

  const instruction = modeInstructions[mode] || modeInstructions.exploratory;

  return `${instruction}

USER QUESTION: "${question}"

ACTUAL DATASET CONTEXT:
${dataContext}

STRICT RULES:
1. Answer MUST be directly relevant to the question "${question}"
2. Use SPECIFIC numbers from the dataset context above — never fabricate values
3. Apply the analysis techniques listed above to generate deep insights
4. Structure your response as a clear narrative with specific findings
5. For prescriptive questions: provide a numbered priority plan with concrete actions
6. For exploratory: describe distributions, patterns, and structure
7. For predictive: provide scenarios with ranges
8. For diagnostic: identify root causes with evidence
9. Be SPECIFIC, DETAILED, and DATA-GROUNDED — not generic
10. Length: 200-400 words, professional analyst tone

Respond in plain text (no markdown headers). Start directly with the insight.`;
}

// ── Build chart from analysis ────────────────────────────────────
function buildChart(question, analysisResults, activeTable) {
  const r = analysisResults;
  if (!r) return null;
  const q = question.toLowerCase();

  if ((q.includes('trend') || q.includes('forecast') || q.includes('predict')) && r.trendData?.length) {
    return {
      type: r.forecastData?.length ? 'composed' : 'area',
      title: `${r.primaryLabel} — Trend${r.forecastData?.length ? ' + Forecast' : ''}`,
      data: [
        ...(r.trendData || []).map(d => ({ date: d.date, actual: d.value })),
        ...(r.forecastData || []).map(d => ({ date: d.date, forecast: d.value })),
      ],
      x_key: 'date',
      y_key: 'actual',
      series: [
        { key: 'actual', label: r.primaryLabel, type: 'area' },
        ...(r.forecastData?.length ? [{ key: 'forecast', label: 'Forecast', type: 'line' }] : []),
      ],
    };
  }

  if ((q.includes('segment') || q.includes('breakdown') || q.includes('plan') || q.includes('focus') || q.includes('priority')) && r.breakdownData?.length) {
    return {
      type: 'bar',
      title: `${r.primaryLabel} by Segment — Priority View`,
      data: r.breakdownData.slice(0, 10),
      x_key: 'name',
      y_key: 'value',
    };
  }

  if ((q.includes('anomal') || q.includes('deviation') || q.includes('diagnostic') || q.includes('cause')) && r.trendData?.length) {
    return {
      type: 'area',
      title: `${r.primaryLabel} with Anomaly Context`,
      data: r.trendData.map(d => ({ date: d.date, value: d.value })),
      x_key: 'date',
      y_key: 'value',
      reference_value: r.trendData.reduce((a,b) => a + b.value, 0) / r.trendData.length,
      reference_label: 'Baseline Mean',
    };
  }

  if ((q.includes('correlat') || q.includes('relation') || q.includes('distribution') || q.includes('scatter')) && r.correlations?.length) {
    const topCorr = r.correlations[0];
    const rows = (activeTable?.rows || []).slice(0, 300);
    const scatterData = rows
      .map(r => ({ x: Number(r[topCorr.colA]), y: Number(r[topCorr.colB]) }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y));
    if (scatterData.length > 4) {
      return {
        type: 'scatter',
        title: `Correlation: ${topCorr.colA} vs ${topCorr.colB} (r=${topCorr.r})`,
        data: scatterData,
        x_key: topCorr.colA,
        y_key: topCorr.colB,
      };
    }
  }

  // Default: breakdown chart
  if (r.breakdownData?.length) {
    return {
      type: 'bar',
      title: `${r.primaryLabel} by Segment`,
      data: r.breakdownData.slice(0, 8),
      x_key: 'name',
      y_key: 'value',
    };
  }

  return null;
}

// ── Main workflow ────────────────────────────────────────────────
export async function executeAnalystWorkflow(question, store, analysisResultsArg, activeTableArg) {
  const activeTable = activeTableArg || store?.tables?.find(t => t.id === store?.activeTableId) || store?.tables?.[0] || null;
  const analysisResults = analysisResultsArg || store?.analysisResults || null;

  const steps = [
    'Detecting question intent…',
    'Loading workspace context…',
    'Running statistical analysis…',
    'Applying analytical models…',
    'Generating deep insights…',
    'Building visualizations…',
    'Finalizing response…',
  ];

  const response = {
    role: 'assistant',
    answer: '',
    insights: [],
    evidence: [],
    recommendations: [],
    charts: [],
    confidence: 100,
    limitations: [],
    steps,
  };

  try {
    // Detect mode from question context
    const q = question.toLowerCase();
    let mode = 'exploratory';
    if (q.includes('forecast') || q.includes('predict') || q.includes('next') || q.includes('will')) mode = 'predictive';
    else if (q.includes('why') || q.includes('cause') || q.includes('anomal') || q.includes('drop') || q.includes('issue') || q.includes('problem')) mode = 'diagnostic';
    else if (q.includes('should') || q.includes('recommend') || q.includes('plan') || q.includes('focus') || q.includes('priority') || q.includes('action') || q.includes('improve')) mode = 'prescriptive';

    const dataContext = buildDataContext(store, activeTable, analysisResults);

    // Call LLM for deep analysis
    const prompt = buildPrompt(question, mode, dataContext);
    let llmAnswer = '';
    try {
      llmAnswer = await base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
    } catch {
      // Fallback to local tools
      const fallback = await localTools.safeFallbackResponse(store, question);
      llmAnswer = fallback.answer;
    }

    response.answer = llmAnswer;

    // Build contextual insights from data
    const kpi = await localTools.getKPISummary(store);
    const anomalies = await localTools.getAnomalyResults(store);
    const recs = await localTools.generateRecommendations(store);

    const insights = [];
    if (kpi?.primary_value) insights.push(`${kpi.primary_kpi}: ${kpi.primary_change} vs prior period`);
    if (kpi?.quality_score) insights.push(`Data quality: ${kpi.quality_score}% — ${kpi.quality_score >= 90 ? 'analysis-ready' : 'review recommended'}`);
    if (analysisResults?.correlations?.length) {
      const top = analysisResults.correlations[0];
      insights.push(`Strongest correlation: ${top.colA} ↔ ${top.colB} (r=${top.r})`);
    }
    if (anomalies?.total_anomalies > 0) insights.push(`${anomalies.total_anomalies} statistical anomalies detected (${anomalies.severity_breakdown?.high || 0} high-severity)`);
    if (kpi?.top_segments?.length) insights.push(`Top segment: ${kpi.top_segments[0]?.name} contributing ${kpi.top_segments[0]?.value?.toLocaleString()}`);

    response.insights = insights;
    response.recommendations = recs?.slice(0, 4) || [];

    // Build chart
    const chart = buildChart(question, analysisResults, activeTable);
    if (chart) response.charts = [chart];

  } catch (e) {
    console.error('[AnalystEngine v2]', e);
    const fallback = await localTools.safeFallbackResponse(store, question);
    response.answer = fallback.answer;
    response.insights = fallback.insights || [];
  }

  return response;
}