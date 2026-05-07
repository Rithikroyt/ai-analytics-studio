import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { reportType, analysisResults, tableData, title } = await req.json();

    if (!reportType || !analysisResults) {
      return Response.json({ error: 'Missing reportType or analysisResults' }, { status: 400 });
    }

    const reportTypes = {
      executive_summary: 'What happened? Why? What should we do?',
      data_quality_audit: 'Completeness, validity, consistency, timeliness',
      kpi_trend: 'KPI performance over time',
      contribution_analysis: 'Which segment drove the change?',
      forecast: 'Projections for next period',
      anomaly_risk: 'Unusual patterns and risks',
      what_if_simulation: 'Scenario impact analysis',
      board_memo: 'Formal governance memo',
      customer_rfm: 'Customer segmentation by recency, frequency, monetary',
      funnel_analysis: 'Conversion funnel and drop-off analysis',
    };

    const reportTemplate = reportTypes[reportType] || 'Analysis report';

    const prompt = `Generate a professional ${reportType} report with the following data:
Title: ${title || 'Data Analysis Report'}
KPI: ${analysisResults.primaryLabel || 'Primary Metric'}
Value: ${analysisResults.totalValue || 'N/A'}
Growth: ${analysisResults.growthRate || 'N/A'}%

Structure:
1. Executive Summary (2-3 sentences)
2. Key Findings (3 bullet points)
3. Business Impact
4. Recommended Actions
5. Confidence Level

Make it professional and decision-focused.`;

    const report = await base44.integrations.Core.InvokeLLM({ prompt });

    return Response.json({
      reportType,
      title: title || `${reportType.replace(/_/g, ' ')} Report`,
      content: report,
      generatedAt: new Date().toISOString(),
      status: 'success',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});