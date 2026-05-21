import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, type, xLabel, yLabel, data, xKey, yKey, metricDefinition, tableName } = await req.json();
  if (!title || !data?.length) return Response.json({ error: 'Missing chart data' }, { status: 400 });

  const fmtV = (v) => {
    if (v == null || isNaN(Number(v))) return String(v ?? '');
    const n = Number(v);
    if (n >= 1e9) return `${(n/1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`;
    return n.toLocaleString();
  };

  const vals = data.map(d => Number(d[yKey || 'value'])).filter(v => !isNaN(v));
  const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const std = vals.length > 1 ? Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) : 0;
  const maxV = Math.max(...vals);
  const minV = Math.min(...vals);
  const maxItem = data.find(d => Number(d[yKey || 'value']) === maxV);
  const minItem = data.find(d => Number(d[yKey || 'value']) === minV);
  const total = vals.reduce((a, b) => a + b, 0);
  const top3 = [...data].sort((a, b) => Number(b[yKey || 'value']) - Number(a[yKey || 'value'])).slice(0, 3);
  const bottom3 = [...data].sort((a, b) => Number(a[yKey || 'value']) - Number(b[yKey || 'value'])).slice(0, 3);
  const anomalyItems = data.filter(d => std > 0 && Math.abs(Number(d[yKey || 'value']) - mean) > 2 * std);
  const trend = vals.length >= 3 ? (vals[vals.length - 1] > vals[0] ? 'upward' : vals[vals.length - 1] < vals[0] ? 'downward' : 'flat') : 'insufficient data';
  const sample = data.slice(0, 15).map(d => `${d[xKey || 'name']}: ${fmtV(d[yKey || 'value'])}`).join(', ');

  const prompt = `You are a senior data analyst explaining this ${type || 'bar'} chart to a C-suite executive. Be precise and businessfocused — use specific numbers.

CHART: "${title}"
SOURCE: ${tableName || 'Dataset'}
TYPE: ${type || 'bar'}
X-AXIS (${xLabel || xKey || 'dimension'}): categories/time
Y-AXIS (${yLabel || yKey || 'metric'}): ${metricDefinition || 'business metric'}

KEY STATISTICS:
- Total: ${fmtV(total)}
- Average: ${fmtV(mean)} per ${xLabel || 'category'}
- Max: ${fmtV(maxV)} (${maxItem?.[xKey || 'name'] || 'N/A'})
- Min: ${fmtV(minV)} (${minItem?.[xKey || 'name'] || 'N/A'})
- Trend: ${trend}
- Standard deviation: ${fmtV(std)} (${std > mean * 0.5 ? 'HIGH variance' : 'moderate variance'})
- Anomalies (>2σ): ${anomalyItems.length} items — ${anomalyItems.slice(0, 3).map(d => d[xKey || 'name']).join(', ') || 'none'}

TOP 3: ${top3.map(d => `${d[xKey || 'name']}: ${fmtV(d[yKey || 'value'])}`).join(', ')}
BOTTOM 3: ${bottom3.map(d => `${d[xKey || 'name']}: ${fmtV(d[yKey || 'value'])}`).join(', ')}
DATA SAMPLE: ${sample}

Respond in strict JSON with all these fields populated with specific values from above:
- whatItShows: What the chart displays — name the axes and the metric explicitly
- trendOrPattern: The primary trend or comparison visible (cite at least 2 specific values)  
- topInsight: The single most important finding for a business leader (use numbers)
- businessMeaning: Why this pattern matters strategically
- riskOrWarning: Any risk, anomaly, or warning signal in the data (or "No significant risk detected")
- recommendedNextStep: One concrete, specific action to take based on this chart (start with a verb)
- sqlToReproduce: A simple SQL query to reproduce this analysis (SELECT ${xLabel || xKey || 'category'}, ${yLabel || yKey || 'metric'}...)
- hasAnomaly: true/false
- anomalyNote: Description of any anomaly with the specific value and how far above/below mean`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    model: 'claude_sonnet_4_6',
    response_json_schema: {
      type: 'object',
      properties: {
        whatItShows: { type: 'string' },
        trendOrPattern: { type: 'string' },
        topInsight: { type: 'string' },
        businessMeaning: { type: 'string' },
        riskOrWarning: { type: 'string' },
        recommendedNextStep: { type: 'string' },
        sqlToReproduce: { type: 'string' },
        hasAnomaly: { type: 'boolean' },
        anomalyNote: { type: ['string', 'null'] },
      },
      required: ['whatItShows', 'trendOrPattern', 'topInsight', 'businessMeaning', 'recommendedNextStep'],
    },
  });

  return Response.json({ ok: true, explanation: result, stats: { mean, std, maxV, minV, total, trend, anomalyCount: anomalyItems.length } });
});