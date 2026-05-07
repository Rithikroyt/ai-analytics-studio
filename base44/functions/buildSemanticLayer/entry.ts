import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tableId, tableName } = await req.json();

    if (!tableId || !tableName) {
      return Response.json({ error: 'Missing tableId or tableName' }, { status: 400 });
    }

    const tables = await base44.asServiceRole.entities.DataTable.filter({ name: tableName });
    if (!tables.length) {
      return Response.json({ error: 'Table not found' }, { status: 404 });
    }

    const table = tables[0];
    const metrics = [];

    // Auto-generate metrics from numeric KPI-candidate columns
    (table.columns || []).filter(c => c.isKpiCandidate && c.type === 'numeric').forEach(col => {
      metrics.push({
        metricId: col.name.toLowerCase().replace(/\s+/g, '_'),
        displayName: col.name.charAt(0).toUpperCase() + col.name.slice(1),
        formula: `SUM(${col.name})`,
        businessDefinition: `Total ${col.name} for the selected period`,
        aggregation: 'sum',
        sourceTable: tableName,
        sourceColumn: col.name,
        validDimensions: (table.columns || [])
          .filter(c => c.type === 'category' || c.isSegmentCandidate)
          .map(c => c.name),
        owner: user.email,
        certificationStatus: 'draft',
        exampleQuestions: [
          `What is the total ${col.name}?`,
          `Show ${col.name} by region`,
          `How did ${col.name} change month-over-month?`,
        ],
        tags: ['auto-generated', 'kpi'],
      });
    });

    return Response.json({ metrics });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});