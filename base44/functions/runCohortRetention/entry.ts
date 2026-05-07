import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows, customerCol, dateCol, maxPeriods = 8 } = await req.json();
    if (!rows?.length || !customerCol || !dateCol) {
      return Response.json({ error: 'rows, customerCol, dateCol required' }, { status: 400 });
    }

    const customerFirstDate = {};
    const customerActivePeriods = {};

    rows.forEach(row => {
      const id = String(row[customerCol] ?? '');
      if (!id || id === 'undefined') return;
      const d = new Date(row[dateCol]);
      if (isNaN(d.getTime())) return;

      const monthKey = d.toISOString().slice(0, 7);
      if (!customerFirstDate[id] || monthKey < customerFirstDate[id]) {
        customerFirstDate[id] = monthKey;
      }
      if (!customerActivePeriods[id]) customerActivePeriods[id] = new Set();
      customerActivePeriods[id].add(monthKey);
    });

    const cohorts = {};
    Object.entries(customerFirstDate).forEach(([id, cohort]) => {
      if (!cohorts[cohort]) cohorts[cohort] = [];
      cohorts[cohort].push(id);
    });

    const cohortKeys = Object.keys(cohorts).sort();
    const matrix = cohortKeys.map(cohort => {
      const members = cohorts[cohort];
      const cohortSize = members.length;
      const cohortDate = new Date(cohort + '-01');
      const periods = [];

      for (let p = 0; p < maxPeriods; p++) {
        const targetDate = new Date(cohortDate);
        targetDate.setMonth(targetDate.getMonth() + p);
        const targetKey = targetDate.toISOString().slice(0, 7);
        const activeCount = members.filter(id => customerActivePeriods[id]?.has(targetKey)).length;
        const retentionRate = cohortSize > 0 ? parseFloat((activeCount / cohortSize * 100).toFixed(1)) : 0;
        periods.push({ period: p, active: activeCount, retentionRate });
      }

      return { cohort, cohortSize, periods };
    });

    const avgRetention = Array.from({ length: maxPeriods }, (_, p) => {
      const valid = matrix.filter(r => r.periods[p] && !(r.periods[p].active === 0 && p > 0));
      const avg = valid.length ? valid.reduce((s, r) => s + r.periods[p].retentionRate, 0) / valid.length : 0;
      return parseFloat(avg.toFixed(1));
    });

    return Response.json({
      matrix,
      cohortKeys,
      avgRetention,
      totalCustomers: Object.keys(customerFirstDate).length,
      period1Retention: avgRetention[1] || 0,
      period3Retention: avgRetention[3] || 0,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});