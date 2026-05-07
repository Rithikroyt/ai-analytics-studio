/**
 * Analyst Engine V4 — 9-Part Structured Response
 * Direct Answer → Business Meaning → Evidence → Chart → Root Cause → Actions → Confidence → Limitations → Next Question
 */
import { base44 } from '@/api/base44Client';
import * as localTools from '@/lib/analystToolsLocal.js';
import { obs } from '@/lib/observability';

// ── Intent classifier (regex-first, zero LLM cost) ───────────────
export function classifyIntent(question) {
  const q = question.toLowerCase();
  if (/forecast|predict|next|will|future|project|trend/.test(q)) return 'predictive';
  if (/why|cause|drop|decline|issue|problem|anomal|spike|surge|root/.test(q)) return 'diagnostic';
  if (/should|recommend|plan|action|focus|priority|improve|fix|optimize|strategy/.test(q)) return 'prescriptive';
  if (/sql|query|select|from|where|group by/.test(q)) return 'sql';
  if (/clean|quality|missing|null|duplicate|invalid/.test(q)) return 'quality';
  if (/rfm|customer segment|churn|loyal|champion/.test(q)) return 'rfm';
  if (/funnel|conversion|dropoff|drop.off|stage/.test(q)) return 'funnel';
  if (/chart|visuali|plot|graph|show me|bar|line|pie/.test(q)) return 'visual';
  if (/cohort|retention|repeat/.test(q)) return 'cohort';
  if (/clv|lifetime value|customer value/.test(q)) return 'clv';
  if (/contribut|driver|segment impact|which segment/.test(q)) return 'contribution';
  if (/mape|rmse|accuracy|forecast error/.test(q)) return 'forecast_eval';
  return 'exploratory';
}

// ── Build dense data context ─────────────────────────────────────
function buildDataContext(store, activeTable, analysisResults) {
  const r = analysisResults;
  const table = activeTable;
  if (!table) return 'No dataset loaded.';

  const numCols = table.columns?.filter(c => c.type === 'numeric') || [];
  const catCols = table.columns?.filter(c => c.type === 'category') || [];
  const dateCols = table.columns?.filter(c => c.type === 'date') || [];
  const fmt = v => v == null ? 'N/A' : Math.abs(Number(v)) >= 1e6 ? `${(Number(v)/1e6).toFixed(2)}M` : Math.abs(Number(v)) >= 1e3 ? `${(Number(v)/1e3).toFixed(1)}K` : String(v);

  const colStats = numCols.slice(0, 8).map(col => {
    const vals = (table.rows || []).map(r => Number(r[col.name])).filter(v => !isNaN(v));
    if (!vals.length) return null;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sorted = [...vals].sort((a, b) => a - b);
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
    const outlierCount = vals.filter(v => Math.abs(v - mean) > 2 * std).length;
    return `  ${col.name}: mean=${fmt(mean)}, std=${fmt(std)}, min=${fmt(sorted[0])}, max=${fmt(sorted[sorted.length-1])}, outliers=${outlierCount}`;
  }).filter(Boolean).join('\n');

  const anomalyDetail = r?.anomalies?.slice(0, 5).map(a =>
    `  ${a.date || 'row'}: actual=${fmt(a.value)}, expected=${fmt(a.expected)}, z=${a.zScore}σ, severity=${a.severity}`
  ).join('\n') || '  None';

  const corrDetail = r?.correlations?.slice(0, 5).map(c =>
    `  ${c.colA} ↔ ${c.colB}: r=${c.r} (${c.strength})`
  ).join('\n') || '  None';

  return `
DATASET: ${table.name} | Rows: ${table.rowCount?.toLocaleString()} | Quality: ${table.qualityScore}%
Numeric: ${numCols.map(c => c.name).join(', ') || 'None'}
Category: ${catCols.map(c => c.name).join(', ') || 'None'}
Date: ${dateCols.map(c => c.name).join(', ') || 'None'}

PRIMARY KPI: ${r?.primaryLabel || 'Unknown'} = ${fmt(r?.totalValue)}
SECONDARY KPI: ${r?.secondLabel || 'N/A'} = ${fmt(r?.secondValue)}
GROWTH RATE: ${r?.growthRate != null ? r.growthRate + '%' : 'N/A'}
TOP SEGMENTS: ${r?.breakdownData?.slice(0,5).map(b => `${b.name}: ${fmt(b.value)}`).join(', ') || 'N/A'}

COLUMN STATISTICS:
${colStats || '  No numeric data'}

ANOMALIES (${r?.anomalies?.length || 0} total):
${anomalyDetail}

CORRELATIONS:
${corrDetail}

EXISTING RECOMMENDATIONS:
${r?.recommendations?.map(rec => `  [${rec.priority?.toUpperCase()}] ${rec.action}`).join('\n') || '  None'}
`.trim();
}

// ── Mode-specific prompt builder ─────────────────────────────────
function buildPrompt(question, intent, dataContext) {
  const intentGuides = {
    exploratory: `Apply: distribution analysis, key patterns, outlier detection, correlation mapping, segmentation insights.`,
    predictive: `Apply: trend extrapolation, forecast narrative (bull/base/bear), feature importance from correlations, anomaly forecasting.`,
    diagnostic: `Apply: deviation analysis (exact % from baseline), drill-down decomposition by segment/time/column, causal chain mapping, statistical significance.`,
    prescriptive: `Apply: priority matrix (impact × feasibility × urgency), resource optimization, risk-adjusted recommendations, 30/60/90 day roadmap.`,
    contribution: `Apply: contribution % = SegmentValue/TotalValue×100 for each dimension. Identify which segment contributed most to any change or anomaly.`,
    rfm: `Apply: RFM quintile analysis summary. Champion, Loyal, Big Spender, At Risk High Value, Hibernating, Needs Attention segments.`,
    funnel: `Apply: ConversionRate_i = Users_i / Users_(i-1). DropoffRate = 1 - ConversionRate. Identify biggest drop-off.`,
    cohort: `Apply: cohort retention matrix. Identify retention rates by period since first transaction.`,
    clv: `Apply: CLV = AverageOrderValue × PurchaseFrequency × GrossMargin × CustomerLifespan. Rank customers.`,
    forecast_eval: `Apply: MAPE = 100/n × Σ|y_i - ŷ_i|/|y_i|. RMSE = √(1/n × Σ(y_i - ŷ_i)²). sMAPE = 100/n × Σ|y_i - ŷ_i|/((|y_i|+|ŷ_i|)/2).`,
    quality: `Apply: data quality audit. Missing %, duplicate rows, type mismatches, format issues, quality score dimensions.`,
    sql: `Generate a precise SQL query for DuckDB. Use only exact column names from the dataset.`,
    visual: `Recommend the optimal chart type and configuration for the user's question.`,
  };

  return `You are a senior data scientist and business analyst. Produce a STRUCTURED ANALYSIS with exactly these 9 sections (plain text, no markdown headers):

DIRECT ANSWER
Answer the question "${question}" in 2-3 sentences using specific numbers from the data.

BUSINESS MEANING
What does this mean for the business? 2-3 sentences with actionable framing.

EVIDENCE
List 3-5 specific data points: column name, value, and statistical context.

ROOT CAUSE OR DRIVER
What most likely explains the pattern? Reference correlations, anomalies, or segment data.

RECOMMENDED ACTIONS
Number 3 specific actions ranked by priority (1=highest). Each must reference a specific metric or segment.

CONFIDENCE
State confidence % (0-100) and one-sentence reason.

LIMITATIONS
State 1-2 data quality limitations or caveats.

SUGGESTED NEXT QUESTION
One follow-up question that logically extends this analysis.

ANALYSIS GUIDE: ${intentGuides[intent] || intentGuides.exploratory}

DATA CONTEXT:
${dataContext}

RULES:
- Use ONLY numbers that appear in the data context above
- Never fabricate values
- Be specific and data-grounded
- Total length: 280-380 words`;
}

// ── Parse 9-section response ─────────────────────────────────────
function parseStructuredResponse(text) {
  const sections = {
    directAnswer: '',
    businessMeaning: '',
    evidence: '',
    rootCause: '',
    recommendedActions: '',
    confidence: '',
    limitations: '',
    nextQuestion: '',
  };

  const markers = [
    { key: 'directAnswer', pattern: /DIRECT ANSWER\s*/i },
    { key: 'businessMeaning', pattern: /BUSINESS MEANING\s*/i },
    { key: 'evidence', pattern: /EVIDENCE\s*/i },
    { key: 'rootCause', pattern: /ROOT CAUSE(?: OR DRIVER)?\s*/i },
    { key: 'recommendedActions', pattern: /RECOMMENDED ACTIONS\s*/i },
    { key: 'confidence', pattern: /CONFIDENCE\s*/i },
    { key: 'limitations', pattern: /LIMITATIONS\s*/i },
    { key: 'nextQuestion', pattern: /SUGGESTED NEXT QUESTION\s*/i },
  ];

  let remaining = text;
  for (let i = 0; i < markers.length; i++) {
    const { key, pattern } = markers[i];
    const nextPattern = i + 1 < markers.length ? markers[i + 1].pattern : null;
    const match = remaining.search(pattern);
    if (match === -1) continue;
    const afterHeader = remaining.slice(match).replace(pattern, '').trimStart();
    if (nextPattern) {
      const nextMatch = afterHeader.search(nextPattern);
      sections[key] = (nextMatch === -1 ? afterHeader : afterHeader.slice(0, nextMatch)).trim();
    } else {
      sections[key] = afterHeader.trim();
    }
    remaining = afterHeader;
  }

  // Extract confidence number
  const confMatch = sections.confidence.match(/(\d{1,3})/);
  const confidenceNum = confMatch ? parseInt(confMatch[1]) : 75;

  return { sections, confidenceNum };
}

// ── Build chart from context ─────────────────────────────────────
function buildChart(question, intent, analysisResults, activeTable) {
  const r = analysisResults;
  if (!r) return null;
  const q = question.toLowerCase();

  if ((intent === 'predictive' || /trend|forecast/.test(q)) && r.trendData?.length) {
    return {
      type: r.forecastData?.length ? 'composed' : 'area',
      title: `${r.primaryLabel} — Trend${r.forecastData?.length ? ' + Forecast' : ''}`,
      data: [
        ...(r.trendData || []).map(d => ({ date: d.date, actual: d.value })),
        ...(r.forecastData || []).map(d => ({ date: d.date, forecast: d.value })),
      ],
      x_key: 'date', y_key: 'actual',
      series: [
        { key: 'actual', label: r.primaryLabel, type: 'area' },
        ...(r.forecastData?.length ? [{ key: 'forecast', label: 'Forecast', type: 'line' }] : []),
      ],
    };
  }

  if ((intent === 'contribution' || intent === 'diagnostic' || /segment|breakdown|contribut/.test(q)) && r.breakdownData?.length) {
    return {
      type: 'bar',
      title: `${r.primaryLabel} — Contribution by Segment`,
      data: r.breakdownData.slice(0, 10),
      x_key: 'name', y_key: 'value',
    };
  }

  if ((intent === 'diagnostic' || /anomal|deviation|spike/.test(q)) && r.trendData?.length) {
    return {
      type: 'area',
      title: `${r.primaryLabel} — Anomaly Context`,
      data: r.trendData.map(d => ({ date: d.date, value: d.value })),
      x_key: 'date', y_key: 'value',
    };
  }

  if (r.correlations?.length && /correlat|relation|predictor/.test(q)) {
    const top = r.correlations[0];
    const rows = (activeTable?.rows || []).slice(0, 300)
      .map(r => ({ x: Number(r[top.colA]), y: Number(r[top.colB]) }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y));
    if (rows.length > 4) {
      return {
        type: 'scatter',
        title: `Correlation: ${top.colA} vs ${top.colB} (r=${top.r})`,
        data: rows, x_key: top.colA, y_key: top.colB,
      };
    }
  }

  if (r.breakdownData?.length) {
    return {
      type: 'bar',
      title: `${r.primaryLabel} by Segment`,
      data: r.breakdownData.slice(0, 8),
      x_key: 'name', y_key: 'value',
    };
  }

  return null;
}

// ── Main V4 workflow ─────────────────────────────────────────────
export async function executeAnalystWorkflowV4(question, store, analysisResultsArg, activeTableArg) {
  const activeTable = activeTableArg || store?.tables?.find(t => t.id === store?.activeTableId) || store?.tables?.[0] || null;
  const analysisResults = analysisResultsArg || store?.analysisResults || null;

  const intent = classifyIntent(question);
  const dataContext = buildDataContext(store, activeTable, analysisResults);

  const response = {
    role: 'assistant',
    v4: true,
    intent,
    answer: '',
    sections: {},
    confidenceNum: 75,
    charts: [],
    insights: [],
    recommendations: [],
    nextQuestion: '',
  };

  const llmTimer = obs.logLLMCall('claude_sonnet_4_6', question);
  try {
    const prompt = buildPrompt(question, intent, dataContext);
    const text = await base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
    llmTimer.end({ success: true });

    const { sections, confidenceNum } = parseStructuredResponse(text);
    response.sections = sections;
    response.answer = sections.directAnswer || text;
    response.confidenceNum = confidenceNum;
    response.nextQuestion = sections.nextQuestion || '';

    // Pull recommendations from section
    const recLines = (sections.recommendedActions || '').split('\n').filter(l => /^\d\./.test(l.trim()));
    response.recommendations = recLines.map(line => ({
      priority: line.startsWith('1.') ? 'high' : line.startsWith('2.') ? 'medium' : 'low',
      action: line.replace(/^\d\.\s*/, '').trim(),
    }));

  } catch (llmErr) {
    llmTimer.end({ error: llmErr.message, fallback: true });
    const fallback = await localTools.safeFallbackResponse(store, question);
    response.answer = fallback.answer;
    response.sections = { directAnswer: fallback.answer };
    response.insights = fallback.insights || [];
  }

  // Build chart
  const chart = buildChart(question, intent, analysisResults, activeTable);
  if (chart) response.charts = [chart];

  // Contextual insights from local tools
  try {
    const kpi = await localTools.getKPISummary(store);
    const anomalyData = await localTools.getAnomalyResults(store);
    const insights = [];
    if (kpi?.primary_value) insights.push(`${kpi.primary_kpi}: ${kpi.primary_change} vs prior period`);
    if (anomalyData?.total_anomalies > 0) insights.push(`${anomalyData.total_anomalies} anomalies detected (${anomalyData.severity_breakdown?.high || 0} high-severity)`);
    if (analysisResults?.correlations?.[0]) {
      const top = analysisResults.correlations[0];
      insights.push(`Strongest correlation: ${top.colA} ↔ ${top.colB} (r=${top.r})`);
    }
    response.insights = insights;
  } catch {}

  return response;
}