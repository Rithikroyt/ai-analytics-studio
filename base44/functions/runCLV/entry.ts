import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows, customerCol, revenueCol, dateCol, marginCol } = await req.json();
    if (!rows?.length || !customerCol || !revenueCol) {
      return Response.json({ error: 'rows, customerCol, revenueCol required' }, { status: 400 });
    }

    const customers = {};
    rows.forEach(row => {
      const id = String(row[customerCol] ?? '');
      if (!id || id === 'undefined') return;
      if (!customers[id]) customers[id] = { revenues: [], margins: [], dates: [] };

      const rev = Number(row[revenueCol]);
      if (!isNaN(rev)) customers[id].revenues.push(rev);

      if (marginCol) {
        const m = Number(row[marginCol]);
        if (!isNaN(m)) customers[id].margins.push(m);
      }

      if (dateCol) {
        const d = new Date(row[dateCol]);
        if (!isNaN(d.getTime())) customers[id].dates.push(d.getTime());
      }
    });

    const results = Object.entries(customers).map(([customerId, data]) => {
      const totalRevenue = data.revenues.reduce((a, b) => a + b, 0);
      const txCount = data.revenues.length;
      const aov = txCount > 0 ? totalRevenue / txCount : 0;

      let lifespanMonths = 1;
      if (data.dates.length >= 2) {
        const minDate = Math.min(...data.dates);
        const maxDate = Math.max(...data.dates);
        lifespanMonths = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24 * 30));
      }

      const frequency = txCount / lifespanMonths;
      const hasMargin = data.margins.length > 0;
      const avgMargin = hasMargin ? data.margins.reduce((a, b) => a + b, 0) / data.margins.length : null;
      const clv = hasMargin && avgMargin != null
        ? aov * frequency * (avgMargin / 100) * lifespanMonths
        : totalRevenue;

      return { customerId, totalRevenue: Math.round(totalRevenue), txCount, aov: Math.round(aov), lifespanMonths: parseFloat(lifespanMonths.toFixed(1)), clv: Math.round(clv) };
    }).sort((a, b) => b.clv - a.clv);

    const n = results.length;
    results.forEach((r, i) => {
      const pct = i / n;
      r.tier = pct < 0.1 ? 'Champion' : pct < 0.25 ? 'High Value' : pct < 0.5 ? 'Mid Value' : pct < 0.75 ? 'Low Value' : 'At Risk';
    });

    const totalCLV = results.reduce((s, r) => s + r.clv, 0);
    const avgCLV = n ? totalCLV / n : 0;

    return Response.json({
      customers: results.slice(0, 500),
      totalCustomers: n,
      totalCLV: Math.round(totalCLV),
      avgCLV: Math.round(avgCLV),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});