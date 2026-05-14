import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// 12 professional Decision Intelligence report types
const REPORT_CONFIGS = {
  executive_summary: {
    label: 'Executive Summary',
    questions: ['What happened?', 'Why did it happen?', 'Where is the risk?', 'What should we do?', 'What is the expected impact?'],
    sections: ['## Executive Summary\n## Performance Highlights\n## Risk Signals\n## Recommended Actions\n## Confidence & Limitations'],
  },
  board_memo: {
    label: 'Board Memo',
    questions: ['What are the key strategic signals?', 'What decisions are needed from the board?'],
    sections: ['## BOARD MEMO\n## Strategic Context\n## Performance vs Target\n## Risk Assessment\n## Board Actions Required'],
  },
  data_quality_audit: {
    label: 'Data Quality Audit',
    questions: ['How complete is the data?', 'What data issues were found?', 'Is this data ready for analysis?'],
    sections: ['## Quality Score Summary\n## Completeness Audit\n## Validity & Consistency\n## Issues Found\n## Remediation Plan\n## Analysis Readiness: YES / CONDITIONAL / NO'],
  },
  kpi_trend: {
    label: 'KPI & Trend Report',
    questions: ['How are KPIs performing?', 'What are the trends?', 'Which segments are driving results?'],
    sections: ['## KPI Performance Dashboard\n## Trend Analysis\n## Segment Performance\n## Correlation Insights\n## Forward Outlook'],
  },
  anomaly_risk: {
    label: 'Anomaly & Risk Report',
    questions: ['What anomalies were detected?', 'What is the business impact?', 'What is the remediation plan?'],
    sections: ['## Anomaly Summary\n## Detected Anomalies (table: Period | Value | Expected | Severity | Cause)\n## Root Cause Hypotheses\n## Business Impact Assessment\n## Remediation Plan'],
  },
  contribution_analysis: {
    label: 'Contribution Analysis',
    questions: ['Which segments drove the change?', 'What is each segment\'s contribution?'],
    sections: ['## Contribution Summary\n## Segment Breakdown\n## Top Drivers\n## Drag Segments\n## Recommended Focus Areas'],
  },
  rfm_customer: {
    label: 'RFM Customer Report',
    questions: ['Who are our best customers?', 'Who is at risk of churning?', 'Where should we focus retention?'],
    sections: ['## RFM Overview\n## Champion Customers\n## At-Risk Customers\n## Hibernating Segment\n## Retention & Growth Recommendations'],
  },
  funnel_analysis: {
    label: 'Funnel Analysis Report',
    questions: ['Where is the biggest conversion drop?', 'What is the stage-by-stage conversion?'],
    sections: ['## Funnel Overview\n## Stage-by-Stage Conversion\n## Biggest Drop-off\n## Root Cause Hypotheses\n## Optimization Recommendations'],
  },
  forecast_report: {
    label: 'Forecast Report',
    questions: ['What will happen next?', 'What are the base/bull/bear scenarios?'],
    sections: ['## Forecast Overview\n## Historical Trend\n## Base Scenario\n## Bull Scenario\n## Bear Scenario\n## Assumptions & Limitations'],
  },
  what_if_simulation: {
    label: 'What-If Simulation Report',
    questions: ['What happens if we change X?', 'What is the projected impact?'],
    sections: ['## Simulation Setup\n## Parameter Changes\n## Projected Impact\n## Sensitivity Analysis\n## Recommendation'],
  },
  startup_validation: {
    label: 'Startup Validation Report',
    questions: ['Is this business viable?', 'What do the metrics say about product-market fit?'],
    sections: ['## Business Metrics Overview\n## Growth Signals\n## Unit Economics\n## Retention Analysis\n## Runway & Risk\n## Go/No-Go Assessment'],
  },
  insight_digest: {
    label: 'Insight Digest',
    questions: ['What are the key insights?', 'What should we act on?'],
    sections: ['## What We Found\n## Why It Matters\n## Hidden Patterns\n## What To Do Next'],
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportType, tableContext, analysisResults, agentAnswer } = await req.json();
    if (!reportType || !tableContext) return Response.json({ error: 'Missing reportType or tableContext' }, { status: 400 });

    const config = REPORT_CONFIGS[reportType];
    if (!config) return Response.json({ error: `Unknown report type: ${reportType}` }, { status: 400 });

    const ctx = {
      tableName: tableContext.name || 'Dataset',
      rowCount: (tableContext.rowCount || 0).toLocaleString(),
      columnCount: tableContext.columnCount || tableContext.columns?.length || 0,
      qualityScore: tableContext.qualityScore || 0,
      columns: tableContext.columns?.map(c => c.name || c).slice(0, 20).join(', ') || 'N/A',
      primaryLabel: analysisResults?.primaryLabel || 'Primary KPI',
      totalValue: analysisResults?.totalValue?.toLocaleString() || '—',
      growthRate: analysisResults?.growthRate != null ? (analysisResults.growthRate > 0 ? '+' : '') + analysisResults.growthRate + '%' : 'N/A',
      topSegment: analysisResults?.breakdownData?.[0]?.name || '—',
      topSegmentValue: analysisResults?.breakdownData?.[0]?.value?.toLocaleString() || '—',
      top5Segments: analysisResults?.breakdownData?.slice(0, 5).map(b => `${b.name}: ${b.value?.toLocaleString()}`).join(', ') || 'N/A',
      anomalyCount: analysisResults?.anomalies?.length || 0,
      highSeverity: analysisResults?.anomalies?.filter(a => a.severity === 'high' || a.severity === 'critical').length || 0,
      keyFindings: analysisResults?.keyFindings?.join('; ') || 'See data analysis above',
      recommendations: analysisResults?.recommendations?.slice(0, 5).map(r => r.action || r).join('; ') || 'See recommendations below',
      qualityBreakdown: tableContext.qualityBreakdown ? `Completeness: ${tableContext.qualityBreakdown.completeness}%, Validity: ${tableContext.qualityBreakdown.validity}%, Uniqueness: ${tableContext.qualityBreakdown.uniqueness}%` : 'N/A',
      agentDirectAnswer: agentAnswer?.direct_answer || '',
      agentEvidence: agentAnswer?.evidence?.join('; ') || '',
      agentRisk: agentAnswer?.risk || '',
      agentRecommendations: agentAnswer?.recommendation?.join('; ') || '',
      agentConfidence: agentAnswer?.confidence_score || 0,
    };

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `You are a senior data analyst writing a professional ${config.label} for a business executive audience.

REPORT: ${config.label}
DATE: ${today}
DATASET: ${ctx.tableName} (${ctx.rowCount} rows, ${ctx.columnCount} columns)
COLUMNS: ${ctx.columns}
DATA QUALITY: ${ctx.qualityScore}% overall | ${ctx.qualityBreakdown}

PERFORMANCE DATA:
- Primary KPI: ${ctx.primaryLabel} = ${ctx.totalValue} (trend: ${ctx.growthRate})
- Top Segment: ${ctx.topSegment} = ${ctx.topSegmentValue}
- Top 5 Segments: ${ctx.top5Segments}
- Anomalies Detected: ${ctx.anomalyCount} (${ctx.highSeverity} high severity)
- Key Findings: ${ctx.keyFindings}
- Recommendations: ${ctx.recommendations}

${ctx.agentDirectAnswer ? `AI AGENT FINDINGS:
Direct Answer: ${ctx.agentDirectAnswer}
Evidence: ${ctx.agentEvidence}
Risk: ${ctx.agentRisk}
Recommendations: ${ctx.agentRecommendations}
Confidence: ${ctx.agentConfidence}%` : ''}

REPORT STRUCTURE — write all of these sections:
${config.sections.join('\n')}

QUESTIONS THIS REPORT MUST ANSWER:
${config.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

CRITICAL REQUIREMENTS:
- Every section must contain specific numbers from the data above
- No vague statements, no filler, no generic text
- Use actual column names and KPI values throughout
- Include confidence level (${ctx.agentConfidence || ctx.qualityScore}%) in the analysis
- Explicitly state limitations based on data quality score of ${ctx.qualityScore}%
- Recommended actions must be numbered and start with action verbs
- Board Memo and Executive Summary must be 400-600 words
- Other reports 300-500 words
- Cite methodology: "Analysis based on ${ctx.rowCount} rows using descriptive statistics"
- Close with: "Confidence: ${ctx.agentConfidence || ctx.qualityScore}% | Data Quality: ${ctx.qualityScore}% | Analysis Date: ${today}"

Write in clear, professional business language. Be specific. Use real numbers throughout.`;

    const content = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
    });

    // Save to ForecastHistory/SharedReport as side-effect (fire-and-forget)
    base44.asServiceRole.entities.SharedReport?.create?.({
      title: `${config.label} — ${ctx.tableName}`,
      reportType,
      content: typeof content === 'string' ? content.slice(0, 5000) : '',
      generatedAt: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({
      ok: true,
      reportType,
      label: config.label,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      generatedAt: new Date().toISOString(),
      tableName: ctx.tableName,
      wordCount: (typeof content === 'string' ? content : '').split(' ').length,
      confidence: ctx.agentConfidence || ctx.qualityScore,
      methodology: `Descriptive statistics + AI synthesis on ${ctx.rowCount} rows`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});