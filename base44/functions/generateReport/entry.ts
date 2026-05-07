import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REPORT_PROMPTS = {
  executive_summary: (ctx) => `You are writing an Executive Summary for a board presentation.

DATASET: ${ctx.tableName} | ${ctx.rowCount} rows | Quality: ${ctx.qualityScore}%
PRIMARY KPI: ${ctx.primaryLabel} = ${ctx.totalValue} (${ctx.growthRate != null ? (ctx.growthRate > 0 ? '+' : '') + ctx.growthRate + '% trend' : 'no trend'})
TOP SEGMENTS: ${ctx.topSegments}
ANOMALIES: ${ctx.anomalyCount} detected (${ctx.highAnomalies} high severity)
KEY FINDINGS: ${ctx.keyFindings}

Write a professional Executive Summary (400-500 words):
## Executive Summary
## Key Performance Highlights
## Risks & Concerns
## Strategic Recommendations
## Next Steps

Be specific. Use exact numbers. Write for a C-suite audience.`,

  board_memo: (ctx) => `You are writing a Board Memo for a strategic review meeting.

DATASET: ${ctx.tableName}
PERFORMANCE: ${ctx.primaryLabel} = ${ctx.totalValue} | Growth: ${ctx.growthRate != null ? ctx.growthRate + '%' : 'N/A'}
ANOMALIES: ${ctx.anomalyCount} | HIGH: ${ctx.highAnomalies}
QUALITY SCORE: ${ctx.qualityScore}%
RECOMMENDATIONS: ${ctx.recommendations}

Write a concise Board Memo (600-800 words) following this structure:
## TO: Board of Directors
## FROM: Analytics Team
## RE: ${ctx.tableName} Performance Review
## SUMMARY (2-3 sentences)
## FINDINGS
## RISK REGISTER
## RECOMMENDED ACTIONS
## APPENDIX: Data Sources

Professional tone. Bullet points for findings. Numbered list for actions.`,

  kpi_trend: (ctx) => `Generate a KPI & Trend Report.

DATASET: ${ctx.tableName} | ${ctx.rowCount} rows
PRIMARY KPI: ${ctx.primaryLabel} = ${ctx.totalValue}
GROWTH RATE: ${ctx.growthRate != null ? ctx.growthRate + '%' : 'No time data'}
TREND DATA: ${ctx.trendSummary}
TOP SEGMENTS: ${ctx.topSegments}
CORRELATIONS: ${ctx.correlations}

Write a KPI & Trend Report (350-450 words):
## KPI Performance Summary
## Trend Analysis
## Segment Breakdown
## Correlation Insights
## Outlook`,

  anomaly_risk: (ctx) => `Generate an Anomaly & Risk Report.

DATASET: ${ctx.tableName}
ANOMALIES DETECTED: ${ctx.anomalyCount}
HIGH SEVERITY: ${ctx.highAnomalies}
ANOMALY DETAILS: ${ctx.anomalyDetails}
PRIMARY KPI: ${ctx.primaryLabel} = ${ctx.totalValue}

Write an Anomaly & Risk Report (400-500 words):
## Anomaly Register
## Root Cause Analysis
## Business Impact Assessment
## Risk Mitigation Plan
## Monitoring Recommendations

For each anomaly: date/period, actual vs expected, severity, likely driver, recommended action.`,

  data_quality: (ctx) => `Generate a Data Quality Audit Report.

DATASET: ${ctx.tableName} | ${ctx.rowCount} rows | ${ctx.columnCount} columns
QUALITY SCORE: ${ctx.qualityScore}% (weighted: Completeness 35%, Validity 25%, Uniqueness 20%, Consistency 10%, Timeliness 10%)
ISSUES: ${ctx.issues}
NULL COLUMNS: ${ctx.nullColumns}

Write a Data Quality Audit Report (300-400 words):
## Overall Quality Assessment
## Completeness Analysis
## Validity & Format Check
## Uniqueness (Duplicates)
## Recommendations for Improvement
## Certification Statement`,

  forecast: (ctx) => `Generate a Forecast Report.

DATASET: ${ctx.tableName}
PRIMARY KPI: ${ctx.primaryLabel}
CURRENT VALUE: ${ctx.totalValue}
HISTORICAL TREND: ${ctx.growthRate != null ? ctx.growthRate + '% rate' : 'No time data'}
FORECAST DATA: ${ctx.forecastSummary}
DATA QUALITY: ${ctx.qualityScore}%

Write a Forecast Report (400-500 words):
## Forecast Summary
## Methodology (model used, assumptions)
## Base / Bull / Bear Scenarios
## Key Risk Factors
## Confidence Assessment
## Recommended Monitoring Thresholds`,

  insight_digest: (ctx) => `Generate an Insight Digest for weekly distribution.

DATASET: ${ctx.tableName}
KEY FINDINGS: ${ctx.keyFindings}
ANOMALIES: ${ctx.anomalyCount} detected
TOP RECOMMENDATIONS: ${ctx.recommendations}
QUALITY: ${ctx.qualityScore}%

Write a concise Insight Digest (300-400 words):
## This Week's Highlights (3-5 bullet points)
## What Changed
## What Needs Attention
## Quick Wins
## One Number That Matters`,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportType, tableContext, analysisResults } = await req.json();
    const r = analysisResults || {};
    const t = tableContext || {};

    const ctx = {
      tableName: t.name || 'Dataset',
      rowCount: t.rowCount?.toLocaleString() || '0',
      columnCount: t.columnCount || 0,
      qualityScore: t.qualityScore || 0,
      primaryLabel: r.primaryLabel || 'Primary KPI',
      totalValue: r.totalValue != null ? r.totalValue.toLocaleString() : 'N/A',
      growthRate: r.growthRate,
      anomalyCount: r.anomalies?.length || 0,
      highAnomalies: r.anomalies?.filter(a => a.severity === 'high' || a.severity === 'critical').length || 0,
      topSegments: r.breakdownData?.slice(0, 5).map(b => `${b.name}: ${b.value}`).join(', ') || 'N/A',
      keyFindings: r.keyFindings?.join('; ') || 'No findings available',
      recommendations: r.recommendations?.map(rc => `[${rc.priority}] ${rc.action}`).join('; ') || 'No recommendations',
      anomalyDetails: r.anomalies?.slice(0, 5).map(a => `${a.date}: ${a.value} (expected ${a.expected}, z=${a.zScore}, ${a.severity})`).join('; ') || 'None',
      correlations: r.correlations?.slice(0, 3).map(c => `${c.colA}↔${c.colB} r=${c.r}`).join(', ') || 'None computed',
      trendSummary: r.trendData?.length ? `${r.trendData.length} periods, latest: ${r.trendData[r.trendData.length - 1]?.value}` : 'No time-series',
      forecastSummary: r.forecastData?.length ? `${r.forecastData.length} periods forecast, first: ${r.forecastData[0]?.value}` : 'No forecast',
      nullColumns: Object.entries(t.nullsByColumn || {}).map(([c, n]) => `${c}: ${n}`).join(', ') || 'None',
      issues: (t.issues || []).map(i => i.message).join('; ') || 'None',
    };

    const promptFn = REPORT_PROMPTS[reportType];
    if (!promptFn) return Response.json({ error: `Unknown report type: ${reportType}` }, { status: 400 });

    const content = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: promptFn(ctx),
      model: ['board_memo', 'executive_summary', 'forecast'].includes(reportType) ? 'claude_sonnet_4_6' : undefined,
    });

    return Response.json({ ok: true, content, reportType, wordCount: content.split(/\s+/).length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});