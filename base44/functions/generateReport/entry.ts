import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REPORT_PROMPTS = {
  executive_summary: (ctx) => `You are writing an Executive Summary for a board presentation.

Dataset: ${ctx.tableName} | ${ctx.rowCount} rows | Quality: ${ctx.qualityScore}%
Primary KPI: ${ctx.primaryLabel} = ${ctx.totalValue} (${ctx.growthRate != null ? (ctx.growthRate > 0 ? '+' : '') + ctx.growthRate + '% trend' : 'no trend data'})
Top Segment: ${ctx.topSegment} (${ctx.topSegmentValue})
Anomalies: ${ctx.anomalyCount} detected (${ctx.highSeverityAnomalies} high severity)
Key Findings: ${ctx.keyFindings?.join('; ') || 'None'}
Recommendations: ${ctx.recommendations?.map(r => `[${r.priority}] ${r.action}`).join('; ') || 'None'}

Write a professional 400-word executive summary with:
## Executive Summary
## Key Findings (3-5 bullet points with specific numbers)
## Risk Signals
## Recommended Actions (ranked by priority)

Use actual data values. Professional business language. No filler.`,

  board_memo: (ctx) => `You are writing a Board Memo — the most important 1-page strategic brief.

Dataset: ${ctx.tableName} | ${ctx.rowCount} rows | Quality Score: ${ctx.qualityScore}%
KPI: ${ctx.primaryLabel} = ${ctx.totalValue} | Growth: ${ctx.growthRate != null ? ctx.growthRate + '%' : 'N/A'}
Top 5 segments: ${ctx.top5Segments || 'N/A'}
Anomaly count: ${ctx.anomalyCount} | High severity: ${ctx.highSeverityAnomalies}
Key Findings: ${ctx.keyFindings?.join('; ') || 'None'}
Top Recommendations: ${ctx.recommendations?.slice(0, 3).map(r => r.action).join('; ') || 'None'}

Write a concise board memo (500 words max) with:
## MEMO
**To:** Board of Directors  **From:** Analytics Team  **Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

## Summary (2 sentences)
## Performance Highlights
## Risks & Concerns
## Recommended Board Actions (numbered, each ≤15 words)

Strict: no padding, no generic statements, numbers must appear in every section.`,

  forecast_report: (ctx) => `You are writing a Forecast Report for business planning.

Dataset: ${ctx.tableName} | Trend: ${ctx.growthRate != null ? (ctx.growthRate > 0 ? '+' : '') + ctx.growthRate + '%' : 'No date column'}
Current: ${ctx.primaryLabel} = ${ctx.totalValue}
Forecast available: ${ctx.canForecast ? 'Yes' : 'No — no date column'}
Historical periods: ${ctx.trendPeriods || 'N/A'}
Top segment: ${ctx.topSegment}

Write a professional Forecast Report (450 words):
## Forecast Overview
## Historical Trend Analysis (cite actual values)
## Base / Bull / Bear Scenarios (quantified estimates)
## Forecast Assumptions & Risks
## Recommended Actions

If no forecast data: provide trend narrative and guidance on what data is needed.`,

  anomaly_risk: (ctx) => `You are writing an Anomaly & Risk Report.

Dataset: ${ctx.tableName} | ${ctx.rowCount} rows
Anomalies detected: ${ctx.anomalyCount}
High severity: ${ctx.highSeverityAnomalies}
Anomaly details: ${ctx.anomalyDetails || 'Z-score and IQR methods applied'}
Quality score: ${ctx.qualityScore}%

Write a professional Anomaly & Risk Report (500 words):
## Anomaly Summary
## Detected Anomalies (table format: Period | Value | Expected | Severity | Likely Cause)
## Root Cause Hypotheses
## Business Impact Assessment
## Remediation Plan (prioritized)

Be specific. Cite z-scores and deviations where available.`,

  quality_audit: (ctx) => `You are writing a Data Quality Audit Report.

Dataset: ${ctx.tableName} | ${ctx.rowCount} rows | ${ctx.columnCount} columns
Quality Score: ${ctx.qualityScore}%
Completeness: ${ctx.completeness || 'N/A'}% | Validity: ${ctx.validity || 'N/A'}% | Uniqueness: ${ctx.uniqueness || 'N/A'}%
Issues: ${ctx.issues?.map(i => i.message).join('; ') || 'None detected'}
Missing values: ${ctx.missingCells || 0} cells

Write a professional Data Quality Audit (350 words):
## Quality Score Breakdown (with the weighted formula)
## Issues Found (severity + column + impact)
## Completeness Audit by Column
## Recommended Remediation Steps
## Readiness for Analysis: YES / CONDITIONAL / NO

Include the formula: QS = 0.35×Completeness + 0.25×Validity + 0.20×Uniqueness + 0.10×Consistency + 0.10×Timeliness`,

  kpi_trend: (ctx) => `You are writing a KPI & Trend Performance Report.

Dataset: ${ctx.tableName} | Primary KPI: ${ctx.primaryLabel} = ${ctx.totalValue}
Growth Rate: ${ctx.growthRate != null ? (ctx.growthRate > 0 ? '+' : '') + ctx.growthRate + '%' : 'No trend data'}
Secondary KPI: ${ctx.secondLabel || 'N/A'} = ${ctx.secondValue || 'N/A'}
Top Segments: ${ctx.top5Segments || 'N/A'}
Correlations: ${ctx.correlations?.map(c => `${c.colA}↔${c.colB} r=${c.r}`).slice(0, 3).join(', ') || 'None'}

Write a KPI & Trend Report (400 words):
## KPI Performance Dashboard (table of all KPIs with values, change, status)
## Trend Analysis
## Segment Performance
## Correlation Insights
## Forward Outlook`,

  insight_digest: (ctx) => `You are writing an Insight Digest — a narrative synthesis of all analytical findings.

Dataset: ${ctx.tableName}
KPI: ${ctx.primaryLabel} = ${ctx.totalValue} | Trend: ${ctx.growthRate != null ? ctx.growthRate + '%' : 'N/A'}
Top Finding: ${ctx.keyFindings?.[0] || 'N/A'}
Anomalies: ${ctx.anomalyCount} | Quality: ${ctx.qualityScore}%
Top Recommendation: ${ctx.recommendations?.[0]?.action || 'N/A'}

Write a compelling Insight Digest (350 words):
## What We Found
## Why It Matters
## Hidden Patterns
## What To Do Next (3 specific actions)

Write as a compelling narrative, not bullet points. Use specific numbers throughout.`,
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { reportType, tableContext, analysisResults } = await req.json();
  if (!reportType || !tableContext) return Response.json({ error: 'Missing reportType or tableContext' }, { status: 400 });

  const ctx = {
    tableName: tableContext.name || 'Dataset',
    rowCount: tableContext.rowCount?.toLocaleString() || '0',
    columnCount: tableContext.columnCount || tableContext.columns?.length || 0,
    qualityScore: tableContext.qualityScore || 0,
    issues: tableContext.issues || [],
    completeness: tableContext.qualityBreakdown?.completeness,
    validity: tableContext.qualityBreakdown?.validity,
    uniqueness: tableContext.qualityBreakdown?.uniqueness,
    missingCells: tableContext.missingCells || 0,
    primaryLabel: analysisResults?.primaryLabel || 'Primary KPI',
    totalValue: analysisResults?.totalValue?.toLocaleString() || '—',
    growthRate: analysisResults?.growthRate,
    secondLabel: analysisResults?.secondLabel,
    secondValue: analysisResults?.secondValue?.toLocaleString(),
    topSegment: analysisResults?.breakdownData?.[0]?.name || '—',
    topSegmentValue: analysisResults?.breakdownData?.[0]?.value?.toLocaleString() || '—',
    top5Segments: analysisResults?.breakdownData?.slice(0, 5).map(b => `${b.name}: ${b.value?.toLocaleString()}`).join(', '),
    anomalyCount: analysisResults?.anomalies?.length || 0,
    highSeverityAnomalies: analysisResults?.anomalies?.filter(a => a.severity === 'high' || a.severity === 'critical').length || 0,
    anomalyDetails: analysisResults?.anomalies?.slice(0, 3).map(a => `${a.date}: z=${a.zScore}σ (${a.severity})`).join(', '),
    keyFindings: analysisResults?.keyFindings || [],
    recommendations: analysisResults?.recommendations || [],
    canForecast: analysisResults?.canForecast,
    trendPeriods: analysisResults?.trendData?.length,
    correlations: analysisResults?.correlations || [],
  };

  const promptFn = REPORT_PROMPTS[reportType];
  if (!promptFn) return Response.json({ error: 'Unknown report type' }, { status: 400 });

  const content = await base44.integrations.Core.InvokeLLM({
    prompt: promptFn(ctx),
    model: 'claude_sonnet_4_6',
  });

  return Response.json({
    ok: true,
    content: typeof content === 'string' ? content : JSON.stringify(content),
    reportType,
    generatedAt: new Date().toISOString(),
    tableName: ctx.tableName,
    wordCount: (typeof content === 'string' ? content : '').split(' ').length,
  });
});