import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tables, metrics, reports } = await req.json();

    if (!tables?.length) return Response.json({ lineage: [], nodes: [], edges: [] });

    const lineageResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a data lineage expert. Build a data lineage graph for this workspace.

Tables: ${JSON.stringify(tables.map(t => ({ name: t.name, columns: t.columns?.slice(0, 10).map(c => c.name) })))}
Metrics/KPIs: ${JSON.stringify((metrics || []).slice(0, 10))}
Reports: ${JSON.stringify((reports || []).map(r => r.title).slice(0, 10))}

Build a complete lineage graph showing how data flows from source tables → transformations → KPIs → reports.

Return JSON:
{
  "nodes": [{"id": "string", "label": "string", "type": "table|column|kpi|report|transformation", "table": "string"}],
  "edges": [{"from": "string", "to": "string", "transformationType": "direct|aggregation|join|formula|filter", "label": "string"}],
  "criticalPath": ["node_id"],
  "impactMap": {"column_or_table_name": ["affected_kpi_or_report"]}
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          nodes: { type: 'array', items: { type: 'object' } },
          edges: { type: 'array', items: { type: 'object' } },
          criticalPath: { type: 'array', items: { type: 'string' } },
          impactMap: { type: 'object' },
        },
      },
    });

    return Response.json({ ok: true, ...lineageResult, builtAt: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});