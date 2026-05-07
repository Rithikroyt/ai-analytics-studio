import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { chartType, title, xLabel, yLabel, dataPreview } = await req.json();

    const prompt = `You are a senior data analyst explaining a chart to a business executive.

CHART TYPE: ${chartType || 'bar'}
CHART TITLE: ${title || 'Untitled chart'}
X-AXIS: ${xLabel || 'X axis'}
Y-AXIS: ${yLabel || 'Y axis'}
DATA SAMPLE: ${JSON.stringify(dataPreview || []).slice(0, 1000)}

Return a grounded explanation. Be specific. Use actual numbers from the data.

Required fields:
- what_happened: one sentence describing the main trend
- business_meaning: what this means for the business
- anomaly_note: any unusual pattern (null if none)
- recommended_action: one specific next step`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          what_happened: { type: 'string' },
          business_meaning: { type: 'string' },
          anomaly_note: { type: ['string', 'null'] },
          recommended_action: { type: 'string' },
        },
        required: ['what_happened', 'business_meaning', 'recommended_action'],
      },
    });

    return Response.json({ ok: true, explanation: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});