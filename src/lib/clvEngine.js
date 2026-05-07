/**
 * Customer Lifetime Value (CLV) Engine
 * CLV = AverageOrderValue × PurchaseFrequency × GrossMargin × CustomerLifespan
 * Graceful degradation: without margin → CLV = AOV × Frequency
 */

const fmtV = v => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

export function computeCLV(rows, customerCol, revenueCol, dateCol, marginCol = null) {
  if (!rows?.length || !customerCol || !revenueCol) return null;

  const customers = {};

  rows.forEach(row => {
    const id = String(row[customerCol] ?? '');
    if (!id || id === 'undefined') return;
    if (!customers[id]) customers[id] = { transactions: [], revenues: [], margins: [], dates: [] };

    const rev = Number(row[revenueCol]);
    if (!isNaN(rev)) {
      customers[id].revenues.push(rev);
      customers[id].transactions.push(1);
    }

    if (marginCol) {
      const m = Number(row[marginCol]);
      if (!isNaN(m)) customers[id].margins.push(m);
    }

    if (dateCol) {
      const d = new Date(row[dateCol]);
      if (!isNaN(d.getTime())) customers[id].dates.push(d);
    }
  });

  const results = Object.entries(customers).map(([customerId, data]) => {
    const totalRevenue = data.revenues.reduce((a, b) => a + b, 0);
    const txCount = data.revenues.length;
    const aov = txCount > 0 ? totalRevenue / txCount : 0;

    // Lifespan in months
    let lifespanMonths = 1;
    if (data.dates.length >= 2) {
      const minDate = Math.min(...data.dates.map(d => d.getTime()));
      const maxDate = Math.max(...data.dates.map(d => d.getTime()));
      lifespanMonths = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24 * 30));
    }

    // Frequency per month
    const frequency = txCount / lifespanMonths;

    // Margin
    const hasMargin = data.margins.length > 0;
    const avgMargin = hasMargin ? data.margins.reduce((a, b) => a + b, 0) / data.margins.length : null;

    // CLV calculation
    let clv;
    if (hasMargin && avgMargin != null) {
      // Full formula: AOV × Frequency × Margin × Lifespan
      clv = aov * frequency * (avgMargin / 100) * lifespanMonths;
    } else {
      // Degraded: AOV × txCount (simple total value)
      clv = totalRevenue;
    }

    return {
      customerId,
      totalRevenue: Math.round(totalRevenue),
      txCount,
      aov: Math.round(aov),
      lifespanMonths: parseFloat(lifespanMonths.toFixed(1)),
      clv: Math.round(clv),
      avgMargin: hasMargin ? parseFloat((avgMargin || 0).toFixed(1)) : null,
      tier: null, // assigned below
    };
  });

  // Sort by CLV desc
  results.sort((a, b) => b.clv - a.clv);

  // Assign tiers
  const n = results.length;
  results.forEach((r, i) => {
    const pct = i / n;
    if (pct < 0.1) r.tier = 'Champion';
    else if (pct < 0.25) r.tier = 'High Value';
    else if (pct < 0.5) r.tier = 'Mid Value';
    else if (pct < 0.75) r.tier = 'Low Value';
    else r.tier = 'At Risk';
  });

  const total = results.reduce((s, r) => s + r.clv, 0);
  const avg = results.length ? total / results.length : 0;
  const top10 = results.slice(0, Math.ceil(n * 0.1));
  const top10Revenue = top10.reduce((s, r) => s + r.clv, 0);

  const tierSummary = ['Champion', 'High Value', 'Mid Value', 'Low Value', 'At Risk'].map(tier => {
    const group = results.filter(r => r.tier === tier);
    return {
      tier,
      count: group.length,
      pct: n > 0 ? parseFloat((group.length / n * 100).toFixed(1)) : 0,
      totalCLV: Math.round(group.reduce((s, r) => s + r.clv, 0)),
      avgCLV: group.length ? Math.round(group.reduce((s, r) => s + r.clv, 0) / group.length) : 0,
    };
  });

  return {
    customers: results,
    totalCustomers: n,
    totalCLV: Math.round(total),
    avgCLV: Math.round(avg),
    top10Pct: n > 0 ? parseFloat((top10Revenue / (total || 1) * 100).toFixed(1)) : 0,
    tierSummary,
    hasMargin: results[0]?.avgMargin != null,
    fmtV,
  };
}