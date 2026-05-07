import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, type, xLabel, yLabel, data, xKey, yKey } = await req.json();
  if (!title || !data?.length) return Response.json({ error: 'Missing chart data' }, { status: 400 });

  const fmtV = (v) => {
    if (v == null || isNaN(Number(v))) return String(v ?? '');
    const n = Number(v);
    if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`;
    return n.toLocaleString();
  };

  const sample = data.slice(0, 20).map(d => `${d[xKey || 'name']}: ${fmtV(d[yKey || 'value'])}`).join(', ');
  const vals = data.map(d => Number(d[yKey || 'value'])).filter(v => !isNaN(v));
  const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const maxV = Math.max(...vals);
  const minV = Math.min(...vals);
  const hasAnomaly = vals.some(v => Math.abs(v - mean) > 2 * (Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1));

  const prompt = `You are a senior data analyst explaining a ${type || 'bar'} chart to a business executive.

Chart Title: "${title}"
X-axis (${xLabel || xKey || 'category'}): Shows ${[...new Set(data.slice(0, 5).map(d => String(d[xKey || 'name'])))].join(', ')}...
Y-axis (${yLabel || yKey || 'value'}): Range ${fmtV(minV)} to ${fmtV(maxV)}, avg ${fmtV(mean)}
Data: ${sample}

Respond in JSON with:
1. whatItShows: What the chart displays (mention axis names and metric)
2. trendOrPattern: The key trend, comparison, or pattern visible in the data (cite actual values)
3. businessMeaning: Why this pattern matters to the business
4. recommendedNextStep: One concrete action to take based on this chart
5. hasAnomaly: true/false if any point is significantly different from the rest
6. anomalyNote: If hasAnomaly, describe which point and by how much

Be specific. Use real numbers from the data. No generic text.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        whatItShows: { type: 'string' },
        trendOrPattern: { type: 'string' },
        businessMeaning: { type: 'string' },
        recommendedNextStep: { type: 'string' },
        hasAnomaly: { type: 'boolean' },
        anomalyNote: { type: ['string', 'null'] },
      },
    },
  });

  return Response.json({ ok: true, explanation: result });
});