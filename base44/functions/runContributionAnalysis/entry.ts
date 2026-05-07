import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows, categoryCol, numericCol, totalValue } = await req.json();
    if (!rows?.length || !categoryCol || !numericCol) {
      return Response.json({ error: 'rows, categoryCol, and numericCol are required' }, { status: 400 });
    }

    // Aggregate by category
    const grouped = {};
    rows.forEach(row => {
      const key = String(row[categoryCol] ?? 'Unknown');
      grouped[key] = (grouped[key] || 0) + (Number(row[numericCol]) || 0);
    });

    const total = totalValue || Object.values(grouped).reduce((a, b) => a + b, 0);
    const contributions = Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
        contribution: total > 0 ? parseFloat((value / total * 100).toFixed(1)) : 0,
        rank: 0,
      }))
      .sort((a, b) => b.value - a.value)
      .map((c, i) => ({ ...c, rank: i + 1 }));

    // Top contributor insight
    const top = contributions[0];
    const bottom = contributions[contributions.length - 1];
    const insight = top
      ? `"${top.name}" is the top contributor at ${top.contribution}% of total ${numericCol.replace(/_/g,' ')}. ` +
        (contributions.length > 1 ? `The bottom segment "${bottom.name}" accounts for only ${bottom.contribution}%.` : '')
      : 'No contribution data available.';

    return Response.json({ contributions, total: Math.round(total), insight });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});